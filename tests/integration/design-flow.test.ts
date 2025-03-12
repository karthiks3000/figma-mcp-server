/**
 * Integration test for the Figma MCP server
 * Tests the flow from creating designs to reading them
 *
 * This test preserves the real connection to the Figma plugin
 * similar to the original design-flow-test.js
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { WebSocketServer, WebSocket as WS } from 'ws';
import { waitForCondition, sleep, logWithTimestamp } from '../utils/testHelpers.js';

// Use WS type for WebSocket connections
type WebSocketConnection = WS;

// Define types for messages and responses
interface PluginMessage {
  type: string;
  id?: string;
  data?: any;
  command?: string;
  params?: any;
  responseRequired?: boolean;
}

interface ResponseMessage {
  id: string;
  success: boolean;
  result: {
    id: string;
    [key: string]: any;
  };
}

// Interface for created nodes
interface CreatedNodes {
  frameId: string | null;
  titleId: string | null;
  subtitleId: string | null;
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

describe('Design Flow Integration', () => {
  // Skip tests if no token is provided
  const skipIfNoToken = () => {
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      test.skip('Skipping design flow test (no token)', () => {});
      return true;
    }
    return false;
  };

  // Only run this test if a token is provided
  (skipIfNoToken() ? describe.skip : describe)('Design Flow', () => {
    // Global variables
    let wsServer: WebSocketServer;
    let pluginConnection: WebSocketConnection | null = null;
    let testCompleted = false;
    
    // Command IDs
    const frameCommandId = 'create-frame-command';
    const titleCommandId = 'create-title-command';
    const subtitleCommandId = 'create-subtitle-command';
    const agreeBackgroundBarCommandId = 'create-agree-background-bar-command';
    const agreeBarCommandId = 'create-agree-bar-command';
    const agreeTextCommandId = 'create-agree-text-command';
    const agreePercentCommandId = 'create-agree-percent-command';
    const stronglyAgreeBackgroundBarCommandId = 'create-strongly-agree-background-bar-command';
    const stronglyAgreeBarCommandId = 'create-strongly-agree-bar-command';
    const stronglyAgreeTextCommandId = 'create-strongly-agree-text-command';
    const stronglyAgreePercentCommandId = 'create-strongly-agree-percent-command';
    const disagreeBackgroundBarCommandId = 'create-disagree-background-bar-command';
    const disagreeBarCommandId = 'create-disagree-bar-command';
    const disagreeTextCommandId = 'create-disagree-text-command';
    const disagreePercentCommandId = 'create-disagree-percent-command';
    const stronglyDisagreeBackgroundBarCommandId = 'create-strongly-disagree-background-bar-command';
    const stronglyDisagreeBarCommandId = 'create-strongly-disagree-bar-command';
    const stronglyDisagreeTextCommandId = 'create-strongly-disagree-text-command';
    const stronglyDisagreePercentCommandId = 'create-strongly-disagree-percent-command';
    const dividerCommandId = 'create-divider-command';
    
    // Store created node IDs
    const createdNodes: CreatedNodes = {
      frameId: null,
      titleId: null,
      subtitleId: null,
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
    
    // Test completion status
    let frameCreated = false;
    let titleCreated = false;
    let subtitleCreated = false;
    let agreeBackgroundBarCreated = false;
    let agreeBarCreated = false;
    let agreeTextCreated = false;
    let agreePercentCreated = false;
    let stronglyAgreeBackgroundBarCreated = false;
    let stronglyAgreeBarCreated = false;
    let stronglyAgreeTextCreated = false;
    let stronglyAgreePercentCreated = false;
    let disagreeBackgroundBarCreated = false;
    let disagreeBarCreated = false;
    let disagreeTextCreated = false;
    let disagreePercentCreated = false;
    let stronglyDisagreeBackgroundBarCreated = false;
    let stronglyDisagreeBarCreated = false;
    let stronglyDisagreeTextCreated = false;
    let stronglyDisagreePercentCreated = false;
    let dividerCreated = false;
    
    beforeAll(async () => {
      const port = 8766;
      logWithTimestamp(`Starting WebSocket server on port ${port}...`);
      
      // Create WebSocket server with noServer option to avoid keeping the handle open
      wsServer = new WebSocketServer({
        port,
        // Close the server as soon as possible when the process exits
        perMessageDeflate: false,
        // Set a short timeout for closing connections
        clientTracking: true
      });
      
      // Set up connection handling
      wsServer.on('connection', (ws) => {
        logWithTimestamp('New connection!');
        pluginConnection = ws;
        
        // Set up message handler
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString()) as PluginMessage;
            logWithTimestamp('Received message:', message);
            
            // If it's a plugin-info message, send a response
            if (message.type === 'plugin-info') {
              logWithTimestamp('Plugin info received:', message.data);
              
              // Create a test frame
              createTestFrame(ws);
            }
            
            // If it's a response message, handle it
            if (message.type === 'response') {
              handleResponse(message.data);
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        });
        
        // Set up close handler
        ws.on('close', () => {
          logWithTimestamp('Connection closed');
          pluginConnection = null;
        });
        
        // Set up error handler
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      });
      
      // Set up server error handling
      wsServer.on('error', (error) => {
        console.error('WebSocket server error:', error);
      });
      
      logWithTimestamp('WebSocket server running. Waiting for connections...');
    }, 10000); // Longer timeout for setup
    
    afterAll(async () => {
      // Close the server
      logWithTimestamp('Closing WebSocket server...');
      
      // Force close any remaining connections
      if (wsServer && wsServer.clients) {
        wsServer.clients.forEach(client => {
          try {
            client.terminate();
          } catch (e) {
            console.error('Error terminating client:', e);
          }
        });
      }
      
      // Close the server with a promise to ensure it's fully closed
      if (wsServer) {
        await new Promise<void>((resolve) => {
          wsServer.close(() => {
            logWithTimestamp('WebSocket server closed');
            resolve();
          });
        });
      }
      
      // Add a small delay to ensure all resources are released
      await new Promise(resolve => setTimeout(resolve, 100));
    }, 5000); // Add timeout for cleanup
    
    test('should complete design flow successfully', async () => {
      // Wait for plugin connection (max 60 seconds)
      try {
        await waitForCondition(
          () => pluginConnection !== null,
          60000, // 60 second timeout
          1000   // Check every second
        );
        
        expect(pluginConnection).not.toBeNull();
        logWithTimestamp('Plugin connected successfully!');
        
        // Wait for test to complete (max 60 seconds)
        await waitForCondition(
          () => testCompleted,
          60000, // 60 second timeout
          1000   // Check every second
        );
        
        expect(testCompleted).toBe(true);
        logWithTimestamp('Design flow test completed successfully!');
      } catch (error) {
        if (!pluginConnection) {
          logWithTimestamp('Plugin not connected after timeout, skipping test');
          logWithTimestamp('Make sure the Figma plugin is running and connected to port 8766');
        } else {
          logWithTimestamp('Design flow test timed out');
        }
        
        // Fail the test
        expect(testCompleted).toBe(true);
      }
    }, 130000); // Longer timeout for the entire test (2 minutes + 10 seconds)
    
    /**
     * Create a poll results frame
     * @param ws WebSocket connection
     */
    function createTestFrame(ws: WebSocketConnection): void {
      logWithTimestamp('Creating poll results frame...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: frameCommandId,
        command: 'create-frame',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the header text
     * @param ws WebSocket connection
     */
    function createTitle(ws: WebSocketConnection): void {
      logWithTimestamp('Creating header text...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: titleCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the subtitle text
     * @param ws WebSocket connection
     */
    function createSubtitle(ws: WebSocketConnection): void {
      logWithTimestamp('Creating subtitle text...');
      
      // We'll create the Agree background bar instead of a subtitle
      createAgreeBackgroundBar(ws);
    }
    
    /**
     * Create the Agree text
     * @param ws WebSocket connection
     */
    function createAgreeText(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Agree text...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: agreeTextCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Agree background bar
     * @param ws WebSocket connection
     */
    function createAgreeBackgroundBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Agree background bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: agreeBackgroundBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Agree progress bar
     * @param ws WebSocket connection
     */
    function createAgreeBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Agree progress bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: agreeBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Agree percentage text
     * @param ws WebSocket connection
     */
    function createAgreePercent(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Agree percentage...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: agreePercentCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Agree text
     * @param ws WebSocket connection
     */
    function createStronglyAgreeText(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Agree text...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyAgreeTextCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Agree background bar
     * @param ws WebSocket connection
     */
    function createStronglyAgreeBackgroundBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Agree background bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyAgreeBackgroundBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Agree progress bar
     * @param ws WebSocket connection
     */
    function createStronglyAgreeBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Agree progress bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyAgreeBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Agree percentage text
     * @param ws WebSocket connection
     */
    function createStronglyAgreePercent(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Agree percentage...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyAgreePercentCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Disagree text
     * @param ws WebSocket connection
     */
    function createDisagreeText(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Disagree text...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: disagreeTextCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Disagree background bar
     * @param ws WebSocket connection
     */
    function createDisagreeBackgroundBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Disagree background bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: disagreeBackgroundBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Disagree progress bar
     * @param ws WebSocket connection
     */
    function createDisagreeBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Disagree progress bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: disagreeBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Disagree percentage text
     * @param ws WebSocket connection
     */
    function createDisagreePercent(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Disagree percentage...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: disagreePercentCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Disagree text
     * @param ws WebSocket connection
     */
    function createStronglyDisagreeText(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Disagree text...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyDisagreeTextCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Disagree background bar
     * @param ws WebSocket connection
     */
    function createStronglyDisagreeBackgroundBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Disagree background bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyDisagreeBackgroundBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Disagree progress bar
     * @param ws WebSocket connection
     */
    function createStronglyDisagreeBar(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Disagree progress bar...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyDisagreeBarCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create the Strongly Disagree percentage text
     * @param ws WebSocket connection
     */
    function createStronglyDisagreePercent(ws: WebSocketConnection): void {
      logWithTimestamp('Creating Strongly Disagree percentage...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: stronglyDisagreePercentCommandId,
        command: 'create-text',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Create a divider line at the bottom
     * @param ws WebSocket connection
     */
    function createDivider(ws: WebSocketConnection): void {
      logWithTimestamp('Creating divider...');
      
      ws.send(JSON.stringify({
        type: 'command',
        id: dividerCommandId,
        command: 'create-rectangle',
        params: {
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
        },
        responseRequired: true
      }));
    }
    
    /**
     * Handle a response from the plugin
     * @param response Response data
     */
    function handleResponse(response: ResponseMessage): void {
      logWithTimestamp('Response received:', response);
      
      if (response.id === frameCommandId && response.success) {
        createdNodes.frameId = response.result.id;
        logWithTimestamp(`Created frame with ID: ${createdNodes.frameId}`);
        frameCreated = true;
        
        // Create title
        createTitle(pluginConnection!);
      }
      
      else if (response.id === titleCommandId && response.success) {
        createdNodes.titleId = response.result.id;
        logWithTimestamp(`Created title with ID: ${createdNodes.titleId}`);
        titleCreated = true;
        
        // Create subtitle
        createSubtitle(pluginConnection!);
      }
      
      else if (response.id === agreeBackgroundBarCommandId && response.success) {
        createdNodes.agreeBackgroundBarId = response.result.id;
        logWithTimestamp(`Created Agree background bar with ID: ${createdNodes.agreeBackgroundBarId}`);
        agreeBackgroundBarCreated = true;
        
        // Create Agree progress bar
        createAgreeBar(pluginConnection!);
      }
      
      else if (response.id === agreeBarCommandId && response.success) {
        createdNodes.agreeBarId = response.result.id;
        logWithTimestamp(`Created Agree bar with ID: ${createdNodes.agreeBarId}`);
        agreeBarCreated = true;
        
        // Create Agree text
        createAgreeText(pluginConnection!);
      }
      
      else if (response.id === agreeTextCommandId && response.success) {
        createdNodes.agreeTextId = response.result.id;
        logWithTimestamp(`Created Agree text with ID: ${createdNodes.agreeTextId}`);
        agreeTextCreated = true;
        
        // Create Agree percentage
        createAgreePercent(pluginConnection!);
      }
      
      else if (response.id === agreePercentCommandId && response.success) {
        createdNodes.agreePercentId = response.result.id;
        logWithTimestamp(`Created Agree percentage with ID: ${createdNodes.agreePercentId}`);
        agreePercentCreated = true;
        
        // Create Strongly Agree background bar
        createStronglyAgreeBackgroundBar(pluginConnection!);
      }
      
      else if (response.id === stronglyAgreeBackgroundBarCommandId && response.success) {
        createdNodes.stronglyAgreeBackgroundBarId = response.result.id;
        logWithTimestamp(`Created Strongly Agree background bar with ID: ${createdNodes.stronglyAgreeBackgroundBarId}`);
        stronglyAgreeBackgroundBarCreated = true;
        
        // Create Strongly Agree progress bar
        createStronglyAgreeBar(pluginConnection!);
      }
      
      else if (response.id === stronglyAgreeBarCommandId && response.success) {
        createdNodes.stronglyAgreeBarId = response.result.id;
        logWithTimestamp(`Created Strongly Agree bar with ID: ${createdNodes.stronglyAgreeBarId}`);
        stronglyAgreeBarCreated = true;
        
        // Create Strongly Agree text
        createStronglyAgreeText(pluginConnection!);
      }
      
      else if (response.id === stronglyAgreeTextCommandId && response.success) {
        createdNodes.stronglyAgreeTextId = response.result.id;
        logWithTimestamp(`Created Strongly Agree text with ID: ${createdNodes.stronglyAgreeTextId}`);
        stronglyAgreeTextCreated = true;
        
        // Create Strongly Agree percentage
        createStronglyAgreePercent(pluginConnection!);
      }
      
      else if (response.id === stronglyAgreePercentCommandId && response.success) {
        createdNodes.stronglyAgreePercentId = response.result.id;
        logWithTimestamp(`Created Strongly Agree percentage with ID: ${createdNodes.stronglyAgreePercentId}`);
        stronglyAgreePercentCreated = true;
        
        // Create Disagree background bar
        createDisagreeBackgroundBar(pluginConnection!);
      }
      
      else if (response.id === disagreeBackgroundBarCommandId && response.success) {
        createdNodes.disagreeBackgroundBarId = response.result.id;
        logWithTimestamp(`Created Disagree background bar with ID: ${createdNodes.disagreeBackgroundBarId}`);
        disagreeBackgroundBarCreated = true;
        
        // Create Disagree progress bar
        createDisagreeBar(pluginConnection!);
      }
      
      else if (response.id === disagreeBarCommandId && response.success) {
        createdNodes.disagreeBarId = response.result.id;
        logWithTimestamp(`Created Disagree bar with ID: ${createdNodes.disagreeBarId}`);
        disagreeBarCreated = true;
        
        // Create Disagree text
        createDisagreeText(pluginConnection!);
      }
      
      else if (response.id === disagreeTextCommandId && response.success) {
        createdNodes.disagreeTextId = response.result.id;
        logWithTimestamp(`Created Disagree text with ID: ${createdNodes.disagreeTextId}`);
        disagreeTextCreated = true;
        
        // Create Disagree percentage
        createDisagreePercent(pluginConnection!);
      }
      
      else if (response.id === disagreePercentCommandId && response.success) {
        createdNodes.disagreePercentId = response.result.id;
        logWithTimestamp(`Created Disagree percentage with ID: ${createdNodes.disagreePercentId}`);
        disagreePercentCreated = true;
        
        // Create Strongly Disagree background bar
        createStronglyDisagreeBackgroundBar(pluginConnection!);
      }
      
      else if (response.id === stronglyDisagreeBackgroundBarCommandId && response.success) {
        createdNodes.stronglyDisagreeBackgroundBarId = response.result.id;
        logWithTimestamp(`Created Strongly Disagree background bar with ID: ${createdNodes.stronglyDisagreeBackgroundBarId}`);
        stronglyDisagreeBackgroundBarCreated = true;
        
        // Create Strongly Disagree progress bar
        createStronglyDisagreeBar(pluginConnection!);
      }
      
      else if (response.id === stronglyDisagreeBarCommandId && response.success) {
        createdNodes.stronglyDisagreeBarId = response.result.id;
        logWithTimestamp(`Created Strongly Disagree bar with ID: ${createdNodes.stronglyDisagreeBarId}`);
        stronglyDisagreeBarCreated = true;
        
        // Create Strongly Disagree text
        createStronglyDisagreeText(pluginConnection!);
      }
      
      else if (response.id === stronglyDisagreeTextCommandId && response.success) {
        createdNodes.stronglyDisagreeTextId = response.result.id;
        logWithTimestamp(`Created Strongly Disagree text with ID: ${createdNodes.stronglyDisagreeTextId}`);
        stronglyDisagreeTextCreated = true;
        
        // Create Strongly Disagree percentage
        createStronglyDisagreePercent(pluginConnection!);
      }
      
      else if (response.id === stronglyDisagreePercentCommandId && response.success) {
        createdNodes.stronglyDisagreePercentId = response.result.id;
        logWithTimestamp(`Created Strongly Disagree percentage with ID: ${createdNodes.stronglyDisagreePercentId}`);
        stronglyDisagreePercentCreated = true;
        
        // Create divider
        createDivider(pluginConnection!);
      }
      
      else if (response.id === dividerCommandId && response.success) {
        createdNodes.dividerId = response.result.id;
        logWithTimestamp(`Created divider with ID: ${createdNodes.dividerId}`);
        dividerCreated = true;
        
        // Test completed
        testCompleted = true;
      }
    }
  });
});
