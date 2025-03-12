/**
 * Figma API Client for readonly mode
 * Handles communication with the Figma REST API
 */
import axios, { AxiosInstance } from 'axios';
import { 
  FigmaFileInfo, 
  FigmaNodesResponse, 
  FigmaStylesResponse, 
  FigmaComponentsResponse, 
  FigmaImagesResponse,
  FigmaTopLevelNode,
  FigmaNode,
  FigmaStyle,
  FigmaComponent,
  FigmaVariable,
  FigmaVariableCollection
} from '../core/types.js';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';

/**
 * Figma API Client for readonly mode
 */
export class FigmaApiClient {
  private axiosInstance: AxiosInstance;
  private logger: Logger;
  
  /**
   * Create a new Figma API Client
   * @param configManager Configuration manager
   */
  constructor(configManager: ConfigManager) {
    const accessToken = configManager.getAccessToken();
    
    this.logger = createLogger('FigmaApiClient', configManager);
    
    // Create axios instance with Figma API token
    this.axiosInstance = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': accessToken,
      },
    });
    
    this.logger.debug('Figma API Client initialized');
  }
  
  /**
   * Get basic file information
   * @param fileId Figma file ID
   * @returns Basic file information
   */
  async getFileInfo(fileId: string): Promise<FigmaFileInfo> {
    try {
      this.logger.debug(`Getting file info for ${fileId}`);
      
      // Request only the file metadata
      const response = await this.axiosInstance.get(`/files/${fileId}`, {
        params: {
          depth: 1, // Minimum depth required by the API
        },
      });
      
      // Extract basic file information
      const fileInfo: FigmaFileInfo = {
        name: response.data.name,
        lastModified: response.data.lastModified,
        version: response.data.version,
        thumbnailUrl: response.data.thumbnailUrl,
        editorType: response.data.editorType,
        role: response.data.role,
        linkAccess: response.data.linkAccess,
      };
      
      this.logger.debug(`Got file info for ${fileId}`, fileInfo);
      
      return fileInfo;
    } catch (error) {
      this.logger.error(`Error getting file info for ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get the top-level nodes in the file
   * @param fileId Figma file ID
   * @returns Array of top-level nodes
   */
  async getTopLevelNodes(fileId: string): Promise<FigmaTopLevelNode[]> {
    try {
      this.logger.debug(`Getting top-level nodes for ${fileId}`);
      
      // Request only the top-level children
      const response = await this.axiosInstance.get(`/files/${fileId}`, {
        params: {
          depth: 1, // Only include immediate children
        },
      });
      
      // Extract top-level nodes (usually pages)
      const document = response.data.document;
      const topLevelNodes: FigmaTopLevelNode[] = document.children.map((child: any) => ({
        id: child.id,
        name: child.name,
        type: child.type,
        childCount: child.children?.length || 0,
      }));
      
      this.logger.debug(`Got ${topLevelNodes.length} top-level nodes for ${fileId}`);
      
      return topLevelNodes;
    } catch (error) {
      this.logger.error(`Error getting top-level nodes for ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get detailed information about a specific node
   * @param fileId Figma file ID
   * @param nodeId Node ID
   * @returns Node details
   */
  async getNodeDetails(fileId: string, nodeId: string): Promise<FigmaNode> {
    try {
      this.logger.debug(`Getting node details for ${nodeId} in file ${fileId}`);
      
      const response = await this.axiosInstance.get<FigmaNodesResponse>(`/files/${fileId}/nodes`, {
        params: { ids: nodeId },
      });
      
      // Extract node details
      const nodeDetails = response.data.nodes[nodeId];
      
      if (!nodeDetails || nodeDetails.err) {
        throw new Error(`Node not found: ${nodeDetails?.err || 'Unknown error'}`);
      }
      
      this.logger.debug(`Got node details for ${nodeId} in file ${fileId}`);
      
      return nodeDetails.document;
    } catch (error) {
      this.logger.error(`Error getting node details for ${nodeId} in file ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get styles from the file
   * @param fileId Figma file ID
   * @param nodeId Optional node ID to filter styles
   * @param version Optional version/timestamp
   * @returns Styles response
   */
  async getStyles(fileId: string, nodeId?: string, version?: string): Promise<FigmaStyle[]> {
    try {
      this.logger.debug(`Getting styles for ${fileId}`);
      
      // Prepare parameters
      const params: Record<string, string> = {};
      
      // Add node ID if available to target specific frame
      if (nodeId) {
        params.node_id = nodeId;
      }
      
      // Add version/timestamp if available
      if (version) {
        params.version = version;
      }
      
      // Get style metadata directly with specific parameters
      const response = await this.axiosInstance.get<FigmaStylesResponse>(`/files/${fileId}/styles`, { params });
      
      // Check if styles exist and are iterable
      if (response.data.meta && response.data.meta.styles) {
        this.logger.debug(`Got ${response.data.meta.styles.length} styles for ${fileId}`);
        return response.data.meta.styles;
      } else if (response.data.styles && Array.isArray(response.data.styles)) {
        // Alternative format: direct styles array
        this.logger.debug(`Got ${response.data.styles.length} styles for ${fileId}`);
        return response.data.styles as FigmaStyle[];
      }
      
      this.logger.debug(`No styles found for ${fileId}`);
      return [];
    } catch (error) {
      this.logger.error(`Error getting styles for ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get components from the file
   * @param fileId Figma file ID
   * @param nodeId Optional node ID to filter components
   * @param version Optional version/timestamp
   * @returns Components response
   */
  async getComponents(fileId: string, nodeId?: string, version?: string): Promise<FigmaComponent[]> {
    try {
      this.logger.debug(`Getting components for ${fileId}`);
      
      // Prepare parameters
      const params: Record<string, string> = {};
      
      // Add node ID if available to target specific frame
      if (nodeId) {
        params.node_id = nodeId;
      }
      
      // Add version/timestamp if available
      if (version) {
        params.version = version;
      }
      
      // Get components metadata directly with specific parameters
      const response = await this.axiosInstance.get<FigmaComponentsResponse>(`/files/${fileId}/components`, { params });
      
      // Check if components exist
      if (response.data.meta && response.data.meta.components) {
        this.logger.debug(`Got ${response.data.meta.components.length} components for ${fileId}`);
        return response.data.meta.components;
      }
      
      this.logger.debug(`No components found for ${fileId}`);
      return [];
    } catch (error) {
      this.logger.error(`Error getting components for ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get image URLs for nodes
   * @param fileId Figma file ID
   * @param nodeId The ID of the node to get images for
   * @param format The image format (jpg, png, svg, pdf)
   * @param scale The image scale factor
   * @returns Images response
   */
  async getImages(fileId: string, nodeId: string, format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png', scale: number = 1): Promise<Record<string, string>> {
    try {
      this.logger.debug(`Getting images for node ${nodeId} in file ${fileId}`);
      
      // Get image URLs
      const response = await this.axiosInstance.get<FigmaImagesResponse>(`/images/${fileId}`, {
        params: {
          ids: nodeId,
          format,
          scale,
        },
      });
      
      if (response.data.err) {
        throw new Error(`Figma API error: ${response.data.err}`);
      }
      
      this.logger.debug(`Got images for node ${nodeId} in file ${fileId}`);
      
      return response.data.images;
    } catch (error) {
      this.logger.error(`Error getting images for node ${nodeId} in file ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get variables from the file (new Figma Variables API)
   * @param fileId Figma file ID
   * @returns Variables and collections
   */
  async getVariables(fileId: string): Promise<{ variables: FigmaVariable[], collections: FigmaVariableCollection[] }> {
    try {
      this.logger.debug(`Getting variables for ${fileId}`);
      
      const response = await this.axiosInstance.get(`/files/${fileId}/variables`);
      
      const variables = response.data.meta?.variables || [];
      const collections = response.data.meta?.variableCollections || [];
      
      this.logger.debug(`Got ${variables.length} variables and ${collections.length} collections for ${fileId}`);
      
      return {
        variables,
        collections
      };
    } catch (error) {
      // If the API doesn't support variables yet, return empty arrays
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.warn(`Variables API not available for file ${fileId}`);
        return { variables: [], collections: [] };
      }
      
      this.logger.error(`Error getting variables for ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get comments from the file
   * @param fileId Figma file ID
   * @returns Comments
   */
  async getComments(fileId: string): Promise<any[]> {
    try {
      this.logger.debug(`Getting comments for ${fileId}`);
      
      const response = await this.axiosInstance.get(`/files/${fileId}/comments`);
      
      const comments = response.data.comments || [];
      
      this.logger.debug(`Got ${comments.length} comments for ${fileId}`);
      
      return comments;
    } catch (error) {
      this.logger.error(`Error getting comments for ${fileId}`, error);
      throw error;
    }
  }
  
  /**
   * Get file versions
   * @param fileId Figma file ID
   * @returns File versions
   */
  async getVersions(fileId: string): Promise<any[]> {
    try {
      this.logger.debug(`Getting versions for ${fileId}`);
      
      const response = await this.axiosInstance.get(`/files/${fileId}/versions`);
      
      const versions = response.data.versions || [];
      
      this.logger.debug(`Got ${versions.length} versions for ${fileId}`);
      
      return versions;
    } catch (error) {
      this.logger.error(`Error getting versions for ${fileId}`, error);
      throw error;
    }
  }
}