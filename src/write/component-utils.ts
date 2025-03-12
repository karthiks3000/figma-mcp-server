/**
 * Component Utilities for write mode
 * Helps with component-related operations
 */
import { PluginBridge } from './plugin-bridge.js';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';

/**
 * Component category
 */
export interface ComponentCategory {
  name: string;
  components: ComponentInfo[];
}

/**
 * Component information
 */
export interface ComponentInfo {
  id: string;
  name: string;
  key: string;
  type: string;
}

/**
 * Component Utilities for write mode
 */
export class ComponentUtils {
  private pluginBridge: PluginBridge;
  private logger: Logger;
  
  /**
   * Create new Component Utilities
   * @param pluginBridge Plugin bridge
   * @param configManager Configuration manager
   */
  constructor(pluginBridge: PluginBridge, configManager: ConfigManager) {
    this.pluginBridge = pluginBridge;
    this.logger = createLogger('ComponentUtils', configManager);
    
    this.logger.debug('Component Utilities initialized');
  }
  
  /**
   * List available components
   * @returns Promise that resolves with the available components
   */
  async listAvailableComponents(): Promise<ComponentInfo[]> {
    try {
      this.logger.debug('Listing available components');
      
      const response = await this.pluginBridge.sendCommand('list-components');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to list components');
      }
      
      const components = response.result;
      this.logger.debug(`Listed ${components.length} available components`);
      
      return components;
    } catch (error) {
      this.logger.error('Error listing available components', error);
      throw error;
    }
  }
  
  /**
   * Group components by category
   * @returns Promise that resolves with the component categories
   */
  async groupComponentsByCategory(): Promise<ComponentCategory[]> {
    try {
      this.logger.debug('Grouping components by category');
      
      // Get all components
      const components = await this.listAvailableComponents();
      
      // Group by category
      const categories: Record<string, ComponentInfo[]> = {};
      
      for (const component of components) {
        // Extract category from name (e.g., "Button/Primary" -> "Button")
        const categoryName = component.name.split('/')[0] || 'Other';
        
        if (!categories[categoryName]) {
          categories[categoryName] = [];
        }
        
        categories[categoryName].push(component);
      }
      
      // Convert to array
      const result = Object.entries(categories).map(([name, components]) => ({
        name,
        components
      }));
      
      this.logger.debug(`Grouped components into ${result.length} categories`);
      
      return result;
    } catch (error) {
      this.logger.error('Error grouping components by category', error);
      throw error;
    }
  }
  
  /**
   * Find component by name
   * @param name Component name (can be partial)
   * @returns Promise that resolves with the matching components
   */
  async findComponentByName(name: string): Promise<ComponentInfo[]> {
    try {
      this.logger.debug(`Finding component by name: ${name}`);
      
      // Get all components
      const components = await this.listAvailableComponents();
      
      // Filter by name
      const matches = components.filter(component => 
        component.name.toLowerCase().includes(name.toLowerCase())
      );
      
      this.logger.debug(`Found ${matches.length} components matching "${name}"`);
      
      return matches;
    } catch (error) {
      this.logger.error(`Error finding component by name: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Find component by type
   * @param type Component type (e.g., "button", "input", "card")
   * @returns Promise that resolves with the matching components
   */
  async findComponentByType(type: string): Promise<ComponentInfo[]> {
    try {
      this.logger.debug(`Finding component by type: ${type}`);
      
      // Get all components
      const components = await this.listAvailableComponents();
      
      // Filter by type
      const matches = components.filter(component => {
        const lowerName = component.name.toLowerCase();
        const lowerType = type.toLowerCase();
        
        return lowerName.includes(lowerType) || 
               (component.type && component.type.toLowerCase().includes(lowerType));
      });
      
      this.logger.debug(`Found ${matches.length} components matching type "${type}"`);
      
      return matches;
    } catch (error) {
      this.logger.error(`Error finding component by type: ${type}`, error);
      throw error;
    }
  }
  
  /**
   * Get component variants
   * @param componentKey Component key
   * @returns Promise that resolves with the component variants
   */
  async getComponentVariants(componentKey: string): Promise<ComponentInfo[]> {
    try {
      this.logger.debug(`Getting variants for component: ${componentKey}`);
      
      // Get all components
      const components = await this.listAvailableComponents();
      
      // Find the component
      const component = components.find(c => c.key === componentKey);
      
      if (!component) {
        throw new Error(`Component not found: ${componentKey}`);
      }
      
      // Extract base name (everything before the first =)
      const match = component.name.match(/^(.+?)=/);
      const baseName = match ? match[1].trim() : component.name;
      
      // Find variants
      const variants = components.filter(c => {
        // Check if it's a variant of the same component
        const variantMatch = c.name.match(/^(.+?)=/);
        const variantBaseName = variantMatch ? variantMatch[1].trim() : c.name;
        
        return variantBaseName === baseName;
      });
      
      this.logger.debug(`Found ${variants.length} variants for component: ${componentKey}`);
      
      return variants;
    } catch (error) {
      this.logger.error(`Error getting variants for component: ${componentKey}`, error);
      throw error;
    }
  }
  
  /**
   * Create a component instance
   * @param parentNodeId Parent node ID
   * @param componentKey Component key
   * @param name Instance name
   * @param x X position
   * @param y Y position
   * @param scaleX X scale
   * @param scaleY Y scale
   * @returns Promise that resolves with the instance ID
   */
  async createComponentInstance(
    parentNodeId: string,
    componentKey: string,
    name: string,
    x: number,
    y: number,
    scaleX: number = 1,
    scaleY: number = 1
  ): Promise<string> {
    try {
      this.logger.debug(`Creating component instance: ${name} (${componentKey})`);
      
      const response = await this.pluginBridge.sendCommand('create-instance', {
        parentId: parentNodeId,
        componentKey,
        name,
        x,
        y,
        scaleX,
        scaleY
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create component instance');
      }
      
      const instanceId = response.result.id;
      this.logger.debug(`Created component instance: ${name} (${instanceId})`);
      
      return instanceId;
    } catch (error) {
      this.logger.error(`Error creating component instance: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Set component instance properties
   * @param instanceId Instance ID
   * @param properties Properties to set
   * @returns Promise that resolves to true if the properties were set successfully
   */
  async setInstanceProperties(
    instanceId: string,
    properties: Record<string, string | number | boolean>
  ): Promise<boolean> {
    try {
      this.logger.debug(`Setting properties for instance: ${instanceId}`);
      
      const response = await this.pluginBridge.sendCommand('set-instance-properties', {
        instanceId,
        properties
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set instance properties');
      }
      
      this.logger.debug(`Set properties for instance: ${instanceId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error setting properties for instance: ${instanceId}`, error);
      throw error;
    }
  }
  
  /**
   * Swap component instance
   * @param instanceId Instance ID
   * @param componentKey New component key
   * @returns Promise that resolves to true if the instance was swapped successfully
   */
  async swapComponentInstance(
    instanceId: string,
    componentKey: string
  ): Promise<boolean> {
    try {
      this.logger.debug(`Swapping instance ${instanceId} to component: ${componentKey}`);
      
      const response = await this.pluginBridge.sendCommand('swap-instance', {
        instanceId,
        componentKey
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to swap component instance');
      }
      
      this.logger.debug(`Swapped instance ${instanceId} to component: ${componentKey}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error swapping instance ${instanceId} to component: ${componentKey}`, error);
      throw error;
    }
  }
}