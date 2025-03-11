# Figma MCP Bridge Plugin

This plugin creates a bridge between the Figma API and the Model Context Protocol (MCP), allowing for programmatic control of Figma designs.

## How to Use the Plugin Test

To run the plugin test successfully, follow these steps:

1. **Open Figma Desktop Application**

2. **Import the Plugin**
   - In Figma, go to Plugins > Development > Import plugin from manifest...
   - Select the `manifest.json` file from the `plugin` directory

3. **Run the Plugin**
   - After importing, the plugin should appear in your Development plugins
   - Run the plugin from the Plugins > Development menu
   - A dialog will appear showing the MCP Bridge UI

4. **Run the Test Script**
   - With the plugin running in Figma, open a terminal
   - Navigate to the project directory
   - Run: `npm run build && node build/plugin-test.js`

5. **View Results**
   - Check your Figma canvas for the created Poll Results component
   - The test creates a complete poll results UI based on the provided design

## Troubleshooting

- **Connection Timeout**: Make sure the plugin is running in Figma before executing the test script
- **WebSocket Issues**: If you get WebSocket errors, ensure no other instances of the plugin are running
- **Timeouts in Responses**: The plugin may report timeouts even though elements were created successfully in Figma. This is due to WebSocket communication delays and doesn't affect the actual creation of elements.

## Plugin Features

This plugin demonstrates:

1. Creating complex UI components programmatically
2. Using gradients and solid fills
3. Creating and using Figma components
4. Managing text and rectangle elements
5. Creating component instances
6. Adding effects like shadows
7. Validating component creation with API calls

## Development Notes

- The plugin UI is resizable and displays detailed logs
- The plugin bridge uses WebSockets for communication
- Color values should be provided without alpha (a) property when creating fills
- For gradients, always include `gradientTransform` property
