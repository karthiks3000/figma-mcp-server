import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { FigmaNode } from './types.js';

/**
 * Detail level for node summarization
 */
export type DetailLevel = 'summary' | 'basic' | 'full';

/**
 * Helper function to extract file ID and node ID from Figma URLs
 */
export function extractFigmaIds(figmaUrl: string): { fileId: string; nodeId?: string } {
  let fileId: string | undefined;
  let nodeId: string | undefined;

  // Extract file ID from URL
  const fileIdRegex = /figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/;
  const fileIdMatch = figmaUrl.match(fileIdRegex);
  if (fileIdMatch && fileIdMatch[2]) {
    fileId = fileIdMatch[2];
  }

  // Extract node ID from URL if present
  const nodeIdRegex = /node-id=([^&]+)/;
  const nodeIdMatch = figmaUrl.match(nodeIdRegex);
  if (nodeIdMatch && nodeIdMatch[1]) {
    nodeId = nodeIdMatch[1].replace('-', ':'); // Convert URL format to API format
  }

  if (!fileId) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid Figma URL. Could not extract file ID.'
    );
  }

  return { fileId, nodeId };
}

/**
 * Summarize a Figma node based on detail level and optional properties
 * @param node - The Figma node to summarize
 * @param detailLevel - The level of detail to include ('summary', 'basic', or 'full')
 * @param properties - Optional array of property paths to include
 * @param currentDepth - Current recursion depth (used internally)
 * @param maxDepth - Maximum recursion depth (used internally)
 * @returns Summarized node
 */
export function summarizeNode(
  node: any, 
  detailLevel: DetailLevel = 'basic',
  properties?: string[],
  currentDepth: number = 0,
  maxDepth: number = 10
): any {
  // If node is null or undefined, return as is
  if (node === null || node === undefined) {
    return node;
  }

  // For non-objects (primitives), return as is
  if (typeof node !== 'object') {
    return node;
  }

  // For arrays, process each item
  if (Array.isArray(node)) {
    // For summary level, limit array size
    if (detailLevel === 'summary' && node.length > 5) {
      return node.slice(0, 5).map(item => 
        typeof item === 'object' && item !== null
          ? summarizeNode(item, detailLevel, properties, currentDepth + 1, maxDepth)
          : item
      ).concat([`... ${node.length - 5} more items`]);
    }
    
    // For basic level, limit array size but less aggressively
    if (detailLevel === 'basic' && node.length > 20) {
      return node.slice(0, 20).map(item => 
        typeof item === 'object' && item !== null
          ? summarizeNode(item, detailLevel, properties, currentDepth + 1, maxDepth)
          : item
      ).concat([`... ${node.length - 20} more items`]);
    }
    
    // Process each item in the array
    return node.map(item => 
      typeof item === 'object' && item !== null
        ? summarizeNode(item, detailLevel, properties, currentDepth + 1, maxDepth)
        : item
    );
  }

  // Stop recursion if we've reached max depth
  if (currentDepth >= maxDepth) {
    return detailLevel === 'full' ? node : { _truncated: true, _type: node.type || 'object' };
  }

  // Create a new object for the result
  const result: any = {};

  // If specific properties are requested, only include those
  if (properties && properties.length > 0) {
    // Get top-level properties from the property paths
    const topLevelProps = new Set(properties.map(p => p.split('.')[0]));
    
    // Add each requested top-level property
    for (const prop of topLevelProps) {
      if (prop in node) {
        // Get sub-properties for this property
        const subProps = properties
          .filter(p => p.startsWith(`${prop}.`))
          .map(p => p.substring(prop.length + 1));
        
        // If there are sub-properties, recurse with those
        if (subProps.length > 0) {
          result[prop] = summarizeNode(node[prop], detailLevel, subProps, currentDepth + 1, maxDepth);
        } else {
          // Otherwise, include the whole property
          result[prop] = typeof node[prop] === 'object' && node[prop] !== null
            ? summarizeNode(node[prop], detailLevel, undefined, currentDepth + 1, maxDepth)
            : node[prop];
        }
      }
    }
    
    return result;
  }

  // Handle different detail levels
  switch (detailLevel) {
    case 'summary':
      // For summary, include only essential properties
      const essentialProps = ['id', 'name', 'type'];
      for (const prop of essentialProps) {
        if (prop in node) {
          result[prop] = node[prop];
        }
      }
      
      // Include a count of children if present
      if (node.children && Array.isArray(node.children)) {
        result.childCount = node.children.length;
        
        // Include minimal info about the first few children
        if (node.children.length > 0) {
          result.children = node.children.slice(0, 3).map((child: any) => ({
            id: child.id,
            name: child.name,
            type: child.type
          }));
          
          if (node.children.length > 3) {
            result.children.push(`... ${node.children.length - 3} more children`);
          }
        }
      }
      
      // Include bounding box if present
      if (node.absoluteBoundingBox) {
        result.absoluteBoundingBox = node.absoluteBoundingBox;
      }
      
      return result;
      
    case 'basic':
      // For basic, include common properties but limit depth and array sizes
      const commonProps = [
        'id', 'name', 'type', 'visible', 'locked', 'absoluteBoundingBox',
        'relativeTransform', 'styles', 'characters', 'style', 'layoutMode',
        'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems',
        'counterAxisAlignItems', 'paddingLeft', 'paddingRight', 'paddingTop',
        'paddingBottom', 'itemSpacing', 'componentId'
      ];
      
      for (const prop of commonProps) {
        if (prop in node) {
          result[prop] = typeof node[prop] === 'object' && node[prop] !== null
            ? summarizeNode(node[prop], detailLevel, undefined, currentDepth + 1, maxDepth)
            : node[prop];
        }
      }
      
      // Handle children with recursion but limit depth
      if (node.children && Array.isArray(node.children)) {
        // For basic level, include more children but still limit
        const maxChildren = 10;
        if (node.children.length > maxChildren) {
          result.children = node.children.slice(0, maxChildren).map((child: any) => 
            summarizeNode(child, detailLevel, undefined, currentDepth + 1, maxDepth)
          );
          result.children.push(`... ${node.children.length - maxChildren} more children`);
        } else {
          result.children = node.children.map((child: any) => 
            summarizeNode(child, detailLevel, undefined, currentDepth + 1, maxDepth)
          );
        }
      }
      
      return result;
      
    case 'full':
      // For full, include everything but still protect against infinite recursion
      for (const prop in node) {
        result[prop] = typeof node[prop] === 'object' && node[prop] !== null
          ? summarizeNode(node[prop], detailLevel, undefined, currentDepth + 1, maxDepth)
          : node[prop];
      }
      
      return result;
      
    default:
      return node;
  }
}
