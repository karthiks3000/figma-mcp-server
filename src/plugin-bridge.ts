import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

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
 * Command response interface
 */
export interface CommandResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Plugin info interface
 */
export interface PluginInfo {
  name: string;
  id: string;
  user?: {
    id: string;
    name: string;
  };
}

/**
 * Plugin command interface
 */
export interface PluginCommand {
  id: string;
  command: string;
  params: any;
  responseRequired?: boolean;
}

/**
 * Plugin bridge that connects to Figma plugin via WebSocket
 */
export class PluginBridge extends EventEmitter {
  private wsServer: WebSocketServer | null = null;
  private connections: Map<WebSocket, PluginInfo> = new Map();
  private pendingCommands: Map<string, (response: CommandResponse) => void> = new Map();
  public isRunning = false; // Changed to public for testing

  /**
   * Creates a new plugin bridge
   * @param port WebSocket server port
   */
  constructor(private port: number = 8766) {
    super();
  }

  /**
   * Starts the WebSocket server
   */
  public start(): boolean {
    if (this.isRunning) {
      console.log('Plugin bridge is already running');
      return false;
    }

    try {
      this.wsServer = new WebSocketServer({ port: this.port });
      
      // Set up connection handling
      this.wsServer.on('connection', this.handleConnection.bind(this));
      
      // Set up error handling
      this.wsServer.on('error', (error: Error) => {
        console.error('WebSocket server error:', error);
        this.emit(PluginEventType.ERROR, error);
      });
      
      console.log(`WebSocket server for Figma plugin running on port ${this.port}`);
      this.isRunning = true;
      return true;
    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
      this.emit(PluginEventType.ERROR, error);
      return false;
    }
  }

  /**
   * Stops the WebSocket server
   */
  public stop(): boolean {
    if (!this.isRunning || !this.wsServer) {
      console.log('Plugin bridge is not running');
      return false;
    }

    try {
      this.wsServer.close();
      this.connections.clear();
      this.pendingCommands.clear();
      this.isRunning = false;
      console.log('WebSocket server stopped');
      return true;
    } catch (error) {
      console.error('Failed to stop WebSocket server:', error);
      this.emit(PluginEventType.ERROR, error);
      return false;
    }
  }

  /**
   * Checks if the plugin is connected
   */
  public isConnected(): boolean {
    return this.connections.size > 0;
  }

  /**
   * Returns the number of connected plugins
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Gets connected plugin info
   */
  public getConnectedPlugins(): PluginInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Sends a command to the plugin
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
        ws.send(JSON.stringify({
          type: 'command',
          ...pluginCommand
        }));
      } catch (error) {
        this.pendingCommands.delete(id);
        reject(error);
      }
      
      // Set timeout for command
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          reject(new Error(`Command timed out: ${command}`));
        }
      }, 60000); // 60 second timeout for better reliability
    });
  }

  /**
   * Handles a new WebSocket connection
   * @param ws WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log('New plugin connection');
    
    // Set up message handler
    ws.on('message', (data: WebSocket.Data) => this.handleMessage(ws, data));
    
    // Set up close handler
    ws.on('close', () => this.handleClose(ws));
    
    // Set up error handler
    ws.on('error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.emit(PluginEventType.ERROR, error);
    });
  }

  /**
   * Handles a WebSocket message
   * @param ws WebSocket connection
   * @param data Message data
   */
  private handleMessage(ws: WebSocket, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'plugin-info':
          // Store plugin info
          this.connections.set(ws, message.data);
          
          // Emit connected event
          this.emit(PluginEventType.CONNECTED, message.data);
          console.log(`Plugin connected: ${message.data.name} (${message.data.id})`);
          break;
        
        case 'response':
          // Handle command response
          const response = message.data as CommandResponse;
          
          // Find and call response handler
          if (this.pendingCommands.has(response.id)) {
            const handler = this.pendingCommands.get(response.id);
            this.pendingCommands.delete(response.id);
            
            if (handler) {
              handler(response);
            }
            
            // Emit response event
            this.emit(PluginEventType.COMMAND_RESPONSE, response);
          }
          break;
        
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handles a WebSocket connection close
   * @param ws WebSocket connection
   */
  private handleClose(ws: WebSocket): void {
    // Get plugin info before removing
    const pluginInfo = this.connections.get(ws);
    
    // Remove connection
    this.connections.delete(ws);
    
    // Emit disconnected event
    if (pluginInfo) {
      console.log(`Plugin disconnected: ${pluginInfo.name} (${pluginInfo.id})`);
      this.emit(PluginEventType.DISCONNECTED, pluginInfo);
    }
  }
}

// Export singleton instance
export const pluginBridge = new PluginBridge();
