/**
 * Design Creator class for creating and modifying Figma designs
 * 
 * This version uses the Plugin API via a WebSocket bridge instead of REST API
 */
import { pluginClient } from './plugin-client.js';
import { ComponentUtilizer } from './component-utilizer.js';
import { FigmaApiClient } from './api-client.js';

import { FigmaFill, FigmaEffect, FigmaStroke } from './types.js';

export class DesignCreator {
  private apiClient: FigmaApiClient;
  private componentUtilizer: ComponentUtilizer;
  private figmaUrl: string;
  
  constructor(fileId: string, accessToken: string) {
    this.apiClient = new FigmaApiClient(fileId, accessToken);
    this.componentUtilizer = new ComponentUtilizer(this.apiClient);
    this.figmaUrl = `https://www.figma.com/file/${fileId}`;
    
    // Initialize plugin client if needed
    if (!pluginClient.isReady) {
      try {
        const started = pluginClient.start();
        if (!started) {
          console.warn('Failed to start plugin client');
          console.warn('Using REST API fallback where possible');
        }
      } catch (err: unknown) {
        console.warn('Error starting plugin client:', err);
        console.warn('Using REST API fallback where possible');
      }
    }
  }
  
  /**
   * Check if plugin client is ready to use
   * @returns True if plugin is connected and ready
   */
  isPluginReady(): boolean {
    return pluginClient.isConnected();
  }

  /**
   * Create a new frame in the Figma file
   * @param parentId - ID of the parent node
   * @param name - Name of the frame
   * @param x - X position
   * @param y - Y position
   * @param width - Frame width
   * @param height - Frame height
   * @returns ID of the created frame
   */
  async createFrame(
    parentId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<string> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        const result = await pluginClient.createFrame({
          parentId,
          name,
          x,
          y,
          width,
          height
        });
        return result.id;
      } else {
        // Fallback to REST API
        return await this.apiClient.createNode(parentId, {
          type: 'FRAME',
          name,
          x,
          y,
          width,
          height
        });
      }
    } catch (error) {
      console.error('Error creating frame:', error);
      throw error;
    }
  }
  
  /**
   * Create a rectangle
   * @param parentId - ID of the parent node
   * @param name - Name of the rectangle
   * @param x - X position
   * @param y - Y position
   * @param width - Rectangle width
   * @param height - Rectangle height
   * @param fill - Optional fill properties
   * @param cornerRadius - Optional corner radius
   * @returns ID of the created rectangle
   */
  async createRectangle(
    parentId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: FigmaFill,
    cornerRadius?: number
  ): Promise<string> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        const result = await pluginClient.createRectangle({
          parentId,
          name,
          x,
          y,
          width,
          height,
          fill,
          cornerRadius
        });
        return result.id;
      } else {
        // Fallback to REST API
        const properties: any = {
          type: 'RECTANGLE',
          name,
          x,
          y,
          width,
          height
        };
        
        if (fill) {
          properties.fills = [fill];
        }
        
        if (cornerRadius !== undefined) {
          properties.cornerRadius = cornerRadius;
        }
        
        return await this.apiClient.createNode(parentId, properties);
      }
    } catch (error) {
      console.error('Error creating rectangle:', error);
      throw error;
    }
  }
  
  /**
   * Create an ellipse
   * @param parentId - ID of the parent node
   * @param name - Name of the ellipse
   * @param x - X position
   * @param y - Y position
   * @param width - Ellipse width
   * @param height - Ellipse height
   * @param fill - Optional fill properties
   * @returns ID of the created ellipse
   */
  async createEllipse(
    parentId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: FigmaFill
  ): Promise<string> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API - using createNode since there's no direct ellipse method
        const result = await pluginClient.createNode({
          parentId,
          type: 'ELLIPSE',
          name,
          x,
          y,
          width,
          height,
          properties: { fill }
        });
        return result.id;
      } else {
        // Fallback to REST API
        const properties: any = {
          type: 'ELLIPSE',
          name,
          x,
          y,
          width,
          height
        };
        
        if (fill) {
          properties.fills = [fill];
        }
        
        return await this.apiClient.createNode(parentId, properties);
      }
    } catch (error) {
      console.error('Error creating ellipse:', error);
      throw error;
    }
  }
  
  /**
   * Create a polygon
   * @param parentId - ID of the parent node
   * @param name - Name of the polygon
   * @param x - X position
   * @param y - Y position
   * @param width - Polygon width
   * @param height - Polygon height
   * @param points - Number of points
   * @param fill - Optional fill properties
   * @returns ID of the created polygon
   */
  async createPolygon(
    parentId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    points: number,
    fill?: FigmaFill
  ): Promise<string> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API - using createNode since there's no direct polygon method
        const result = await pluginClient.createNode({
          parentId,
          type: 'POLYGON',
          name,
          x,
          y,
          width,
          height,
          properties: { 
            fill,
            points
          }
        });
        return result.id;
      } else {
        // Fallback to REST API
        const properties: any = {
          type: 'POLYGON',
          name,
          x,
          y,
          width,
          height,
          pointCount: points
        };
        
        if (fill) {
          properties.fills = [fill];
        }
        
        return await this.apiClient.createNode(parentId, properties);
      }
    } catch (error) {
      console.error('Error creating polygon:', error);
      throw error;
    }
  }
  
  /**
   * Create a text element
   * @param parentId - ID of the parent node
   * @param name - Name of the text element
   * @param x - X position
   * @param y - Y position
   * @param width - Text width
   * @param height - Text height
   * @param characters - Text content
   * @param style - Text style properties
   * @returns ID of the created text element
   */
  async createText(
    parentId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    characters: string,
    style?: any
  ): Promise<string> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        const result = await pluginClient.createText({
          parentId,
          name,
          x,
          y,
          width,
          height,
          characters,
          style
        });
        return result.id;
      } else {
        // Fallback to REST API
        const properties: any = {
          type: 'TEXT',
          name,
          x,
          y,
          width,
          height,
          characters
        };
        
        if (style) {
          // Add text style properties
          properties.style = style;
        }
        
        return await this.apiClient.createNode(parentId, properties);
      }
    } catch (error) {
      console.error('Error creating text:', error);
      throw error;
    }
  }
  
  /**
   * Create a component
   * @param parentId - ID of the parent node
   * @param name - Name of the component
   * @param x - X position
   * @param y - Y position
   * @param width - Component width
   * @param height - Component height
   * @param childrenData - Optional data for child nodes
   * @returns ID of the created component
   */
  async createComponent(
    parentId: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    childrenData?: any[]
  ): Promise<string> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        const result = await pluginClient.createComponent({
          parentId,
          name,
          x,
          y,
          width,
          height,
          childrenData
        });
        return result.id;
      } else {
        // Fallback to REST API
        const properties: any = {
          type: 'COMPONENT',
          name,
          x,
          y,
          width,
          height
        };
        
        // Create the component
        const componentId = await this.apiClient.createNode(parentId, properties);
        
        // If child data is provided, add children
        if (childrenData && Array.isArray(childrenData) && childrenData.length > 0) {
          for (const childData of childrenData) {
            await this.apiClient.createNode(componentId, childData);
          }
        }
        
        return componentId;
      }
    } catch (error) {
      console.error('Error creating component:', error);
      throw error;
    }
  }
  
  /**
   * Create a component instance
   * @param parentId - ID of the parent node
   * @param componentKey - Component key to instantiate
   * @param name - Name of the instance
   * @param x - X position
   * @param y - Y position
   * @param scaleX - Optional X scale factor
   * @param scaleY - Optional Y scale factor
   * @returns ID of the created component instance
   */
  async createComponentInstance(
    parentId: string,
    componentKey: string,
    name: string,
    x: number,
    y: number,
    scaleX?: number,
    scaleY?: number
  ): Promise<string> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        const result = await pluginClient.createInstance({
          parentId,
          componentKey,
          name,
          x,
          y,
          scaleX,
          scaleY
        });
        return result.id;
      } else {
        // Fallback to REST API
        const properties: any = {
          type: 'INSTANCE',
          name,
          x,
          y,
          componentKey
        };
        
        // Apply scaling if specified
        if (scaleX !== undefined || scaleY !== undefined) {
          properties.transform = {
            scaleX: scaleX ?? 1.0,
            scaleY: scaleY ?? 1.0
          };
        }
        
        return await this.apiClient.createNode(parentId, properties);
      }
    } catch (error) {
      console.error('Error creating component instance:', error);
      throw error;
    }
  }
  
  /**
   * Update node properties
   * @param nodeId - ID of the node to update
   * @param properties - Properties to update
   * @returns Success flag
   */
  async updateNode(nodeId: string, properties: any): Promise<boolean> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.updateNode({
          nodeId,
          properties
        });
      } else {
        // Fallback to REST API
        await this.apiClient.updateNode(nodeId, properties);
      }
      return true;
    } catch (error) {
      console.error('Error updating node:', error);
      throw error;
    }
  }
  
  /**
   * Move a node to a new position
   * @param nodeId - ID of the node to move
   * @param x - New X position
   * @param y - New Y position
   * @returns Success flag
   */
  async moveNode(nodeId: string, x: number, y: number): Promise<boolean> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.updateNode({
          nodeId,
          properties: { x, y }
        });
      } else {
        // Fallback to REST API
        await this.apiClient.updateNode(nodeId, { x, y });
      }
      return true;
    } catch (error) {
      console.error('Error moving node:', error);
      throw error;
    }
  }
  
  /**
   * Resize a node
   * @param nodeId - ID of the node to resize
   * @param width - New width
   * @param height - New height
   * @returns Success flag
   */
  async resizeNode(nodeId: string, width: number, height: number): Promise<boolean> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.updateNode({
          nodeId,
          properties: { width, height }
        });
      } else {
        // Fallback to REST API
        await this.apiClient.updateNode(nodeId, { width, height });
      }
      return true;
    } catch (error) {
      console.error('Error resizing node:', error);
      throw error;
    }
  }
  
  /**
   * Delete a node
   * @param nodeId - ID of the node to delete
   * @returns Success flag
   */
  async deleteNode(nodeId: string): Promise<boolean> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.deleteNode({ nodeId });
        return true;
      } else {
        // Fallback to REST API
        await this.apiClient.deleteNode(nodeId);
        return true;
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      throw error;
    }
  }
  
  /**
   * Set a solid fill on a node
   * @param nodeId - ID of the node
   * @param color - Color object with r, g, b, a values (0-1 range)
   * @param opacity - Optional opacity (0-1 range)
   * @returns Success flag
   */
  async setSolidFill(
    nodeId: string,
    color: { r: number; g: number; b: number; a: number },
    opacity?: number
  ): Promise<boolean> {
    try {
      const fill: FigmaFill = {
        type: 'SOLID',
        color,
        opacity: opacity !== undefined ? opacity : 1.0
      };
      
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.setFill({
          nodeId,
          fill
        });
      } else {
        // Fallback to REST API
        await this.apiClient.updateNode(nodeId, {
          fills: [fill]
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error setting solid fill:', error);
      throw error;
    }
  }
  
  /**
   * Set fill(s) on a node
   * @param nodeId - ID of the node
   * @param fills - Array of fills to apply
   * @returns Success flag
   */
  async setFill(nodeId: string, fills: FigmaFill[]): Promise<boolean> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.setFill({
          nodeId,
          fill: fills
        });
      } else {
        // Fallback to REST API
        await this.apiClient.updateNode(nodeId, { fills });
      }
      return true;
    } catch (error) {
      console.error('Error setting fill:', error);
      throw error;
    }
  }
  
  /**
   * Set stroke(s) on a node
   * @param nodeId - ID of the node
   * @param strokes - Array of strokes to apply
   * @param strokeWeight - Optional stroke weight (thickness)
   * @returns Success flag
   */
  async setStroke(
    nodeId: string,
    strokes: FigmaStroke[],
    strokeWeight?: number
  ): Promise<boolean> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.setStroke({
          nodeId,
          stroke: strokes,
          strokeWeight
        });
      } else {
        // Fallback to REST API
        const properties: any = { strokes };
        
        if (strokeWeight !== undefined) {
          properties.strokeWeight = strokeWeight;
        }
        
        await this.apiClient.updateNode(nodeId, properties);
      }
      return true;
    } catch (error) {
      console.error('Error setting stroke:', error);
      throw error;
    }
  }
  
  /**
   * Set effects (shadows, blurs, etc.) on a node
   * @param nodeId - ID of the node
   * @param effects - Array of effects to apply
   * @returns Success flag
   */
  async setEffects(nodeId: string, effects: FigmaEffect[]): Promise<boolean> {
    try {
      if (this.isPluginReady()) {
        // Use plugin API if available
        await pluginClient.setEffects({
          nodeId,
          effects
        });
      } else {
        // Fallback to REST API
        await this.apiClient.updateNode(nodeId, { effects });
      }
      return true;
    } catch (error) {
      console.error('Error setting effects:', error);
      throw error;
    }
  }
  
  /**
   * Smart element creation - uses existing components if available
   * @param parentId - ID of the parent node
   * @param type - Type of element to create
   * @param name - Name of the element
   * @param x - X position
   * @param y - Y position
   * @param width - Element width
   * @param height - Element height
   * @param properties - Additional properties for the element
   * @returns ID of the created element
   */
  async smartCreateElement(
    parentId: string,
    type: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    properties?: any
  ): Promise<string> {
    // Check if there are suitable components available
    const components = await this.componentUtilizer.findMatchingComponents(type, properties);
    
    if (components && components.length > 0) {
      // Use the best matching component
      const bestMatch = components[0];
      
      // Create an instance of the component
      return await this.createComponentInstance(
        parentId,
        bestMatch.key,
        name,
        x,
        y,
        undefined,  // Use default scale
        undefined
      );
    }
    
    // No suitable component found, create a basic element
    let nodeId: string;
    
    switch (type.toLowerCase()) {
      case 'rectangle':
        nodeId = await this.createRectangle(
          parentId,
          name,
          x,
          y,
          width,
          height,
          properties?.fill,
          properties?.cornerRadius
        );
        break;
      
      case 'ellipse':
        nodeId = await this.createEllipse(
          parentId,
          name,
          x,
          y,
          width,
          height,
          properties?.fill
        );
        break;
      
      case 'text':
        nodeId = await this.createText(
          parentId,
          name,
          x,
          y,
          width,
          height,
          properties?.characters || 'Text',
          properties?.style
        );
        break;
      
      default:
        // Default to rectangle
        nodeId = await this.createRectangle(
          parentId,
          name,
          x,
          y,
          width,
          height
        );
    }
    
    // Apply additional properties if provided
    if (properties && Object.keys(properties).length > 0) {
      // Filter out properties we've already handled
      const { fill, cornerRadius, characters, style, ...otherProps } = properties;
      
      // Apply the remaining properties
      if (Object.keys(otherProps).length > 0) {
        await this.updateNode(nodeId, otherProps);
      }
    }
    
    return nodeId;
  }
}
