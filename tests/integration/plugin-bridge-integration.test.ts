/**
 * Integration test for the PluginBridge
 * 
 * This test directly tests the PluginBridge class's ability to connect to the Figma plugin
 * without using mocks. It's similar to the design-flow.test.ts in that it preserves
 * the real connection to the Figma plugin.
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ConfigManager } from '../../src/core/config.js';
import { PluginBridge, PluginEventType } from '../../src/write/plugin-bridge.js';
import { waitForCondition, logWithTimestamp } from '../utils/testHelpers.js';

describe('PluginBridge Integration', () => {
  // Skip tests if no token is provided
  const skipIfNoToken = () => {
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      test.skip('Skipping plugin bridge integration test (no token)', () => {});
      return true;
    }
    return false;
  };

  // Only run this test if a token is provided
  (skipIfNoToken() ? describe.skip : describe)('PluginBridge Connection', () => {
    let configManager: ConfigManager;
    let pluginBridge: PluginBridge;
    let connected = false;
    let pluginInfo: any = null;
    
    beforeAll(async () => {
      // Create config manager with the token from environment
      configManager = new ConfigManager({
        accessToken: process.env.FIGMA_ACCESS_TOKEN || 'test-token',
        debug: true
      });
      
      logWithTimestamp('Creating PluginBridge instance...');
      
      // Create plugin bridge
      pluginBridge = new PluginBridge(configManager);
      
      // Add event listeners
      pluginBridge.on(PluginEventType.CONNECTED, (info) => {
        logWithTimestamp('Plugin connected event received!', info);
        connected = true;
        pluginInfo = info;
      });
      
      pluginBridge.on(PluginEventType.DISCONNECTED, (info) => {
        logWithTimestamp('Plugin disconnected event received!', info);
        connected = false;
      });
      
      pluginBridge.on(PluginEventType.ERROR, (error) => {
        logWithTimestamp('Plugin error event received!', error);
      });
      
      // Start the plugin bridge
      logWithTimestamp('Starting PluginBridge...');
      const startResult = await pluginBridge.start();
      logWithTimestamp(`PluginBridge start result: ${startResult}`);
      
    }, 15000); // Longer timeout for setup
    
    afterAll(async () => {
      // Stop the plugin bridge
      if (pluginBridge) {
        logWithTimestamp('Stopping PluginBridge...');
        await pluginBridge.stop();
        logWithTimestamp('PluginBridge stopped');
      }
    }, 5000);
    
    test('should connect to the Figma plugin', async () => {
      // Wait for plugin connection (max 30 seconds)
      try {
        await waitForCondition(
          () => connected,
          30000, // 30 second timeout
          1000   // Check every second
        );
        
        expect(connected).toBe(true);
        expect(pluginBridge.isConnected()).toBe(true);
        expect(pluginBridge.getConnectionCount()).toBe(1);
        expect(pluginInfo).not.toBeNull();
        
        logWithTimestamp('Plugin connected successfully!');
        logWithTimestamp('Plugin info:', pluginInfo);
      } catch (error) {
        logWithTimestamp('Plugin connection test failed:', error);
        // Fail the test
        expect(connected).toBe(true);
      }
    }, 35000); // Longer timeout for connection
    
    test('should be able to send commands to the plugin', async () => {
      // Skip if not connected
      if (!pluginBridge.isConnected()) {
        logWithTimestamp('Skipping command test - plugin not connected');
        return;
      }
      
      try {
        // Send a command to get the current selection
        // This is a command we know the plugin supports
        logWithTimestamp('Sending get-selection command...');
        const response = await pluginBridge.sendCommand('get-selection');
        
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.result).toBeDefined(); // Result might be an empty array if nothing is selected
        
        logWithTimestamp('Command response received:', response);
      } catch (error) {
        logWithTimestamp('Command test failed:', error);
        // Fail the test
        expect(error).toBeUndefined();
      }
    }, 10000);
    
    test('should be able to get the current selection', async () => {
      // Skip if not connected
      if (!pluginBridge.isConnected()) {
        logWithTimestamp('Skipping selection test - plugin not connected');
        return;
      }
      
      try {
        // Send a command to get the current selection
        logWithTimestamp('Sending get-selection command...');
        const response = await pluginBridge.sendCommand('get-selection');
        
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        
        logWithTimestamp('Selection response received:', response);
        
        // Note: We don't assert on the selection content since it depends on what's
        // actually selected in Figma when the test runs
      } catch (error) {
        logWithTimestamp('Selection test failed:', error);
        // Fail the test only if it's not a "no selection" error
        if (error instanceof Error && !error.message.includes('No selection')) {
          expect(error).toBeUndefined();
        } else {
          logWithTimestamp('No selection in Figma - this is acceptable');
        }
      }
    }, 10000);
    
    test('should handle connection tracking correctly', async () => {
      // This test verifies that the connection tracking is working correctly
      
      // Verify that the connection tracking methods exist and work
      expect(typeof pluginBridge.isConnected).toBe('function');
      expect(typeof pluginBridge.getConnectionCount).toBe('function');
      expect(typeof pluginBridge.getConnectedPlugins).toBe('function');
      
      // Verify that the connection tracking is working
      if (pluginBridge.isConnected()) {
        expect(pluginBridge.getConnectionCount()).toBeGreaterThan(0);
        expect(pluginBridge.getConnectedPlugins().length).toBeGreaterThan(0);
      } else {
        expect(pluginBridge.getConnectionCount()).toBe(0);
        expect(pluginBridge.getConnectedPlugins().length).toBe(0);
      }
    });
  });
});