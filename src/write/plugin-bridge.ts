/**
 * Plugin Bridge for write mode
 * Handles WebSocket communication with the Figma plugin
 */
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';
import { PluginInfo, CommandResponse, PluginCommand } from '../core/types.js';

/**
 * Plugin connection event types
 */
export enum PluginEventType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  COMMAND_RESPONSE = 'command-response',
  ERROR = 'error'
}

/**
 * Plugin Bridge for write mode
 * Handles WebSocket communication with the Figma plugin
 */
export class PluginBridge extends EventEmitter {
  private wsServer: WebSocketServer | null = null;
  private connections: Map<WebSocket, PluginInfo> = new Map();
  private pendingCommands: Map<string, (response: CommandResponse) => void> = new Map();
  private logger: Logger;
  private port: number;
  public isRunning = false;
  
  /**
   * Create a new Plugin Bridge
   * @param configManager Configuration manager
   */
  constructor(configManager: ConfigManager) {
    super();
    this.port = 8766;
    this.logger = createLogger('PluginBridge', configManager);
    
    this.logger.debug(`Plugin Bridge initialized with port ${this.port}`);
  }
  
  /**
   * Start the WebSocket server
   * @returns Promise that resolves to true if the server was started successfully
   */
  public async start(): Promise<boolean> {
    if (this.isRunning) {
      this.logger.warn('Plugin Bridge is already running');
      return true; // Return true since it's already running
    }
    
    try {
      this.logger.info(`Starting WebSocket server on port ${this.port}`);
      console.log(`[PluginBridge] Starting WebSocket server on port ${this.port}`);
      
      // Create WebSocket server
      try {
        this.wsServer = new WebSocketServer({ port: this.port });
        
        // Set up connection handling
        this.wsServer.on('connection', (ws) => {
          console.log('[PluginBridge] New connection received!');
          this.handleConnection(ws);
        });
        
        // Set up error handling
        this.wsServer.on('error', (error: Error) => {
          console.error('[PluginBridge] WebSocket server error:', error);
          this.logger.error('WebSocket server error', error);
          this.emit(PluginEventType.ERROR, error);
        });
        
        this.isRunning = true;
        this.logger.info(`WebSocket server running on port ${this.port}`);
        console.log(`[PluginBridge] WebSocket server running on port ${this.port}`);
        
        // Wait for a connection with a timeout
        try {
          console.log('[PluginBridge] Waiting for plugin connection (5 second timeout)...');
          await new Promise<void>((resolve, reject) => {
            // Set a timeout for the connection (30 seconds)
            const timeout = setTimeout(() => {
              console.log('[PluginBridge] Connection timeout after 30 seconds');
              reject(new Error('Connection timeout after 30 seconds'));
            }, 30000); // 30 second timeout
            
            // Set up a one-time connection event handler
            const connectionHandler = () => {
              console.log('[PluginBridge] Connection event received!');
              clearTimeout(timeout);
              resolve();
            };
            
            // Listen for the first connection
            this.once(PluginEventType.CONNECTED, connectionHandler);
          });
          
          this.logger.info('Plugin connected successfully');
          console.log('[PluginBridge] Plugin connected successfully');
          return true;
        } catch (timeoutError) {
          this.logger.error('Timeout waiting for plugin connection', timeoutError);
          console.error('[PluginBridge] Timeout waiting for plugin connection:', timeoutError);
          
          // Stop the server since no connection was established
          console.log('[PluginBridge] Stopping server due to connection timeout');
          await this.stop();
          
          return false;
        }
      } catch (wsError) {
        // If the error is EADDRINUSE, it means the port is already in use
        if (wsError instanceof Error && wsError.message.includes('EADDRINUSE')) {
          this.logger.warn(`Port ${this.port} is already in use. This could be another instance of the server or the plugin connection test.`);
          console.warn(`[PluginBridge] Port ${this.port} is already in use. This could be another instance of the server or the plugin connection test.`);
          
          // Try to connect to the existing server as a client
          console.log('[PluginBridge] Trying to connect to existing server as a client...');
          
          try {
            // Create a WebSocket client to connect to the existing server
            const ws = new WebSocket(`ws://localhost:${this.port}`);
            
            // Wait for the connection to be established
            await new Promise<void>((resolve, reject) => {
              ws.onopen = () => {
                console.log(`[PluginBridge] Connected to existing WebSocket server on port ${this.port}`);
                resolve();
              };
              
              ws.onerror = (error) => {
                console.error('[PluginBridge] Failed to connect to existing WebSocket server:', error);
                reject(error);
              };
              
              // Set a timeout (30 seconds)
              setTimeout(() => {
                reject(new Error(`Connection timeout after 30 seconds`));
              }, 30000); // 30 second timeout
            });
            
            // Handle the connection
            this.handleConnection(ws);
            
            this.isRunning = true;
            this.logger.info(`Connected to existing WebSocket server on port ${this.port}`);
            
            return true;
          } catch (clientError) {
            console.error('[PluginBridge] Failed to connect to existing server:', clientError);
            return false;
          }
        }
        
        // For other errors, rethrow
        console.error('[PluginBridge] Error creating WebSocket server:', wsError);
        throw wsError;
      }
    } catch (error) {
      this.logger.error('Failed to start WebSocket server', error);
      console.error('[PluginBridge] Failed to start WebSocket server:', error);
      this.emit(PluginEventType.ERROR, error);
      return false;
    }
  }
  
  /**
   * Stop the WebSocket server
   * @returns Promise that resolves to true if the server was stopped successfully
   */
  public async stop(): Promise<boolean> {
    if (!this.isRunning || !this.wsServer) {
      this.logger.warn('Plugin Bridge is not running');
      return false;
    }
    
    try {
      // Close all connections
      for (const ws of this.connections.keys()) {
        try {
          ws.close();
        } catch (error) {
          this.logger.warn('Error closing WebSocket connection', error);
        }
      }
      
      // Close the server
      await new Promise<void>((resolve) => {
        if (this.wsServer) {
          this.wsServer.close(() => {
            resolve();
          });
        } else {
          resolve();
        }
      });
      
      // Clear connections and pending commands
      this.connections.clear();
      this.pendingCommands.clear();
      
      this.isRunning = false;
      this.wsServer = null;
      
      this.logger.info('WebSocket server stopped');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to stop WebSocket server', error);
      this.emit(PluginEventType.ERROR, error);
      return false;
    }
  }
  
  /**
   * Check if the plugin is connected
   * @returns True if the plugin is connected
   */
  public isConnected(): boolean {
    return this.connections.size > 0;
  }
  
  /**
   * Get the number of connected plugins
   * @returns Number of connected plugins
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }
  
  /**
   * Get connected plugin info
   * @returns Array of connected plugin info
   */
  public getConnectedPlugins(): PluginInfo[] {
    return Array.from(this.connections.values());
  }
  
  /**
   * Send a command to the plugin
   * @param command Command name
   * @param params Command parameters
   * @returns Promise that resolves with the command response
   */
  public sendCommand(command: string, params: any = {}): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('No plugin connected'));
        return;
      }
      
      // Create command ID
      const id = uuidv4();
      
      // Create command
      const pluginCommand: PluginCommand = {
        id,
        command,
        params,
        responseRequired: true
      };
      
      // Store callback for response
      this.pendingCommands.set(id, resolve);
      
      // Send command to first connected plugin
      // In future we might want to target specific plugins by ID
      const firstKey = this.connections.keys().next();
      if (firstKey.done || !firstKey.value) {
        reject(new Error('No plugin connected'));
        return;
      }
      
      const ws = firstKey.value;
      
      try {
        this.logger.debug(`Sending command: ${command}`, params);
        
        ws.send(JSON.stringify({
          type: 'command',
          ...pluginCommand
        }));
      } catch (error) {
        this.pendingCommands.delete(id);
        this.logger.error(`Error sending command: ${command}`, error);
        reject(error);
      }
      
      // Set timeout for command
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          this.logger.warn(`Command timed out: ${command}`);
          reject(new Error(`Command timed out: ${command}`));
        }
      }, 60000); // 60 second timeout for better reliability
    });
  }
  
  /**
   * Handle a new WebSocket connection
   * @param ws WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    this.logger.info('New plugin connection');
    console.log('[PluginBridge] New plugin connection in handleConnection method');
    
    // Set up message handler
    ws.on('message', (data) => {
      console.log('[PluginBridge] Received message from plugin:', data.toString().substring(0, 100) + '...');
      this.handleMessage(ws, data);
    });
    
    // Set up close handler
    ws.on('close', () => {
      console.log('[PluginBridge] WebSocket connection closed');
      this.handleClose(ws);
    });
    
    // Set up error handler
    ws.on('error', (error: Error) => {
      console.error('[PluginBridge] WebSocket connection error:', error);
      this.logger.error('WebSocket connection error', error);
      this.emit(PluginEventType.ERROR, error);
    });
  }
  
  /**
   * Handle a WebSocket message
   * @param ws WebSocket connection
   * @param data Message data
   */
  private handleMessage(ws: WebSocket, data: any): void {
    try {
      const message = JSON.parse(data.toString());
      console.log('[PluginBridge] Parsed message:', message);
      
      switch (message.type) {
        case 'plugin-info':
          // Store plugin info
          console.log('[PluginBridge] Received plugin-info message:', message.data);
          this.connections.set(ws, message.data);
          
          // Emit connected event
          console.log('[PluginBridge] Emitting CONNECTED event');
          this.emit(PluginEventType.CONNECTED, message.data);
          this.logger.info(`Plugin connected: ${message.data.name} (${message.data.id})`);
          console.log(`[PluginBridge] Plugin connected: ${message.data.name} (${message.data.id})`);
          break;
        
        case 'response':
          // Handle command response
          console.log('[PluginBridge] Received response message:', message.data);
          const response = message.data as CommandResponse;
          
          // Find and call response handler
          if (this.pendingCommands.has(response.id)) {
            console.log(`[PluginBridge] Found handler for response ID: ${response.id}`);
            const handler = this.pendingCommands.get(response.id);
            this.pendingCommands.delete(response.id);
            
            if (handler) {
              console.log(`[PluginBridge] Calling handler for response ID: ${response.id}`);
              handler(response);
            }
            
            // Emit response event
            console.log(`[PluginBridge] Emitting COMMAND_RESPONSE event for ID: ${response.id}`);
            this.emit(PluginEventType.COMMAND_RESPONSE, response);
            
            if (response.success) {
              this.logger.debug(`Command response: ${response.id}`, response.result);
              console.log(`[PluginBridge] Command response success: ${response.id}`, response.result);
            } else {
              this.logger.warn(`Command error: ${response.id}`, response.error);
              console.warn(`[PluginBridge] Command error: ${response.id}`, response.error);
            }
          } else {
            console.warn(`[PluginBridge] No handler found for response ID: ${response.id}`);
          }
          break;
        
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
          console.warn(`[PluginBridge] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', error);
      console.error('[PluginBridge] Failed to parse WebSocket message:', error, data.toString());
    }
  }
  
  /**
   * Handle a WebSocket connection close
   * @param ws WebSocket connection
   */
  private handleClose(ws: WebSocket): void {
    // Get plugin info before removing
    const pluginInfo = this.connections.get(ws);
    
    // Remove connection
    this.connections.delete(ws);
    
    // Emit disconnected event
    if (pluginInfo) {
      this.logger.info(`Plugin disconnected: ${pluginInfo.name} (${pluginInfo.id})`);
      this.emit(PluginEventType.DISCONNECTED, pluginInfo);
    }
  }
}