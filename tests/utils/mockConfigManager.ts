import { ConfigManager } from '../../src/core/config.js';
import { FigmaServerMode } from '../../src/core/types.js';

/**
 * Mock ConfigManager for testing
 */
export class MockConfigManager extends ConfigManager {
  constructor() {
    super({
      accessToken: process.env.FIGMA_ACCESS_TOKEN || 'test-token',
      pluginPort: 8766,
      defaultMode: FigmaServerMode.READONLY,
      debug: true
    });
  }
  
  protected validate(): void {
    // Override validation for testing
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      console.warn('FIGMA_ACCESS_TOKEN not set, some tests may fail');
    }
  }
}