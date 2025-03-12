#!/usr/bin/env node
/**
 * RooCode Simulation Test
 * 
 * This script simulates how RooCode might be calling the switch_to_write_mode command
 * and then creating a complex poll results design in Figma through the MCP protocol.
 * 
 * Usage: node --loader ts-node/esm tests/roocode-simulation.ts
 */
import { ConfigManager } from '../src/core/config.js';
import { FigmaServerMode } from '../src/core/types.js';
import { FigmaMcpServer } from '../src/mcp/server.js';
import { createLogger } from '../src/core/logger.js';

// Store created node IDs for easier reference
interface CreatedNodes {
  frameId: string | null;
  titleId: string | null;
  agreeBackgroundBarId: string | null;
  agreeBarId: string | null;
  agreeTextId: string | null;
  agreePercentId: string | null;
  stronglyAgreeBackgroundBarId: string | null;
  stronglyAgreeBarId: string | null;
  stronglyAgreeTextId: string | null;
  stronglyAgreePercentId: string | null;
  disagreeBackgroundBarId: string | null;
  disagreeBarId: string | null;
  disagreeTextId: string | null;
  disagreePercentId: string | null;
  stronglyDisagreeBackgroundBarId: string | null;
  stronglyDisagreeBarId: string | null;
  stronglyDisagreeTextId: string | null;
  stronglyDisagreePercentId: string | null;
  dividerId: string | null;
}

/**
 * Main function to run the RooCode simulation test
 */
async function main() {
  try {
    console.log('=== Starting RooCode Simulation Test ===');
    
  // Create configuration manager
  console.log('Creating ConfigManager...');
  const configManager = new ConfigManager({
    accessToken: process.env.FIGMA_ACCESS_TOKEN || 'test-token',
    debug: true
  });
    
    // Create logger
    console.log('Creating logger...');
    const logger = createLogger('RooCodeSim', configManager);
    
    // Create and start MCP server
    console.log('Creating FigmaMcpServer...');
    const mcpServer = new FigmaMcpServer(configManager);
    
    console.log('Starting FigmaMcpServer...');
    await mcpServer.start();
    
    // Simulate RooCode calling the switch_to_write_mode command through MCP
    console.log('Simulating RooCode calling switch_to_write_mode command...');
    
    // Create a request to call the switch_to_write_mode tool
    const request = {
      jsonrpc: '2.0',
      id: 'roocode-test',
      method: 'callTool',
      params: {
        name: 'switch_to_write_mode',
        arguments: {
          prompt: 'Testing switch to write mode command from RooCode'
        }
      }
    };
    
    console.log('Sending request to MCP server...');
    const responseJson = await mcpServer.handleRequest(JSON.stringify(request));
    const response = JSON.parse(responseJson);
    
    console.log('Response from MCP server:', response);
    
    // Check if the command was successful
    if (response.error) {
      console.log('Command failed with error:', response.error);
    } else if (response.result && response.result.isError) {
      console.log('Command failed:', response.result.content[0].text);
    } else {
      console.log('Command succeeded:', response.result.content[0].text);
      
      // Get the ModeManager from the server
      const modeManager = (mcpServer as any).modeManager;
      if (!modeManager) {
        throw new Error('ModeManager not found on server');
      }
      
      console.log('Current mode:', modeManager.getCurrentMode());
      
      // Get the write mode bridge
      const bridge = modeManager.getWriteModeBridge();
      if (!bridge || !bridge.pluginBridge) {
        throw new Error('Write mode bridge not accessible');
      }
      
      console.log('Plugin connection status:', {
        isConnected: bridge.pluginBridge.isConnected(),
        connectionCount: bridge.pluginBridge.getConnectionCount(),
        plugins: bridge.pluginBridge.getConnectedPlugins()
      });
      
      // Initialize storage for created nodes
      const createdNodes: CreatedNodes = {
        frameId: null,
        titleId: null,
        agreeBackgroundBarId: null,
        agreeBarId: null,
        agreeTextId: null,
        agreePercentId: null,
        stronglyAgreeBackgroundBarId: null,
        stronglyAgreeBarId: null,
        stronglyAgreeTextId: null,
        stronglyAgreePercentId: null,
        disagreeBackgroundBarId: null,
        disagreeBarId: null,
        disagreeTextId: null,
        disagreePercentId: null,
        stronglyDisagreeBackgroundBarId: null,
        stronglyDisagreeBarId: null,
        stronglyDisagreeTextId: null,
        stronglyDisagreePercentId: null,
        dividerId: null
      };
      
      // Create the poll results design
      console.log('Creating poll results design...');
      
      // 1. Create main frame
      console.log('Creating main frame...');
      const frameResponse = await bridge.pluginBridge.sendCommand('create-frame', {
        parentNodeId: 'CURRENT_PAGE',
        name: 'Poll Results',
        x: 0,
        y: 0,
        width: 400,
        height: 260,
        fill: {
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1, a: 1 } // White background
        },
        stroke: {
          type: 'SOLID',
          color: { r: 0.8, g: 0.8, b: 0.8, a: 1 } // Light gray border
        },
        strokeWeight: 1,
        cornerRadius: 0
      });
      
      if (!frameResponse.success) {
        throw new Error('Failed to create frame');
      }
      
      createdNodes.frameId = frameResponse.result.id;
      console.log(`Created frame with ID: ${createdNodes.frameId}`);
      
      // 2. Create header text
      console.log('Creating header text...');
      const titleResponse = await bridge.pluginBridge.sendCommand('create-text', {
        parentNodeId: createdNodes.frameId,
        name: 'Header',
        x: 20,
        y: 20,
        width: 360,
        height: 30,
        characters: '30 Responses',
        style: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 500,
          textAlignHorizontal: 'LEFT'
        }
      });
      
      if (!titleResponse.success) {
        throw new Error('Failed to create title text');
      }
      
      createdNodes.titleId = titleResponse.result.id;
      console.log(`Created title with ID: ${createdNodes.titleId}`);
      
      // 3. Create Agree section
      
      // 3.1 Create Agree background bar
      console.log('Creating Agree background bar...');
      const agreeBackgroundBarResponse = await bridge.pluginBridge.sendCommand('create-rectangle', {
        parentNodeId: createdNodes.frameId,
        name: 'Agree-Background',
        x: 20,
        y: 95,
        width: 280,
        height: 8,
        fill: {
          type: 'SOLID',
          color: { r: 0.95, g: 0.95, b: 0.95, a: 1 } // Light gray
        },
        cornerRadius: 4
      });
      
      if (!agreeBackgroundBarResponse.success) {
        throw new Error('Failed to create Agree background bar');
      }
      
      createdNodes.agreeBackgroundBarId = agreeBackgroundBarResponse.result.id;
      console.log(`Created Agree background bar with ID: ${createdNodes.agreeBackgroundBarId}`);
      
      // 3.2 Create Agree progress bar
      console.log('Creating Agree progress bar...');
      const agreeBarResponse = await bridge.pluginBridge.sendCommand('create-rectangle', {
        parentNodeId: createdNodes.frameId,
        name: 'Agree-ProgressBar',
        x: 20,
        y: 95,
        width: 112, // 40% of 280
        height: 8,
        fill: {
          type: 'GRADIENT_LINEAR',
          gradientStops: [
            { position: 0, color: { r: 0.95, g: 0.3, b: 0.1, a: 1 } },  // Red
            { position: 1, color: { r: 1, g: 0.8, b: 0.2, a: 1 } }      // Yellow
          ],
          gradientTransform: [[1, 0, 0], [0, 1, 0]]
        },
        cornerRadius: 4
      });
      
      if (!agreeBarResponse.success) {
        throw new Error('Failed to create Agree progress bar');
      }
      
      createdNodes.agreeBarId = agreeBarResponse.result.id;
      console.log(`Created Agree progress bar with ID: ${createdNodes.agreeBarId}`);
      
      // 3.3 Create Agree text
      console.log('Creating Agree text...');
      const agreeTextResponse = await bridge.pluginBridge.sendCommand('create-text', {
        parentNodeId: createdNodes.frameId,
        name: 'Agree Text',
        x: 20,
        y: 70,
        width: 150,
        height: 24,
        characters: 'Agree',
        style: {
          fontFamily: 'Inter',
          fontSize: 14,
          fontWeight: 400
        }
      });
      
      if (!agreeTextResponse.success) {
        throw new Error('Failed to create Agree text');
      }
      
      createdNodes.agreeTextId = agreeTextResponse.result.id;
      console.log(`Created Agree text with ID: ${createdNodes.agreeTextId}`);
      
      // 3.4 Create Agree percentage
      console.log('Creating Agree percentage...');
      const agreePercentResponse = await bridge.pluginBridge.sendCommand('create-text', {
        parentNodeId: createdNodes.frameId,
        name: 'Agree-Stats',
        x: 310,
        y: 70,
        width: 70,
        height: 24,
        characters: '40% (12)',
        style: {
          fontFamily: 'Inter',
          fontSize: 12,
          textAlignHorizontal: 'RIGHT'
        }
      });
      
      if (!agreePercentResponse.success) {
        throw new Error('Failed to create Agree percentage');
      }
      
      createdNodes.agreePercentId = agreePercentResponse.result.id;
      console.log(`Created Agree percentage with ID: ${createdNodes.agreePercentId}`);
      
      // 4. Create Strongly Agree section
      
      // 4.1 Create Strongly Agree background bar
      console.log('Creating Strongly Agree background bar...');
      const stronglyAgreeBackgroundBarResponse = await bridge.pluginBridge.sendCommand('create-rectangle', {
        parentNodeId: createdNodes.frameId,
        name: 'Strongly Agree-Background',
        x: 20,
        y: 135,
        width: 280,
        height: 8,
        fill: {
          type: 'SOLID',
          color: { r: 0.95, g: 0.95, b: 0.95, a: 1 } // Light gray
        },
        cornerRadius: 4
      });
      
      if (!stronglyAgreeBackgroundBarResponse.success) {
        throw new Error('Failed to create Strongly Agree background bar');
      }
      
      createdNodes.stronglyAgreeBackgroundBarId = stronglyAgreeBackgroundBarResponse.result.id;
      console.log(`Created Strongly Agree background bar with ID: ${createdNodes.stronglyAgreeBackgroundBarId}`);
      
      // Complete additional elements of the design
      await createRemainingElements(bridge.pluginBridge, createdNodes);
      
      // Switch back to readonly mode
      console.log('Switching back to readonly mode...');
      const switchBackResult = await modeManager.switchToMode(FigmaServerMode.READONLY);
      console.log(`Switch back result: ${switchBackResult}`);
      console.log(`Final mode: ${modeManager.getCurrentMode()}`);
    }
    
    // Close the server
    console.log('Closing FigmaMcpServer...');
    await mcpServer.close();
    
    console.log('=== RooCode Simulation Test Completed ===');
    
    // Ensure the process exits
    process.exit(0);
  } catch (error: any) {
    console.log('Test error:', error.message);
    process.exit(1);
  }
}

/**
 * Creates the remaining elements of the poll results design
 * @param pluginBridge The plugin bridge to use for sending commands
 * @param createdNodes Object to store created node IDs
 */
async function createRemainingElements(pluginBridge: any, createdNodes: CreatedNodes): Promise<void> {
  // 4.2 Create Strongly Agree progress bar
  console.log('Creating Strongly Agree progress bar...');
  const stronglyAgreeBarResponse = await pluginBridge.sendCommand('create-rectangle', {
    parentNodeId: createdNodes.frameId,
    name: 'Strongly Agree-ProgressBar',
    x: 20,
    y: 135,
    width: 28, // 10% of 280
    height: 8,
    fill: {
      type: 'SOLID',
      color: { r: 0.2, g: 0.7, b: 0.4, a: 1 } // Green
    },
    cornerRadius: 4
  });
  
  if (!stronglyAgreeBarResponse.success) {
    throw new Error('Failed to create Strongly Agree progress bar');
  }
  
  createdNodes.stronglyAgreeBarId = stronglyAgreeBarResponse.result.id;
  console.log(`Created Strongly Agree progress bar with ID: ${createdNodes.stronglyAgreeBarId}`);
  
  // 4.3 Create Strongly Agree text
  console.log('Creating Strongly Agree text...');
  const stronglyAgreeTextResponse = await pluginBridge.sendCommand('create-text', {
    parentNodeId: createdNodes.frameId,
    name: 'Strongly Agree Text',
    x: 20,
    y: 110,
    width: 150,
    height: 24,
    characters: 'Strongly Agree',
    style: {
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: 600 // Bold for "Strongly" options
    }
  });
  
  if (!stronglyAgreeTextResponse.success) {
    throw new Error('Failed to create Strongly Agree text');
  }
  
  createdNodes.stronglyAgreeTextId = stronglyAgreeTextResponse.result.id;
  console.log(`Created Strongly Agree text with ID: ${createdNodes.stronglyAgreeTextId}`);
  
  // 4.4 Create Strongly Agree percentage
  console.log('Creating Strongly Agree percentage...');
  const stronglyAgreePercentResponse = await pluginBridge.sendCommand('create-text', {
    parentNodeId: createdNodes.frameId,
    name: 'Strongly Agree-Stats',
    x: 310,
    y: 110,
    width: 70,
    height: 24,
    characters: '10% (3)',
    style: {
      fontFamily: 'Inter',
      fontSize: 12,
      textAlignHorizontal: 'RIGHT'
    }
  });
  
  if (!stronglyAgreePercentResponse.success) {
    throw new Error('Failed to create Strongly Agree percentage');
  }
  
  createdNodes.stronglyAgreePercentId = stronglyAgreePercentResponse.result.id;
  console.log(`Created Strongly Agree percentage with ID: ${createdNodes.stronglyAgreePercentId}`);
  
  // 5. Create Disagree section
  
  // 5.1 Create Disagree background bar
  console.log('Creating Disagree background bar...');
  const disagreeBackgroundBarResponse = await pluginBridge.sendCommand('create-rectangle', {
    parentNodeId: createdNodes.frameId,
    name: 'Disagree-Background',
    x: 20,
    y: 175,
    width: 280,
    height: 8,
    fill: {
      type: 'SOLID',
      color: { r: 0.95, g: 0.95, b: 0.95, a: 1 } // Light gray
    },
    cornerRadius: 4
  });
  
  if (!disagreeBackgroundBarResponse.success) {
    throw new Error('Failed to create Disagree background bar');
  }
  
  createdNodes.disagreeBackgroundBarId = disagreeBackgroundBarResponse.result.id;
  console.log(`Created Disagree background bar with ID: ${createdNodes.disagreeBackgroundBarId}`);
  
  // 5.2 Create Disagree progress bar
  console.log('Creating Disagree progress bar...');
  const disagreeBarResponse = await pluginBridge.sendCommand('create-rectangle', {
    parentNodeId: createdNodes.frameId,
    name: 'Disagree-ProgressBar',
    x: 20,
    y: 175,
    width: 140, // 50% of 280
    height: 8,
    fill: {
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { position: 0, color: { r: 0.1, g: 0.4, b: 0.9, a: 1 } },  // Blue
        { position: 1, color: { r: 0.1, g: 0.7, b: 0.7, a: 1 } }   // Teal
      ],
      gradientTransform: [[1, 0, 0], [0, 1, 0]]
    },
    cornerRadius: 4
  });
  
  if (!disagreeBarResponse.success) {
    throw new Error('Failed to create Disagree progress bar');
  }
  
  createdNodes.disagreeBarId = disagreeBarResponse.result.id;
  console.log(`Created Disagree progress bar with ID: ${createdNodes.disagreeBarId}`);
  
  // 5.3 Create Disagree text
  console.log('Creating Disagree text...');
  const disagreeTextResponse = await pluginBridge.sendCommand('create-text', {
    parentNodeId: createdNodes.frameId,
    name: 'Disagree Text',
    x: 20,
    y: 150,
    width: 100,
    height: 24,
    characters: 'Disagree',
    style: {
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: 400
    }
  });
  
  if (!disagreeTextResponse.success) {
    throw new Error('Failed to create Disagree text');
  }
  
  createdNodes.disagreeTextId = disagreeTextResponse.result.id;
  console.log(`Created Disagree text with ID: ${createdNodes.disagreeTextId}`);
  
  // 5.4 Create Disagree percentage
  console.log('Creating Disagree percentage...');
  const disagreePercentResponse = await pluginBridge.sendCommand('create-text', {
    parentNodeId: createdNodes.frameId,
    name: 'Disagree-Stats',
    x: 310,
    y: 150,
    width: 70,
    height: 24,
    characters: '50% (15)',
    style: {
      fontFamily: 'Inter',
      fontSize: 12,
      textAlignHorizontal: 'RIGHT'
    }
  });
  
  if (!disagreePercentResponse.success) {
    throw new Error('Failed to create Disagree percentage');
  }
  
  createdNodes.disagreePercentId = disagreePercentResponse.result.id;
  console.log(`Created Disagree percentage with ID: ${createdNodes.disagreePercentId}`);
  
  // 6. Create Strongly Disagree section
  
  // 6.1 Create Strongly Disagree background bar
  console.log('Creating Strongly Disagree background bar...');
  const stronglyDisagreeBackgroundBarResponse = await pluginBridge.sendCommand('create-rectangle', {
    parentNodeId: createdNodes.frameId,
    name: 'Strongly Disagree-Background',
    x: 20,
    y: 215,
    width: 280,
    height: 8,
    fill: {
      type: 'SOLID',
      color: { r: 0.95, g: 0.95, b: 0.95, a: 1 } // Light gray
    },
    cornerRadius: 4
  });
  
  if (!stronglyDisagreeBackgroundBarResponse.success) {
    throw new Error('Failed to create Strongly Disagree background bar');
  }
  
  createdNodes.stronglyDisagreeBackgroundBarId = stronglyDisagreeBackgroundBarResponse.result.id;
  console.log(`Created Strongly Disagree background bar with ID: ${createdNodes.stronglyDisagreeBackgroundBarId}`);
  
  // 6.2 Create Strongly Disagree progress bar
  console.log('Creating Strongly Disagree progress bar...');
  const stronglyDisagreeBarResponse = await pluginBridge.sendCommand('create-rectangle', {
    parentNodeId: createdNodes.frameId,
    name: 'Strongly Disagree-ProgressBar',
    x: 20,
    y: 215,
    width: 0, // 0% of 280
    height: 8,
    fill: {
      type: 'SOLID',
      color: { r: 0.4, g: 0.8, b: 1.0, a: 1 } // Very light blue (not visible as width is 0)
    },
    cornerRadius: 4
  });
  
  if (!stronglyDisagreeBarResponse.success) {
    throw new Error('Failed to create Strongly Disagree progress bar');
  }
  
  createdNodes.stronglyDisagreeBarId = stronglyDisagreeBarResponse.result.id;
  console.log(`Created Strongly Disagree progress bar with ID: ${createdNodes.stronglyDisagreeBarId}`);
  
  // 6.3 Create Strongly Disagree text
  console.log('Creating Strongly Disagree text...');
  const stronglyDisagreeTextResponse = await pluginBridge.sendCommand('create-text', {
    parentNodeId: createdNodes.frameId,
    name: 'Strongly Disagree Text',
    x: 20,
    y: 190,
    width: 150,
    height: 24,
    characters: 'Strongly Disagree',
    style: {
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: 600 // Bold for "Strongly" options
    }
  });
  
  if (!stronglyDisagreeTextResponse.success) {
    throw new Error('Failed to create Strongly Disagree text');
  }
  
  createdNodes.stronglyDisagreeTextId = stronglyDisagreeTextResponse.result.id;
  console.log(`Created Strongly Disagree text with ID: ${createdNodes.stronglyDisagreeTextId}`);
  
  // 6.4 Create Strongly Disagree percentage
  console.log('Creating Strongly Disagree percentage...');
  const stronglyDisagreePercentResponse = await pluginBridge.sendCommand('create-text', {
    parentNodeId: createdNodes.frameId,
    name: 'Strongly Disagree-Stats',
    x: 310,
    y: 190,
    width: 70,
    height: 24,
    characters: '0% (0)',
    style: {
      fontFamily: 'Inter',
      fontSize: 12,
      textAlignHorizontal: 'RIGHT'
    }
  });
  
  if (!stronglyDisagreePercentResponse.success) {
    throw new Error('Failed to create Strongly Disagree percentage');
  }
  
  createdNodes.stronglyDisagreePercentId = stronglyDisagreePercentResponse.result.id;
  console.log(`Created Strongly Disagree percentage with ID: ${createdNodes.stronglyDisagreePercentId}`);
  
  // 7. Create divider
  console.log('Creating divider...');
  const dividerResponse = await pluginBridge.sendCommand('create-rectangle', {
    parentNodeId: createdNodes.frameId,
    name: 'Divider',
    x: 170,
    y: 235,
    width: 60,
    height: 2,
    fill: {
      type: 'SOLID',
      color: { r: 0.8, g: 0.8, b: 0.8, a: 1 } // Light gray
    }
  });
  
  if (!dividerResponse.success) {
    throw new Error('Failed to create divider');
  }
  
  createdNodes.dividerId = dividerResponse.result.id;
  console.log(`Created divider with ID: ${createdNodes.dividerId}`);
  console.log('Poll results design creation completed!');
}

// Run the test
console.log('Starting RooCode simulation test...');
main().catch((error: any) => {
  console.log('Unhandled error:', error.message);
  process.exit(1);
});
