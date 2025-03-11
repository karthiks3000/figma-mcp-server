import { pluginBridge, CommandResponse } from './plugin-bridge.js';

/**
 * Client for interacting with the Figma plugin
 * Provides a simplified interface for common operations
 */
export class PluginClient {
  /**
   * Flag indicating if the client is ready to use
   */
  public isReady: boolean = false;

  /**
   * Create a new plugin client
   */
  constructor() {
    // Start the bridge automatically
    try {
      const started = this.start();
      this.isReady = started;
      if (started) {
        console.log('Plugin bridge started successfully');
      } else {
        console.warn('Failed to start plugin bridge');
      }
    } catch (err: unknown) {
      console.warn('Error starting plugin bridge:', err);
    }
  }

  /**
   * Check if the plugin is connected
   * @returns True if the plugin is connected
   */
  public isConnected(): boolean {
    return pluginBridge.isConnected();
  }

  /**
   * Start the plugin bridge
   * @returns True if started successfully
   */
  public start(): boolean {
    return pluginBridge.start();
  }

  /**
   * Start the plugin bridge asynchronously
   * @returns Promise resolving to true if started successfully
   */
  public async startAsync(): Promise<boolean> {
    return Promise.resolve(this.start());
  }

  /**
   * Stop the plugin bridge
   * @returns True if stopped successfully
   */
  public stop(): boolean {
    return pluginBridge.stop();
  }

  /**
   * Get the current selection
   * @returns Promise with selection info
   */
  public async getSelection(): Promise<any[]> {
    const response = await pluginBridge.sendCommand('get-selection');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get selection');
    }
    return response.result;
  }

  /**
   * Create a rectangle
   * @param params Rectangle parameters
   * @returns Promise with rectangle ID
   */
  public async createRectangle(params: {
    parentId?: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: any;
    cornerRadius?: number;
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('create-rectangle', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create rectangle');
    }
    return response.result;
  }

  /**
   * Create text
   * @param params Text parameters
   * @returns Promise with text ID
   */
  public async createText(params: {
    parentId?: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    characters: string;
    style?: any;
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('create-text', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create text');
    }
    return response.result;
  }

  /**
   * Create a frame
   * @param params Frame parameters
   * @returns Promise with frame ID
   */
  public async createFrame(params: {
    parentId?: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('create-frame', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create frame');
    }
    return response.result;
  }

  /**
   * Create a component
   * @param params Component parameters
   * @returns Promise with component info
   */
  public async createComponent(params: {
    parentId?: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    childrenData?: any[];
  }): Promise<{ id: string; key: string }> {
    const response = await pluginBridge.sendCommand('create-component', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create component');
    }
    return response.result;
  }

  /**
   * Create an instance of a component
   * @param params Instance parameters
   * @returns Promise with instance ID
   */
  public async createInstance(params: {
    parentId?: string;
    componentKey: string;
    name?: string;
    x: number;
    y: number;
    scaleX?: number;
    scaleY?: number;
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('create-instance', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create instance');
    }
    return response.result;
  }

  /**
   * Set fill for a node
   * @param params Fill parameters
   * @returns Promise with node ID
   */
  public async setFill(params: {
    nodeId: string;
    fill: any;
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('set-fill', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set fill');
    }
    return response.result;
  }

  /**
   * Set stroke for a node
   * @param params Stroke parameters
   * @returns Promise with node ID
   */
  public async setStroke(params: {
    nodeId: string;
    stroke: any;
    strokeWeight?: number;
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('set-stroke', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set stroke');
    }
    return response.result;
  }

  /**
   * Set effects for a node
   * @param params Effects parameters
   * @returns Promise with node ID
   */
  public async setEffects(params: {
    nodeId: string;
    effects: any[];
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('set-effects', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set effects');
    }
    return response.result;
  }

  /**
   * Update node properties
   * @param params Update parameters
   * @returns Promise with node ID
   */
  public async updateNode(params: {
    nodeId: string;
    properties: any;
  }): Promise<{ id: string }> {
    const response = await pluginBridge.sendCommand('update-node', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update node');
    }
    return response.result;
  }

  /**
   * Delete a node
   * @param params Delete parameters
   */
  public async deleteNode(params: {
    nodeId: string;
  }): Promise<void> {
    const response = await pluginBridge.sendCommand('delete-node', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete node');
    }
  }

  /**
   * Export a node
   * @param params Export parameters
   * @returns Promise with export data
   */
  public async exportNode(params: {
    nodeId: string;
    format?: 'PNG' | 'JPG' | 'SVG' | 'PDF';
    scale?: number;
  }): Promise<{ id: string; format: string; data: string }> {
    const response = await pluginBridge.sendCommand('export-node', params);
    if (!response.success) {
      throw new Error(response.error || 'Failed to export node');
    }
    return response.result;
  }

  /**
   * List all components in the document
   * @returns Promise with component list
   */
  public async listComponents(): Promise<any[]> {
    const response = await pluginBridge.sendCommand('list-components');
    if (!response.success) {
      throw new Error(response.error || 'Failed to list components');
    }
    return response.result;
  }

  /**
   * Create a node of any supported type
   * @param params Node parameters
   * @returns Promise with node ID
   */
  /**
   * Smart element creation based on element type
   * @param params Element creation parameters
   * @returns Promise with node info
   */
  public async smartCreateElement(params: any): Promise<{ id: string }> {
    // Map parameters to appropriate creation method based on type
    switch(params.type?.toUpperCase()) {
      case 'RECTANGLE':
        return this.createRectangle(params);
      case 'TEXT':
        return this.createText(params);
      case 'FRAME':
        return this.createFrame(params);
      case 'COMPONENT':
        return this.createComponent(params);
      default:
        // Default to rectangle if type is not recognized
        return this.createRectangle(params);
    }
  }

  /**
   * Create a component instance
   * @param params Instance parameters
   * @returns Promise with instance ID
   */
  public async createComponentInstance(params: {
    parentId?: string;
    componentKey: string;
    name?: string;
    x: number;
    y: number;
    scaleX?: number;
    scaleY?: number;
  }): Promise<{ id: string }> {
    return this.createInstance(params);
  }

  /**
   * Create a node of any supported type
   * @param params Node parameters
   * @returns Promise with node ID
   */
  public async createNode(params: {
    parentId?: string;
    type: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties?: any;
  }): Promise<{ id: string }> {
    // Map to specific command based on type
    const commandMap: { [key: string]: string } = {
      'RECTANGLE': 'create-rectangle',
      'TEXT': 'create-text',
      'FRAME': 'create-frame',
      'COMPONENT': 'create-component',
    };
    
    const command = commandMap[params.type] || 'create-rectangle';
    const response = await pluginBridge.sendCommand(command, params);
    
    if (!response.success) {
      throw new Error(response.error || `Failed to create ${params.type}`);
    }
    
    return response.result;
  }
}

// Export singleton instance
export const pluginClient = new PluginClient();
