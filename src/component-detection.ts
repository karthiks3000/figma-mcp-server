/**
 * Helper functions for detecting and extracting information from UI components
 */

/**
 * Check if a node is likely a chart
 */
export function isChartNode(node: any): boolean {
  // Check node name
  const nameHints = ['chart', 'graph', 'plot', 'bar', 'line', 'pie', 'histogram', 'scatter'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    return true;
  }
  
  // Check for chart-like structure (container with multiple similar children)
  if (node.children && node.children.length > 3) {
    // Check for bar chart pattern (multiple rectangles with similar width/height)
    const rectangles = node.children.filter((child: any) => 
      child.type === 'RECTANGLE' || 
      (child.name?.toLowerCase()?.includes('bar'))
    );
    
    if (rectangles.length >= 3) {
      // Check if rectangles have similar width or height (bar chart)
      const widths = rectangles.map((r: any) => r.absoluteBoundingBox?.width || 0);
      const heights = rectangles.map((r: any) => r.absoluteBoundingBox?.height || 0);
      
      const similarWidths = hasSimilarValues(widths);
      const similarHeights = hasSimilarValues(heights);
      
      if (similarWidths || similarHeights) {
        return true;
      }
    }
    
    // Check for line chart pattern (vector paths)
    const paths = node.children.filter((child: any) => 
      child.type === 'VECTOR' || 
      (child.name?.toLowerCase()?.includes('line'))
    );
    
    if (paths.length >= 1) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a node is likely a table
 */
export function isTableNode(node: any): boolean {
  // Check node name
  const nameHints = ['table', 'grid', 'data table', 'spreadsheet', 'matrix'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    return true;
  }
  
  // Check for table-like structure (grid of cells)
  if (node.children && node.children.length > 0) {
    // Check for rows
    const possibleRows = node.children.filter((child: any) => 
      child.children && 
      child.children.length > 1 && 
      child.children.every((c: any) => c.absoluteBoundingBox)
    );
    
    if (possibleRows.length >= 2) {
      // Check if rows have similar heights and contain similar number of children
      const rowHeights = possibleRows.map((r: any) => r.absoluteBoundingBox?.height || 0);
      const childrenCounts = possibleRows.map((r: any) => r.children.length);
      
      const similarHeights = hasSimilarValues(rowHeights);
      const similarChildrenCounts = hasSimilarValues(childrenCounts);
      
      if (similarHeights && similarChildrenCounts) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Count the number of rows in a table node
 */
export function countTableRows(node: any): number {
  if (!node || !node.children || !Array.isArray(node.children)) return 0;
  
  // Look for direct row children
  const possibleRows = node.children.filter((child: any) => 
    child && child.children && 
    Array.isArray(child.children) && 
    child.children.length > 1
  );
  
  if (possibleRows.length > 0) {
    return possibleRows.length;
  }
  
  // If no direct rows, look for a container that might hold rows
  for (const child of node.children) {
    if (child && child.children && Array.isArray(child.children) && child.children.length > 1) {
      const nestedRows = countTableRows(child);
      if (nestedRows > 0) {
        return nestedRows;
      }
    }
  }
  
  return 0;
}

/**
 * Count the number of columns in a table node
 */
export function countTableColumns(node: any): number {
  if (!node || !node.children || !Array.isArray(node.children)) return 0;
  
  // Look for direct row children and count their children
  const possibleRows = node.children.filter((child: any) => 
    child && child.children && 
    Array.isArray(child.children) && 
    child.children.length > 1
  );
  
  if (possibleRows.length > 0) {
    // Get the most common number of children in rows
    const columnCounts = possibleRows.map((row: any) => row.children.length);
    return getMostCommonValue(columnCounts);
  }
  
  // If no direct rows, look for a container that might hold rows
  for (const child of node.children) {
    if (child && child.children && Array.isArray(child.children) && child.children.length > 1) {
      const nestedColumns = countTableColumns(child);
      if (nestedColumns > 0) {
        return nestedColumns;
      }
    }
  }
  
  return 0;
}

/**
 * Check if a node is likely a form
 */
export function isFormNode(node: any): boolean {
  // Check node name
  const nameHints = ['form', 'input', 'login', 'signup', 'register', 'contact'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    return true;
  }
  
  // Check for form-like structure (input fields, buttons)
  if (node.children && node.children.length > 0) {
    // Count potential form elements
    const inputFields = countInputFields(node);
    const buttons = countButtons(node);
    
    // If we have multiple input fields and at least one button, it's likely a form
    if (inputFields >= 2 && buttons >= 1) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a node is likely a navigation component
 */
export function isNavigationNode(node: any): boolean {
  // Check node name
  const nameHints = ['nav', 'navigation', 'menu', 'sidebar', 'header', 'navbar', 'tabs'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    return true;
  }
  
  // Check for navigation-like structure (horizontal or vertical list of links/buttons)
  if (node.children && node.children.length >= 3) {
    // Check if children are arranged horizontally or vertically
    const isHorizontal = areChildrenHorizontal(node.children);
    const isVertical = areChildrenVertical(node.children);
    
    if (isHorizontal || isVertical) {
      // Check if children look like navigation items
      const navItems = node.children.filter((child: any) => 
        isLikelyNavigationItem(child)
      );
      
      if (navItems.length >= 3) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a node is likely a card component
 */
export function isCardNode(node: any): boolean {
  // Check node name
  const nameHints = ['card', 'tile', 'panel', 'box'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    return true;
  }
  
  // Check for card-like structure
  if (node.children && node.children.length > 0) {
    // Cards typically have a background fill and rounded corners
    const hasBackground = node.fills && node.fills.some((fill: any) => fill.visible !== false);
    const hasRoundedCorners = node.cornerRadius && node.cornerRadius > 0;
    
    // Cards typically have a title and content
    const hasTitle = node.children.some((child: any) => 
      child.type === 'TEXT' && 
      child.style && 
      (child.style.fontWeight >= 500 || child.style.fontSize >= 14)
    );
    
    if (hasBackground && (hasRoundedCorners || hasTitle)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a node is likely a button
 */
export function isButtonNode(node: any): boolean {
  // Check node name
  const nameHints = ['button', 'btn', 'cta', 'submit', 'cancel', 'save'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    return true;
  }
  
  // Check for button-like structure
  if (node.children) {
    // Buttons typically have a background fill and rounded corners
    const hasBackground = node.fills && node.fills.some((fill: any) => fill.visible !== false);
    const hasRoundedCorners = node.cornerRadius && node.cornerRadius > 0;
    
    // Buttons typically have text
    const hasText = node.children.some((child: any) => child.type === 'TEXT');
    
    if (hasBackground && hasRoundedCorners && hasText) {
      return true;
    }
  } else if (node.type === 'TEXT') {
    // Text-only buttons often have specific styling
    const isTextButton = node.style && 
      (node.style.textDecoration === 'UNDERLINE' || 
       node.style.fontWeight >= 500);
    
    if (isTextButton) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract text from a button node
 */
export function extractButtonText(node: any): string {
  if (node.type === 'TEXT') {
    return node.characters || '';
  }
  
  if (node.children) {
    // Find text nodes
    const textNodes = node.children.filter((child: any) => child.type === 'TEXT');
    if (textNodes.length > 0) {
      return textNodes.map((textNode: any) => textNode.characters || '').join(' ');
    }
  }
  
  return '';
}

/**
 * Check if a node is likely a dropdown
 */
export function isDropdownNode(node: any): boolean {
  // Check node name
  const nameHints = ['dropdown', 'select', 'combobox', 'menu', 'picker'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    return true;
  }
  
  // Check for dropdown-like structure
  if (node.children) {
    // Dropdowns often have a text field and an icon (like a chevron)
    const hasTextField = node.children.some((child: any) => child.type === 'TEXT');
    const hasIcon = node.children.some((child: any) => 
      child.type === 'VECTOR' || 
      (child.name?.toLowerCase() && (
        child.name!.toLowerCase().includes('icon') ||
        child.name!.toLowerCase().includes('arrow') ||
        child.name!.toLowerCase().includes('chevron')
      ))
    );
    
    if (hasTextField && hasIcon) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract options from a dropdown node
 */
export function extractDropdownOptions(node: any): string[] {
  const options: string[] = [];
  
  // Look for a menu or list of options
  const findOptions = (n: any) => {
    if (n.type === 'TEXT') {
      options.push(n.characters || '');
    } else if (n.children) {
      n.children.forEach(findOptions);
    }
  };
  
  // Start search
  findOptions(node);
  
  return options;
}

/**
 * Determine the type of chart
 */
export function determineChartType(node: any): string {
  // Check node name for hints
  if (node.name) {
    const name = node.name.toLowerCase();
    if (name.includes('bar')) return 'bar';
    if (name.includes('line')) return 'line';
    if (name.includes('pie') || name.includes('donut')) return 'pie';
    if (name.includes('scatter')) return 'scatter';
    if (name.includes('area')) return 'area';
  }
  
  // Analyze structure
  if (node.children) {
    // Check for bar chart pattern
    const rectangles = node.children.filter((child: any) => 
      child.type === 'RECTANGLE' || 
      (child.name?.toLowerCase()?.includes('bar'))
    );
    
    if (rectangles.length >= 3) {
      return 'bar';
    }
    
    // Check for line chart pattern
    const paths = node.children.filter((child: any) => 
      child.type === 'VECTOR' || 
      (child.name?.toLowerCase()?.includes('line'))
    );
    
    if (paths.length >= 1) {
      return 'line';
    }
    
    // Check for pie chart pattern
    const ellipses = node.children.filter((child: any) => 
      child.type === 'ELLIPSE' || 
      (child.name?.toLowerCase() && (
        child.name!.toLowerCase().includes('pie') ||
        child.name!.toLowerCase().includes('slice')
      ))
    );
    
    if (ellipses.length >= 1) {
      return 'pie';
    }
  }
  
  return 'unknown';
}

/**
 * Extract data from a chart node
 */
export function extractChartData(node: any): any[] {
  const data: any[] = [];
  const chartType = determineChartType(node);
  
  if (chartType === 'bar' && node.children && Array.isArray(node.children)) {
    // Extract data from bar chart
    const bars = node.children.filter((child: any) => 
      child.type === 'RECTANGLE' || 
      (child.name?.toLowerCase()?.includes('bar'))
    );
    
    bars.forEach((bar: any, index: number) => {
      // Try to find label and value
      let label = `Item ${index + 1}`;
      let value = 0;
      
      // Extract value from bar height/width
      if (bar.absoluteBoundingBox) {
        value = bar.absoluteBoundingBox.height || bar.absoluteBoundingBox.width || 0;
      }
      
      // Look for associated label
      if (node.children && Array.isArray(node.children)) {
        const possibleLabels = node.children.filter((child: any) => 
          child.type === 'TEXT' && 
          isNearby(child, bar)
        );
        
        if (possibleLabels.length > 0) {
          label = possibleLabels[0].characters || label;
        }
      }
      
      data.push({ label, value });
    });
  }
  
  return data;
}

/**
 * Extract styling information from a chart node
 */
export function extractChartStyling(node: any): any {
  const styling: any = {
    colors: [],
    fontFamily: '',
    fontSize: 0,
    gridLines: false,
    legend: false,
  };
  
  // Extract colors
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      if (child.fills && Array.isArray(child.fills) && child.fills.length > 0) {
        child.fills.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color) {
            const color = {
              r: Math.round(fill.color.r * 255),
              g: Math.round(fill.color.g * 255),
              b: Math.round(fill.color.b * 255),
              a: fill.color.a || 1,
            };
            
            // Add color if not already in the list
            if (!styling.colors.some((c: any) => 
              c.r === color.r && c.g === color.g && c.b === color.b
            )) {
              styling.colors.push(color);
            }
          }
        });
      }
    });
  }
  
  // Extract text styling
  const textNodes = findAllTextNodes(node);
  if (textNodes.length > 0) {
    const firstText = textNodes[0];
    if (firstText.style) {
      styling.fontFamily = firstText.style.fontFamily || '';
      styling.fontSize = firstText.style.fontSize || 0;
    }
  }
  
  // Check for grid lines
  styling.gridLines = hasGridLines(node);
  
  // Check for legend
  styling.legend = hasLegend(node);
  
  return styling;
}

/**
 * Extract data from a table node
 */
export function extractTableData(node: any): any[][] {
  const data: any[][] = [];
  
  // Find rows
  const rows = findTableRows(node);
  
  if (!rows || !Array.isArray(rows)) {
    return data;
  }
  
  // Extract data from each row
  rows.forEach((row: any) => {
    const rowData: any[] = [];
    
    // Find cells in the row
    const cells = findTableCells(row);
    
    if (cells && Array.isArray(cells)) {
      // Extract text from each cell
      cells.forEach((cell: any) => {
        rowData.push(extractCellText(cell));
      });
      
      data.push(rowData);
    }
  });
  
  return data;
}

/**
 * Extract styling information from a table node
 */
export function extractTableStyling(node: any): any {
  const styling: any = {
    headerStyle: {},
    cellStyle: {},
    borderStyle: {},
    alternatingRows: false,
  };
  
  // Find rows
  const rows = findTableRows(node);
  
  if (rows.length > 0) {
    // Extract header styling
    const headerRow = rows[0];
    const headerCells = findTableCells(headerRow);
    
    if (headerCells.length > 0) {
      const headerCell = headerCells[0];
      styling.headerStyle = extractNodeStyling(headerCell);
    }
    
    // Extract cell styling
    if (rows.length > 1) {
      const dataRow = rows[1];
      const dataCells = findTableCells(dataRow);
      
      if (dataCells.length > 0) {
        const dataCell = dataCells[0];
        styling.cellStyle = extractNodeStyling(dataCell);
      }
    }
    
    // Check for alternating row styling
    if (rows.length > 2) {
      const row1 = extractNodeStyling(rows[1]);
      const row2 = extractNodeStyling(rows[2]);
      
      styling.alternatingRows = !areStylesEqual(row1, row2);
    }
  }
  
  return styling;
}

// Helper functions

/**
 * Check if an array has similar values (within a tolerance)
 */
function hasSimilarValues(values: number[], tolerance: number = 0.2): boolean {
  if (values.length < 2) return true;
  
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const maxDiff = avg * tolerance;
  
  return values.every(val => Math.abs(val - avg) <= maxDiff);
}

/**
 * Get the most common value in an array
 */
function getMostCommonValue(values: number[]): number {
  if (values.length === 0) return 0;
  
  const counts = new Map<number, number>();
  let maxCount = 0;
  let mostCommon = values[0];
  
  for (const value of values) {
    const count = (counts.get(value) || 0) + 1;
    counts.set(value, count);
    
    if (count > maxCount) {
      maxCount = count;
      mostCommon = value;
    }
  }
  
  return mostCommon;
}

/**
 * Count the number of input fields in a node
 */
function countInputFields(node: any): number {
  let count = 0;
  
  // Check if this node is an input field
  const nameHints = ['input', 'field', 'text', 'email', 'password', 'textarea'];
  if (node.name?.toLowerCase() && nameHints.some(hint => node.name!.toLowerCase().includes(hint))) {
    count++;
  }
  
  // Check for input-like structure (rectangle with text)
  if (node.type === 'RECTANGLE' && node.children && 
      node.children.some((child: any) => child.type === 'TEXT')) {
    count++;
  }
  
  // Recursively check children
  if (node.children) {
    node.children.forEach((child: any) => {
      count += countInputFields(child);
    });
  }
  
  return count;
}

/**
 * Count the number of buttons in a node
 */
function countButtons(node: any): number {
  let count = 0;
  
  // Check if this node is a button
  if (isButtonNode(node)) {
    count++;
  }
  
  // Recursively check children
  if (node.children) {
    node.children.forEach((child: any) => {
      count += countButtons(child);
    });
  }
  
  return count;
}

/**
 * Check if children are arranged horizontally
 */
function areChildrenHorizontal(children: any[]): boolean {
  if (children.length < 2) return false;
  
  // Get bounding boxes
  const boxes = children
    .filter(child => child.absoluteBoundingBox)
    .map(child => child.absoluteBoundingBox);
  
  if (boxes.length < 2) return false;
  
  // Check if y-coordinates are similar
  const yValues = boxes.map(box => box.y);
  return hasSimilarValues(yValues, 0.1);
}

/**
 * Check if children are arranged vertically
 */
function areChildrenVertical(children: any[]): boolean {
  if (children.length < 2) return false;
  
  // Get bounding boxes
  const boxes = children
    .filter(child => child.absoluteBoundingBox)
    .map(child => child.absoluteBoundingBox);
  
  if (boxes.length < 2) return false;
  
  // Check if x-coordinates are similar
  const xValues = boxes.map(box => box.x);
  return hasSimilarValues(xValues, 0.1);
}

/**
 * Check if a node is likely a navigation item
 */
function isLikelyNavigationItem(node: any): boolean {
  // Navigation items are often text or text with an icon
  if (node.type === 'TEXT') {
    return true;
  }
  
  // Check for text with icon
  if (node.children) {
    const hasText = node.children.some((child: any) => child.type === 'TEXT');
    const hasIcon = node.children.some((child: any) => 
      child.type === 'VECTOR' || 
      child.type === 'BOOLEAN_OPERATION' || 
      child.type === 'INSTANCE'
    );
    
    if (hasText && hasIcon) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if two nodes are nearby
 */
function isNearby(node1: any, node2: any): boolean {
  if (!node1.absoluteBoundingBox || !node2.absoluteBoundingBox) {
    return false;
  }
  
  const box1 = node1.absoluteBoundingBox;
  const box2 = node2.absoluteBoundingBox;
  
  // Calculate distance between centers
  const center1 = { x: box1.x + box1.width / 2, y: box1.y + box1.height / 2 };
  const center2 = { x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 };
  
  const distance = Math.sqrt(
    Math.pow(center1.x - center2.x, 2) + 
    Math.pow(center1.y - center2.y, 2)
  );
  
  // Consider nearby if distance is less than the sum of half widths and heights
  const threshold = (box1.width + box1.height + box2.width + box2.height) / 4;
  return distance < threshold;
}

/**
 * Find all text nodes in a node
 */
function findAllTextNodes(node: any): any[] {
  const textNodes: any[] = [];
  
  if (node.type === 'TEXT') {
    textNodes.push(node);
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      textNodes.push(...findAllTextNodes(child));
    });
  }
  
  return textNodes;
}

/**
 * Check if a node has grid lines
 */
function hasGridLines(node: any): boolean {
  // Look for line elements
  const findLines = (n: any): boolean => {
    if (n.type === 'LINE' || (n.type === 'VECTOR' && n.name?.toLowerCase()?.includes('grid'))) {
      return true;
    }
    
    if (n.children && Array.isArray(n.children)) {
      return n.children.some(findLines);
    }
    
    return false;
  };
  
  return findLines(node);
}

/**
 * Check if a chart has a legend
 */
function hasLegend(node: any): boolean {
  // Look for a legend container
  const findLegend = (n: any): boolean => {
    if (n.name?.toLowerCase()?.includes('legend')) {
      return true;
    }
    
    if (n.children && Array.isArray(n.children)) {
      return n.children.some(findLegend);
    }
    
    return false;
  };
  
  return findLegend(node);
}

/**
 * Find table rows in a node
 */
function findTableRows(node: any): any[] {
  if (!node || !node.children || !Array.isArray(node.children)) return [];
  
  // Look for direct row children
  const possibleRows = node.children.filter((child: any) => 
    child && child.children && Array.isArray(child.children) && 
    child.children.length > 1
  );
  
  if (possibleRows.length > 1) {
    return possibleRows;
  }
  
  // If no direct rows, look for a container that might hold rows
  for (const child of node.children) {
    if (child && child.children && Array.isArray(child.children) && child.children.length > 1) {
      const nestedRows = findTableRows(child);
      if (nestedRows.length > 1) {
        return nestedRows;
      }
    }
  }
  
  return [];
}

/**
 * Find table cells in a row
 */
function findTableCells(row: any): any[] {
  if (!row || !row.children || !Array.isArray(row.children)) return [];
  
  // Look for cell-like children
  return row.children.filter((child: any) => 
    child && (
      child.absoluteBoundingBox || 
      child.type === 'TEXT' || 
      child.type === 'RECTANGLE' ||
      (child.children && Array.isArray(child.children) && child.children.length > 0)
    )
  );
}

/**
 * Extract text from a table cell
 */
function extractCellText(cell: any): string {
  if (cell.type === 'TEXT') {
    return cell.characters || '';
  }
  
  if (cell.children) {
    const textNodes = cell.children.filter((child: any) => child.type === 'TEXT');
    if (textNodes.length > 0) {
      return textNodes.map((textNode: any) => textNode.characters || '').join(' ');
    }
  }
  
  return '';
}

/**
 * Extract styling information from a node
 */
function extractNodeStyling(node: any): any {
  const styling: any = {
    backgroundColor: null,
    borderRadius: 0,
    borderColor: null,
    borderWidth: 0,
    fontFamily: '',
    fontSize: 0,
    fontWeight: 0,
    textColor: null,
  };
  
  // Extract background color
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
    if (fill && fill.color) {
      styling.backgroundColor = {
        r: Math.round(fill.color.r * 255),
        g: Math.round(fill.color.g * 255),
        b: Math.round(fill.color.b * 255),
        a: fill.color.a || 1,
      };
    }
  }
  
  // Extract border properties
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes.find((s: any) => s.visible !== false);
    if (stroke && stroke.color) {
      styling.borderColor = {
        r: Math.round(stroke.color.r * 255),
        g: Math.round(stroke.color.g * 255),
        b: Math.round(stroke.color.b * 255),
        a: stroke.color.a || 1,
      };
    }
  }
  
  styling.borderWidth = node.strokeWeight || 0;
  styling.borderRadius = node.cornerRadius || 0;
  
  // Extract text styling
  const textNodes = findAllTextNodes(node);
  if (textNodes.length > 0) {
    const firstText = textNodes[0];
    if (firstText.style) {
      styling.fontFamily = firstText.style.fontFamily || '';
      styling.fontSize = firstText.style.fontSize || 0;
      styling.fontWeight = firstText.style.fontWeight || 0;
      
      if (firstText.fills && firstText.fills.length > 0) {
        const textFill = firstText.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
        if (textFill && textFill.color) {
          styling.textColor = {
            r: Math.round(textFill.color.r * 255),
            g: Math.round(textFill.color.g * 255),
            b: Math.round(textFill.color.b * 255),
            a: textFill.color.a || 1,
          };
        }
      }
    }
  }
  
  return styling;
}

/**
 * Check if two styles are equal
 */
function areStylesEqual(style1: any, style2: any): boolean {
  // Compare background colors
  if (style1.backgroundColor && style2.backgroundColor) {
    if (
      style1.backgroundColor.r !== style2.backgroundColor.r ||
      style1.backgroundColor.g !== style2.backgroundColor.g ||
      style1.backgroundColor.b !== style2.backgroundColor.b
    ) {
      return false;
    }
  } else if (style1.backgroundColor !== style2.backgroundColor) {
    return false;
  }
  
  // Compare border properties
  if (style1.borderRadius !== style2.borderRadius) return false;
  if (style1.borderWidth !== style2.borderWidth) return false;
  
  // Compare text properties
  if (style1.fontFamily !== style2.fontFamily) return false;
  if (style1.fontSize !== style2.fontSize) return false;
  if (style1.fontWeight !== style2.fontWeight) return false;
  
  // Compare text colors
  if (style1.textColor && style2.textColor) {
    if (
      style1.textColor.r !== style2.textColor.r ||
      style1.textColor.g !== style2.textColor.g ||
      style1.textColor.b !== style2.textColor.b
    ) {
      return false;
    }
  } else if (style1.textColor !== style2.textColor) {
    return false;
  }
  
  // If we've made it this far, the styles are equal
  return true;
}
