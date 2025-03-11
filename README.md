# Figma MCP Server

This is an MCP (Model Context Protocol) server that provides tools for interacting with the Figma API. It enables AI assistants to extract and analyze design information from Figma files.

## Available Tools

The server provides the following tools:

### Basic Tools
1. `validate_token` - Tests if the configured token has access to a Figma file
2. `get_file_info` - Gets basic metadata about a Figma file
3. `get_node_details` - Gets detailed information about a specific node (component, frame, etc.) with configurable detail levels
4. `extract_styles` - Extracts color, text, and effect styles from a Figma file
5. `get_assets` - Gets image URLs for nodes in a Figma file

### Advanced Tools
6. `get_variables` - Gets variables and variable collections from a Figma file (new Figma Variables API)
7. `identify_components` - Identifies UI components in a Figma design (charts, tables, forms, etc.)
8. `detect_variants` - Detects component variants and groups them
9. `detect_responsive` - Detects responsive variations of components

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Set up your Figma access token as an environment variable:
```bash
export FIGMA_ACCESS_TOKEN=your_figma_access_token
```

4. Start the server:
```bash
npm start
```

## Testing

The project includes a comprehensive test suite that tests all the tools provided by the server.

### Running Tests

To run the tests, you need to use the same Figma access token that is configured in your MCP server settings:

```bash
export FIGMA_ACCESS_TOKEN=your_figma_access_token
npm test
```

> **Important**: The tests use real API calls to validate that the MCP server tools are working correctly. You must use the same token that is configured in your MCP server settings.

### Test Details

The test suite:

1. Tests each tool with a real Figma URL
2. Validates the responses from each tool
3. Provides detailed output on test success/failure
4. Includes error handling for common issues

#### Known Limitations

When testing with large Figma files, you may encounter "Request too large" errors for some of the tools. This is a limitation of the Figma API and not an issue with the MCP server. The test will still be considered successful if at least some of the tools work correctly.

Common errors you might see:
- `400 Bad Request` with message `Request too large. If applicable filter by query params.`
- This typically affects tools that retrieve the entire file content, like `validate_token` and `get_file_info`
- Tools that work with specific nodes, like `get_node_details` and `get_assets`, are more likely to succeed

### Test Configuration

The test uses the following Figma URL by default:
```
https://www.figma.com/design/qWoIIHHPuzNPtcOKfjha1N/Platform-Data-%26-Reports?node-id=5222-41504&t=n7JwZvZVncZx4jY1-4
```

To use a different Figma URL for testing, modify the `TEST_FIGMA_URL` constant in `src/test.ts`.

## Architecture

The server is built with a modular architecture that separates concerns and makes the code more maintainable:

### Core Components

1. **DesignManager** - Main entry point for interacting with Figma designs
   - Coordinates between different specialized components
   - Provides a high-level API for extracting design information

2. **FigmaApiClient** - Handles communication with the Figma API
   - Manages authentication and request formatting
   - Provides methods for accessing different Figma API endpoints

3. **StyleExtractor** - Extracts and processes styles from Figma designs
   - Extracts colors, text styles, effects, and grid styles
   - Processes both API-based styles and node-based styles

4. **ComponentDetector** - Detects and extracts UI components
   - Identifies common UI patterns like charts, tables, forms, etc.
   - Extracts detailed information about components

### Using the DesignManager

The `DesignManager` class provides a unified interface for working with Figma designs:

```typescript
import { DesignManager } from './design-manager.js';

// Create a new manager instance
const designManager = new DesignManager('https://www.figma.com/file/...', 'your-access-token');

// Extract all design information
const designInfo = await designManager.extractDesignInformation();
console.log(designInfo);
```

### Available Methods

- `getFileInfo()` - Get basic file metadata
- `getTopLevelNodes()` - Get the top-level pages/frames in the file
- `getNodeDetails(nodeId, detailLevel, properties)` - Get detailed information about a specific node with configurable detail levels
- `extractStyles()` - Extract styles from a file
- `extractStylesFromNode(nodeId)` - Extract styles directly from a node
- `getComponents()` - Get all components in the file
- `identifyUIComponents(nodeId)` - Identify UI components in a node
- `getAssets(nodeId, format, scale)` - Get image URLs for nodes
- `getVariables()` - Get variables and variable collections
- `extractDesignInformation()` - Extract all design information

### Advanced Style Extraction

The `StyleExtractor` uses two complementary approaches to extract styles:

1. **API-based extraction** (`extractStyles()`): Uses the Figma API's `/styles` endpoint to get published styles
2. **Node-based extraction** (`extractStylesFromNode()`): Analyzes the node's properties to find:
   - Style references
   - Direct color fills
   - Text styles
   - Effects
   - Grid configurations

This dual approach ensures you get the most complete style information possible, even from large files where the API might return limited results due to size constraints.

### UI Component Detection

The `ComponentDetector` can automatically identify and extract information about common UI components in Figma designs:

1. **Smart Detection** (`identifyUIComponents()`): Analyzes node properties and structure to identify:
   - Charts (bar, line, pie)
   - Tables with rows and columns
   - Forms with input fields
   - Navigation menus
   - Cards and panels
   - Buttons with text
   - Dropdowns with options

2. **Detailed Extraction**: For identified components, extracts detailed information:
   - Chart data and styling (`extractChartDetails()`)
   - Table structure and content (`extractTableDetails()`)
   - Button text and styling
   - Form fields and layout

This feature helps bridge the gap between design and implementation by automatically recognizing UI patterns and extracting their properties, making it easier to translate designs into code.

### Component Variant Detection

The `ComponentDetector` includes advanced features for detecting component variants:

1. **Variant Detection** (`detectComponentVariants()`): Groups components that are variants of the same base component
   - Identifies components with naming patterns like "Button/Primary", "Button/Secondary"
   - Groups them by their base component name

2. **Responsive Detection** (`detectResponsiveComponents()`): Identifies responsive variations of components
   - Detects components with size indicators (xs, sm, md, lg, xl, mobile, tablet, desktop)
   - Groups them by their base component name

### Testing the Design Manager

To test the Design Manager with your Figma file:

```bash
export FIGMA_ACCESS_TOKEN=your_figma_access_token
npm run test:large-file
```

### Validating Design Information

The project includes a design validator that compares the extracted design information with the expected design elements:

```bash
export FIGMA_ACCESS_TOKEN=your_figma_access_token
npm run validate-design
```

The validator checks for:
- Expected colors (Scholastic Red, Blue chart bars, White background, Gray text)
- Font families (Museo Sans, Roboto)
- UI components and node types

### Configurable Node Detail Levels

The `get_node_details` tool supports different levels of detail to handle large Figma nodes efficiently:

1. **Summary Level** (`detailLevel: 'summary'`):
   - Includes only essential properties (id, name, type)
   - Shows a count of children and minimal info about the first few children
   - Includes bounding box if present
   - Perfect for getting a high-level overview of complex nodes

2. **Basic Level** (`detailLevel: 'basic'`, default):
   - Includes common properties like visibility, layout settings, and styles
   - Limits the depth of nested objects and array sizes
   - Shows more children but still limits very large arrays
   - Good balance between detail and response size

3. **Full Level** (`detailLevel: 'full'`):
   - Includes all properties from the Figma API
   - Still protects against infinite recursion with a max depth
   - May result in very large responses for complex nodes
   - Use when you need complete details about a node

4. **Custom Properties** (`properties: ['id', 'name', 'children.id']`):
   - Extract only specific properties you need
   - Can include nested properties using dot notation
   - Most efficient option when you know exactly what you need

Example usage:
```typescript
// Get a summary of a node
const nodeSummary = await designManager.getNodeDetails(nodeId, 'summary');

// Get specific properties only
const nodeProps = await designManager.getNodeDetails(nodeId, 'basic', ['id', 'name', 'children.name']);
```

#### Validation Results

For the test Figma file, the validator found:
- **435 colors** including the Scholastic red brand color and blue chart bars
- **241 text styles** using Museo Sans and Roboto fonts
- **1 effect** and **1 grid style**
- **No published components**, but many nested elements that function as components

## Development

- `npm run dev` - Run the server in development mode
- `npm run build` - Build the server
- `npm start` - Start the server
- `npm test` - Run the test suite
- `npm run test:large-file` - Test the DesignManager with a large Figma file
- `npm run validate-design` - Validate the extracted design information
