/**
 * Unit tests for the Figma MCP server
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { FigmaMcpServer } from '../../src/mcp/server.js';
import { ModeManager } from '../../src/mode-manager.js';
import { FigmaServerMode } from '../../src/core/types.js';
import { MockConfigManager } from '../utils/mockConfigManager.js';

describe('FigmaMcpServer', () => {
  test('should create server successfully', () => {
    // Create config manager
    const configManager = new MockConfigManager();
    
    // Create server
    const server = new FigmaMcpServer(configManager);
    
    // Verify server was created
    expect(server).toBeDefined();
  });
});

describe('ModeManager', () => {
  let configManager: MockConfigManager;
  let modeManager: ModeManager;
  
  beforeEach(() => {
    // Create config manager
    configManager = new MockConfigManager();
    
    // Create mode manager
    modeManager = new ModeManager(configManager);
  });
  
  test('should initialize with readonly mode', () => {
    // Check initial mode
    const initialMode = modeManager.getCurrentMode();
    
    // Verify initial mode is readonly
    expect(initialMode).toBe(FigmaServerMode.READONLY);
  });
  
  test('should switch modes successfully', async () => {
    // Set up a mock write mode bridge
    modeManager.setWriteModeBridge({
      pluginBridge: {} as any,
      designCreator: {} as any,
      componentUtils: {} as any,
      start: async () => true,
      stop: async () => true,
      createFrame: () => Promise.resolve('test-id'),
      createShape: () => Promise.resolve('test-id'),
      createText: () => Promise.resolve('test-id'),
      createComponent: () => Promise.resolve({ id: 'test-id', key: 'test-key' }),
      createComponentInstance: () => Promise.resolve('test-id'),
      updateNode: () => Promise.resolve(true),
      deleteNode: () => Promise.resolve(true),
      setFill: () => Promise.resolve(true),
      setStroke: () => Promise.resolve(true),
      setEffects: () => Promise.resolve(true),
      smartCreateElement: () => Promise.resolve('test-id'),
      listAvailableComponents: () => Promise.resolve([])
    });
    
    // Try to switch to write mode
    const switchResult = await modeManager.switchToMode(FigmaServerMode.WRITE);
    
    // Verify switch was successful
    expect(switchResult).toBe(true);
    
    // Check current mode
    const currentMode = modeManager.getCurrentMode();
    
    // Verify current mode is write mode
    expect(currentMode).toBe(FigmaServerMode.WRITE);
    
    // Switch back to readonly mode
    const switchBackResult = await modeManager.switchToMode(FigmaServerMode.READONLY);
    
    // Verify switch back was successful
    expect(switchBackResult).toBe(true);
    
    // Check current mode
    const finalMode = modeManager.getCurrentMode();
    
    // Verify final mode is readonly mode
    expect(finalMode).toBe(FigmaServerMode.READONLY);
  });
});