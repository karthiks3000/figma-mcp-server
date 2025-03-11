/**
 * TypeScript interfaces for Figma API objects and server types
 */

// Common Figma API types
export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaTransform {
  matrix: number[][];
}

export interface FigmaStyle {
  key: string;
  name: string;
  description?: string;
  node_id?: string;
  style_type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

// File information
export interface FigmaFileInfo {
  name: string;
  lastModified: string;
  version: string;
  thumbnailUrl: string;
  editorType: string;
  role: string;
  linkAccess: string;
}

export interface FigmaTopLevelNode {
  id: string;
  name: string;
  type: string;
  childCount: number;
}

// Node types
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: FigmaRectangle;
  relativeTransform?: FigmaTransform;
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  strokeWeight?: number;
  cornerRadius?: number;
  styles?: Record<string, string>;
}

export interface FigmaTextNode extends FigmaNode {
  type: 'TEXT';
  characters: string;
  style: FigmaTextStyle;
}

export interface FigmaFrameNode extends FigmaNode {
  type: 'FRAME' | 'GROUP' | 'COMPONENT' | 'INSTANCE';
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
}

export interface FigmaComponentNode extends FigmaFrameNode {
  type: 'COMPONENT';
  componentId: string;
}

export interface FigmaInstanceNode extends FigmaFrameNode {
  type: 'INSTANCE';
  componentId: string;
  exposedInstances?: Record<string, any>;
}

export interface FigmaVectorNode extends FigmaNode {
  type: 'VECTOR' | 'LINE' | 'ELLIPSE' | 'POLYGON' | 'STAR' | 'BOOLEAN_OPERATION' | 'RECTANGLE';
  strokeCap?: 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL';
  strokeJoin?: 'MITER' | 'BEVEL' | 'ROUND';
  strokeDashes?: number[];
  strokeMiterLimit?: number;
}

// Style types
export interface FigmaTextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  letterSpacing?: number;
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
  paragraphSpacing?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
}

export interface FigmaFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  gradientStops?: { position: number; color: FigmaColor }[];
  gradientHandlePositions?: { x: number; y: number }[];
  imageRef?: string;
  scaleMode?: 'FILL' | 'FIT' | 'TILE' | 'STRETCH';
}

export interface FigmaStroke {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
}

export interface FigmaEffect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}

export interface FigmaGrid {
  pattern: 'COLUMNS' | 'ROWS' | 'GRID';
  sectionSize?: number;
  visible?: boolean;
  color?: FigmaColor;
  alignment?: 'MIN' | 'STRETCH' | 'CENTER';
  gutterSize?: number;
  count?: number;
  offset?: number;
}

// Component types
export interface FigmaComponent {
  key: string;
  name: string;
  description?: string;
  node_id: string;
  created_at: string;
  updated_at: string;
  user: {
    handle: string;
    img_url: string;
  };
  containing_frame?: {
    name: string;
    node_id: string;
    page_id: string;
    page_name: string;
  };
  containing_page?: {
    name: string;
    node_id: string;
  };
}

// API response types
export interface FigmaNodeResponse {
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaNodesResponse {
  nodes: Record<string, { document: FigmaNode; components?: Record<string, FigmaComponent>; schemaVersion?: number; styles?: Record<string, FigmaStyle>; err?: string }>;
}

export interface FigmaStylesResponse {
  meta?: {
    styles: FigmaStyle[];
  };
  styles?: FigmaStyle[]; // Alternative format where styles are directly on the response
}

export interface FigmaComponentsResponse {
  meta: {
    components: FigmaComponent[];
  };
}

export interface FigmaImagesResponse {
  err?: string;
  images: Record<string, string>;
}

// Server types
export interface ExtractedStyles {
  colors: any[];
  text: any[];
  effects: any[];
  grid: any[];
}

export interface UIComponents {
  charts: any[];
  tables: any[];
  forms: any[];
  navigation: any[];
  cards: any[];
  buttons: any[];
  dropdowns: any[];
  other: any[];
}

export interface DesignInformation {
  fileInfo: FigmaFileInfo;
  topLevelNodes: FigmaTopLevelNode[];
  styles: ExtractedStyles;
  components: FigmaComponent[];
  nodeStyles: ExtractedStyles;
  uiComponents: UIComponents;
}

// Tool argument types
export interface ValidateTokenArgs {
  figmaUrl: string;
}

export interface GetFileInfoArgs {
  figmaUrl: string;
}

export interface GetNodeDetailsArgs {
  figmaUrl: string;
  nodeId?: string;
  detailLevel?: 'summary' | 'basic' | 'full';
  properties?: string[];
}

export interface ExtractStylesArgs {
  figmaUrl: string;
}

export interface GetAssetsArgs {
  figmaUrl: string;
  nodeId?: string;
  format?: 'jpg' | 'png' | 'svg' | 'pdf';
  scale?: number;
}

// New types for enhanced features
export interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, any>;
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  key: string;
  modes: { modeId: string; name: string }[];
  defaultModeId: string;
}

export interface FigmaPrototypeConfig {
  nodeId: string;
  name: string;
  type: 'FRAME' | 'COMPONENT' | 'INSTANCE';
  interactions: {
    trigger: 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG' | 'AFTER_TIMEOUT';
    action: 'NAVIGATE' | 'SWAP' | 'OPEN_URL' | 'BACK' | 'CLOSE' | 'SET_VARIABLE';
    destinationId?: string;
    transition?: {
      type: 'DISSOLVE' | 'SMART_ANIMATE' | 'SCROLL_ANIMATE' | 'MOVE_IN' | 'MOVE_OUT' | 'PUSH' | 'SLIDE_IN' | 'SLIDE_OUT';
      duration: number;
      direction?: 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';
    };
    url?: string;
    variableId?: string;
    value?: any;
  }[];
}

export interface FigmaComponentSet {
  id: string;
  name: string;
  type: 'COMPONENT_SET';
  children: FigmaComponentNode[];
  componentPropertyDefinitions: Record<string, {
    type: 'BOOLEAN' | 'INSTANCE_SWAP' | 'TEXT' | 'VARIANT';
    defaultValue: any;
    variantOptions?: string[];
  }>;
}

export interface FigmaConstraint {
  type: 'SCALE' | 'WIDTH' | 'HEIGHT' | 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM' | 'CENTER' | 'HORIZONTAL' | 'VERTICAL';
  value: number;
}
