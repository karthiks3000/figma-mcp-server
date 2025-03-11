/**
 * FigmaApiClient - Handles communication with the Figma API
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
  FigmaVariableCollection,
  FigmaCreateFileResponse,
  FigmaCreateNodeResponse
} from './types.js';

/**
 * Client for interacting with the Figma API
 * Includes methods for both reading and modifying designs
 */
export class FigmaApiClient {
  private axiosInstance: AxiosInstance;
  private fileId: string;

  /**
   * Create a new FigmaApiClient
   * @param fileId - The Figma file ID
   * @param accessToken - The Figma access token
   */
  constructor(fileId: string, accessToken: string) {
    this.fileId = fileId;
    
    // Create axios instance with Figma API token
    this.axiosInstance = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': accessToken,
      },
    });
  }

  /**
   * Get basic file information
   * @returns Basic file information
   */
  async getFileInfo(): Promise<FigmaFileInfo> {
    try {
      // Request only the file metadata
      const response = await this.axiosInstance.get(`/files/${this.fileId}`, {
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
      
      return fileInfo;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Get the top-level nodes in the file
   * @returns Array of top-level nodes
   */
  async getTopLevelNodes(): Promise<FigmaTopLevelNode[]> {
    try {
      // Request only the top-level children
      const response = await this.axiosInstance.get(`/files/${this.fileId}`, {
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
      
      return topLevelNodes;
    } catch (error) {
      console.error('Error getting top-level nodes:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific node
   * @param nodeId - The ID of the node to get details for
   * @returns Node details
   */
  async getNodeDetails(nodeId: string): Promise<FigmaNode> {
    try {
      const response = await this.axiosInstance.get<FigmaNodesResponse>(`/files/${this.fileId}/nodes`, {
        params: { ids: nodeId },
      });
      
      // Extract node details
      const nodeDetails = response.data.nodes[nodeId];
      
      if (!nodeDetails || nodeDetails.err) {
        throw new Error(`Node not found: ${nodeDetails?.err || 'Unknown error'}`);
      }
      
      return nodeDetails.document;
    } catch (error) {
      console.error('Error getting node details:', error);
      throw error;
    }
  }

  /**
   * Get styles from the file
   * @param nodeId - Optional node ID to filter styles
   * @param version - Optional version/timestamp
   * @returns Styles response
   */
  async getStyles(nodeId?: string, version?: string): Promise<FigmaStyle[]> {
    try {
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
      const response = await this.axiosInstance.get<FigmaStylesResponse>(`/files/${this.fileId}/styles`, { params });
      
      // Check if styles exist and are iterable
      if (response.data.meta && response.data.meta.styles) {
        return response.data.meta.styles;
      } else if (response.data.styles && Array.isArray(response.data.styles)) {
        // Alternative format: direct styles array
        return response.data.styles as FigmaStyle[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting styles:', error);
      throw error;
    }
  }

  /**
   * Get components from the file
   * @param nodeId - Optional node ID to filter components
   * @param version - Optional version/timestamp
   * @returns Components response
   */
  async getComponents(nodeId?: string, version?: string): Promise<FigmaComponent[]> {
    try {
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
      const response = await this.axiosInstance.get<FigmaComponentsResponse>(`/files/${this.fileId}/components`, { params });
      
      // Check if components exist
      if (response.data.meta && response.data.meta.components) {
        return response.data.meta.components;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting components:', error);
      throw error;
    }
  }

  /**
   * Get image URLs for nodes
   * @param nodeId - The ID of the node to get images for
   * @param format - The image format (jpg, png, svg, pdf)
   * @param scale - The image scale factor
   * @returns Images response
   */
  async getImages(nodeId: string, format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png', scale: number = 1): Promise<Record<string, string>> {
    try {
      // Get image URLs
      const response = await this.axiosInstance.get<FigmaImagesResponse>(`/images/${this.fileId}`, {
        params: {
          ids: nodeId,
          format,
          scale,
        },
      });
      
      if (response.data.err) {
        throw new Error(`Figma API error: ${response.data.err}`);
      }
      
      return response.data.images;
    } catch (error) {
      console.error('Error getting images:', error);
      throw error;
    }
  }

  /**
   * Get variables from the file (new Figma Variables API)
   * @returns Variables and collections
   */
  async getVariables(): Promise<{ variables: FigmaVariable[], collections: FigmaVariableCollection[] }> {
    try {
      const response = await this.axiosInstance.get(`/files/${this.fileId}/variables`);
      
      return {
        variables: response.data.meta?.variables || [],
        collections: response.data.meta?.variableCollections || []
      };
    } catch (error) {
      console.error('Error getting variables:', error);
      // If the API doesn't support variables yet, return empty arrays
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { variables: [], collections: [] };
      }
      throw error;
    }
  }

  /**
   * Get comments from the file
   * @returns Comments
   */
  async getComments(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/files/${this.fileId}/comments`);
      return response.data.comments || [];
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Get file versions
   * @returns File versions
   */
  async getVersions(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/files/${this.fileId}/versions`);
      return response.data.versions || [];
    } catch (error) {
      console.error('Error getting versions:', error);
      throw error;
    }
  }
  
  /**
   * Create a new file
   * @param name - The name of the file
   * @param template - Optional template file key to use as a starting point
   * @returns The new file key and name
   */
  async createFile(name: string, template?: string): Promise<{ key: string; name: string }> {
    try {
      const params: Record<string, string> = { name };
      
      if (template) {
        params.template = template;
      }
      
      // Use the proper full URL for v2 endpoint
      const response = await axios.post<FigmaCreateFileResponse>(
        'https://api.figma.com/v2/files',
        params,
        {
          headers: {
            'X-Figma-Token': this.axiosInstance.defaults.headers['X-Figma-Token'],
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.key) {
        throw new Error('Failed to create file - no key returned');
      }
      
      return {
        key: response.data.key,
        name: response.data.name || name,
      };
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }
  
  /**
   * Create a new node
   * @param parentNodeId - The ID of the parent node
   * @param nodeData - Data for the new node
   * @returns The new node ID
   */
  async createNode(parentNodeId: string, nodeData: any): Promise<string> {
    try {
      const response = await this.axiosInstance.post<FigmaCreateNodeResponse>(
        `/files/${this.fileId}/nodes/${parentNodeId}`,
        nodeData
      );
      
      if (!response.data.id) {
        throw new Error('Failed to create node - no ID returned');
      }
      
      return response.data.id;
    } catch (error) {
      console.error('Error creating node:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing node
   * @param nodeId - The ID of the node to update
   * @param properties - The properties to update
   * @returns Success status
   */
  async updateNode(nodeId: string, properties: any): Promise<boolean> {
    try {
      await this.axiosInstance.put(
        `/files/${this.fileId}/nodes/${nodeId}`,
        properties
      );
      
      return true;
    } catch (error) {
      console.error('Error updating node:', error);
      throw error;
    }
  }
  
  /**
   * Delete an existing node
   * @param nodeId - The ID of the node to delete
   * @returns Success status
   */
  async deleteNode(nodeId: string): Promise<boolean> {
    try {
      await this.axiosInstance.delete(`/files/${this.fileId}/nodes/${nodeId}`);
      return true;
    } catch (error) {
      console.error('Error deleting node:', error);
      throw error;
    }
  }
  
  /**
   * Create an instance of a component
   * @param parentNodeId - The ID of the parent node
   * @param componentKey - The component key to instantiate
   * @param name - The name of the instance
   * @param x - X position
   * @param y - Y position
   * @param scaleX - X scale factor (1 = 100%)
   * @param scaleY - Y scale factor (1 = 100%)
   * @returns The new instance node ID
   */
  async createComponentInstance(
    parentNodeId: string,
    componentKey: string,
    name: string,
    x: number,
    y: number,
    scaleX: number = 1,
    scaleY: number = 1
  ): Promise<string> {
    try {
      const response = await this.axiosInstance.post<FigmaCreateNodeResponse>(
        `/files/${this.fileId}/components/${componentKey}/instances`,
        {
          parentNodeId,
          name,
          position: { x, y },
          scale: { x: scaleX, y: scaleY },
        }
      );
      
      if (!response.data.id) {
        throw new Error('Failed to create component instance - no ID returned');
      }
      
      return response.data.id;
    } catch (error) {
      console.error('Error creating component instance:', error);
      throw error;
    }
  }
  
  /**
   * Set properties on a component instance
   * @param instanceId - The ID of the component instance
   * @param properties - The properties to set
   * @returns Success status
   */
  async setInstanceProperties(
    instanceId: string,
    properties: Record<string, string | number | boolean>
  ): Promise<boolean> {
    try {
      await this.axiosInstance.put(
        `/files/${this.fileId}/instances/${instanceId}/properties`,
        { properties }
      );
      
      return true;
    } catch (error) {
      console.error('Error setting instance properties:', error);
      throw error;
    }
  }
}
