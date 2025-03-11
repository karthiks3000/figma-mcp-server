/**
 * StyleExtractor - Extracts and processes styles from Figma designs
 */
import { FigmaNode, FigmaStyle, ExtractedStyles, FigmaColor } from './types.js';
import { FigmaApiClient } from './api-client.js';

/**
 * Extracts and processes styles from Figma designs
 */
export class StyleExtractor {
  private apiClient: FigmaApiClient;
  
  /**
   * Create a new StyleExtractor
   * @param apiClient - The FigmaApiClient instance
   */
  constructor(apiClient: FigmaApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * Extract styles from a file using the Figma API
   * @param nodeId - Optional node ID to filter styles
   * @param version - Optional version/timestamp
   * @returns Extracted styles
   */
  async extractStyles(nodeId?: string, version?: string): Promise<ExtractedStyles> {
    try {
      console.log(`Extracting styles${nodeId ? ` for node ${nodeId}` : ''}`);
      
      // Get styles from API
      const styles = await this.apiClient.getStyles(nodeId, version);
      
      // Organize styles by type
      const extractedStyles: ExtractedStyles = {
        colors: [],
        text: [],
        effects: [],
        grid: [],
      };
      
      // Process style metadata
      for (const style of styles) {
        const styleInfo = {
          key: style.key,
          name: style.name,
          description: style.description || '',
          nodeId: style.node_id,
          styleType: style.style_type,
        };
        
        switch (style.style_type) {
          case 'FILL':
            extractedStyles.colors.push(styleInfo);
            break;
          case 'TEXT':
            extractedStyles.text.push(styleInfo);
            break;
          case 'EFFECT':
            extractedStyles.effects.push(styleInfo);
            break;
          case 'GRID':
            extractedStyles.grid.push(styleInfo);
            break;
        }
      }
      
      return extractedStyles;
    } catch (error) {
      console.error('Error extracting styles:', error);
      throw error;
    }
  }
  
  /**
   * Extract styles directly from a node's properties
   * @param node - The node to extract styles from
   * @returns Extracted styles
   */
  extractStylesFromNode(node: FigmaNode): ExtractedStyles {
    console.log(`Extracting styles from node: ${node.id}`);
    
    // Initialize extracted styles
    const extractedStyles: ExtractedStyles = {
      colors: [],
      text: [],
      effects: [],
      grid: [],
    };
    
    // Process the node to find style references
    this.processNodeForStyles(node, extractedStyles);
    
    return extractedStyles;
  }
  
  /**
   * Process a node and its children to extract styles
   * @param node - The node to process
   * @param extractedStyles - The styles object to populate
   */
  private processNodeForStyles(node: FigmaNode, extractedStyles: ExtractedStyles): void {
    // Check for style references in this node
    if (node.styles) {
      // Process style references
      Object.entries(node.styles).forEach(([styleType, styleId]) => {
        const styleInfo = {
          key: styleId,
          name: `${node.name || 'Unnamed'} - ${styleType}`,
          nodeId: node.id,
          styleType,
        };
        
        switch (styleType) {
          case 'fill':
          case 'fills':
            extractedStyles.colors.push(styleInfo);
            break;
          case 'text':
          case 'typography':
            extractedStyles.text.push(styleInfo);
            break;
          case 'effect':
          case 'effects':
            extractedStyles.effects.push(styleInfo);
            break;
          case 'grid':
            extractedStyles.grid.push(styleInfo);
            break;
        }
      });
    }
    
    // Check for direct style properties
    if (node.fills && node.fills.length > 0) {
      node.fills.forEach((fill, index) => {
        if (fill.type === 'SOLID' && fill.color) {
          extractedStyles.colors.push({
            key: `${node.id}-fill-${index}`,
            name: `${node.name || 'Unnamed'} - Fill ${index + 1}`,
            nodeId: node.id,
            styleType: 'FILL',
            color: this.normalizeColor(fill.color),
          });
        }
      });
    }
    
    // Check for text styles
    if ('style' in node && node.type === 'TEXT') {
      const textNode = node as any; // Type assertion for text node
      if (textNode.style && textNode.style.fontFamily) {
        extractedStyles.text.push({
          key: `${node.id}-text`,
          name: `${node.name || 'Unnamed'} - Text`,
          nodeId: node.id,
          styleType: 'TEXT',
          fontFamily: textNode.style.fontFamily,
          fontSize: textNode.style.fontSize,
          fontWeight: textNode.style.fontWeight,
        });
      }
    }
    
    // Recursively process children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.processNodeForStyles(child, extractedStyles);
      });
    }
  }
  
  /**
   * Normalize a Figma color to RGB format
   * @param color - The Figma color object
   * @returns Normalized color object
   */
  private normalizeColor(color: FigmaColor): { r: number; g: number; b: number; a: number } {
    return {
      r: Math.round(color.r * 255),
      g: Math.round(color.g * 255),
      b: Math.round(color.b * 255),
      a: color.a || 1,
    };
  }
  
  /**
   * Convert array-based styles to object-based styles
   * @param styles - The array-based styles
   * @returns Object-based styles
   */
  formatStylesAsObject(styles: ExtractedStyles): Record<string, Record<string, any>> {
    const formattedStyles = {
      colors: {} as Record<string, any>,
      text: {} as Record<string, any>,
      effects: {} as Record<string, any>,
      grid: {} as Record<string, any>,
    };
    
    // Process colors
    styles.colors.forEach((color, index) => {
      const name = color.name || `Color ${index + 1}`;
      formattedStyles.colors[name] = color;
    });
    
    // Process text styles
    styles.text.forEach((text, index) => {
      const name = text.name || `Text Style ${index + 1}`;
      formattedStyles.text[name] = text;
    });
    
    // Process effects
    styles.effects.forEach((effect, index) => {
      const name = effect.name || `Effect ${index + 1}`;
      formattedStyles.effects[name] = effect;
    });
    
    // Process grid styles
    styles.grid.forEach((grid, index) => {
      const name = grid.name || `Grid ${index + 1}`;
      formattedStyles.grid[name] = grid;
    });
    
    return formattedStyles;
  }
  
  /**
   * Merge multiple style collections
   * @param stylesArray - Array of style collections to merge
   * @returns Merged styles
   */
  mergeStyles(...stylesArray: ExtractedStyles[]): ExtractedStyles {
    const mergedStyles: ExtractedStyles = {
      colors: [],
      text: [],
      effects: [],
      grid: [],
    };
    
    // Merge all styles
    for (const styles of stylesArray) {
      mergedStyles.colors = [...mergedStyles.colors, ...styles.colors];
      mergedStyles.text = [...mergedStyles.text, ...styles.text];
      mergedStyles.effects = [...mergedStyles.effects, ...styles.effects];
      mergedStyles.grid = [...mergedStyles.grid, ...styles.grid];
    }
    
    // Remove duplicates based on key
    mergedStyles.colors = this.removeDuplicates(mergedStyles.colors, 'key');
    mergedStyles.text = this.removeDuplicates(mergedStyles.text, 'key');
    mergedStyles.effects = this.removeDuplicates(mergedStyles.effects, 'key');
    mergedStyles.grid = this.removeDuplicates(mergedStyles.grid, 'key');
    
    return mergedStyles;
  }
  
  /**
   * Remove duplicate objects from an array based on a key
   * @param array - The array to process
   * @param key - The key to use for comparison
   * @returns Array with duplicates removed
   */
  private removeDuplicates<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (value === undefined || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
}
