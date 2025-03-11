#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { DesignManager } from './design-manager.js';
import { 
  ValidateTokenArgs, 
  GetFileInfoArgs, 
  GetNodeDetailsArgs, 
  ExtractStylesArgs, 
  GetAssetsArgs 
} from './types.js';

// Get the Figma access token from environment variables
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
if (!FIGMA_ACCESS_TOKEN) {
  throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
}


class FigmaServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'figma-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'validate_token',
          description: 'Test if the configured token has access to a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'get_file_info',
          description: 'Get basic metadata about a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'get_node_details',
          description: 'Get detailed information about a specific node (component, frame, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'Node ID (optional if URL contains node-id)',
              },
              detailLevel: {
                type: 'string',
                enum: ['summary', 'basic', 'full'],
                description: 'Level of detail to include (default: basic)',
              },
              properties: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Optional array of property paths to include (e.g., ["id", "name", "children.id"])',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'extract_styles',
          description: 'Extract color, text, and effect styles from a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'get_assets',
          description: 'Get image URLs for nodes in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'Node ID (optional if URL contains node-id)',
              },
              format: {
                type: 'string',
                enum: ['jpg', 'png', 'svg', 'pdf'],
                description: 'Image format (default: png)',
              },
              scale: {
                type: 'number',
                description: 'Image scale (default: 1)',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'get_variables',
          description: 'Get variables and variable collections from a Figma file (new Figma Variables API)',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'identify_components',
          description: 'Identify UI components in a Figma design (charts, tables, forms, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'Node ID (optional if URL contains node-id)',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'detect_variants',
          description: 'Detect component variants and group them',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
            },
            required: ['figmaUrl'],
          },
        },
        {
          name: 'detect_responsive',
          description: 'Detect responsive variations of components',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
            },
            required: ['figmaUrl'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Validate that arguments is an object with the required properties
        const args = request.params.arguments as Record<string, unknown>;
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, 'Arguments must be an object');
        }

        switch (request.params.name) {
          case 'validate_token': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            return await this.validateToken({ figmaUrl: args.figmaUrl });
          }
          case 'get_file_info': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            return await this.getFileInfo({ figmaUrl: args.figmaUrl });
          }
          case 'get_node_details': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            const nodeId = args.nodeId !== undefined ? String(args.nodeId) : undefined;
            const detailLevel = args.detailLevel as 'summary' | 'basic' | 'full' | undefined;
            const properties = Array.isArray(args.properties) ? args.properties as string[] : undefined;
            return await this.getNodeDetails({ 
              figmaUrl: args.figmaUrl, 
              nodeId, 
              detailLevel, 
              properties 
            });
          }
          case 'extract_styles': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            return await this.extractStyles({ figmaUrl: args.figmaUrl });
          }
          case 'get_assets': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            const nodeId = args.nodeId !== undefined ? String(args.nodeId) : undefined;
            const format = args.format as GetAssetsArgs['format'] | undefined;
            const scale = typeof args.scale === 'number' ? args.scale : undefined;
            return await this.getAssets({ figmaUrl: args.figmaUrl, nodeId, format, scale });
          }
          case 'get_variables': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            return await this.getVariables({ figmaUrl: args.figmaUrl });
          }
          case 'identify_components': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            const nodeId = args.nodeId !== undefined ? String(args.nodeId) : undefined;
            return await this.identifyComponents({ figmaUrl: args.figmaUrl, nodeId });
          }
          case 'detect_variants': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            return await this.detectVariants({ figmaUrl: args.figmaUrl });
          }
          case 'detect_responsive': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            return await this.detectResponsive({ figmaUrl: args.figmaUrl });
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;
          const message = error.response?.data?.message || error.message;
          
          if (statusCode === 404) {
            return {
              content: [
                {
                  type: 'text',
                  text: `File not found or access denied. Please check the file ID and your access token.`,
                },
              ],
              isError: true,
            };
          } else if (statusCode === 403) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Access denied. Your token does not have permission to access this file.`,
                },
              ],
              isError: true,
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Figma API error (${statusCode}): ${message}`,
                },
              ],
              isError: true,
            };
          }
        }
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Unexpected error: ${(error as Error).message}`
        );
      }
    });
  }

  private async validateToken(args: ValidateTokenArgs) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Use getFileInfo to validate token
      await designManager.getFileInfo();
      
      return {
        content: [
          {
            type: 'text',
            text: `Token validation successful. You have access to this Figma file.`,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        
        if (statusCode === 404 || statusCode === 403) {
          return {
            content: [
              {
                type: 'text',
                text: `Token validation failed. You do not have access to this Figma file.`,
              },
            ],
            isError: true,
          };
        }
      }
      
      throw error;
    }
  }

  private async getFileInfo(args: GetFileInfoArgs) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Get basic file information
      const fileInfo = await designManager.getFileInfo();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(fileInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async getNodeDetails(args: GetNodeDetailsArgs) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Get node details with the specified detail level and properties
      const nodeDetails = await designManager.getNodeDetails(
        args.nodeId,
        args.detailLevel || 'basic',
        args.properties
      );
      
      // Add a note about the detail level in the response
      let responseText = '';
      if (args.detailLevel === 'summary') {
        responseText = 'Node details (summary level - showing essential properties only):\n\n';
      } else if (args.detailLevel === 'basic') {
        responseText = 'Node details (basic level - showing common properties with limited depth):\n\n';
      } else if (args.detailLevel === 'full') {
        responseText = 'Node details (full level - showing all properties):\n\n';
      } else if (args.properties) {
        responseText = `Node details (custom properties: ${args.properties.join(', ')}):\n\n`;
      } else {
        responseText = 'Node details (basic level):\n\n';
      }
      
      responseText += JSON.stringify(nodeDetails, null, 2);
      
      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Node not found')) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Node not found: ${error.message}`
        );
      }
      throw error;
    }
  }

  private async extractStyles(args: ExtractStylesArgs) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Extract styles
      const styles = await designManager.extractStyles();
      
      // Format styles as object
      const formattedStyles = designManager.formatStylesAsObject(styles);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formattedStyles, null, 2),
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async getAssets(args: GetAssetsArgs) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Get assets (nodeId, format, and scale are optional)
      const images = await designManager.getAssets(args.nodeId, args.format, args.scale);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(images, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Figma API error')) {
        throw new McpError(
          ErrorCode.InternalError,
          error.message
        );
      }
      throw error;
    }
  }

  private async getVariables(args: { figmaUrl: string }) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Get variables
      const variables = await designManager.getVariables();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(variables, null, 2),
          },
        ],
      };
    } catch (error) {
      // Handle 404 errors gracefully - variables API might not be available for all files
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: `Variables API not available for this file. This might be because the file doesn't use variables or the API is not supported for this file.`,
            },
          ],
        };
      }
      throw error;
    }
  }

  private async identifyComponents(args: { figmaUrl: string; nodeId?: string }) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Identify UI components
      const components = await designManager.identifyUIComponents(args.nodeId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(components, null, 2),
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async detectVariants(args: { figmaUrl: string }) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Get components
      const components = await designManager.getComponents();
      
      // Detect variants
      const variants = designManager.detectComponentVariants(components);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(variants, null, 2),
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async detectResponsive(args: { figmaUrl: string }) {
    try {
      // Create a new DesignManager instance
      const designManager = new DesignManager(args.figmaUrl, FIGMA_ACCESS_TOKEN!);
      
      // Get components
      const components = await designManager.getComponents();
      
      // Detect responsive components
      const responsiveComponents = designManager.detectResponsiveComponents(components);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responsiveComponents, null, 2),
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma MCP server running on stdio');
  }
}

const server = new FigmaServer();
server.run().catch(console.error);
