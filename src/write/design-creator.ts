/**
 * Design Creator for write mode
 * Creates and modifies designs using the Figma plugin
 */
import { 
  FigmaFill, 
  FigmaTextStyle,
  CreateFrameArgs,
  CreateShapeArgs,
  CreateTextArgs,
  CreateComponentArgs,
  CreateComponentInstanceArgs,
  UpdateNodeArgs,
  SetFillArgs,
  SetStrokeArgs,
  SetEffectsArgs,
  SmartCreateElementArgs,
  DeleteNodeArgs
} from '../core/types.js';
import { PluginBridge } from './plugin-bridge.js';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';

/**
 * Design Creator for write mode
 */
export class DesignCreator {
  private pluginBridge: PluginBridge;
  private logger: Logger;
  
  /**
   * Create a new Design Creator
   * @param pluginBridge Plugin bridge
   * @param configManager Configuration manager
   */
  constructor(pluginBridge: PluginBridge, configManager: ConfigManager) {
    this.pluginBridge = pluginBridge;
    this.logger = createLogger('DesignCreator', configManager);
    
    this.logger.debug('Design Creator initialized');
  }
  
  /**
   * Create a frame
   * @param args Frame creation arguments
   * @returns Promise that resolves with the frame ID
   */
  async createFrame(args: CreateFrameArgs): Promise<string> {
    try {
      this.logger.debug(`Creating frame: ${args.name}`);
      
      const response = await this.pluginBridge.sendCommand('create-frame', {
        parentId: args.parentNodeId,
        name: args.name,
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create frame');
      }
      
      const frameId = response.result.id;
      this.logger.debug(`Created frame: ${args.name} (${frameId})`);
      
      return frameId;
    } catch (error) {
      this.logger.error(`Error creating frame: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create a rectangle
   * @param args Rectangle creation arguments
   * @returns Promise that resolves with the rectangle ID
   */
  async createRectangle(
    parentNodeId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: FigmaFill,
    cornerRadius?: number
  ): Promise<string> {
    try {
      this.logger.debug(`Creating rectangle: ${name}`);
      
      const response = await this.pluginBridge.sendCommand('create-rectangle', {
        parentId: parentNodeId,
        name,
        x,
        y,
        width,
        height,
        fill,
        cornerRadius
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create rectangle');
      }
      
      const rectId = response.result.id;
      this.logger.debug(`Created rectangle: ${name} (${rectId})`);
      
      return rectId;
    } catch (error) {
      this.logger.error(`Error creating rectangle: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Create an ellipse
   * @param parentNodeId Parent node ID
   * @param name Ellipse name
   * @param x X position
   * @param y Y position
   * @param width Width
   * @param height Height
   * @param fill Fill
   * @returns Promise that resolves with the ellipse ID
   */
  async createEllipse(
    parentNodeId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: FigmaFill
  ): Promise<string> {
    try {
      this.logger.debug(`Creating ellipse: ${name}`);
      
      const response = await this.pluginBridge.sendCommand('create-ellipse', {
        parentId: parentNodeId,
        name,
        x,
        y,
        width,
        height,
        fill
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create ellipse');
      }
      
      const ellipseId = response.result.id;
      this.logger.debug(`Created ellipse: ${name} (${ellipseId})`);
      
      return ellipseId;
    } catch (error) {
      this.logger.error(`Error creating ellipse: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Create a polygon
   * @param parentNodeId Parent node ID
   * @param name Polygon name
   * @param x X position
   * @param y Y position
   * @param width Width
   * @param height Height
   * @param points Number of points
   * @param fill Fill
   * @returns Promise that resolves with the polygon ID
   */
  async createPolygon(
    parentNodeId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    points: number,
    fill?: FigmaFill
  ): Promise<string> {
    try {
      this.logger.debug(`Creating polygon: ${name}`);
      
      const response = await this.pluginBridge.sendCommand('create-polygon', {
        parentId: parentNodeId,
        name,
        x,
        y,
        width,
        height,
        points,
        fill
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create polygon');
      }
      
      const polygonId = response.result.id;
      this.logger.debug(`Created polygon: ${name} (${polygonId})`);
      
      return polygonId;
    } catch (error) {
      this.logger.error(`Error creating polygon: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Create a shape based on type
   * @param args Shape creation arguments
   * @returns Promise that resolves with the shape ID
   */
  async createShape(args: CreateShapeArgs): Promise<string> {
    try {
      this.logger.debug(`Creating shape: ${args.name} (${args.type})`);
      
      switch (args.type) {
        case 'rectangle':
          return await this.createRectangle(
            args.parentNodeId,
            args.name,
            args.x,
            args.y,
            args.width,
            args.height,
            Array.isArray(args.fill) ? args.fill[0] : args.fill,
            args.cornerRadius
          );
        case 'ellipse':
          return await this.createEllipse(
            args.parentNodeId,
            args.name,
            args.x,
            args.y,
            args.width,
            args.height,
            Array.isArray(args.fill) ? args.fill[0] : args.fill
          );
        case 'polygon':
          if (typeof args.points !== 'number') {
            throw new Error('points parameter is required for polygons');
          }
          return await this.createPolygon(
            args.parentNodeId,
            args.name,
            args.x,
            args.y,
            args.width,
            args.height,
            args.points,
            Array.isArray(args.fill) ? args.fill[0] : args.fill
          );
        default:
          throw new Error(`Unsupported shape type: ${args.type}`);
      }
    } catch (error) {
      this.logger.error(`Error creating shape: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create a text element
   * @param args Text creation arguments
   * @returns Promise that resolves with the text ID
   */
  async createText(args: CreateTextArgs): Promise<string> {
    try {
      this.logger.debug(`Creating text: ${args.name}`);
      
      const response = await this.pluginBridge.sendCommand('create-text', {
        parentId: args.parentNodeId,
        name: args.name,
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
        characters: args.characters,
        style: args.style
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create text');
      }
      
      const textId = response.result.id;
      this.logger.debug(`Created text: ${args.name} (${textId})`);
      
      return textId;
    } catch (error) {
      this.logger.error(`Error creating text: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create a component
   * @param args Component creation arguments
   * @returns Promise that resolves with the component ID and key
   */
  async createComponent(args: CreateComponentArgs): Promise<{ id: string; key: string }> {
    try {
      this.logger.debug(`Creating component: ${args.name}`);
      
      const response = await this.pluginBridge.sendCommand('create-component', {
        parentId: args.parentNodeId,
        name: args.name,
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
        childrenData: args.childrenData
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create component');
      }
      
      const result = {
        id: response.result.id,
        key: response.result.key
      };
      
      this.logger.debug(`Created component: ${args.name} (${result.id}, ${result.key})`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error creating component: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create a component instance
   * @param args Component instance creation arguments
   * @returns Promise that resolves with the instance ID
   */
  async createComponentInstance(args: CreateComponentInstanceArgs): Promise<string> {
    try {
      this.logger.debug(`Creating component instance: ${args.name}`);
      
      const response = await this.pluginBridge.sendCommand('create-instance', {
        parentId: args.parentNodeId,
        componentKey: args.componentKey,
        name: args.name,
        x: args.x,
        y: args.y,
        scaleX: args.scaleX,
        scaleY: args.scaleY
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create component instance');
      }
      
      const instanceId = response.result.id;
      this.logger.debug(`Created component instance: ${args.name} (${instanceId})`);
      
      return instanceId;
    } catch (error) {
      this.logger.error(`Error creating component instance: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Update a node
   * @param args Node update arguments
   * @returns Promise that resolves to true if the update was successful
   */
  async updateNode(args: UpdateNodeArgs): Promise<boolean> {
    try {
      this.logger.debug(`Updating node: ${args.nodeId}`);
      
      const response = await this.pluginBridge.sendCommand('update-node', {
        nodeId: args.nodeId,
        properties: args.properties
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update node');
      }
      
      this.logger.debug(`Updated node: ${args.nodeId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error updating node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Delete a node
   * @param args Node deletion arguments
   * @returns Promise that resolves to true if the deletion was successful
   */
  async deleteNode(args: DeleteNodeArgs): Promise<boolean> {
    try {
      this.logger.debug(`Deleting node: ${args.nodeId}`);
      
      const response = await this.pluginBridge.sendCommand('delete-node', {
        nodeId: args.nodeId
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete node');
      }
      
      this.logger.debug(`Deleted node: ${args.nodeId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Set fill for a node
   * @param args Fill arguments
   * @returns Promise that resolves to true if the fill was set successfully
   */
  async setFill(args: SetFillArgs): Promise<boolean> {
    try {
      this.logger.debug(`Setting fill for node: ${args.nodeId}`);
      
      const response = await this.pluginBridge.sendCommand('set-fill', {
        nodeId: args.nodeId,
        fill: args.fill
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set fill');
      }
      
      this.logger.debug(`Set fill for node: ${args.nodeId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error setting fill for node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Set stroke for a node
   * @param args Stroke arguments
   * @returns Promise that resolves to true if the stroke was set successfully
   */
  async setStroke(args: SetStrokeArgs): Promise<boolean> {
    try {
      this.logger.debug(`Setting stroke for node: ${args.nodeId}`);
      
      const response = await this.pluginBridge.sendCommand('set-stroke', {
        nodeId: args.nodeId,
        stroke: args.stroke,
        strokeWeight: args.strokeWeight
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set stroke');
      }
      
      this.logger.debug(`Set stroke for node: ${args.nodeId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error setting stroke for node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Set effects for a node
   * @param args Effects arguments
   * @returns Promise that resolves to true if the effects were set successfully
   */
  async setEffects(args: SetEffectsArgs): Promise<boolean> {
    try {
      this.logger.debug(`Setting effects for node: ${args.nodeId}`);
      
      const response = await this.pluginBridge.sendCommand('set-effects', {
        nodeId: args.nodeId,
        effects: args.effects
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set effects');
      }
      
      this.logger.debug(`Set effects for node: ${args.nodeId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error setting effects for node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Smart create element
   * @param args Smart create element arguments
   * @returns Promise that resolves with the element ID
   */
  async smartCreateElement(args: SmartCreateElementArgs): Promise<string> {
    try {
      this.logger.debug(`Smart creating element: ${args.name} (${args.type})`);
      
      const response = await this.pluginBridge.sendCommand('smart-create-element', {
        parentId: args.parentNodeId,
        type: args.type,
        name: args.name,
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
        properties: args.properties
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to smart create element');
      }
      
      const elementId = response.result.id;
      this.logger.debug(`Smart created element: ${args.name} (${elementId})`);
      
      return elementId;
    } catch (error) {
      this.logger.error(`Error smart creating element: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * List available components
   * @returns Promise that resolves with the available components
   */
  async listAvailableComponents(): Promise<any[]> {
    try {
      this.logger.debug('Listing available components');
      
      const response = await this.pluginBridge.sendCommand('list-components');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to list components');
      }
      
      const components = response.result;
      this.logger.debug(`Listed ${components.length} available components`);
      
      return components;
    } catch (error) {
      this.logger.error('Error listing available components', error);
      throw error;
    }
  }
  
  /**
   * Export a node
   * @param nodeId Node ID
   * @param format Export format
   * @param scale Export scale
   * @returns Promise that resolves with the export data
   */
  async exportNode(
    nodeId: string,
    format: 'PNG' | 'JPG' | 'SVG' | 'PDF' = 'PNG',
    scale: number = 1
  ): Promise<{ id: string; format: string; data: string }> {
    try {
      this.logger.debug(`Exporting node: ${nodeId}`);
      
      const response = await this.pluginBridge.sendCommand('export-node', {
        nodeId,
        format,
        scale
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to export node');
      }
      
      this.logger.debug(`Exported node: ${nodeId}`);
      
      return response.result;
    } catch (error) {
      this.logger.error(`Error exporting node: ${nodeId}`, error);
      throw error;
    }
  }
}