/**
 * ComponentUtilizer class for finding and using components
 * to enable smart reuse of existing design elements
 */
import { FigmaApiClient } from './api-client.js';
import { FigmaComponent } from './types.js';

export class ComponentUtilizer {
  private apiClient: FigmaApiClient;
  
  constructor(apiClient: FigmaApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * Find components that match certain criteria
   * @param type - Type of element to match (button, input, etc.)
   * @param properties - Optional properties to match
   * @returns Array of matching components
   */
  async findMatchingComponents(
    type: string,
    properties?: Record<string, any>
  ): Promise<FigmaComponent[]> {
    // Get all components in the file
    const components = await this.apiClient.getComponents();
    
    // Filter components by type
    const typeMatches = components.filter(component => {
      const name = component.name.toLowerCase();
      const searchType = type.toLowerCase();
      
      return name.includes(searchType);
    });
    
    // If no properties to match, return all type matches
    if (!properties) {
      return typeMatches;
    }
    
    // Filter by additional properties if they were provided
    // This is a simplified matching algorithm - in practice, you'd want
    // more sophisticated property matching based on component structure
    return typeMatches.filter(component => {
      const name = component.name.toLowerCase();
      
      // Check if component name suggests it has properties matching the criteria
      for (const [prop, value] of Object.entries(properties)) {
        if (typeof value === 'string' && name.includes(value.toLowerCase())) {
          return true;
        }
        if (prop === 'variant' && name.includes(String(value).toLowerCase())) {
          return true;
        }
        if (prop === 'size' && name.includes(String(value).toLowerCase())) {
          return true;
        }
        if (prop === 'state' && name.includes(String(value).toLowerCase())) {
          return true;
        }
      }
      
      return false;
    });
  }
  
  /**
   * List available components grouped by type
   * @returns Object with components grouped by type
   */
  async listAvailableComponents(): Promise<Record<string, FigmaComponent[]>> {
    // Get all components in the file
    const components = await this.apiClient.getComponents();
    
    // Group components by type
    const groupedComponents: Record<string, FigmaComponent[]> = {
      buttons: [],
      inputs: [],
      icons: [],
      cards: [],
      navigation: [],
      layout: [],
      other: []
    };
    
    components.forEach(component => {
      const name = component.name.toLowerCase();
      
      if (name.includes('button')) {
        groupedComponents.buttons.push(component);
      } else if (name.includes('input') || name.includes('field') || name.includes('form')) {
        groupedComponents.inputs.push(component);
      } else if (name.includes('icon')) {
        groupedComponents.icons.push(component);
      } else if (name.includes('card')) {
        groupedComponents.cards.push(component);
      } else if (name.includes('nav') || name.includes('menu') || name.includes('tab')) {
        groupedComponents.navigation.push(component);
      } else if (name.includes('layout') || name.includes('grid') || name.includes('container')) {
        groupedComponents.layout.push(component);
      } else {
        groupedComponents.other.push(component);
      }
    });
    
    // Remove empty categories
    Object.keys(groupedComponents).forEach(key => {
      if (groupedComponents[key].length === 0) {
        delete groupedComponents[key];
      }
    });
    
    return groupedComponents;
  }
  
  /**
   * Find the best component for a specific use case
   * @param type - Type of component needed
   * @param specific - Specific variant or style
   * @returns Best matching component or null
   */
  async findBestComponent(
    type: string,
    specific?: string
  ): Promise<FigmaComponent | null> {
    const components = await this.findMatchingComponents(type);
    
    if (components.length === 0) {
      return null;
    }
    
    if (!specific) {
      // Return the first match if no specific variant requested
      return components[0];
    }
    
    // Look for components that match the specific request
    const specificMatches = components.filter(component => 
      component.name.toLowerCase().includes(specific.toLowerCase())
    );
    
    return specificMatches.length > 0 ? specificMatches[0] : components[0];
  }
}
