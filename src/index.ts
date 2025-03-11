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
import { DesignCreator } from './design-creator.js';
import { extractFigmaIds } from './utils.js';
import { FigmaApiClient } from './api-client.js';
import { ComponentUtilizer } from './component-utilizer.js';
import { pluginClient } from './plugin-client.js';
import { pluginBridge } from './plugin-bridge.js';
import { 
  ValidateTokenArgs, 
  GetFileInfoArgs, 
  GetNodeDetailsArgs, 
  ExtractStylesArgs, 
  GetAssetsArgs,
  CreateFileArgs,
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
  DeleteNodeArgs,
  FigmaFill
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

    // Start plugin bridge (WebSocket server)
    this.initializePluginBridge();
    
    // Set up MCP tool handlers
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
  
  /**
   * Initialize the plugin bridge WebSocket server
   */
  private initializePluginBridge(): void {
    try {
      // Set the port on pluginBridge directly before starting
      (pluginBridge as any).port = 8766;
      
      // Initialize plugin client (starts the WebSocket server)
      const started = pluginClient.start();
      
      if (started) {
        console.log('Plugin bridge initialized and ready for connections');
      } else {
        console.warn('Plugin bridge initialization failed');
        console.warn('Continuing with REST API fallback where possible');
      }
      
      // Set up graceful shutdown
      process.on('SIGINT', async () => {
        // Stop the plugin bridge
        if (pluginBridge.isRunning) {
          pluginBridge.stop();
        }
      });
    } catch (error: unknown) {
      console.error('Failed to initialize plugin bridge:', error);
    }
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
        // Design creation tools
        {
          name: 'request_figma_file',
          description: 'Request user to provide a Figma file URL for creating designs',
          inputSchema: {
            type: 'object',
            properties: {
              purpose: {
                type: 'string',
                description: 'Purpose for requesting the file (e.g., "create components", "edit design")',
              },
              prompt: {
                type: 'string',
                description: 'Custom prompt to show the user',
              },
            },
            required: ['purpose'],
          },
        },
        {
          name: 'create_frame',
          description: 'Create a new frame/artboard in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              parentNodeId: {
                type: 'string',
                description: 'ID of the parent node where the frame will be created',
              },
              name: {
                type: 'string',
                description: 'Name for the new frame',
              },
              x: {
                type: 'number',
                description: 'X position of the frame',
              },
              y: {
                type: 'number',
                description: 'Y position of the frame',
              },
              width: {
                type: 'number',
                description: 'Width of the frame',
              },
              height: {
                type: 'number',
                description: 'Height of the frame',
              },
            },
            required: ['figmaUrl', 'parentNodeId', 'name', 'x', 'y', 'width', 'height'],
          },
        },
        {
          name: 'create_shape',
          description: 'Create a new shape (rectangle, ellipse, polygon) in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              parentNodeId: {
                type: 'string',
                description: 'ID of the parent node where the shape will be created',
              },
              type: {
                type: 'string',
                enum: ['rectangle', 'ellipse', 'polygon'],
                description: 'Type of shape to create',
              },
              name: {
                type: 'string',
                description: 'Name for the new shape',
              },
              x: {
                type: 'number',
                description: 'X position of the shape',
              },
              y: {
                type: 'number',
                description: 'Y position of the shape',
              },
              width: {
                type: 'number',
                description: 'Width of the shape',
              },
              height: {
                type: 'number',
                description: 'Height of the shape',
              },
              fill: {
                type: 'object',
                description: 'Optional fill properties',
              },
              cornerRadius: {
                type: 'number',
                description: 'Optional corner radius (for rectangles)',
              },
              points: {
                type: 'number',
                description: 'Optional number of points (for polygons)',
              },
            },
            required: ['figmaUrl', 'parentNodeId', 'type', 'name', 'x', 'y', 'width', 'height'],
          },
        },
        {
          name: 'create_text',
          description: 'Create a new text element in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              parentNodeId: {
                type: 'string',
                description: 'ID of the parent node where the text will be created',
              },
              name: {
                type: 'string',
                description: 'Name for the new text element',
              },
              x: {
                type: 'number',
                description: 'X position of the text',
              },
              y: {
                type: 'number',
                description: 'Y position of the text',
              },
              width: {
                type: 'number',
                description: 'Width of the text box',
              },
              height: {
                type: 'number',
                description: 'Height of the text box',
              },
              characters: {
                type: 'string',
                description: 'Text content',
              },
              style: {
                type: 'object',
                description: 'Optional text style properties',
              },
            },
            required: ['figmaUrl', 'parentNodeId', 'name', 'x', 'y', 'width', 'height', 'characters'],
          },
        },
        {
          name: 'create_component',
          description: 'Create a new component in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              parentNodeId: {
                type: 'string',
                description: 'ID of the parent node where the component will be created',
              },
              name: {
                type: 'string',
                description: 'Name for the new component',
              },
              x: {
                type: 'number',
                description: 'X position of the component',
              },
              y: {
                type: 'number',
                description: 'Y position of the component',
              },
              width: {
                type: 'number',
                description: 'Width of the component',
              },
              height: {
                type: 'number',
                description: 'Height of the component',
              },
              childrenData: {
                type: 'array',
                description: 'Optional data for child nodes',
              },
            },
            required: ['figmaUrl', 'parentNodeId', 'name', 'x', 'y', 'width', 'height'],
          },
        },
        {
          name: 'create_component_instance',
          description: 'Create an instance of a component in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              parentNodeId: {
                type: 'string',
                description: 'ID of the parent node where the instance will be created',
              },
              componentKey: {
                type: 'string',
                description: 'Key of the component to instantiate',
              },
              name: {
                type: 'string',
                description: 'Name for the new instance',
              },
              x: {
                type: 'number',
                description: 'X position of the instance',
              },
              y: {
                type: 'number',
                description: 'Y position of the instance',
              },
              scaleX: {
                type: 'number',
                description: 'Optional X scale factor (1 = 100%)',
              },
              scaleY: {
                type: 'number',
                description: 'Optional Y scale factor (1 = 100%)',
              },
            },
            required: ['figmaUrl', 'parentNodeId', 'componentKey', 'name', 'x', 'y'],
          },
        },
        {
          name: 'update_node',
          description: 'Update properties of an existing node',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'ID of the node to update',
              },
              properties: {
                type: 'object',
                description: 'Properties to update',
              },
            },
            required: ['figmaUrl', 'nodeId', 'properties'],
          },
        },
        {
          name: 'delete_node',
          description: 'Delete a node from a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'ID of the node to delete',
              },
            },
            required: ['figmaUrl', 'nodeId'],
          },
        },
        {
          name: 'set_fill',
          description: 'Set the fill properties of a node',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'ID of the node',
              },
              fill: {
                type: 'object',
                description: 'Fill properties to set',
              },
            },
            required: ['figmaUrl', 'nodeId', 'fill'],
          },
        },
        {
          name: 'set_stroke',
          description: 'Set the stroke properties of a node',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'ID of the node',
              },
              stroke: {
                type: 'object',
                description: 'Stroke properties to set',
              },
              strokeWeight: {
                type: 'number',
                description: 'Optional stroke weight',
              },
            },
            required: ['figmaUrl', 'nodeId', 'stroke'],
          },
        },
        {
          name: 'set_effects',
          description: 'Set effects (shadows, blurs) on a node',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              nodeId: {
                type: 'string',
                description: 'ID of the node',
              },
              effects: {
                type: 'array',
                description: 'Effects to set',
              },
            },
            required: ['figmaUrl', 'nodeId', 'effects'],
          },
        },
        {
          name: 'smart_create_element',
          description: 'Create an element using existing components when available',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (any format)',
              },
              parentNodeId: {
                type: 'string',
                description: 'ID of the parent node',
              },
              type: {
                type: 'string',
                description: 'Type of element to create (rectangle, ellipse, text, etc.)',
              },
              name: {
                type: 'string',
                description: 'Name for the new element',
              },
              x: {
                type: 'number',
                description: 'X position',
              },
              y: {
                type: 'number',
                description: 'Y position',
              },
              width: {
                type: 'number',
                description: 'Width',
              },
              height: {
                type: 'number',
                description: 'Height',
              },
              properties: {
                type: 'object',
                description: 'Additional properties for the element',
              },
            },
            required: ['figmaUrl', 'parentNodeId', 'type', 'name', 'x', 'y', 'width', 'height'],
          },
        },
        {
          name: 'list_available_components',
          description: 'List all available components in a file grouped by type',
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
          // Design creation tools
          case 'request_figma_file': {
            if (typeof args.purpose !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'purpose must be a string');
            }
            
            // Use custom prompt if provided, otherwise generate one based on purpose
            const promptText = typeof args.prompt === 'string' 
              ? args.prompt 
              : `To ${args.purpose}, please provide a Figma file URL that you'd like to use.`;
            
            return {
              content: [
                {
                  type: 'text',
                  text: `${promptText}\n\nThe URL should be in the format: https://www.figma.com/file/XXXXXX/...\n\nOnce you provide the URL, I'll use it as the base for creating your designs.`,
                },
              ],
            };
          }
          case 'create_frame': {
            if (typeof args.figmaUrl !== 'string' || typeof args.parentNodeId !== 'string' ||
                typeof args.name !== 'string' || typeof args.x !== 'number' ||
                typeof args.y !== 'number' || typeof args.width !== 'number' ||
                typeof args.height !== 'number') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for create_frame');
            }
            return await this.createFrame({
              figmaUrl: args.figmaUrl,
              parentNodeId: args.parentNodeId,
              name: args.name,
              x: args.x,
              y: args.y,
              width: args.width,
              height: args.height
            });
          }
          case 'create_shape': {
            if (typeof args.figmaUrl !== 'string' || typeof args.parentNodeId !== 'string' ||
                typeof args.type !== 'string' || typeof args.name !== 'string' ||
                typeof args.x !== 'number' || typeof args.y !== 'number' ||
                typeof args.width !== 'number' || typeof args.height !== 'number') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for create_shape');
            }
            
            // Handle fill property correctly
            let singleFill;
            if (args.fill) {
              singleFill = Array.isArray(args.fill) ? args.fill[0] : args.fill;
            }
            
            return await this.createShape({
              figmaUrl: args.figmaUrl,
              parentNodeId: args.parentNodeId,
              type: args.type as 'rectangle' | 'ellipse' | 'polygon',
              name: args.name,
              x: args.x,
              y: args.y,
              width: args.width,
              height: args.height,
              fill: singleFill as FigmaFill | undefined,
              cornerRadius: typeof args.cornerRadius === 'number' ? args.cornerRadius : undefined,
              points: typeof args.points === 'number' ? args.points : undefined
            });
          }
          case 'create_text': {
            if (typeof args.figmaUrl !== 'string' || typeof args.parentNodeId !== 'string' ||
                typeof args.name !== 'string' || typeof args.x !== 'number' ||
                typeof args.y !== 'number' || typeof args.width !== 'number' ||
                typeof args.height !== 'number' || typeof args.characters !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for create_text');
            }
            return await this.createText({
              figmaUrl: args.figmaUrl,
              parentNodeId: args.parentNodeId,
              name: args.name,
              x: args.x,
              y: args.y,
              width: args.width,
              height: args.height,
              characters: args.characters,
              style: args.style as any
            });
          }
          case 'create_component': {
            if (typeof args.figmaUrl !== 'string' || typeof args.parentNodeId !== 'string' ||
                typeof args.name !== 'string' || typeof args.x !== 'number' ||
                typeof args.y !== 'number' || typeof args.width !== 'number' ||
                typeof args.height !== 'number') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for create_component');
            }
            return await this.createComponent({
              figmaUrl: args.figmaUrl,
              parentNodeId: args.parentNodeId,
              name: args.name,
              x: args.x,
              y: args.y,
              width: args.width,
              height: args.height,
              childrenData: Array.isArray(args.childrenData) ? args.childrenData : undefined
            });
          }
          case 'create_component_instance': {
            if (typeof args.figmaUrl !== 'string' || typeof args.parentNodeId !== 'string' ||
                typeof args.componentKey !== 'string' || typeof args.name !== 'string' ||
                typeof args.x !== 'number' || typeof args.y !== 'number') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for create_component_instance');
            }
            return await this.createComponentInstance({
              figmaUrl: args.figmaUrl,
              parentNodeId: args.parentNodeId,
              componentKey: args.componentKey,
              name: args.name,
              x: args.x,
              y: args.y,
              scaleX: typeof args.scaleX === 'number' ? args.scaleX : undefined,
              scaleY: typeof args.scaleY === 'number' ? args.scaleY : undefined
            });
          }
          case 'update_node': {
            if (typeof args.figmaUrl !== 'string' || typeof args.nodeId !== 'string' ||
                typeof args.properties !== 'object' || args.properties === null) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for update_node');
            }
            return await this.updateNode({
              figmaUrl: args.figmaUrl,
              nodeId: args.nodeId,
              properties: args.properties
            });
          }
          case 'delete_node': {
            if (typeof args.figmaUrl !== 'string' || typeof args.nodeId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for delete_node');
            }
            return await this.deleteNode({
              figmaUrl: args.figmaUrl,
              nodeId: args.nodeId
            });
          }
          case 'set_fill': {
            if (typeof args.figmaUrl !== 'string' || typeof args.nodeId !== 'string' ||
                typeof args.fill !== 'object' || args.fill === null) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for set_fill');
            }
            return await this.setFill({
              figmaUrl: args.figmaUrl,
              nodeId: args.nodeId,
              fill: args.fill as any
            });
          }
          case 'set_stroke': {
            if (typeof args.figmaUrl !== 'string' || typeof args.nodeId !== 'string' ||
                typeof args.stroke !== 'object' || args.stroke === null) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for set_stroke');
            }
            return await this.setStroke({
              figmaUrl: args.figmaUrl,
              nodeId: args.nodeId,
              stroke: args.stroke as any,
              strokeWeight: typeof args.strokeWeight === 'number' ? args.strokeWeight : undefined
            });
          }
          case 'set_effects': {
            if (typeof args.figmaUrl !== 'string' || typeof args.nodeId !== 'string' ||
                !Array.isArray(args.effects)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for set_effects');
            }
            return await this.setEffects({
              figmaUrl: args.figmaUrl,
              nodeId: args.nodeId,
              effects: args.effects
            });
          }
          case 'smart_create_element': {
            if (typeof args.figmaUrl !== 'string' || typeof args.parentNodeId !== 'string' ||
                typeof args.type !== 'string' || typeof args.name !== 'string' ||
                typeof args.x !== 'number' || typeof args.y !== 'number' ||
                typeof args.width !== 'number' || typeof args.height !== 'number') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for smart_create_element');
            }
            return await this.smartCreateElement({
              figmaUrl: args.figmaUrl,
              parentNodeId: args.parentNodeId,
              type: args.type,
              name: args.name,
              x: args.x,
              y: args.y,
              width: args.width,
              height: args.height,
              properties: args.properties
            });
          }
          case 'list_available_components': {
            if (typeof args.figmaUrl !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'figmaUrl must be a string');
            }
            return await this.listAvailableComponents({
              figmaUrl: args.figmaUrl
            });
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

  // Original handler methods
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

  // Design creation methods

  private async createFrame(args: CreateFrameArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Create the frame
      const frameId = await designCreator.createFrame(
        args.parentNodeId,
        args.name,
        args.x,
        args.y,
        args.width,
        args.height
      );
      
      return {
        content: [
          {
            type: 'text',
            text: `Created frame "${args.name}" with ID ${frameId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async createShape(args: CreateShapeArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Process the fill property - ensure it's a single fill object, not an array
      const singleFill = args.fill && Array.isArray(args.fill) ? args.fill[0] : args.fill;
      
      // Create the shape based on type
      let shapeId: string;
      
      switch(args.type) {
        case 'rectangle':
          shapeId = await designCreator.createRectangle(
            args.parentNodeId,
            args.name,
            args.x,
            args.y,
            args.width,
            args.height,
            singleFill as FigmaFill,
            args.cornerRadius
          );
          break;
        case 'ellipse':
          shapeId = await designCreator.createEllipse(
            args.parentNodeId,
            args.name,
            args.x,
            args.y,
            args.width,
            args.height,
            singleFill as FigmaFill
          );
          break;
        case 'polygon':
          if (typeof args.points !== 'number') {
            throw new McpError(ErrorCode.InvalidParams, 'points parameter is required for polygons');
          }
          shapeId = await designCreator.createPolygon(
            args.parentNodeId,
            args.name,
            args.x,
            args.y,
            args.width,
            args.height,
            args.points,
            singleFill as FigmaFill
          );
          break;
        default:
          throw new McpError(ErrorCode.InvalidParams, `Unsupported shape type: ${args.type}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Created ${args.type} "${args.name}" with ID ${shapeId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }
  
  private async createText(args: CreateTextArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Create the text element
      const textId = await designCreator.createText(
        args.parentNodeId,
        args.name,
        args.x,
        args.y,
        args.width,
        args.height,
        args.characters,
        args.style
      );
      
      return {
        content: [
          {
            type: 'text',
            text: `Created text element "${args.name}" with ID ${textId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }
  
  private async createComponent(args: CreateComponentArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Create the component
      const componentId = await designCreator.createComponent(
        args.parentNodeId,
        args.name,
        args.x,
        args.y,
        args.width,
        args.height,
        args.childrenData
      );
      
      return {
        content: [
          {
            type: 'text',
            text: `Created component "${args.name}" with ID ${componentId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }
  
  private async createComponentInstance(args: CreateComponentInstanceArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Create the component instance
      const instanceId = await designCreator.createComponentInstance(
        args.parentNodeId,
        args.componentKey,
        args.name,
        args.x,
        args.y,
        args.scaleX,
        args.scaleY
      );
      
      return {
        content: [
          {
            type: 'text',
            text: `Created component instance "${args.name}" with ID ${instanceId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async updateNode(args: UpdateNodeArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Update the node
      const success = await designCreator.updateNode(args.nodeId, args.properties);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async deleteNode(args: DeleteNodeArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Delete the node
      const success = await designCreator.deleteNode(args.nodeId);
      
      return {
        content: [
          {
            type: 'text',
            text: `Deleted node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async setFill(args: SetFillArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Set the fill
      const success = await designCreator.setFill(args.nodeId, Array.isArray(args.fill) ? args.fill : [args.fill]);
      
      return {
        content: [
          {
            type: 'text',
            text: `Set fill on node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async setStroke(args: SetStrokeArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Set the stroke
      const success = await designCreator.setStroke(args.nodeId, Array.isArray(args.stroke) ? args.stroke : [args.stroke], args.strokeWeight);
      
      return {
        content: [
          {
            type: 'text',
            text: `Set stroke on node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async setEffects(args: SetEffectsArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Set the effects
      const success = await designCreator.setEffects(args.nodeId, args.effects);
      
      return {
        content: [
          {
            type: 'text',
            text: `Set effects on node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }

  private async smartCreateElement(args: SmartCreateElementArgs) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new DesignCreator instance
      const designCreator = new DesignCreator(fileId, FIGMA_ACCESS_TOKEN!);
      
      // Create the element using smart component selection
      const elementId = await designCreator.smartCreateElement(
        args.parentNodeId,
        args.type,
        args.name,
        args.x,
        args.y,
        args.width,
        args.height,
        args.properties
      );
      
      return {
        content: [
          {
            type: 'text',
            text: `Created ${args.type} element "${args.name}" with ID ${elementId}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }
  
  private async listAvailableComponents(args: { figmaUrl: string }) {
    try {
      // Extract file ID from URL
      const { fileId } = extractFigmaIds(args.figmaUrl);
      
      // Create a new ComponentUtilizer instance
      const componentUtilizer = new ComponentUtilizer(new FigmaApiClient(fileId, FIGMA_ACCESS_TOKEN!));
      
      // List available components
      const components = await componentUtilizer.listAvailableComponents();
      
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma MCP server running on stdio');
  }
}

const server = new FigmaServer();
server.run().catch(console.error);
