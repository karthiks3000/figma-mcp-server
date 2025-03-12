/**
 * Mode Manager for the Figma MCP server
 * Handles switching between readonly and write modes
 */
import { EventEmitter } from 'events';
import { FigmaServerMode } from './core/types.js';
import { ConfigManager } from './core/config.js';
import { Logger, createLogger } from './core/logger.js';

/**
 * Mode change event
 */
export interface ModeChangeEvent {
  previousMode: FigmaServerMode;
  newMode: FigmaServerMode;
  timestamp: Date;
}

/**
 * Mode Manager events
 */
export enum ModeManagerEvent {
  MODE_CHANGED = 'mode-changed',
  MODE_CHANGE_FAILED = 'mode-change-failed'
}

/**
 * Mode Manager class
 * Handles switching between readonly and write modes
 */
export class ModeManager extends EventEmitter {
  private currentMode: FigmaServerMode;
  private logger: Logger;
  private configManager: ConfigManager;
  private writeModeBridge: any | null = null; // Will be set when write mode is initialized
  private readonlyModeClient: any | null = null; // Will be set when readonly mode is initialized
  
  /**
   * Create a new Mode Manager
   * @param configManager Configuration manager
   */
  constructor(configManager: ConfigManager) {
    super();
    this.configManager = configManager;
    this.currentMode = configManager.getDefaultMode();
    this.logger = createLogger('ModeManager', configManager);
    
    this.logger.info(`Initialized in ${this.currentMode} mode`);
  }
  
  /**
   * Get the current mode
   * @returns Current mode
   */
  public getCurrentMode(): FigmaServerMode {
    return this.currentMode;
  }
  
  /**
   * Check if the server is in readonly mode
   * @returns True if in readonly mode
   */
  public isReadonlyMode(): boolean {
    return this.currentMode === FigmaServerMode.READONLY;
  }
  
  /**
   * Check if the server is in write mode
   * @returns True if in write mode
   */
  public isWriteMode(): boolean {
    return this.currentMode === FigmaServerMode.WRITE;
  }
  
  /**
   * Switch to the specified mode
   * @param mode Mode to switch to
   * @returns Promise that resolves to true if the mode was switched successfully
   */
  public async switchToMode(mode: FigmaServerMode): Promise<boolean> {
    // If already in the requested mode, return true
    if (this.currentMode === mode) {
      this.logger.debug(`Already in ${mode} mode`);
      return true;
    }
    
    this.logger.info(`Switching from ${this.currentMode} mode to ${mode} mode`);
    
    try {
      // Handle mode switching
      if (mode === FigmaServerMode.READONLY) {
        await this.switchToReadonlyMode();
      } else if (mode === FigmaServerMode.WRITE) {
        await this.switchToWriteMode();
      } else {
        throw new Error(`Unknown mode: ${mode}`);
      }
      
      // Update current mode
      const previousMode = this.currentMode;
      this.currentMode = mode;
      
      // Emit mode changed event
      const event: ModeChangeEvent = {
        previousMode,
        newMode: mode,
        timestamp: new Date()
      };
      this.emit(ModeManagerEvent.MODE_CHANGED, event);
      
      this.logger.info(`Successfully switched to ${mode} mode`);
      return true;
    } catch (error) {
      // Log error
      this.logger.error(`Failed to switch to ${mode} mode`, error);
      
      // Emit mode change failed event
      this.emit(ModeManagerEvent.MODE_CHANGE_FAILED, {
        requestedMode: mode,
        currentMode: this.currentMode,
        error
      });
      
      return false;
    }
  }
  
  /**
   * Switch to readonly mode
   */
  private async switchToReadonlyMode(): Promise<void> {
    // If write mode is active, shut it down
    if (this.writeModeBridge) {
      this.logger.debug('Shutting down write mode bridge');
      
      try {
        // Shut down the write mode bridge
        // This will be implemented when we create the plugin bridge
        if (typeof this.writeModeBridge.stop === 'function') {
          await this.writeModeBridge.stop();
        }
      } catch (error) {
        this.logger.warn('Error shutting down write mode bridge', error);
      }
      
      this.writeModeBridge = null;
    }
    
    // Initialize readonly mode if not already initialized
    if (!this.readonlyModeClient) {
      this.logger.debug('Initializing readonly mode client');
      
      // This will be implemented when we create the readonly mode client
      // For now, we'll just set a placeholder
      this.readonlyModeClient = {};
    }
  }
  
  /**
   * Switch to write mode
   */
  private async switchToWriteMode(): Promise<void> {
    // Initialize write mode bridge if not already initialized
    if (!this.writeModeBridge) {
      this.logger.debug('Initializing write mode bridge');
      throw new Error('Write mode bridge not initialized');
    }
    
    // Start the write mode bridge
    this.logger.debug('Starting write mode bridge');
    if (typeof this.writeModeBridge.start === 'function') {
      const success = await this.writeModeBridge.start();
      if (!success) {
        throw new Error('Failed to start write mode bridge');
      }
      this.logger.info('Write mode bridge started successfully');
    } else {
      throw new Error('Write mode bridge does not have a start method');
    }
  }
  
  /**
   * Set the write mode bridge
   * @param bridge Write mode bridge
   */
  public setWriteModeBridge(bridge: any): void {
    this.writeModeBridge = bridge;
  }
  
  /**
   * Set the readonly mode client
   * @param client Readonly mode client
   */
  public setReadonlyModeClient(client: any): void {
    this.readonlyModeClient = client;
  }
  
  /**
   * Get the write mode bridge
   * @returns Write mode bridge
   * @throws Error if not in write mode
   */
  public getWriteModeBridge(): any {
    if (!this.isWriteMode()) {
      throw new Error('Not in write mode');
    }
    
    if (!this.writeModeBridge) {
      throw new Error('Write mode bridge not initialized');
    }
    
    return this.writeModeBridge;
  }
  
  /**
   * Get the readonly mode client
   * @returns Readonly mode client
   * @throws Error if not in readonly mode
   */
  public getReadonlyModeClient(): any {
    if (!this.isReadonlyMode()) {
      throw new Error('Not in readonly mode');
    }
    
    if (!this.readonlyModeClient) {
      throw new Error('Readonly mode client not initialized');
    }
    
    return this.readonlyModeClient;
  }
}