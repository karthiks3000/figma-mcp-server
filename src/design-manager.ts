/**
 * DesignManager - Manages the extraction and processing of Figma designs
 */
import { extractFigmaIds } from './utils.js';
import { FigmaApiClient } from './api-client.js';
import { StyleExtractor } from './style-extractor.js';
import { ComponentDetector } from './component-detector.js';
import { DesignInformation, FigmaFileInfo, FigmaTopLevelNode, ExtractedStyles, UIComponents } from './types.js';

/**
 * Manages the extraction and processing of Figma designs
 */
export class DesignManager {
  private figmaUrl: string;
  private fileId: string;
  private nodeId?: string;
  private timestamp?: string;
  private apiClient: FigmaApiClient;
  private styleExtractor: StyleExtractor;
  private componentDetector: ComponentDetector;
  
  /**
   * Create a new DesignManager
   * @param figmaUrl - The Figma URL
   * @param accessToken - The Figma access token
   */
  constructor(figmaUrl: string, accessToken: string) {
    this.figmaUrl = figmaUrl;
    
    // Extract file ID and node ID from the URL
    const ids = extractFigmaIds(figmaUrl);
    this.fileId = ids.fileId;
    this.nodeId = ids.nodeId;
    
    // Extract timestamp parameter if present
    const tMatch = figmaUrl.match(/[?&]t=([^&]+)/);
    if (tMatch && tMatch[1]) {
      this.timestamp = tMatch[1];
    }
    
    // Create API client
    this.apiClient = new FigmaApiClient(this.fileId, accessToken);
    
    // Create style extractor
    this.styleExtractor = new StyleExtractor(this.apiClient);
    
    // Create component detector
    this.componentDetector = new ComponentDetector(this.apiClient);
    
    console.log(`Initialized DesignManager with File ID: ${this.fileId}, Node ID: ${this.nodeId || 'None'}, Timestamp: ${this.timestamp || 'None'}`);
  }
  
  /**
   * Get basic file information
   * @returns File information
   */
  async getFileInfo(): Promise<FigmaFileInfo> {
    return this.apiClient.getFileInfo();
  }
  
  /**
   * Get the top-level nodes in the file
   * @returns Array of top-level nodes
   */
  async getTopLevelNodes(): Promise<FigmaTopLevelNode[]> {
    return this.apiClient.getTopLevelNodes();
  }
  
  /**
   * Get detailed information about a specific node
   * @param nodeId - The ID of the node to get details for (optional if provided in URL)
   * @param detailLevel - The level of detail to include ('summary', 'basic', or 'full')
   * @param properties - Optional array of property paths to include
   * @returns Node details
   */
  async getNodeDetails(nodeId?: string, detailLevel: 'summary' | 'basic' | 'full' = 'basic', properties?: string[]): Promise<any> {
    const targetNodeId = nodeId || this.nodeId;
    if (!targetNodeId) {
      throw new Error('Node ID is required. Either provide it as a parameter or in the figmaUrl.');
    }
    
    // Get the full node details from the API
    const nodeDetails = await this.apiClient.getNodeDetails(targetNodeId);
    
    // If detail level is 'full', return the complete node details
    if (detailLevel === 'full' && !properties) {
      return nodeDetails;
    }
    
    // Otherwise, summarize the node based on the detail level and properties
    const { summarizeNode } = await import('./utils.js');
    return summarizeNode(nodeDetails, detailLevel, properties);
  }
  
  /**
   * Extract styles from the file
   * @returns Extracted styles
   */
  async extractStyles(): Promise<ExtractedStyles> {
    // Get styles from API
    const styles = await this.styleExtractor.extractStyles(this.nodeId, this.timestamp);
    
    // If we have a node ID, also extract styles from that node
    if (this.nodeId) {
      try {
        // Get node details
        const nodeDetails = await this.apiClient.getNodeDetails(this.nodeId);
        
        // Extract styles from node
        const nodeStyles = this.styleExtractor.extractStylesFromNode(nodeDetails);
        
        // Merge styles
        return this.styleExtractor.mergeStyles(styles, nodeStyles);
      } catch (error) {
        console.error('Error extracting styles from node:', error);
        // Continue with the styles we have
        return styles;
      }
    }
    
    return styles;
  }
  
  /**
   * Extract styles from a specific node
   * @param nodeId - The ID of the node to extract styles from
   * @returns Extracted styles
   */
  async extractStylesFromNode(nodeId: string): Promise<ExtractedStyles> {
    // Get node details
    const nodeDetails = await this.apiClient.getNodeDetails(nodeId);
    
    // Extract styles from node
    return this.styleExtractor.extractStylesFromNode(nodeDetails);
  }
  
  /**
   * Get components from the file
   * @returns Components
   */
  async getComponents(): Promise<any[]> {
    return this.apiClient.getComponents(this.nodeId, this.timestamp);
  }
  
  /**
   * Identify UI components in a node
   * @param nodeId - The ID of the node to analyze (optional if provided in URL)
   * @returns Detected UI components
   */
  async identifyUIComponents(nodeId?: string): Promise<UIComponents> {
    const targetNodeId = nodeId || this.nodeId;
    if (!targetNodeId) {
      throw new Error('Node ID is required. Either provide it as a parameter or in the figmaUrl.');
    }
    
    return this.componentDetector.identifyUIComponents(targetNodeId);
  }
  
  /**
   * Get image URLs for nodes
   * @param nodeId - The ID of the node to get images for (optional if provided in URL)
   * @param format - The image format (jpg, png, svg, pdf)
   * @param scale - The image scale factor
   * @returns Images
   */
  async getAssets(nodeId?: string, format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png', scale: number = 1): Promise<Record<string, string>> {
    const targetNodeId = nodeId || this.nodeId;
    if (!targetNodeId) {
      throw new Error('Node ID is required. Either provide it as a parameter or in the figmaUrl.');
    }
    
    return this.apiClient.getImages(targetNodeId, format, scale);
  }
  
  /**
   * Get variables from the file (new Figma Variables API)
   * @returns Variables and collections
   */
  async getVariables(): Promise<any> {
    return this.apiClient.getVariables();
  }
  
  /**
   * Extract all design information from the file
   * @returns Complete design information
   */
  async extractDesignInformation(): Promise<DesignInformation> {
    try {
      // Get basic file info
      const fileInfo = await this.getFileInfo();
      
      // Get top-level nodes
      const topLevelNodes = await this.getTopLevelNodes();
      
      // Get styles from API
      const styles = await this.extractStyles();
      
      // Get components
      const components = await this.getComponents();
      
      // Initialize node styles and UI components
      let nodeStyles: ExtractedStyles = {
        colors: [],
        text: [],
        effects: [],
        grid: [],
      };
      
      let uiComponents: UIComponents = {
        charts: [],
        tables: [],
        forms: [],
        navigation: [],
        cards: [],
        buttons: [],
        dropdowns: [],
        other: [],
      };
      
      // If we have a specific node ID, extract additional information
      if (this.nodeId) {
        try {
          // Extract styles from node
          nodeStyles = await this.extractStylesFromNode(this.nodeId);
        } catch (styleError) {
          console.error('Error extracting node styles:', styleError);
          // Continue with empty node styles
        }
        
        try {
          // Identify UI components
          uiComponents = await this.identifyUIComponents(this.nodeId);
        } catch (componentError) {
          console.error('Error identifying UI components:', componentError);
          // Continue with empty UI components
        }
      }
      
      // Combine all information
      const designInformation: DesignInformation = {
        fileInfo,
        topLevelNodes,
        styles,
        components,
        nodeStyles,
        uiComponents,
      };
      
      return designInformation;
    } catch (error) {
      console.error('Error extracting design information:', error);
      throw error;
    }
  }
  
  /**
   * Format extracted styles as an object
   * @param styles - The styles to format
   * @returns Formatted styles
   */
  formatStylesAsObject(styles: ExtractedStyles): Record<string, Record<string, any>> {
    return this.styleExtractor.formatStylesAsObject(styles);
  }
  
  /**
   * Detect component variants and group them
   * @param components - The components to analyze
   * @returns Grouped component variants
   */
  detectComponentVariants(components: any[]): Record<string, any[]> {
    return this.componentDetector.detectComponentVariants(components);
  }
  
  /**
   * Detect responsive variations of components
   * @param components - The components to analyze
   * @returns Components with responsive information
   */
  detectResponsiveComponents(components: any[]): any[] {
    return this.componentDetector.detectResponsiveComponents(components);
  }
}
