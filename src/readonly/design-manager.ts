/**
 * Design Manager for readonly mode
 * Extracts design information from Figma files
 */
import { 
  FigmaFileInfo, 
  FigmaTopLevelNode, 
  FigmaNode, 
  FigmaComponent,
  FigmaStyle,
  ExtractedStyles,
  UIComponents,
  DesignInformation
} from '../core/types.js';
import { FigmaApiClient } from './api-client.js';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';
import { extractFigmaIds } from '../core/utils.js';

/**
 * Design Manager for readonly mode
 */
export class DesignManager {
  private apiClient: FigmaApiClient;
  private logger: Logger;
  
  /**
   * Create a new Design Manager
   * @param configManager Configuration manager
   */
  constructor(configManager: ConfigManager) {
    this.apiClient = new FigmaApiClient(configManager);
    this.logger = createLogger('DesignManager', configManager);
    
    this.logger.debug('Design Manager initialized');
  }
  
  /**
   * Get basic file information
   * @param figmaUrl Figma URL
   * @returns Basic file information
   */
  async getFileInfo(figmaUrl: string): Promise<FigmaFileInfo> {
    try {
      const { fileId } = extractFigmaIds(figmaUrl);
      
      this.logger.debug(`Getting file info for ${figmaUrl} (fileId: ${fileId})`);
      
      return await this.apiClient.getFileInfo(fileId);
    } catch (error) {
      this.logger.error(`Error getting file info for ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Get the top-level nodes in the file
   * @param figmaUrl Figma URL
   * @returns Array of top-level nodes
   */
  async getTopLevelNodes(figmaUrl: string): Promise<FigmaTopLevelNode[]> {
    try {
      const { fileId } = extractFigmaIds(figmaUrl);
      
      this.logger.debug(`Getting top-level nodes for ${figmaUrl} (fileId: ${fileId})`);
      
      return await this.apiClient.getTopLevelNodes(fileId);
    } catch (error) {
      this.logger.error(`Error getting top-level nodes for ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Get detailed information about a specific node
   * @param figmaUrl Figma URL
   * @param nodeId Node ID (optional if URL contains node-id)
   * @param detailLevel Level of detail to include (default: basic)
   * @param properties Optional array of property paths to include
   * @returns Node details
   */
  async getNodeDetails(
    figmaUrl: string,
    nodeId?: string,
    detailLevel: 'summary' | 'basic' | 'full' = 'basic',
    properties?: string[]
  ): Promise<any> {
    try {
      const { fileId, nodeId: urlNodeId } = extractFigmaIds(figmaUrl);
      
      // Use nodeId from URL if not provided
      const targetNodeId = nodeId || urlNodeId;
      
      if (!targetNodeId) {
        throw new Error('Node ID is required');
      }
      
      this.logger.debug(`Getting node details for ${targetNodeId} in ${figmaUrl} (fileId: ${fileId})`);
      
      // Get full node details
      const nodeDetails = await this.apiClient.getNodeDetails(fileId, targetNodeId);
      
      // Filter properties based on detail level and requested properties
      return this.filterNodeDetails(nodeDetails, detailLevel, properties);
    } catch (error) {
      this.logger.error(`Error getting node details for ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Filter node details based on detail level and requested properties
   * @param node Node details
   * @param detailLevel Level of detail to include
   * @param properties Optional array of property paths to include
   * @returns Filtered node details
   */
  private filterNodeDetails(
    node: FigmaNode,
    detailLevel: 'summary' | 'basic' | 'full',
    properties?: string[]
  ): any {
    // If specific properties are requested, extract only those
    if (properties && properties.length > 0) {
      return this.extractProperties(node, properties);
    }
    
    // Otherwise, filter based on detail level
    switch (detailLevel) {
      case 'summary':
        return this.getSummaryDetails(node);
      case 'basic':
        return this.getBasicDetails(node);
      case 'full':
        return node;
      default:
        return this.getBasicDetails(node);
    }
  }
  
  /**
   * Get summary details for a node
   * @param node Node details
   * @returns Summary details
   */
  private getSummaryDetails(node: FigmaNode): any {
    // Extract only essential properties
    const summary: any = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    
    // Add bounding box if available
    if (node.absoluteBoundingBox) {
      summary.absoluteBoundingBox = node.absoluteBoundingBox;
    }
    
    // Add child count if children exist
    if (node.children) {
      summary.childCount = node.children.length;
    }
    
    return summary;
  }
  
  /**
   * Get basic details for a node
   * @param node Node details
   * @returns Basic details
   */
  private getBasicDetails(node: FigmaNode): any {
    // Start with a copy of the node
    const basic: any = { ...node };
    
    // If children exist, replace with summary details
    if (basic.children) {
      basic.children = basic.children.map((child: FigmaNode) => this.getSummaryDetails(child));
    }
    
    return basic;
  }
  
  /**
   * Extract specific properties from a node
   * @param node Node details
   * @param properties Array of property paths to include
   * @returns Extracted properties
   */
  private extractProperties(node: any, properties: string[]): any {
    const result: any = {};
    
    for (const path of properties) {
      const value = this.getPropertyByPath(node, path);
      if (value !== undefined) {
        this.setPropertyByPath(result, path, value);
      }
    }
    
    return result;
  }
  
  /**
   * Get a property value by path
   * @param obj Object to get property from
   * @param path Property path (e.g., "children.0.name")
   * @returns Property value
   */
  private getPropertyByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Set a property value by path
   * @param obj Object to set property on
   * @param path Property path (e.g., "children.0.name")
   * @param value Property value
   */
  private setPropertyByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current)) {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  /**
   * Extract styles from a file
   * @param figmaUrl Figma URL
   * @returns Extracted styles
   */
  async extractStyles(figmaUrl: string): Promise<ExtractedStyles> {
    try {
      const { fileId } = extractFigmaIds(figmaUrl);
      
      this.logger.debug(`Extracting styles from ${figmaUrl} (fileId: ${fileId})`);
      
      // Get styles from the API
      const styles = await this.apiClient.getStyles(fileId);
      
      // Categorize styles
      const extractedStyles: ExtractedStyles = {
        colors: [],
        text: [],
        effects: [],
        grid: []
      };
      
      // Process each style
      for (const style of styles) {
        switch (style.style_type) {
          case 'FILL':
            extractedStyles.colors.push(style);
            break;
          case 'TEXT':
            extractedStyles.text.push(style);
            break;
          case 'EFFECT':
            extractedStyles.effects.push(style);
            break;
          case 'GRID':
            extractedStyles.grid.push(style);
            break;
        }
      }
      
      this.logger.debug(`Extracted ${styles.length} styles from ${figmaUrl}`);
      
      return extractedStyles;
    } catch (error) {
      this.logger.error(`Error extracting styles from ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Format styles as an object
   * @param styles Extracted styles
   * @returns Formatted styles object
   */
  formatStylesAsObject(styles: ExtractedStyles): any {
    return {
      colors: styles.colors.map(style => ({
        name: style.name,
        key: style.key,
        description: style.description || ''
      })),
      text: styles.text.map(style => ({
        name: style.name,
        key: style.key,
        description: style.description || ''
      })),
      effects: styles.effects.map(style => ({
        name: style.name,
        key: style.key,
        description: style.description || ''
      })),
      grid: styles.grid.map(style => ({
        name: style.name,
        key: style.key,
        description: style.description || ''
      }))
    };
  }
  
  /**
   * Get assets (images) for a node
   * @param figmaUrl Figma URL
   * @param nodeId Node ID (optional if URL contains node-id)
   * @param format Image format (default: png)
   * @param scale Image scale (default: 1)
   * @returns Image URLs
   */
  async getAssets(
    figmaUrl: string,
    nodeId?: string,
    format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png',
    scale: number = 1
  ): Promise<Record<string, string>> {
    try {
      const { fileId, nodeId: urlNodeId } = extractFigmaIds(figmaUrl);
      
      // Use nodeId from URL if not provided
      const targetNodeId = nodeId || urlNodeId;
      
      if (!targetNodeId) {
        throw new Error('Node ID is required');
      }
      
      this.logger.debug(`Getting assets for ${targetNodeId} in ${figmaUrl} (fileId: ${fileId})`);
      
      return await this.apiClient.getImages(fileId, targetNodeId, format, scale);
    } catch (error) {
      this.logger.error(`Error getting assets for ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Get variables from a file
   * @param figmaUrl Figma URL
   * @returns Variables and collections
   */
  async getVariables(figmaUrl: string): Promise<any> {
    try {
      const { fileId } = extractFigmaIds(figmaUrl);
      
      this.logger.debug(`Getting variables from ${figmaUrl} (fileId: ${fileId})`);
      
      return await this.apiClient.getVariables(fileId);
    } catch (error) {
      this.logger.error(`Error getting variables from ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Identify UI components in a design
   * @param figmaUrl Figma URL
   * @param nodeId Node ID (optional if URL contains node-id)
   * @returns Identified UI components
   */
  async identifyUIComponents(figmaUrl: string, nodeId?: string): Promise<UIComponents> {
    try {
      const { fileId, nodeId: urlNodeId } = extractFigmaIds(figmaUrl);
      
      // Use nodeId from URL if not provided
      const targetNodeId = nodeId || urlNodeId;
      
      this.logger.debug(`Identifying UI components in ${figmaUrl} (fileId: ${fileId}, nodeId: ${targetNodeId || 'root'})`);
      
      // Get node details
      let rootNode: FigmaNode;
      
      if (targetNodeId) {
        rootNode = await this.apiClient.getNodeDetails(fileId, targetNodeId);
      } else {
        // Get the document root
        const fileInfo = await this.apiClient.getFileInfo(fileId);
        const topLevelNodes = await this.apiClient.getTopLevelNodes(fileId);
        
        // Use the first page as the root node
        if (topLevelNodes.length === 0) {
          throw new Error('No pages found in the file');
        }
        
        rootNode = await this.apiClient.getNodeDetails(fileId, topLevelNodes[0].id);
      }
      
      // Initialize components
      const components: UIComponents = {
        charts: [],
        tables: [],
        forms: [],
        navigation: [],
        cards: [],
        buttons: [],
        dropdowns: [],
        other: []
      };
      
      // Analyze the node tree to identify components
      this.analyzeNodeForComponents(rootNode, components);
      
      this.logger.debug(`Identified UI components in ${figmaUrl}`);
      
      return components;
    } catch (error) {
      this.logger.error(`Error identifying UI components in ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Analyze a node tree to identify UI components
   * @param node Node to analyze
   * @param components Components object to populate
   */
  private analyzeNodeForComponents(node: FigmaNode, components: UIComponents): void {
    // Check if this node is a component
    const componentType = this.identifyComponentType(node);
    
    if (componentType) {
      // Add to the appropriate category
      switch (componentType) {
        case 'chart':
          components.charts.push(this.extractComponentInfo(node, componentType));
          break;
        case 'table':
          components.tables.push(this.extractComponentInfo(node, componentType));
          break;
        case 'form':
          components.forms.push(this.extractComponentInfo(node, componentType));
          break;
        case 'navigation':
          components.navigation.push(this.extractComponentInfo(node, componentType));
          break;
        case 'card':
          components.cards.push(this.extractComponentInfo(node, componentType));
          break;
        case 'button':
          components.buttons.push(this.extractComponentInfo(node, componentType));
          break;
        case 'dropdown':
          components.dropdowns.push(this.extractComponentInfo(node, componentType));
          break;
        default:
          components.other.push(this.extractComponentInfo(node, 'other'));
          break;
      }
    }
    
    // Recursively analyze children
    if (node.children) {
      for (const child of node.children) {
        this.analyzeNodeForComponents(child, components);
      }
    }
  }
  
  /**
   * Identify the type of component
   * @param node Node to identify
   * @returns Component type or null if not a component
   */
  private identifyComponentType(node: FigmaNode): string | null {
    // Check node name for keywords
    const name = node.name.toLowerCase();
    
    if (name.includes('chart') || name.includes('graph') || name.includes('plot')) {
      return 'chart';
    }
    
    if (name.includes('table') || name.includes('grid') || name.includes('data table')) {
      return 'table';
    }
    
    if (name.includes('form') || name.includes('input') || name.includes('field')) {
      return 'form';
    }
    
    if (name.includes('nav') || name.includes('menu') || name.includes('header') || name.includes('footer')) {
      return 'navigation';
    }
    
    if (name.includes('card') || name.includes('tile') || name.includes('panel')) {
      return 'card';
    }
    
    if (name.includes('button') || name.includes('btn')) {
      return 'button';
    }
    
    if (name.includes('dropdown') || name.includes('select') || name.includes('menu')) {
      return 'dropdown';
    }
    
    // Check if it's a component or instance
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      return 'other';
    }
    
    return null;
  }
  
  /**
   * Extract component information
   * @param node Node to extract information from
   * @param type Component type
   * @returns Component information
   */
  private extractComponentInfo(node: FigmaNode, type: string): any {
    return {
      id: node.id,
      name: node.name,
      type,
      nodeType: node.type,
      bounds: node.absoluteBoundingBox || null
    };
  }
  
  /**
   * Detect component variants
   * @param figmaUrl Figma URL
   * @returns Component variants
   */
  async detectComponentVariants(figmaUrl: string): Promise<any[]> {
    try {
      const { fileId } = extractFigmaIds(figmaUrl);
      
      this.logger.debug(`Detecting component variants in ${figmaUrl} (fileId: ${fileId})`);
      
      // Get components
      const components = await this.apiClient.getComponents(fileId);
      
      // Group components by name prefix
      const variantGroups: Record<string, any[]> = {};
      
      for (const component of components) {
        // Extract variant group name (everything before the first =)
        const match = component.name.match(/^(.+?)=/);
        const groupName = match ? match[1].trim() : component.name;
        
        if (!variantGroups[groupName]) {
          variantGroups[groupName] = [];
        }
        
        variantGroups[groupName].push({
          id: component.node_id,
          key: component.key,
          name: component.name,
          description: component.description || ''
        });
      }
      
      // Convert to array
      const result = Object.entries(variantGroups).map(([groupName, variants]) => ({
        groupName,
        variants,
        variantCount: variants.length
      }));
      
      this.logger.debug(`Detected ${result.length} component variant groups in ${figmaUrl}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error detecting component variants in ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Detect responsive components
   * @param figmaUrl Figma URL
   * @returns Responsive components
   */
  async detectResponsiveComponents(figmaUrl: string): Promise<any[]> {
    try {
      const { fileId } = extractFigmaIds(figmaUrl);
      
      this.logger.debug(`Detecting responsive components in ${figmaUrl} (fileId: ${fileId})`);
      
      // Get components
      const components = await this.apiClient.getComponents(fileId);
      
      // Group components by name without size indicators
      const responsiveGroups: Record<string, any[]> = {};
      
      // Regular expressions for common size patterns
      const sizePatterns = [
        /\b(xs|sm|md|lg|xl)\b/i,
        /\b(small|medium|large)\b/i,
        /\b(\d+)px\b/i,
        /\b(mobile|tablet|desktop)\b/i
      ];
      
      for (const component of components) {
        // Remove size indicators from name
        let baseName = component.name;
        
        for (const pattern of sizePatterns) {
          baseName = baseName.replace(pattern, '');
        }
        
        // Clean up the base name
        baseName = baseName.replace(/\s+/g, ' ').trim();
        
        if (!responsiveGroups[baseName]) {
          responsiveGroups[baseName] = [];
        }
        
        responsiveGroups[baseName].push({
          id: component.node_id,
          key: component.key,
          name: component.name,
          description: component.description || ''
        });
      }
      
      // Filter groups with multiple components
      const result = Object.entries(responsiveGroups)
        .filter(([_, variants]) => variants.length > 1)
        .map(([groupName, variants]) => ({
          groupName,
          variants,
          variantCount: variants.length
        }));
      
      this.logger.debug(`Detected ${result.length} responsive component groups in ${figmaUrl}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error detecting responsive components in ${figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Get comprehensive design information
   * @param figmaUrl Figma URL
   * @returns Design information
   */
  async getDesignInformation(figmaUrl: string): Promise<DesignInformation> {
    try {
      const { fileId } = extractFigmaIds(figmaUrl);
      
      this.logger.debug(`Getting comprehensive design information for ${figmaUrl} (fileId: ${fileId})`);
      
      // Get file info
      const fileInfo = await this.apiClient.getFileInfo(fileId);
      
      // Get top-level nodes
      const topLevelNodes = await this.apiClient.getTopLevelNodes(fileId);
      
      // Get styles
      const styles = await this.extractStyles(figmaUrl);
      
      // Get components
      const components = await this.apiClient.getComponents(fileId);
      
      // Get node styles (from the first page)
      let nodeStyles: ExtractedStyles = {
        colors: [],
        text: [],
        effects: [],
        grid: []
      };
      
      if (topLevelNodes.length > 0) {
        const firstPageId = topLevelNodes[0].id;
        nodeStyles = await this.extractStyles(`${figmaUrl}?node-id=${firstPageId}`);
      }
      
      // Identify UI components
      const uiComponents = await this.identifyUIComponents(figmaUrl);
      
      // Combine all information
      const designInformation: DesignInformation = {
        fileInfo,
        topLevelNodes,
        styles,
        components,
        nodeStyles,
        uiComponents
      };
      
      this.logger.debug(`Got comprehensive design information for ${figmaUrl}`);
      
      return designInformation;
    } catch (error) {
      this.logger.error(`Error getting comprehensive design information for ${figmaUrl}`, error);
      throw error;
    }
  }
}