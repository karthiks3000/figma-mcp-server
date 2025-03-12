/**
 * Utility functions for the Figma MCP server
 */

/**
 * Extract Figma file ID and node ID from a Figma URL
 * @param figmaUrl Figma URL (any format)
 * @returns Object containing fileId and nodeId (if present)
 * @throws Error if the URL is invalid
 */
export function extractFigmaIds(figmaUrl: string): { fileId: string; nodeId?: string } {
  if (!figmaUrl) {
    throw new Error('Figma URL is required');
  }
  
  try {
    // Parse the URL
    const url = new URL(figmaUrl);
    
    // Check if it's a Figma URL
    if (!url.hostname.includes('figma.com')) {
      throw new Error('Not a valid Figma URL');
    }
    
    // Extract file ID from path
    const pathParts = url.pathname.split('/');
    let fileId: string | undefined;
    let nodeId: string | undefined;
    
    // Handle different Figma URL formats
    if (pathParts.includes('file')) {
      // Format: https://www.figma.com/file/FILE_ID/...
      const fileIndex = pathParts.indexOf('file');
      if (fileIndex >= 0 && fileIndex + 1 < pathParts.length) {
        fileId = pathParts[fileIndex + 1];
      }
    } else if (pathParts.includes('proto')) {
      // Format: https://www.figma.com/proto/FILE_ID/...
      const fileIndex = pathParts.indexOf('proto');
      if (fileIndex >= 0 && fileIndex + 1 < pathParts.length) {
        fileId = pathParts[fileIndex + 1];
      }
    } else if (pathParts.includes('design')) {
      // Format: https://www.figma.com/design/FILE_ID/...
      const fileIndex = pathParts.indexOf('design');
      if (fileIndex >= 0 && fileIndex + 1 < pathParts.length) {
        fileId = pathParts[fileIndex + 1];
      }
    }
    
    // Check if we found a file ID
    if (!fileId) {
      throw new Error('Could not extract Figma file ID from URL');
    }
    
    // Extract node ID from URL parameters
    const nodeParam = url.searchParams.get('node-id');
    if (nodeParam) {
      nodeId = nodeParam;
    }
    
    return { fileId, nodeId };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid Figma URL: ${error.message}`);
    } else {
      throw new Error('Invalid Figma URL');
    }
  }
}

/**
 * Generate a random ID
 * @param length Length of the ID (default: 8)
 * @returns Random ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Convert a color object to a CSS color string
 * @param color Figma color object
 * @returns CSS color string
 */
export function colorToCSS(color: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? color.a : 1;
  
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Parse a CSS color string to a Figma color object
 * @param cssColor CSS color string
 * @returns Figma color object
 */
export function cssToColor(cssColor: string): { r: number; g: number; b: number; a: number } {
  // Default color (black)
  const defaultColor = { r: 0, g: 0, b: 0, a: 1 };
  
  try {
    // Handle hex colors
    if (cssColor.startsWith('#')) {
      const hex = cssColor.substring(1);
      
      // Handle #RGB format
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16) / 255;
        const g = parseInt(hex[1] + hex[1], 16) / 255;
        const b = parseInt(hex[2] + hex[2], 16) / 255;
        return { r, g, b, a: 1 };
      }
      
      // Handle #RGBA format
      if (hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16) / 255;
        const g = parseInt(hex[1] + hex[1], 16) / 255;
        const b = parseInt(hex[2] + hex[2], 16) / 255;
        const a = parseInt(hex[3] + hex[3], 16) / 255;
        return { r, g, b, a };
      }
      
      // Handle #RRGGBB format
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        return { r, g, b, a: 1 };
      }
      
      // Handle #RRGGBBAA format
      if (hex.length === 8) {
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const a = parseInt(hex.substring(6, 8), 16) / 255;
        return { r, g, b, a };
      }
    }
    
    // Handle rgb/rgba colors
    if (cssColor.startsWith('rgb')) {
      const rgbRegex = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/;
      const match = cssColor.match(rgbRegex);
      
      if (match) {
        const r = parseInt(match[1], 10) / 255;
        const g = parseInt(match[2], 10) / 255;
        const b = parseInt(match[3], 10) / 255;
        const a = match[4] ? parseFloat(match[4]) : 1;
        return { r, g, b, a };
      }
    }
    
    // Handle named colors (simplified)
    if (cssColor === 'black') return { r: 0, g: 0, b: 0, a: 1 };
    if (cssColor === 'white') return { r: 1, g: 1, b: 1, a: 1 };
    if (cssColor === 'red') return { r: 1, g: 0, b: 0, a: 1 };
    if (cssColor === 'green') return { r: 0, g: 1, b: 0, a: 1 };
    if (cssColor === 'blue') return { r: 0, g: 0, b: 1, a: 1 };
    
    // Return default color if parsing fails
    return defaultColor;
  } catch (error) {
    return defaultColor;
  }
}

/**
 * Deep clone an object
 * @param obj Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a value is a plain object
 * @param value Value to check
 * @returns True if the value is a plain object
 */
export function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' 
    && value !== null 
    && !Array.isArray(value) 
    && Object.getPrototypeOf(value) === Object.prototype;
}