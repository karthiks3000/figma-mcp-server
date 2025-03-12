/**
 * MCP Tool definitions for the Figma MCP server
 */
import { FigmaTool } from '../core/types.js';

/**
 * Tool definitions for readonly mode
 */
export const READONLY_TOOLS = [
  {
    name: FigmaTool.VALIDATE_TOKEN,
    description: 'Test if the configured token has access to a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.GET_FILE_INFO,
    description: 'Get basic metadata about a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.GET_NODE_DETAILS,
    description: 'Get detailed information about a specific node (component, frame, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
        nodeId: {
          type: 'string',
          description: 'Node ID (optional if URL contains node-id)',
        },
        detailLevel: {
          type: 'string',
          enum: ['summary', 'basic', 'full'],
          description: 'Level of detail to include (default: basic)',
        },
        properties: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional array of property paths to include (e.g., ["id", "name", "children.id"])',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.EXTRACT_STYLES,
    description: 'Extract color, text, and effect styles from a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.GET_ASSETS,
    description: 'Get image URLs for nodes in a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
        nodeId: {
          type: 'string',
          description: 'Node ID (optional if URL contains node-id)',
        },
        format: {
          type: 'string',
          enum: ['jpg', 'png', 'svg', 'pdf'],
          description: 'Image format (default: png)',
        },
        scale: {
          type: 'number',
          description: 'Image scale (default: 1)',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.GET_VARIABLES,
    description: 'Get variables and variable collections from a Figma file (new Figma Variables API)',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.IDENTIFY_COMPONENTS,
    description: 'Identify UI components in a Figma design (charts, tables, forms, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
        nodeId: {
          type: 'string',
          description: 'Node ID (optional if URL contains node-id)',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.DETECT_VARIANTS,
    description: 'Detect component variants and group them',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
      },
      required: ['figmaUrl'],
    },
  },
  {
    name: FigmaTool.DETECT_RESPONSIVE,
    description: 'Detect responsive variations of components',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'Figma file URL (any format)',
        },
      },
      required: ['figmaUrl'],
    },
  },
];

/**
 * Tool definitions for write mode
 */
export const WRITE_TOOLS = [
  {
    name: FigmaTool.SWITCH_TO_WRITE_MODE,
    description: 'Switch to write mode to create or update designs',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Custom prompt to show the user',
        },
      },
      required: [],
    },
  },
  {
    name: FigmaTool.CREATE_FRAME,
    description: 'Create a new frame/artboard in a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        parentNodeId: {
          type: 'string',
          description: 'ID of the parent node where the frame will be created',
        },
        name: {
          type: 'string',
          description: 'Name for the new frame',
        },
        x: {
          type: 'number',
          description: 'X position of the frame',
        },
        y: {
          type: 'number',
          description: 'Y position of the frame',
        },
        width: {
          type: 'number',
          description: 'Width of the frame',
        },
        height: {
          type: 'number',
          description: 'Height of the frame',
        },
      },
      required: ['parentNodeId', 'name', 'x', 'y', 'width', 'height'],
    },
  },
  {
    name: FigmaTool.CREATE_SHAPE,
    description: 'Create a new shape (rectangle, ellipse, polygon) in a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        parentNodeId: {
          type: 'string',
          description: 'ID of the parent node where the shape will be created',
        },
        type: {
          type: 'string',
          enum: ['rectangle', 'ellipse', 'polygon'],
          description: 'Type of shape to create',
        },
        name: {
          type: 'string',
          description: 'Name for the new shape',
        },
        x: {
          type: 'number',
          description: 'X position of the shape',
        },
        y: {
          type: 'number',
          description: 'Y position of the shape',
        },
        width: {
          type: 'number',
          description: 'Width of the shape',
        },
        height: {
          type: 'number',
          description: 'Height of the shape',
        },
        fill: {
          type: 'object',
          description: 'Optional fill properties',
        },
        cornerRadius: {
          type: 'number',
          description: 'Optional corner radius (for rectangles)',
        },
        points: {
          type: 'number',
          description: 'Optional number of points (for polygons)',
        },
      },
      required: ['parentNodeId', 'type', 'name', 'x', 'y', 'width', 'height'],
    },
  },
  {
    name: FigmaTool.CREATE_TEXT,
    description: 'Create a new text element in a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        parentNodeId: {
          type: 'string',
          description: 'ID of the parent node where the text will be created',
        },
        name: {
          type: 'string',
          description: 'Name for the new text element',
        },
        x: {
          type: 'number',
          description: 'X position of the text',
        },
        y: {
          type: 'number',
          description: 'Y position of the text',
        },
        width: {
          type: 'number',
          description: 'Width of the text box',
        },
        height: {
          type: 'number',
          description: 'Height of the text box',
        },
        characters: {
          type: 'string',
          description: 'Text content',
        },
        style: {
          type: 'object',
          description: 'Optional text style properties',
        },
      },
      required: ['parentNodeId', 'name', 'x', 'y', 'width', 'height', 'characters'],
    },
  },
  {
    name: FigmaTool.CREATE_COMPONENT,
    description: 'Create a new component in a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        parentNodeId: {
          type: 'string',
          description: 'ID of the parent node where the component will be created',
        },
        name: {
          type: 'string',
          description: 'Name for the new component',
        },
        x: {
          type: 'number',
          description: 'X position of the component',
        },
        y: {
          type: 'number',
          description: 'Y position of the component',
        },
        width: {
          type: 'number',
          description: 'Width of the component',
        },
        height: {
          type: 'number',
          description: 'Height of the component',
        },
        childrenData: {
          type: 'array',
          description: 'Optional data for child nodes',
        },
      },
      required: ['parentNodeId', 'name', 'x', 'y', 'width', 'height'],
    },
  },
  {
    name: FigmaTool.CREATE_COMPONENT_INSTANCE,
    description: 'Create an instance of a component in a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        parentNodeId: {
          type: 'string',
          description: 'ID of the parent node where the instance will be created',
        },
        componentKey: {
          type: 'string',
          description: 'Key of the component to instantiate',
        },
        name: {
          type: 'string',
          description: 'Name for the new instance',
        },
        x: {
          type: 'number',
          description: 'X position of the instance',
        },
        y: {
          type: 'number',
          description: 'Y position of the instance',
        },
        scaleX: {
          type: 'number',
          description: 'Optional X scale factor (1 = 100%)',
        },
        scaleY: {
          type: 'number',
          description: 'Optional Y scale factor (1 = 100%)',
        },
      },
      required: ['parentNodeId', 'componentKey', 'name', 'x', 'y'],
    },
  },
  {
    name: FigmaTool.UPDATE_NODE,
    description: 'Update properties of an existing node',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'ID of the node to update',
        },
        properties: {
          type: 'object',
          description: 'Properties to update',
        },
      },
      required: ['nodeId', 'properties'],
    },
  },
  {
    name: FigmaTool.DELETE_NODE,
    description: 'Delete a node from a Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'ID of the node to delete',
        },
      },
      required: ['nodeId'],
    },
  },
  {
    name: FigmaTool.SET_FILL,
    description: 'Set the fill properties of a node',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'ID of the node',
        },
        fill: {
          type: 'object',
          description: 'Fill properties to set',
        },
      },
      required: ['nodeId', 'fill'],
    },
  },
  {
    name: FigmaTool.SET_STROKE,
    description: 'Set the stroke properties of a node',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'ID of the node',
        },
        stroke: {
          type: 'object',
          description: 'Stroke properties to set',
        },
        strokeWeight: {
          type: 'number',
          description: 'Optional stroke weight',
        },
      },
      required: ['nodeId', 'stroke'],
    },
  },
  {
    name: FigmaTool.SET_EFFECTS,
    description: 'Set effects (shadows, blurs) on a node',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'ID of the node',
        },
        effects: {
          type: 'array',
          description: 'Effects to set',
        },
      },
      required: ['nodeId', 'effects'],
    },
  },
  {
    name: FigmaTool.SMART_CREATE_ELEMENT,
    description: 'Create an element using existing components when available',
    inputSchema: {
      type: 'object',
      properties: {
        parentNodeId: {
          type: 'string',
          description: 'ID of the parent node',
        },
        type: {
          type: 'string',
          description: 'Type of element to create (rectangle, ellipse, text, etc.)',
        },
        name: {
          type: 'string',
          description: 'Name for the new element',
        },
        x: {
          type: 'number',
          description: 'X position',
        },
        y: {
          type: 'number',
          description: 'Y position',
        },
        width: {
          type: 'number',
          description: 'Width',
        },
        height: {
          type: 'number',
          description: 'Height',
        },
        properties: {
          type: 'object',
          description: 'Additional properties for the element',
        },
      },
      required: ['parentNodeId', 'type', 'name', 'x', 'y', 'width', 'height'],
    },
  },
  {
    name: FigmaTool.LIST_AVAILABLE_COMPONENTS,
    description: 'List all available components in a file grouped by type',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

/**
 * All tool definitions
 */
export const ALL_TOOLS = [...READONLY_TOOLS, ...WRITE_TOOLS];