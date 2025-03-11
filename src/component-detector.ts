/**
 * ComponentDetector - Detects and extracts UI components from Figma designs
 */
import { FigmaNode, UIComponents } from './types.js';
import { FigmaApiClient } from './api-client.js';
import {
  isChartNode,
  isTableNode,
  countTableRows,
  countTableColumns,
  isFormNode,
  isNavigationNode,
  isCardNode,
  isButtonNode,
  extractButtonText,
  isDropdownNode,
  extractDropdownOptions,
  determineChartType,
  extractChartData,
  extractChartStyling,
  extractTableData,
  extractTableStyling
} from './component-detection.js';

/**
 * Detects and extracts UI components from Figma designs
 */
export class ComponentDetector {
  private apiClient: FigmaApiClient;
  
  /**
   * Create a new ComponentDetector
   * @param apiClient - The FigmaApiClient instance
   */
  constructor(apiClient: FigmaApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * Identify UI components in a node
   * @param nodeId - The ID of the node to analyze
   * @returns Detected UI components
   */
  async identifyUIComponents(nodeId: string): Promise<UIComponents> {
    try {
      console.log(`Identifying UI components in node: ${nodeId}`);
      
      // Get node details
      const nodeDocument = await this.apiClient.getNodeDetails(nodeId);
      
      // Initialize components object
      const components: UIComponents = {
        charts: [],
        tables: [],
        forms: [],
        navigation: [],
        cards: [],
        buttons: [],
        dropdowns: [],
        other: [],
      };
      
      // Process the node document to identify components
      this.processNodeForComponents(nodeDocument, components);
      
      return components;
    } catch (error) {
      console.error('Error identifying UI components:', error);
      throw error;
    }
  }
  
  /**
   * Process a node and its children to identify components
   * @param node - The node to process
   * @param components - The components object to populate
   * @param path - The current path in the node tree
   */
  private processNodeForComponents(node: FigmaNode, components: UIComponents, path: string = ''): void {
    const currentPath = path ? `${path} > ${node.name || 'Unnamed'}` : node.name || 'Unnamed';
    
    // Check if this node is a component or instance
    const isComponent = node.type === 'COMPONENT' || node.type === 'INSTANCE';
    
    // Check for chart patterns
    if (isChartNode(node)) {
      components.charts.push({
        id: node.id,
        name: node.name,
        type: 'Chart',
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
        children: node.children?.length || 0,
        chartType: determineChartType(node),
        chartData: extractChartData(node),
        chartStyling: extractChartStyling(node)
      });
    }
    
    // Check for table patterns
    else if (isTableNode(node)) {
      components.tables.push({
        id: node.id,
        name: node.name,
        type: 'Table',
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
        children: node.children?.length || 0,
        rows: countTableRows(node),
        columns: countTableColumns(node),
        tableData: extractTableData(node),
        tableStyling: extractTableStyling(node)
      });
    }
    
    // Check for form patterns
    else if (isFormNode(node)) {
      components.forms.push({
        id: node.id,
        name: node.name,
        type: 'Form',
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
        children: node.children?.length || 0,
      });
    }
    
    // Check for navigation patterns
    else if (isNavigationNode(node)) {
      components.navigation.push({
        id: node.id,
        name: node.name,
        type: 'Navigation',
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
        children: node.children?.length || 0,
      });
    }
    
    // Check for card patterns
    else if (isCardNode(node)) {
      components.cards.push({
        id: node.id,
        name: node.name,
        type: 'Card',
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
        children: node.children?.length || 0,
      });
    }
    
    // Check for button patterns
    else if (isButtonNode(node)) {
      components.buttons.push({
        id: node.id,
        name: node.name,
        type: 'Button',
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
        text: extractButtonText(node),
      });
    }
    
    // Check for dropdown patterns
    else if (isDropdownNode(node)) {
      components.dropdowns.push({
        id: node.id,
        name: node.name,
        type: 'Dropdown',
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
        options: extractDropdownOptions(node),
      });
    }
    
    // Check for other component patterns
    else if (isComponent) {
      components.other.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: currentPath,
        bounds: node.absoluteBoundingBox || node.relativeTransform,
      });
    }
    
    // Recursively process children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.processNodeForComponents(child, components, currentPath);
      });
    }
  }
  
  /**
   * Extract detailed information about a chart component
   * @param chartNode - The chart node
   * @returns Chart details
   */
  extractChartDetails(chartNode: any): any {
    if (!chartNode) {
      return { type: 'unknown', data: [], styling: {} };
    }
    
    try {
      // Extract chart type (bar, line, pie, etc.)
      const chartType = determineChartType(chartNode);
      
      // Extract chart data - safely handle potential errors
      let chartData: any[] = [];
      try {
        chartData = extractChartData(chartNode);
      } catch (dataError) {
        console.error('Error extracting chart data:', dataError);
      }
      
      // Extract chart styling - safely handle potential errors
      let chartStyling: Record<string, any> = {};
      try {
        chartStyling = extractChartStyling(chartNode);
      } catch (stylingError) {
        console.error('Error extracting chart styling:', stylingError);
      }
      
      return {
        type: chartType || 'unknown',
        data: chartData,
        styling: chartStyling,
      };
    } catch (error) {
      console.error('Error extracting chart details:', error);
      return { type: 'unknown', data: [], styling: {} };
    }
  }
  
  /**
   * Extract detailed information about a table component
   * @param tableNode - The table node
   * @returns Table details
   */
  extractTableDetails(tableNode: any): any {
    if (!tableNode) {
      return { structure: { rows: 0, columns: 0 }, data: [], styling: {} };
    }
    
    try {
      // Extract table structure (rows, columns) - safely handle potential errors
      const tableStructure = {
        rows: 0,
        columns: 0
      };
      
      try {
        tableStructure.rows = countTableRows(tableNode);
        tableStructure.columns = countTableColumns(tableNode);
      } catch (structureError) {
        console.error('Error extracting table structure:', structureError);
      }
      
      // Extract table data - safely handle potential errors
      let tableData: any[][] = [];
      try {
        tableData = extractTableData(tableNode);
      } catch (dataError) {
        console.error('Error extracting table data:', dataError);
      }
      
      // Extract table styling - safely handle potential errors
      let tableStyling: Record<string, any> = {};
      try {
        tableStyling = extractTableStyling(tableNode);
      } catch (stylingError) {
        console.error('Error extracting table styling:', stylingError);
      }
      
      return {
        structure: tableStructure,
        data: tableData,
        styling: tableStyling,
      };
    } catch (error) {
      console.error('Error extracting table details:', error);
      return { structure: { rows: 0, columns: 0 }, data: [], styling: {} };
    }
  }
  
  /**
   * Detect component variants and group them
   * @param components - The components to analyze
   * @returns Grouped component variants
   */
  detectComponentVariants(components: any[]): Record<string, any[]> {
    const variantGroups: Record<string, any[]> = {};
    
    // Group components by name pattern (e.g., "Button/Primary", "Button/Secondary")
    components.forEach(component => {
      const nameParts = component.name.split('/');
      if (nameParts.length > 1) {
        const baseComponentName = nameParts[0].trim();
        if (!variantGroups[baseComponentName]) {
          variantGroups[baseComponentName] = [];
        }
        variantGroups[baseComponentName].push({
          ...component,
          variant: nameParts.slice(1).join('/').trim()
        });
      }
    });
    
    return variantGroups;
  }
  
  /**
   * Detect responsive variations of components
   * @param components - The components to analyze
   * @returns Components with responsive information
   */
  detectResponsiveComponents(components: any[]): any[] {
    // Group components by name without size indicators
    const sizePatterns = [
      /\b(xs|sm|md|lg|xl)\b/i,
      /\b(small|medium|large)\b/i,
      /\b(mobile|tablet|desktop)\b/i,
      /\b(\d+px|\d+%)\b/i
    ];
    
    const componentGroups: Record<string, any[]> = {};
    
    components.forEach(component => {
      // Try to extract base name without size indicators
      let baseName = component.name;
      for (const pattern of sizePatterns) {
        baseName = baseName.replace(pattern, '').trim();
      }
      
      // Remove trailing slashes, dashes, or underscores
      baseName = baseName.replace(/[\/\-_]+$/, '').trim();
      
      if (!componentGroups[baseName]) {
        componentGroups[baseName] = [];
      }
      componentGroups[baseName].push(component);
    });
    
    // Only return groups with multiple sizes as responsive components
    const responsiveComponents: any[] = [];
    
    Object.entries(componentGroups).forEach(([baseName, variants]) => {
      if (variants.length > 1) {
        responsiveComponents.push({
          baseName,
          variants: variants.map(variant => ({
            ...variant,
            size: this.extractSizeFromName(variant.name)
          }))
        });
      }
    });
    
    return responsiveComponents;
  }
  
  /**
   * Extract size information from a component name
   * @param name - The component name
   * @returns Extracted size information
   */
  private extractSizeFromName(name: string): string {
    // Try to extract size indicators
    const sizePatterns = [
      /\b(xs|sm|md|lg|xl)\b/i,
      /\b(small|medium|large)\b/i,
      /\b(mobile|tablet|desktop)\b/i,
      /\b(\d+px|\d+%)\b/i
    ];
    
    for (const pattern of sizePatterns) {
      const match = name.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return 'default';
  }
}
