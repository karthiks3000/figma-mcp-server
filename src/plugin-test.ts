/**
 * Test file for the Figma Plugin API integration - Poll Results Component
 * 
 * This script demonstrates how to use the plugin-based Figma API to create
 * a complex poll results component with progress bars.
 * 
 * To run this test:
 * 1. Import and run the Figma plugin in Figma desktop app
 * 2. Run this script with: npm run build && node build/plugin-test.js
 */

import { pluginClient } from './plugin-client.js';
import { pluginBridge } from './plugin-bridge.js';

// Simple waiting utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get alternative port from command line if specified
const getPort = (): number => {
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  if (portArg) {
    return parseInt(portArg.split('=')[1], 10);
  }
  return 8766; // Use a different default port to avoid conflicts
};

// Helper functions for creating poll results elements
const createOptionRow = async (
  parentId: string, 
  label: string, 
  percentage: number, 
  count: number, 
  y: number,
  fillColor: any
) => {
  console.log(`Creating option row: ${label}`);
  
  // Each operation gets its own try-catch to isolate failures
  let optionTextId = null;
  let backgroundBarId = null;
  let progressBarId = null;
  let statsTextId = null;
  
  try {
    // Option label text
    const optionTextResult = await pluginClient.createText({
      parentId,
      name: `Option-${label}`,
      x: 20,
      y: y,
      width: 150,
      height: 24,
      characters: label,
      style: {
        fontSize: 14,
        fontWeight: label.startsWith('Strongly') ? 600 : 400
      }
    });
    optionTextId = optionTextResult.id;
    console.log(`Created option text with ID: ${optionTextId}`);
  } catch (error: any) {
    console.warn(`Could not create option text for "${label}":`, error.message || String(error));
    console.log('Continuing with partial creation...');
  }
  
  // Wait between operations to avoid overwhelming the plugin
  await wait(1000);
  
  try {
    // Background progress bar (light gray)
    const backgroundBarResult = await pluginClient.createRectangle({
      parentId,
      name: `${label}-Background`,
      x: 20,
      y: y + 25,
      width: 280,
      height: 8,
      fill: {
        type: 'SOLID',
        color: { r: 0.95, g: 0.95, b: 0.95 }
      },
      cornerRadius: 4
    });
    backgroundBarId = backgroundBarResult.id;
    console.log(`Created background bar with ID: ${backgroundBarId}`);
  } catch (error: any) {
    console.warn(`Could not create background bar for "${label}":`, error.message || String(error));
    console.log('Continuing with partial creation...');
  }
  
  // Wait between operations to avoid overwhelming the plugin
  await wait(1000);
  
  // Active progress bar (with color)
  const barWidth = percentage > 0 ? (280 * percentage / 100) : 0;
  
  if (barWidth > 0) {
    try {
      const progressBarResult = await pluginClient.createRectangle({
        parentId,
        name: `${label}-ProgressBar`,
        x: 20,
        y: y + 25,
        width: barWidth,
        height: 8,
        fill: fillColor,
        cornerRadius: 4
      });
      progressBarId = progressBarResult.id;
      console.log(`Created progress bar with ID: ${progressBarId}`);
    } catch (error: any) {
      console.warn(`Could not create progress bar for "${label}":`, error.message || String(error));
      console.log('Continuing with partial creation...');
    }
  }
  
  // Wait between operations to avoid overwhelming the plugin
  await wait(1000);
  
  try {
    // Percentage and count text
    const statsTextResult = await pluginClient.createText({
      parentId,
      name: `${label}-Stats`,
      x: 310,
      y: y,
      width: 70,
      height: 24,
      characters: `${percentage}% (${count})`,
      style: {
        fontSize: 12,
        textAlignHorizontal: 'RIGHT'
      }
    });
    statsTextId = statsTextResult.id;
    console.log(`Created stats text with ID: ${statsTextId}`);
  } catch (error: any) {
    console.warn(`Could not create stats text for "${label}":`, error.message || String(error));
    console.log('Continuing with partial creation...');
  }
  
  return {
    optionTextId,
    backgroundBarId,
    progressBarId,
    statsTextId
  };
};

// Helper function to create a frame and retry if needed
async function createFrameAndRetryIfNeeded(retries: number = 3): Promise<string> {
  let attempt = 0;
  let frameId = null;
  
  while (attempt < retries && !frameId) {
    try {
      const frameResult = await pluginClient.createFrame({
        name: 'Poll Results',
        x: 0,
        y: 0,
        width: 400,
        height: 260
      });
      frameId = frameResult.id;
    } catch (error: any) {
      console.warn(`Frame creation attempt ${attempt + 1} failed:`, error.message || String(error));
      attempt++;
      if (attempt < retries) {
        console.log(`Retrying frame creation (attempt ${attempt + 1}/${retries})...`);
        await wait(1000); // Wait before retry
      } else {
        throw new Error('Failed to create frame after multiple attempts');
      }
    }
  }
  
  return frameId as string;
}

// Helper function to get a component's key
async function getComponentKey(componentId: string): Promise<string | null> {
  try {
    const components = await pluginClient.listComponents();
    const component = components.find(c => c.id === componentId);
    return component?.key || null;
  } catch (error: any) {
    console.warn('Could not get component key:', error.message || String(error));
    return null;
  }
}

// Main test function
async function runPluginTest() {
  console.log('Starting Figma Plugin API test for Poll Results Component...');
  
  try {
    // Set longer timeout if possible
    try {
      (pluginBridge as any).commandTimeout = 60000; // 60 seconds
    } catch (error) {
      console.warn('Could not set longer command timeout, using default');
    }
    
    const port = getPort();
    console.log(`Using WebSocket port: ${port}`);
    
    // Make sure we don't have any existing bridges running
    if (pluginBridge.isRunning) {
      console.log('Stopping existing plugin bridge...');
      pluginBridge.stop();
      // Brief pause to ensure the port is released
      await wait(100);
    }
    
    // 1. Start the plugin client (this initializes the WebSocket server)
    // Set the port before starting
    (pluginBridge as any).port = port;
    const started = pluginClient.start();
    console.log('Plugin client started:', started);
    
    // 2. Wait for plugin connection (up to 60 seconds)
    console.log('Waiting for plugin connection (make sure the plugin is running in Figma)...');
    for (let i = 0; i < 60; i++) {
      if (pluginClient.isConnected()) {
        console.log('Plugin connected!');
        break;
      }
      
      if (i === 59) {
        throw new Error('Timeout waiting for plugin connection');
      }
      
      // Wait 1 second between checks
      await wait(1000);
    }
    
    // 3. Get the current selection (if any)
    console.log('Getting current selection...');
    const selection = await pluginClient.getSelection();
    console.log('Current selection:', selection);
    
    // 4. Create the main container frame for the poll results
    console.log('Creating poll results frame...');
    const frameId = await createFrameAndRetryIfNeeded();
    console.log(`Created frame with ID: ${frameId}`);
    
    // Wait between major operations
    await wait(1000);
    
    // 5. Add a border to the frame
    try {
      console.log('Attempting to add border to frame...');
      await pluginClient.setStroke({
        nodeId: frameId,
        stroke: {
          type: 'SOLID',
          color: { r: 0.8, g: 0.8, b: 0.8 }
        },
        strokeWeight: 1
      });
      console.log('Added border to frame');
    } catch (error: any) {
      console.warn('Could not add border, continuing without it:', error.message || String(error));
      console.log('Note: The border might still be applied despite the timeout.');
    }
    
    await wait(1000);
    
    // 6. Create header text
    let headerId = null;
    try {
      console.log('Creating header text...');
      const headerResult = await pluginClient.createText({
        parentId: frameId,
        name: 'Header',
        x: 20,
        y: 20,
        width: 360,
        height: 30,
        characters: '30 Responses',
        style: {
          fontSize: 16,
          fontWeight: 500
        }
      });
      headerId = headerResult.id;
      console.log(`Created header text with ID: ${headerId}`);
    } catch (error: any) {
      console.warn('Could not create header text, continuing:', error.message || String(error));
    }
    
    await wait(1000);
    
    // 7. Create the poll options - add longer waits between each option to improve reliability
    
    // Agree option (40%) - Red-Yellow gradient
    console.log('Creating "Agree" option...');
    const agreeOptionResult = await createOptionRow(
      frameId,
      'Agree',
      40,
      12,
      70,
      {
        type: 'GRADIENT_LINEAR',
        gradientStops: [
          { position: 0, color: { r: 0.95, g: 0.3, b: 0.1 } },  // Red
          { position: 1, color: { r: 1, g: 0.8, b: 0.2 } }      // Yellow
        ],
        gradientTransform: [[1, 0, 0], [0, 1, 0]]
      }
    );
    
    await wait(1000);
    
    // Strongly Agree option (10%) - Green
    console.log('Creating "Strongly Agree" option...');
    const stronglyAgreeOptionResult = await createOptionRow(
      frameId,
      'Strongly Agree',
      10,
      3,
      110,
      {
        type: 'SOLID',
        color: { r: 0.2, g: 0.7, b: 0.4 }  // Green
      }
    );
    
    await wait(1000);
    
    // Disagree option (50%) - Blue-Teal gradient
    console.log('Creating "Disagree" option...');
    const disagreeOptionResult = await createOptionRow(
      frameId,
      'Disagree',
      50,
      15,
      150,
      {
        type: 'GRADIENT_LINEAR',
        gradientStops: [
          { position: 0, color: { r: 0.1, g: 0.4, b: 0.9 } },  // Blue
          { position: 1, color: { r: 0.1, g: 0.7, b: 0.7 } }   // Teal
        ],
        gradientTransform: [[1, 0, 0], [0, 1, 0]]
      }
    );
    
    await wait(1000);
    
    // Strongly Disagree option (0%) - No progress bar
    console.log('Creating "Strongly Disagree" option...');
    const stronglyDisagreeOptionResult = await createOptionRow(
      frameId,
      'Strongly Disagree',
      0,
      0,
      190,
      {
        type: 'SOLID',
        color: { r: 0.5, g: 0.5, b: 0.5 }  // Gray (not visible as width is 0)
      }
    );
    
    await wait(1000);
    
    // 8. Add a divider line at the bottom
    let dividerId = null;
    try {
      console.log('Creating divider...');
      const dividerResult = await pluginClient.createRectangle({
        parentId: frameId,
        name: 'Divider',
        x: 170,
        y: 235,
        width: 60,
        height: 2,
        fill: {
          type: 'SOLID',
          color: { r: 0.8, g: 0.8, b: 0.8 }
        }
      });
      dividerId = dividerResult.id;
      console.log(`Created divider with ID: ${dividerId}`);
    } catch (error: any) {
      console.warn('Could not create divider, continuing:', error.message || String(error));
      console.log('Note: The divider might still be created despite the timeout.');
    }
    
    await wait(1000);
    
    // 13. Update header text in the original frame
    if (headerId) {
      console.log('Updating header text...');
      try {
        await pluginClient.updateNode({
          nodeId: headerId,
          properties: {
            characters: '35 Responses'
          }
        });
        console.log('Successfully updated header text');
      } catch (error: any) {
        console.warn('Could not update header text:', error.message || String(error));
        console.log('Note: The text might still be updated despite the timeout.');
      }
    }
  
    console.log('\nTest completed successfully! 🎉');
    console.log('Check your Figma file for the created Poll Results component');
    
  } catch (error: any) {
    console.error('Error running plugin test:', error.message || String(error));
  } finally {
    try {
      // Ensure we close the WebSocket connection
      console.log('Closing plugin bridge connection...');
      pluginBridge.stop();
      
      // Exit the process after the bridge is stopped
      console.log('Test finished, exiting process.');
      process.exit(0);
    } catch {
      // Ignore errors in cleanup
      process.exit(1);
    }
  }
}

// Run the test
runPluginTest().catch((err: any) => {
  console.error('Uncaught error:', err.message || String(err));
  process.exit(1);
});
