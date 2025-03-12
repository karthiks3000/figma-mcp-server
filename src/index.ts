#!/usr/bin/env node
/**
 * Figma MCP Server
 * Main entry point
 */
import { ConfigManager } from './core/config.js';
import { Logger, createLogger } from './core/logger.js';
import { FigmaMcpServer } from './mcp/server.js';
import { DesignManager } from './readonly/design-manager.js';
import { PluginBridge } from './write/plugin-bridge.js';
import { DesignCreator } from './write/design-creator.js';
import { ComponentUtils } from './write/component-utils.js';
import { ModeManager } from './mode-manager.js';

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Create configuration manager
    const configManager = new ConfigManager();
    
    // Create logger
    const logger = createLogger('Main', configManager);
    
    logger.info('Starting Figma MCP server');
    
    // Create mode manager
    const modeManager = new ModeManager(configManager);
    
    // Initialize readonly mode
    const designManager = new DesignManager(configManager);
    modeManager.setReadonlyModeClient(designManager);
    
    // Initialize write mode components
    const pluginBridge = new PluginBridge(configManager);
    const designCreator = new DesignCreator(pluginBridge, configManager);
    const componentUtils = new ComponentUtils(pluginBridge, configManager);
    
    // Set write mode bridge
    modeManager.setWriteModeBridge({
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
    
    // Create and start MCP server
    const mcpServer = new FigmaMcpServer(configManager);
    await mcpServer.start();
    
    logger.info('Figma MCP server started');
    
    // Handle process signals
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal');
      
      // Stop the plugin bridge if running
      if (pluginBridge.isRunning) {
        await pluginBridge.stop();
      }
      
      // Exit process
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start Figma MCP server:', error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
