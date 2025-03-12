# Figma MCP Server

A Model Context Protocol (MCP) server for interacting with Figma designs. This server allows Claude AI to extract design information from Figma files and create or update designs using the Figma plugin.

## Features

- **Readonly Mode**: Extract design information from Figma files using a URL link
- **Write Mode**: Create or update designs by establishing a connection with the Figma plugin
- **Comprehensive API**: Access to a wide range of Figma features through a unified API
- **Unit Testing**: Includes tests to verify server functionality
- **Integration Testing**: Tests the flow from creating designs to reading them

## Modes

### Readonly Mode

In readonly mode, the server can extract design information from a Figma file using a URL link. This includes:

- File information
- Node details
- Styles (colors, text, effects)
- Assets (images)
- Variables
- Component identification
- Variant detection
- Responsive design detection

### Write Mode

In write mode, the server can create or update designs by establishing a connection with the Figma plugin. This includes:

- Creating frames, shapes, text, and components
- Creating component instances
- Updating node properties
- Setting fills, strokes, and effects
- Deleting nodes
- Smart element creation

## Prerequisites

- Node.js 18 or higher
- A Figma account and access token
- The Figma MCP plugin installed in the Figma desktop app (for write mode)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/figma-server.git
cd figma-server
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

## Configuration

The server requires a Figma access token to be set in the environment:

```bash
export FIGMA_ACCESS_TOKEN=your_figma_access_token
```

## Usage

### Starting the Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Running Tests

```bash
# Run unit tests
npm test

# Run integration tests (TypeScript)
npm run test:integration

# Run integration tests (JavaScript)
npm run test:integration-js

# Run all tests
npm run test:all

# Test plugin connection
npm run test:plugin-connection-js
```

The plugin connection test is a simple WebSocket server that listens for connections from the Figma plugin. It's useful for verifying that the plugin is running and can connect to the server.

The JavaScript versions of the tests are provided as alternatives that don't require TypeScript compilation, which can be more reliable in some environments.

## Project Structure

```
figma-server/
├── src/                      # Source code
│   ├── core/                 # Core functionality
│   │   ├── config.ts         # Configuration management
│   │   ├── logger.ts         # Logging utilities
│   │   ├── types.ts          # Common type definitions
│   │   └── utils.ts          # Utility functions
│   ├── readonly/             # Readonly mode implementation
│   │   ├── api-client.ts     # Figma REST API client
│   │   ├── design-manager.ts # Design information extraction
│   │   └── style-extractor.ts # Style extraction utilities
│   ├── write/                # Write mode implementation
│   │   ├── plugin-bridge.ts  # WebSocket server for plugin communication
│   │   ├── design-creator.ts # Design creation utilities
│   │   └── component-utils.ts # Component utilities
│   ├── mcp/                  # MCP server implementation
│   │   ├── server.ts         # Main MCP server
│   │   ├── tools.ts          # Tool definitions
│   │   └── handlers.ts       # Tool handlers
│   ├── index.ts              # Entry point
│   └── mode-manager.ts       # Mode management (readonly/write)
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   │   └── server.test.ts    # Server tests
│   └── integration/          # Integration tests
│       └── design-flow.test.ts # Design flow tests
├── plugin/                   # Figma plugin
│   ├── code.js               # Plugin code
│   ├── manifest.json         # Plugin manifest
│   └── ui.html               # Plugin UI
└── docs/                     # Documentation
    └── usage.md              # Usage instructions for Claude AI
```

## Documentation

For detailed usage instructions, see the [usage documentation](docs/usage.md).

## License

ISC
