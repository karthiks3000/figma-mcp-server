/**
 * Style Extractor for readonly mode
 * Extracts and formats style information from Figma designs
 */
import { 
  FigmaNode, 
  FigmaStyle, 
  FigmaFill, 
  FigmaTextStyle,
  FigmaEffect,
  FigmaColor,
  ExtractedStyles
} from '../core/types.js';
import { ConfigManager } from '../core/config.js';
import { Logger, createLogger } from '../core/logger.js';
import { colorToCSS } from '../core/utils.js';

/**
 * Style Extractor for readonly mode
 */
export class StyleExtractor {
  private logger: Logger;
  
  /**
   * Create a new Style Extractor
   * @param configManager Configuration manager
   */
  constructor(configManager: ConfigManager) {
    this.logger = createLogger('StyleExtractor', configManager);
    
    this.logger.debug('Style Extractor initialized');
  }
  
  /**
   * Extract styles from a node tree
   * @param node Root node
   * @returns Extracted styles
   */
  extractStylesFromNode(node: FigmaNode): ExtractedStyles {
    this.logger.debug(`Extracting styles from node ${node.id}`);
    
    const styles: ExtractedStyles = {
      colors: [] as any[],
      text: [] as any[],
      effects: [] as any[],
      grid: [] as any[]
    };
    
    // Process the node tree
    this.processNode(node, styles);
    
    // Remove duplicates
    styles.colors = this.removeDuplicates(styles.colors, 'name');
    styles.text = this.removeDuplicates(styles.text, 'name');
    styles.effects = this.removeDuplicates(styles.effects, 'name');
    styles.grid = this.removeDuplicates(styles.grid, 'name');
    
    this.logger.debug(`Extracted ${styles.colors.length} colors, ${styles.text.length} text styles, ${styles.effects.length} effects, and ${styles.grid.length} grids`);
    
    return styles;
  }
  
  /**
   * Process a node and extract styles
   * @param node Node to process
   * @param styles Styles object to populate
   */
  private processNode(node: FigmaNode, styles: ExtractedStyles): void {
    // Extract fills (colors)
    if (node.fills && node.fills.length > 0) {
      for (const fill of node.fills) {
        if (fill.visible !== false) {
          const colorStyle = this.extractFillStyle(fill);
          if (colorStyle) {
            styles.colors.push(colorStyle);
          }
        }
      }
    }
    
    // Extract text styles
    if (node.type === 'TEXT') {
      const textNode = node as any; // Type assertion
      if (textNode.style) {
        const textStyle = this.extractTextStyle(textNode.style, node.name);
        if (textStyle) {
          styles.text.push(textStyle);
        }
      }
    }
    
    // Extract effects
    if ('effects' in node && node.effects && (node.effects as any[]).length > 0) {
      for (const effect of node.effects as any[]) {
        if (effect.visible !== false) {
          const effectStyle = this.extractEffectStyle(effect, node.name);
          if (effectStyle) {
            styles.effects.push(effectStyle);
          }
        }
      }
    }
    
    // Extract grid styles
    if ('layoutGrids' in node && (node as any).layoutGrids && (node as any).layoutGrids.length > 0) {
      for (const grid of (node as any).layoutGrids) {
        const gridStyle = this.extractGridStyle(grid, node.name);
        if (gridStyle) {
          styles.grid.push(gridStyle);
        }
      }
    }
    
    // Process children recursively
    if (node.children) {
      for (const child of node.children) {
        this.processNode(child, styles);
      }
    }
  }
  
  /**
   * Extract fill style
   * @param fill Fill object
   * @returns Fill style
   */
  private extractFillStyle(fill: FigmaFill): any {
    if (fill.type === 'SOLID' && fill.color) {
      return {
        name: `Color/${fill.color.r.toFixed(2)},${fill.color.g.toFixed(2)},${fill.color.b.toFixed(2)}`,
        type: 'SOLID',
        color: fill.color,
        opacity: fill.opacity !== undefined ? fill.opacity : 1,
        cssColor: colorToCSS(fill.color)
      };
    } else if (fill.type.startsWith('GRADIENT') && fill.gradientStops) {
      return {
        name: `Gradient/${fill.type}`,
        type: fill.type,
        gradientStops: fill.gradientStops,
        cssGradient: this.gradientToCSS(fill)
      };
    }
    
    return null;
  }
  
  /**
   * Extract text style
   * @param style Text style object
   * @param nodeName Node name
   * @returns Text style
   */
  private extractTextStyle(style: FigmaTextStyle, nodeName: string): any {
    return {
      name: `Text/${style.fontFamily}/${style.fontSize}`,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      textCase: style.textCase,
      textDecoration: style.textDecoration,
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
      nodeName
    };
  }
  
  /**
   * Extract effect style
   * @param effect Effect object
   * @param nodeName Node name
   * @returns Effect style
   */
  private extractEffectStyle(effect: FigmaEffect, nodeName: string): any {
    return {
      name: `Effect/${effect.type}`,
      type: effect.type,
      radius: effect.radius,
      color: effect.color,
      offset: effect.offset,
      spread: effect.spread,
      cssEffect: this.effectToCSS(effect),
      nodeName
    };
  }
  
  /**
   * Extract grid style
   * @param grid Grid object
   * @param nodeName Node name
   * @returns Grid style
   */
  private extractGridStyle(grid: any, nodeName: string): any {
    return {
      name: `Grid/${grid.pattern}`,
      pattern: grid.pattern,
      sectionSize: grid.sectionSize,
      gutterSize: grid.gutterSize,
      alignment: grid.alignment,
      count: grid.count,
      nodeName
    };
  }
  
  /**
   * Convert a gradient fill to CSS
   * @param fill Gradient fill
   * @returns CSS gradient
   */
  private gradientToCSS(fill: FigmaFill): string {
    if (!fill.gradientStops) {
      return '';
    }
    
    const stops = fill.gradientStops.map(stop => {
      const color = colorToCSS(stop.color);
      return `${color} ${Math.round(stop.position * 100)}%`;
    }).join(', ');
    
    switch (fill.type) {
      case 'GRADIENT_LINEAR':
        return `linear-gradient(180deg, ${stops})`;
      case 'GRADIENT_RADIAL':
        return `radial-gradient(circle, ${stops})`;
      case 'GRADIENT_ANGULAR':
        return `conic-gradient(from 0deg, ${stops})`;
      case 'GRADIENT_DIAMOND':
        // CSS doesn't have a direct equivalent for diamond gradients
        return `radial-gradient(circle, ${stops})`;
      default:
        return '';
    }
  }
  
  /**
   * Convert an effect to CSS
   * @param effect Effect object
   * @returns CSS effect
   */
  private effectToCSS(effect: FigmaEffect): string {
    if (!effect.color) {
      return '';
    }
    
    const color = colorToCSS(effect.color);
    const offsetX = effect.offset?.x || 0;
    const offsetY = effect.offset?.y || 0;
    const radius = effect.radius || 0;
    const spread = effect.spread || 0;
    
    switch (effect.type) {
      case 'DROP_SHADOW':
        return `box-shadow: ${offsetX}px ${offsetY}px ${radius}px ${spread}px ${color};`;
      case 'INNER_SHADOW':
        return `box-shadow: inset ${offsetX}px ${offsetY}px ${radius}px ${spread}px ${color};`;
      case 'LAYER_BLUR':
        return `filter: blur(${radius}px);`;
      case 'BACKGROUND_BLUR':
        return `backdrop-filter: blur(${radius}px);`;
      default:
        return '';
    }
  }
  
  /**
   * Remove duplicate objects from an array
   * @param array Array to process
   * @param key Key to use for comparison
   * @returns Array with duplicates removed
   */
  private removeDuplicates<T>(array: T[], key: keyof T): T[] {
    if (!Array.isArray(array)) {
      return [];
    }
    
    const seen = new Set();
    return array.filter(item => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  /**
   * Format styles as CSS variables
   * @param styles Extracted styles
   * @returns CSS variables
   */
  formatAsCSSVariables(styles: ExtractedStyles): string {
    let css = ':root {\n';
    
    // Add color variables
    styles.colors.forEach(color => {
      if ('cssColor' in color) {
        const name = this.sanitizeCSSVariableName(color.name);
        css += `  --${name}: ${color.cssColor};\n`;
      }
    });
    
    // Add text style variables
    styles.text.forEach(text => {
      const name = this.sanitizeCSSVariableName(text.name);
      css += `  --font-family-${name}: ${text.fontFamily};\n`;
      css += `  --font-size-${name}: ${text.fontSize}px;\n`;
      css += `  --font-weight-${name}: ${text.fontWeight};\n`;
      
      if (text.letterSpacing) {
        css += `  --letter-spacing-${name}: ${text.letterSpacing}px;\n`;
      }
      
      if (text.lineHeight) {
        if (typeof text.lineHeight === 'number') {
          css += `  --line-height-${name}: ${text.lineHeight}px;\n`;
        } else if (text.lineHeight.unit === 'PIXELS') {
          css += `  --line-height-${name}: ${text.lineHeight.value}px;\n`;
        } else {
          css += `  --line-height-${name}: ${text.lineHeight.value}%;\n`;
        }
      }
    });
    
    // Add effect variables
    styles.effects.forEach(effect => {
      if ('cssEffect' in effect && effect.cssEffect) {
        const name = this.sanitizeCSSVariableName(effect.name);
        css += `  --effect-${name}: ${effect.cssEffect};\n`;
      }
    });
    
    css += '}\n';
    
    return css;
  }
  
  /**
   * Format styles as a design tokens JSON
   * @param styles Extracted styles
   * @returns Design tokens JSON
   */
  formatAsDesignTokens(styles: ExtractedStyles): any {
    const tokens: any = {
      colors: {},
      typography: {},
      effects: {},
      grid: {}
    };
    
    // Add color tokens
    styles.colors.forEach(color => {
      if ('cssColor' in color) {
        const name = this.sanitizeTokenName(color.name);
        tokens.colors[name] = {
          value: color.cssColor,
          type: 'color'
        };
      }
    });
    
    // Add typography tokens
    styles.text.forEach(text => {
      const name = this.sanitizeTokenName(text.name);
      tokens.typography[name] = {
        fontFamily: { value: text.fontFamily },
        fontSize: { value: `${text.fontSize}px` },
        fontWeight: { value: text.fontWeight },
        lineHeight: { value: this.formatLineHeight(text.lineHeight) },
        letterSpacing: { value: text.letterSpacing ? `${text.letterSpacing}px` : '0px' }
      };
    });
    
    // Add effect tokens
    styles.effects.forEach(effect => {
      const name = this.sanitizeTokenName(effect.name);
      tokens.effects[name] = {
        type: { value: effect.type },
        radius: { value: `${effect.radius || 0}px` },
        color: { value: effect.color ? colorToCSS(effect.color) : 'transparent' }
      };
      
      if (effect.offset) {
        tokens.effects[name].offsetX = { value: `${effect.offset.x || 0}px` };
        tokens.effects[name].offsetY = { value: `${effect.offset.y || 0}px` };
      }
      
      if (effect.spread !== undefined) {
        tokens.effects[name].spread = { value: `${effect.spread}px` };
      }
    });
    
    // Add grid tokens
    styles.grid.forEach(grid => {
      const name = this.sanitizeTokenName(grid.name);
      tokens.grid[name] = {
        pattern: { value: grid.pattern },
        sectionSize: { value: `${grid.sectionSize || 0}px` }
      };
      
      if (grid.gutterSize !== undefined) {
        tokens.grid[name].gutterSize = { value: `${grid.gutterSize}px` };
      }
      
      if (grid.count !== undefined) {
        tokens.grid[name].count = { value: grid.count };
      }
    });
    
    return tokens;
  }
  
  /**
   * Format line height
   * @param lineHeight Line height value
   * @returns Formatted line height
   */
  private formatLineHeight(lineHeight: number | { value: number; unit: 'PIXELS' | 'PERCENT' } | undefined): string {
    if (lineHeight === undefined) {
      return 'normal';
    }
    
    if (typeof lineHeight === 'number') {
      return `${lineHeight}px`;
    }
    
    if (lineHeight.unit === 'PIXELS') {
      return `${lineHeight.value}px`;
    }
    
    return `${lineHeight.value}%`;
  }
  
  /**
   * Sanitize a name for use as a CSS variable
   * @param name Name to sanitize
   * @returns Sanitized name
   */
  private sanitizeCSSVariableName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  /**
   * Sanitize a name for use as a design token
   * @param name Name to sanitize
   * @returns Sanitized name
   */
  private sanitizeTokenName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}