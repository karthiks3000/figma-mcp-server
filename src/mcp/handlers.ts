/**
 * MCP Tool handlers for the Figma MCP server
 */
import { 
  CallToolRequestSchema,
  ErrorCode, 
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { 
  FigmaTool, 
  FigmaServerMode,
  ValidateTokenArgs,
  GetFileInfoArgs,
  GetNodeDetailsArgs,
  ExtractStylesArgs,
  GetAssetsArgs,
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
import { ModeManager } from '../mode-manager.js';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';

/**
 * MCP Tool handlers for the Figma MCP server
 */
export class ToolHandlers {
  private modeManager: ModeManager;
  private configManager: ConfigManager;
  private logger: Logger;
  
  /**
   * Create new Tool Handlers
   * @param modeManager Mode manager
   * @param configManager Configuration manager
   */
  constructor(modeManager: ModeManager, configManager: ConfigManager) {
    this.modeManager = modeManager;
    this.configManager = configManager;
    this.logger = createLogger('ToolHandlers', configManager);
    
    this.logger.debug('Tool Handlers initialized');
  }
  
  /**
   * Handle a tool call
   * @param request Tool call request
   * @returns Tool call response
   */
  async handleToolCall(request: any): Promise<any> {
    try {
      const toolName = request.params.name;
      const args = request.params.arguments as Record<string, unknown>;
      
      this.logger.debug(`Handling tool call: ${toolName}`, args);
      
      // Validate that arguments is an object
      if (!args || typeof args !== 'object') {
        throw new McpError(ErrorCode.InvalidParams, 'Arguments must be an object');
      }
      
      // Handle the tool call based on the tool name
      switch (toolName) {
        // Readonly mode tools
        case FigmaTool.VALIDATE_TOKEN:
          return await this.validateToken({
            figmaUrl: args.figmaUrl as string
          });
        case FigmaTool.GET_FILE_INFO:
          return await this.getFileInfo({
            figmaUrl: args.figmaUrl as string
          });
        case FigmaTool.GET_NODE_DETAILS:
          return await this.getNodeDetails({
            figmaUrl: args.figmaUrl as string,
            nodeId: args.nodeId as string | undefined,
            detailLevel: args.detailLevel as 'summary' | 'basic' | 'full' | undefined,
            properties: args.properties as string[] | undefined
          });
        case FigmaTool.EXTRACT_STYLES:
          return await this.extractStyles({
            figmaUrl: args.figmaUrl as string
          });
        case FigmaTool.GET_ASSETS:
          return await this.getAssets({
            figmaUrl: args.figmaUrl as string,
            nodeId: args.nodeId as string | undefined,
            format: args.format as 'jpg' | 'png' | 'svg' | 'pdf' | undefined,
            scale: args.scale as number | undefined
          });
        case FigmaTool.GET_VARIABLES:
          return await this.getVariables({
            figmaUrl: args.figmaUrl as string
          });
        case FigmaTool.IDENTIFY_COMPONENTS:
          return await this.identifyComponents({
            figmaUrl: args.figmaUrl as string,
            nodeId: args.nodeId as string | undefined
          });
        case FigmaTool.DETECT_VARIANTS:
          return await this.detectVariants({
            figmaUrl: args.figmaUrl as string
          });
        case FigmaTool.DETECT_RESPONSIVE:
          return await this.detectResponsive({
            figmaUrl: args.figmaUrl as string
          });
          
        // Write mode tools
        case FigmaTool.SWITCH_TO_WRITE_MODE:
          return await this.switchToWriteMode({
            prompt: args.prompt as string | undefined
          });
        case FigmaTool.CREATE_FRAME:
          return await this.createFrame({
            parentNodeId: args.parentNodeId as string,
            name: args.name as string,
            x: args.x as number,
            y: args.y as number,
            width: args.width as number,
            height: args.height as number
          });
        case FigmaTool.CREATE_SHAPE:
          return await this.createShape({
            parentNodeId: args.parentNodeId as string,
            type: args.type as 'rectangle' | 'ellipse' | 'polygon',
            name: args.name as string,
            x: args.x as number,
            y: args.y as number,
            width: args.width as number,
            height: args.height as number,
            fill: args.fill as any,
            cornerRadius: args.cornerRadius as number | undefined,
            points: args.points as number | undefined
          });
        case FigmaTool.CREATE_TEXT:
          return await this.createText({
            parentNodeId: args.parentNodeId as string,
            name: args.name as string,
            x: args.x as number,
            y: args.y as number,
            width: args.width as number,
            height: args.height as number,
            characters: args.characters as string,
            style: args.style as any
          });
        case FigmaTool.CREATE_COMPONENT:
          return await this.createComponent({
            parentNodeId: args.parentNodeId as string,
            name: args.name as string,
            x: args.x as number,
            y: args.y as number,
            width: args.width as number,
            height: args.height as number,
            childrenData: args.childrenData as any[] | undefined
          });
        case FigmaTool.CREATE_COMPONENT_INSTANCE:
          return await this.createComponentInstance({
            parentNodeId: args.parentNodeId as string,
            componentKey: args.componentKey as string,
            name: args.name as string,
            x: args.x as number,
            y: args.y as number,
            scaleX: args.scaleX as number | undefined,
            scaleY: args.scaleY as number | undefined
          });
        case FigmaTool.UPDATE_NODE:
          return await this.updateNode({
            nodeId: args.nodeId as string,
            properties: args.properties as any
          });
        case FigmaTool.DELETE_NODE:
          return await this.deleteNode({
            nodeId: args.nodeId as string
          });
        case FigmaTool.SET_FILL:
          return await this.setFill({
            nodeId: args.nodeId as string,
            fill: args.fill as any
          });
        case FigmaTool.SET_STROKE:
          return await this.setStroke({
            nodeId: args.nodeId as string,
            stroke: args.stroke as any,
            strokeWeight: args.strokeWeight as number | undefined
          });
        case FigmaTool.SET_EFFECTS:
          return await this.setEffects({
            nodeId: args.nodeId as string,
            effects: args.effects as any[]
          });
        case FigmaTool.SMART_CREATE_ELEMENT:
          return await this.smartCreateElement({
            parentNodeId: args.parentNodeId as string,
            type: args.type as string,
            name: args.name as string,
            x: args.x as number,
            y: args.y as number,
            width: args.width as number,
            height: args.height as number,
            properties: args.properties as any
          });
        case FigmaTool.LIST_AVAILABLE_COMPONENTS:
          return await this.listAvailableComponents();
          
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}`
          );
      }
    } catch (error) {
      this.logger.error(`Error handling tool call: ${request.params.name}`, error);
      
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }
  
  /**
   * Validate token
   * @param args Validate token arguments
   * @returns Validation result
   */
  private async validateToken(args: ValidateTokenArgs): Promise<any> {
    try {
      this.logger.debug(`Validating token for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Use getFileInfo to validate token
      await designManager.getFileInfo(args.figmaUrl);
      
      return {
        content: [
          {
            type: 'text',
            text: `Token validation successful. You have access to this Figma file.`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error validating token for ${args.figmaUrl}`, error);
      
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
  
  /**
   * Get file info
   * @param args Get file info arguments
   * @returns File info
   */
  private async getFileInfo(args: GetFileInfoArgs): Promise<any> {
    try {
      this.logger.debug(`Getting file info for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Get file info
      const fileInfo = await designManager.getFileInfo(args.figmaUrl);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(fileInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error getting file info for ${args.figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Get node details
   * @param args Get node details arguments
   * @returns Node details
   */
  private async getNodeDetails(args: GetNodeDetailsArgs): Promise<any> {
    try {
      this.logger.debug(`Getting node details for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Get node details
      const nodeDetails = await designManager.getNodeDetails(
        args.figmaUrl,
        args.nodeId,
        args.detailLevel,
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
      this.logger.error(`Error getting node details for ${args.figmaUrl}`, error);
      
      if (error instanceof Error && error.message.includes('Node not found')) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Node not found: ${error.message}`
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Extract styles
   * @param args Extract styles arguments
   * @returns Extracted styles
   */
  private async extractStyles(args: ExtractStylesArgs): Promise<any> {
    try {
      this.logger.debug(`Extracting styles for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Extract styles
      const styles = await designManager.extractStyles(args.figmaUrl);
      
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
      this.logger.error(`Error extracting styles for ${args.figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Get assets
   * @param args Get assets arguments
   * @returns Assets
   */
  private async getAssets(args: GetAssetsArgs): Promise<any> {
    try {
      this.logger.debug(`Getting assets for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Get assets
      const images = await designManager.getAssets(
        args.figmaUrl,
        args.nodeId,
        args.format,
        args.scale
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(images, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error getting assets for ${args.figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Get variables
   * @param args Get variables arguments
   * @returns Variables
   */
  private async getVariables(args: { figmaUrl: string }): Promise<any> {
    try {
      this.logger.debug(`Getting variables for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Get variables
      const variables = await designManager.getVariables(args.figmaUrl);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(variables, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error getting variables for ${args.figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Identify components
   * @param args Identify components arguments
   * @returns Identified components
   */
  private async identifyComponents(args: { figmaUrl: string; nodeId?: string }): Promise<any> {
    try {
      this.logger.debug(`Identifying components for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Identify components
      const components = await designManager.identifyUIComponents(args.figmaUrl, args.nodeId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(components, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error identifying components for ${args.figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Detect variants
   * @param args Detect variants arguments
   * @returns Detected variants
   */
  private async detectVariants(args: { figmaUrl: string }): Promise<any> {
    try {
      this.logger.debug(`Detecting variants for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Detect variants
      const variants = await designManager.detectComponentVariants(args.figmaUrl);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(variants, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error detecting variants for ${args.figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Detect responsive components
   * @param args Detect responsive components arguments
   * @returns Detected responsive components
   */
  private async detectResponsive(args: { figmaUrl: string }): Promise<any> {
    try {
      this.logger.debug(`Detecting responsive components for ${args.figmaUrl}`);
      
      // Get the design manager from the mode manager
      const designManager = this.modeManager.getReadonlyModeClient();
      
      // Detect responsive components
      const responsiveComponents = await designManager.detectResponsiveComponents(args.figmaUrl);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responsiveComponents, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error detecting responsive components for ${args.figmaUrl}`, error);
      throw error;
    }
  }
  
  /**
   * Switch to write mode
   * @param args Switch to write mode arguments
   * @returns Switch result
   */
  private async switchToWriteMode(args: { prompt?: string }): Promise<any> {
    try {
      this.logger.debug('Switching to write mode');
      console.log('[ToolHandlers] Switching to write mode');
      
      // Check if already in write mode
      if (this.modeManager.isWriteMode()) {
        console.log('[ToolHandlers] Already in write mode');
        return {
          content: [
            {
              type: 'text',
              text: 'Already in write mode. You can now create and update designs.',
            },
          ],
        };
      }
      
      // Switch to write mode
      console.log('[ToolHandlers] Calling switchToMode(WRITE)');
      const success = await this.modeManager.switchToMode(FigmaServerMode.WRITE);
      console.log(`[ToolHandlers] switchToMode result: ${success}`);
      
      if (!success) {
        console.log('[ToolHandlers] Failed to switch to write mode');
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to switch to write mode. Please make sure the Figma plugin is installed and running.',
            },
          ],
          isError: true,
        };
      }
      
      // Wait for the plugin bridge to connect to the plugin
      console.log('[ToolHandlers] Waiting for plugin to connect...');
      
      // Get the write mode bridge
      const bridge = this.modeManager.getWriteModeBridge();
      
      // Wait for the plugin to connect with a timeout
      let connected = false;
      let attempts = 0;
      const maxAttempts = 10; // Try up to 10 times
      
      while (!connected && attempts < maxAttempts) {
        console.log(`[ToolHandlers] Connection attempt ${attempts + 1}/${maxAttempts}`);
        
        // Check if the plugin is connected
        if (bridge.pluginBridge && bridge.pluginBridge.isConnected()) {
          connected = true;
          console.log('[ToolHandlers] Plugin connected successfully');
          break;
        }
        
        // Wait for 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      // If still not connected after all attempts, return an error
      if (!connected) {
        console.log('[ToolHandlers] Plugin connection timed out');
        
        // Switch back to readonly mode
        await this.modeManager.switchToMode(FigmaServerMode.READONLY);
        
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to connect to the Figma plugin. Please make sure the Figma plugin is installed and running.',
            },
          ],
          isError: true,
        };
      }
      
      // Use custom prompt if provided, otherwise use default
      const promptText = args.prompt ||
        'To create or update designs, please open the Figma desktop app and run the Figma MCP plugin. ' +
        'Once the plugin is connected, you can use the write mode tools to create and update designs.';
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully switched to write mode. ${promptText}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error switching to write mode', error);
      console.error('[ToolHandlers] Error switching to write mode:', error);
      throw error;
    }
  }
  
  /**
   * Create frame
   * @param args Create frame arguments
   * @returns Created frame
   */
  private async createFrame(args: CreateFrameArgs): Promise<any> {
    try {
      this.logger.debug(`Creating frame: ${args.name}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Create frame
      const frameId = await designCreator.createFrame(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created frame "${args.name}" with ID ${frameId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error creating frame: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create shape
   * @param args Create shape arguments
   * @returns Created shape
   */
  private async createShape(args: CreateShapeArgs): Promise<any> {
    try {
      this.logger.debug(`Creating shape: ${args.name} (${args.type})`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Create shape
      const shapeId = await designCreator.createShape(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created ${args.type} "${args.name}" with ID ${shapeId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error creating shape: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create text
   * @param args Create text arguments
   * @returns Created text
   */
  private async createText(args: CreateTextArgs): Promise<any> {
    try {
      this.logger.debug(`Creating text: ${args.name}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Create text
      const textId = await designCreator.createText(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created text element "${args.name}" with ID ${textId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error creating text: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create component
   * @param args Create component arguments
   * @returns Created component
   */
  private async createComponent(args: CreateComponentArgs): Promise<any> {
    try {
      this.logger.debug(`Creating component: ${args.name}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Create component
      const result = await designCreator.createComponent(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created component "${args.name}" with ID ${result.id} and key ${result.key}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error creating component: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Create component instance
   * @param args Create component instance arguments
   * @returns Created component instance
   */
  private async createComponentInstance(args: CreateComponentInstanceArgs): Promise<any> {
    try {
      this.logger.debug(`Creating component instance: ${args.name}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Create component instance
      const instanceId = await designCreator.createComponentInstance(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created component instance "${args.name}" with ID ${instanceId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error creating component instance: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * Update node
   * @param args Update node arguments
   * @returns Update result
   */
  private async updateNode(args: UpdateNodeArgs): Promise<any> {
    try {
      this.logger.debug(`Updating node: ${args.nodeId}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Update node
      await designCreator.updateNode(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error updating node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Delete node
   * @param args Delete node arguments
   * @returns Delete result
   */
  private async deleteNode(args: DeleteNodeArgs): Promise<any> {
    try {
      this.logger.debug(`Deleting node: ${args.nodeId}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Delete node
      await designCreator.deleteNode(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Deleted node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error deleting node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Set fill
   * @param args Set fill arguments
   * @returns Set fill result
   */
  private async setFill(args: SetFillArgs): Promise<any> {
    try {
      this.logger.debug(`Setting fill for node: ${args.nodeId}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Set fill
      await designCreator.setFill(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Set fill on node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error setting fill for node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Set stroke
   * @param args Set stroke arguments
   * @returns Set stroke result
   */
  private async setStroke(args: SetStrokeArgs): Promise<any> {
    try {
      this.logger.debug(`Setting stroke for node: ${args.nodeId}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Set stroke
      await designCreator.setStroke(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Set stroke on node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error setting stroke for node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Set effects
   * @param args Set effects arguments
   * @returns Set effects result
   */
  private async setEffects(args: SetEffectsArgs): Promise<any> {
    try {
      this.logger.debug(`Setting effects for node: ${args.nodeId}`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Set effects
      await designCreator.setEffects(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Set effects on node with ID ${args.nodeId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error setting effects for node: ${args.nodeId}`, error);
      throw error;
    }
  }
  
  /**
   * Smart create element
   * @param args Smart create element arguments
   * @returns Smart create element result
   */
  private async smartCreateElement(args: SmartCreateElementArgs): Promise<any> {
    try {
      this.logger.debug(`Smart creating element: ${args.name} (${args.type})`);
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // Smart create element
      const elementId = await designCreator.smartCreateElement(args);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created ${args.type} element "${args.name}" with ID ${elementId}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Error smart creating element: ${args.name}`, error);
      throw error;
    }
  }
  
  /**
   * List available components
   * @returns Available components
   */
  private async listAvailableComponents(): Promise<any> {
    try {
      this.logger.debug('Listing available components');
      
      // Check if in write mode
      this.ensureWriteMode();
      
      // Get the design creator from the mode manager
      const designCreator = this.modeManager.getWriteModeBridge();
      
      // List available components
      const components = await designCreator.listAvailableComponents();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(components, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error listing available components', error);
      throw error;
    }
  }
  
  /**
   * Ensure write mode
   * @throws Error if not in write mode
   */
  private ensureWriteMode(): void {
    if (!this.modeManager.isWriteMode()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'This tool requires write mode. Please use the switch_to_write_mode tool first.'
      );
    }
  }
}