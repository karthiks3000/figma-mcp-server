/**
 * Configuration management for the Figma MCP server
 */
import { FigmaServerMode } from './types.js';

/**
 * Configuration interface for the Figma MCP server
 */
export interface FigmaServerConfig {
  /**
   * Figma API access token
   */
  accessToken: string;
  
  /**
   * WebSocket server port for plugin communication
   */
  pluginPort: number;
  
  /**
   * Default server mode
   */
  defaultMode: FigmaServerMode;
  
  /**
   * Enable debug logging
   */
  debug: boolean;
}

/**
 * Configuration manager for the Figma MCP server
 */
export class ConfigManager {
  private config: FigmaServerConfig;
  
  /**
   * Create a new configuration manager
   * @param initialConfig Initial configuration (optional)
   */
  constructor(initialConfig?: Partial<FigmaServerConfig>) {
    // Set default configuration
    this.config = {
      accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
      pluginPort: parseInt(process.env.FIGMA_PLUGIN_PORT || '8766', 10),
      defaultMode: FigmaServerMode.READONLY,
      debug: process.env.DEBUG === 'true',
      ...initialConfig
    };
    
    // Validate configuration
    this.validate();
  }
  
  /**
   * Validate the configuration
   * @throws Error if configuration is invalid
   */
  protected validate(): void {
    if (!this.config.accessToken) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
    }
    
    if (isNaN(this.config.pluginPort) || this.config.pluginPort < 1024 || this.config.pluginPort > 65535) {
      throw new Error('Plugin port must be a valid port number (1024-65535)');
    }
  }
  
  /**
   * Get the current configuration
   * @returns The current configuration
   */
  public getConfig(): FigmaServerConfig {
    return { ...this.config };
  }
  
  /**
   * Get a specific configuration value
   * @param key Configuration key
   * @returns Configuration value
   */
  public get<K extends keyof FigmaServerConfig>(key: K): FigmaServerConfig[K] {
    return this.config[key];
  }
  
  /**
   * Update the configuration
   * @param updates Configuration updates
   */
  public update(updates: Partial<FigmaServerConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
    
    // Validate the updated configuration
    this.validate();
  }
  
  /**
   * Get the access token
   * @returns Figma API access token
   */
  public getAccessToken(): string {
    return this.config.accessToken;
  }
  
  /**
   * Get the plugin port
   * @returns WebSocket server port for plugin communication
   */
  public getPluginPort(): number {
    return this.config.pluginPort;
  }
  
  /**
   * Get the default server mode
   * @returns Default server mode
   */
  public getDefaultMode(): FigmaServerMode {
    return this.config.defaultMode;
  }
  
  /**
   * Check if debug logging is enabled
   * @returns True if debug logging is enabled
   */
  public isDebugEnabled(): boolean {
    return this.config.debug;
  }
}