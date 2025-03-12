/**
 * MCP Server for the Figma MCP server
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ModeManager } from '../mode-manager.js';
import { DesignManager } from '../readonly/design-manager.js';
import { PluginBridge } from '../write/plugin-bridge.js';
import { DesignCreator } from '../write/design-creator.js';
import { ComponentUtils } from '../write/component-utils.js';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';
import { ToolHandlers } from './handlers.js';
import { ALL_TOOLS, READONLY_TOOLS, WRITE_TOOLS } from './tools.js';
import { FigmaServerMode } from '../core/types.js';

/**
 * MCP Server for the Figma MCP server
 */
export class FigmaMcpServer {
  private server: Server;
  private modeManager: ModeManager;
  private configManager: ConfigManager;
  private toolHandlers: ToolHandlers;
  private logger: Logger;
  
  /**
   * Create a new Figma MCP Server
   * @param configManager Configuration manager
   */
  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.logger = createLogger('FigmaMcpServer', configManager);
    
    // Create mode manager
    this.modeManager = new ModeManager(configManager);
    
    // Initialize readonly mode
    const designManager = new DesignManager(configManager);
    this.modeManager.setReadonlyModeClient(designManager);
    
    // Initialize write mode components
    const pluginBridge = new PluginBridge(configManager);
    const designCreator = new DesignCreator(pluginBridge, configManager);
    const componentUtils = new ComponentUtils(pluginBridge, configManager);
    
    // Set write mode bridge
    this.modeManager.setWriteModeBridge({
      pluginBridge,
      designCreator,
      componentUtils,
      
      // Start the plugin bridge
      start: async () => {
        return await pluginBridge.start();
      },
      
      // Stop the plugin bridge
      stop: async () => {
        return await pluginBridge.stop();
      },
      
      // Forward methods from design creator
      createFrame: (args: any) => designCreator.createFrame(args),
      createShape: (args: any) => designCreator.createShape(args),
      createText: (args: any) => designCreator.createText(args),
      createComponent: (args: any) => designCreator.createComponent(args),
      createComponentInstance: (args: any) => designCreator.createComponentInstance(args),
      updateNode: (args: any) => designCreator.updateNode(args),
      deleteNode: (args: any) => designCreator.deleteNode(args),
      setFill: (args: any) => designCreator.setFill(args),
      setStroke: (args: any) => designCreator.setStroke(args),
      setEffects: (args: any) => designCreator.setEffects(args),
      smartCreateElement: (args: any) => designCreator.smartCreateElement(args),
      listAvailableComponents: () => designCreator.listAvailableComponents(),
    });
    
    // Create tool handlers
    this.toolHandlers = new ToolHandlers(this.modeManager, configManager);
    
    // Create MCP server
    this.server = new Server(
      {
        name: 'figma-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Set up request handlers
    this.setupRequestHandlers();
    
    // Set up error handler
    this.server.onerror = (error) => {
      this.logger.error('MCP server error', error);
    };
    
    // Set up signal handlers
    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });
    
    this.logger.info('Figma MCP server initialized');
  }
  
  /**
   * Set up request handlers
   */
  private setupRequestHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Get available tools based on current mode
      const tools = this.modeManager.getCurrentMode() === FigmaServerMode.READONLY
        ? READONLY_TOOLS
        : ALL_TOOLS;
      
      return { tools };
    });
    
    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await this.toolHandlers.handleToolCall(request);
      } catch (error) {
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
  
  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Figma MCP server');
      
      // Create transport
      const transport = new StdioServerTransport();
      
      // Connect to transport
      await this.server.connect(transport);
      
      this.logger.info('Figma MCP server running on stdio');
    } catch (error) {
      this.logger.error('Failed to start Figma MCP server', error);
      throw error;
    }
  }
  
  /**
   * Close the server
   */
  async close(): Promise<void> {
    try {
      this.logger.info('Closing Figma MCP server');
      
      // Close the server
      await this.server.close();
      
      this.logger.info('Figma MCP server closed');
    } catch (error) {
      this.logger.error('Failed to close Figma MCP server', error);
      throw error;
    }
  }
  
  /**
   * Handle a JSON-RPC request directly (for testing purposes)
   * @param requestJson JSON-RPC request as a string
   * @returns JSON-RPC response as a string
   */
  async handleRequest(requestJson: string): Promise<string> {
    try {
      // Parse the request
      const request = JSON.parse(requestJson);
      
      if (request.method === 'callTool' && request.params) {
        // Handle the tool call directly
        try {
          const toolResponse = await this.toolHandlers.handleToolCall({
            params: {
              name: request.params.name,
              arguments: request.params.arguments
            }
          });
          
          // Return successful response
          return JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: toolResponse
          });
        } catch (error) {
          if (error instanceof McpError) {
            return JSON.stringify({
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: error.code,
                message: error.message
              }
            });
          }
          
          throw error;
        }
      } else if (request.method === 'listTools') {
        // Get available tools based on current mode
        const tools = this.modeManager.getCurrentMode() === FigmaServerMode.READONLY
          ? READONLY_TOOLS
          : ALL_TOOLS;
        
        // Return successful response
        return JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: { tools }
        });
      }
      
      // Return method not found error for unsupported methods
      return JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: ErrorCode.MethodNotFound,
          message: `Method ${request.method} not supported`
        }
      });
    } catch (error) {
      this.logger.error('Failed to handle direct request', error);
      
      // Return a JSON-RPC error response
      return JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: ErrorCode.InternalError,
          message: `Failed to process request: ${(error as Error).message}`
        }
      });
    }
  }
}
