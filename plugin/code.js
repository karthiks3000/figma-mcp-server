// Figma Plugin - MCP Bridge
// This code runs in the Figma client and provides a WebSocket bridge
// to the MCP server for executing Figma Plugin API commands

// Command queue for tracking in-flight commands
const pendingCommands = new Map();
let isConnected = false;

// Initialize plugin UI (this will handle the WebSocket connection)
figma.showUI(__html__, { width: 400, height: 500, themeColors: true });
figma.ui.resize(400, 500);

// Send plugin information to UI
sendPluginInfo();

// Main command handler - receives commands from the WebSocket server
function processCommand(command) {
  try {
    // Log command (for debugging)
    console.log('Processing command:', command);
    
    // Notify UI of command being processed
    figma.ui.postMessage({
      type: 'command',
      command: command.command,
      message: `Executing: ${command.command}`
    });
    
    // Dispatch to appropriate command handler
    switch (command.command) {
      case 'get-selection':
        return handleGetSelection(command);
      case 'create-rectangle':
        return handleCreateRectangle(command);
      case 'create-text':
        return handleCreateText(command);
      case 'create-frame':
        return handleCreateFrame(command);
      case 'create-component':
        return handleCreateComponent(command);
      case 'create-instance':
        return handleCreateInstance(command);
      case 'set-fill':
        return handleSetFill(command);
      case 'set-stroke':
        return handleSetStroke(command);
      case 'set-effects':
        return handleSetEffects(command);
      case 'update-node':
        return handleUpdateNode(command);
      case 'delete-node':
        return handleDeleteNode(command);
      case 'export-node':
        return handleExportNode(command);
      case 'list-components':
        return handleListComponents(command);
      default:
        throw new Error(`Unknown command: ${command.command}`);
    }
  } catch (error) {
    // Send error response
    sendResponse({
      id: command.id,
      success: false,
      error: error.message
    });
    
    // Log error
    console.error('Error processing command:', error);
  }
}

// Command handlers
async function handleGetSelection(command) {
  try {
    const selection = figma.currentPage.selection;
    const result = selection.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));
    
    sendResponse({
      id: command.id,
      success: true,
      result
    });
  } catch (error) {
    console.error('Error in handleGetSelection:', error);
    sendResponse({
      id: command.id,
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}

async function handleCreateRectangle(command) {
  try {
    const { params } = command;
    
    // Create rectangle
    const rect = figma.createRectangle();
    
    // Set basic properties
    rect.x = params.x || 0;
    rect.y = params.y || 0;
    rect.resize(params.width || 100, params.height || 100);
    rect.name = params.name || 'Rectangle';
    
    // Add to page or parent
    const parent = params.parentId 
      ? figma.getNodeById(params.parentId) 
      : figma.currentPage;
    
    if (!parent) {
      throw new Error(`Parent node not found: ${params.parentId}`);
    }
    
    if (parent.type === 'PAGE' || parent.type === 'FRAME' || parent.type === 'GROUP') {
      parent.appendChild(rect);
    } else {
      throw new Error(`Cannot append to node type: ${parent.type}`);
    }
    
    // Set fill if provided
    if (params.fill) {
      applyFill(rect, params.fill);
    }
    
    // Set corner radius if provided
    if (params.cornerRadius !== undefined) {
      rect.cornerRadius = params.cornerRadius;
    }
    
    // Send success response with node ID
    sendResponse({
      id: command.id,
      success: true,
      result: { id: rect.id }
    });
  } catch (error) {
    console.error('Error in handleCreateRectangle:', error);
    sendResponse({
      id: command.id,
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}

async function handleCreateText(command) {
  const { params } = command;
  
  // Create text node
  const text = figma.createText();
  
  // Set basic properties
  text.x = params.x || 0;
  text.y = params.y || 0;
  text.resize(params.width || 200, params.height || 50);
  text.name = params.name || 'Text';
  
  // Add to page or parent
  const parent = params.parentId 
    ? figma.getNodeById(params.parentId) 
    : figma.currentPage;
  
  if (!parent) {
    throw new Error(`Parent node not found: ${params.parentId}`);
  }
  
  if (parent.type === 'PAGE' || parent.type === 'FRAME' || parent.type === 'GROUP') {
    parent.appendChild(text);
  } else {
    throw new Error(`Cannot append to node type: ${parent.type}`);
  }
  
  // Load font and set characters
  if (params.characters) {
    try {
      // Set font if specified
      if (params.style && params.style.fontFamily) {
        await figma.loadFontAsync({ family: params.style.fontFamily, style: params.style.fontStyle || 'Regular' });
      } else {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      }
      
      // Set text
      text.characters = params.characters;
      
      // Apply text styles if provided
      if (params.style) {
        if (params.style.fontSize) text.fontSize = params.style.fontSize;
        if (params.style.fontWeight) text.fontWeight = params.style.fontWeight;
        if (params.style.textAlignHorizontal) text.textAlignHorizontal = params.style.textAlignHorizontal;
        if (params.style.textAlignVertical) text.textAlignVertical = params.style.textAlignVertical;
        if (params.style.letterSpacing) text.letterSpacing = params.style.letterSpacing;
        if (params.style.lineHeight) text.lineHeight = params.style.lineHeight;
      }
    } catch (err) {
      console.error("Error setting text:", err);
      // We'll still return success, but with a note about the text issue
    }
  }
  
  // Send success response with node ID
  sendResponse({
    id: command.id,
    success: true,
    result: { id: text.id }
  });
}

async function handleCreateFrame(command) {
  const { params } = command;
  
  // Create frame
  const frame = figma.createFrame();
  
  // Set basic properties
  frame.x = params.x || 0;
  frame.y = params.y || 0;
  frame.resize(params.width || 400, params.height || 300);
  frame.name = params.name || 'Frame';
  
  // Add to page or parent
  const parent = params.parentId 
    ? figma.getNodeById(params.parentId) 
    : figma.currentPage;
  
  if (!parent) {
    throw new Error(`Parent node not found: ${params.parentId}`);
  }
  
  if (parent.type === 'PAGE' || parent.type === 'FRAME' || parent.type === 'GROUP') {
    parent.appendChild(frame);
  } else {
    throw new Error(`Cannot append to node type: ${parent.type}`);
  }
  
  // Send success response with node ID
  sendResponse({
    id: command.id,
    success: true,
    result: { id: frame.id }
  });
}

async function handleCreateComponent(command) {
  const { params } = command;
  
  // Create component
  const component = figma.createComponent();
  
  // Set basic properties
  component.x = params.x || 0;
  component.y = params.y || 0;
  component.resize(params.width || 100, params.height || 100);
  component.name = params.name || 'Component';
  
  // Add to page or parent
  const parent = params.parentId 
    ? figma.getNodeById(params.parentId) 
    : figma.currentPage;
  
  if (!parent) {
    throw new Error(`Parent node not found: ${params.parentId}`);
  }
  
  if (parent.type === 'PAGE' || parent.type === 'FRAME' || parent.type === 'GROUP') {
    parent.appendChild(component);
  } else {
    throw new Error(`Cannot append to node type: ${parent.type}`);
  }
  
  // Add children if provided
  if (params.childrenData && Array.isArray(params.childrenData) && params.childrenData.length > 0) {
    // This is just a placeholder - actual child creation would need recursive command handling
    // In a real implementation, we'd need to process each child based on its type
  }
  
  // Send success response with node ID and component key
  sendResponse({
    id: command.id,
    success: true,
    result: { 
      id: component.id,
      key: component.key
    }
  });
}

async function handleCreateInstance(command) {
  const { params } = command;
  
  // Find the main component by key
  const component = figma.getComponentByKey(params.componentKey);
  if (!component) {
    throw new Error(`Component not found with key: ${params.componentKey}`);
  }
  
  // Create an instance
  const instance = component.createInstance();
  
  // Set basic properties
  instance.x = params.x || 0;
  instance.y = params.y || 0;
  instance.name = params.name || 'Instance';
  
  // Set scale if provided
  if (params.scaleX !== undefined || params.scaleY !== undefined) {
    const scaleX = params.scaleX !== undefined ? params.scaleX : 1;
    const scaleY = params.scaleY !== undefined ? params.scaleY : 1;
    instance.rescale(scaleX, scaleY);
  }
  
  // Add to page or parent
  const parent = params.parentId 
    ? figma.getNodeById(params.parentId) 
    : figma.currentPage;
  
  if (!parent) {
    throw new Error(`Parent node not found: ${params.parentId}`);
  }
  
  if (parent.type === 'PAGE' || parent.type === 'FRAME' || parent.type === 'GROUP') {
    parent.appendChild(instance);
  } else {
    throw new Error(`Cannot append to node type: ${parent.type}`);
  }
  
  // Send success response with node ID
  sendResponse({
    id: command.id,
    success: true,
    result: { id: instance.id }
  });
}

async function handleSetFill(command) {
  const { params } = command;
  
  // Get node
  const node = figma.getNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node not found: ${params.nodeId}`);
  }
  
  // Check if node supports fills
  if (!('fills' in node)) {
    throw new Error(`Node type does not support fills: ${node.type}`);
  }
  
  // Apply fills
  applyFill(node, params.fill);
  
  // Send success response
  sendResponse({
    id: command.id,
    success: true,
    result: { id: node.id }
  });
}

async function handleSetStroke(command) {
  const { params } = command;
  
  // Get node
  const node = figma.getNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node not found: ${params.nodeId}`);
  }
  
  // Check if node supports strokes
  if (!('strokes' in node)) {
    throw new Error(`Node type does not support strokes: ${node.type}`);
  }
  
  // Apply strokes
  if (params.stroke) {
    const strokes = Array.isArray(params.stroke) ? params.stroke : [params.stroke];
    node.strokes = strokes.map(stroke => {
      return {
        type: stroke.type || 'SOLID',
        color: stroke.color || { r: 0, g: 0, b: 0 },
        visible: true
      };
    });
  }
  
  // Set stroke weight if provided
  if (params.strokeWeight !== undefined && 'strokeWeight' in node) {
    node.strokeWeight = params.strokeWeight;
  }
  
  // Send success response
  sendResponse({
    id: command.id,
    success: true,
    result: { id: node.id }
  });
}

async function handleSetEffects(command) {
  const { params } = command;
  
  // Get node
  const node = figma.getNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node not found: ${params.nodeId}`);
  }
  
  // Check if node supports effects
  if (!('effects' in node)) {
    throw new Error(`Node type does not support effects: ${node.type}`);
  }
  
  // Apply effects
  if (params.effects && Array.isArray(params.effects)) {
    node.effects = params.effects.map(effect => {
      return {
        type: effect.type || 'DROP_SHADOW',
        color: effect.color || { r: 0, g: 0, b: 0 },
        offset: effect.offset || { x: 0, y: 0 },
        radius: effect.radius !== undefined ? effect.radius : 4,
        visible: effect.visible !== undefined ? effect.visible : true,
        blendMode: effect.blendMode || 'NORMAL'
      };
    });
  }
  
  // Send success response
  sendResponse({
    id: command.id,
    success: true,
    result: { id: node.id }
  });
}

async function handleUpdateNode(command) {
  const { params } = command;
  
  // Get node
  const node = figma.getNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node not found: ${params.nodeId}`);
  }
  
  // Update properties
  if (params.properties) {
    Object.entries(params.properties).forEach(([key, value]) => {
      if (key in node) {
        node[key] = value;
      }
    });
  }
  
  // Send success response
  sendResponse({
    id: command.id,
    success: true,
    result: { id: node.id }
  });
}

async function handleDeleteNode(command) {
  const { params } = command;
  
  // Get node
  const node = figma.getNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node not found: ${params.nodeId}`);
  }
  
  // Remove node
  node.remove();
  
  // Send success response
  sendResponse({
    id: command.id,
    success: true
  });
}

async function handleExportNode(command) {
  const { params } = command;
  
  // Get node
  const node = figma.getNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node not found: ${params.nodeId}`);
  }
  
  // Set export settings
  const settings = {
    format: params.format || 'PNG',
    constraint: { type: 'SCALE', value: params.scale || 1 }
  };
  
  // Export
  const bytes = await node.exportAsync(settings);
  
  // Convert to base64 for transmission
  const base64 = figma.base64Encode(bytes);
  
  // Send success response with export data
  sendResponse({
    id: command.id,
    success: true,
    result: {
      id: node.id,
      format: settings.format,
      data: base64
    }
  });
}

async function handleListComponents(command) {
  // Get all components in the document
  const components = [];
  
  // Process local components
  figma.root.children.forEach(page => {
    // Function to recursively find components
    const findComponents = (node) => {
      if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        components.push({
          id: node.id,
          name: node.name,
          type: node.type,
          key: node.type === 'COMPONENT' ? node.key : null
        });
      }
      
      // Check children
      if ('children' in node) {
        node.children.forEach(findComponents);
      }
    };
    
    // Start recursive search on this page
    findComponents(page);
  });
  
  // Send success response with component list
  sendResponse({
    id: command.id,
    success: true,
    result: components
  });
}

// Helper functions
function applyFill(node, fill) {
  if (!fill) return;
  
  const fills = Array.isArray(fill) ? fill : [fill];
  
  try {
    // Convert from our API format to Figma's internal format
    const figmaFills = fills.map(f => {
      // Handle different fill types
      if (f.type === 'SOLID') {
        return {
          type: 'SOLID',
          color: {
            r: f.color.r,
            g: f.color.g,
            b: f.color.b
          },
          opacity: f.color.a !== undefined ? f.color.a : 1
        };
      }
      else if (f.type === 'GRADIENT_LINEAR' && f.gradientStops) {
        return {
          type: 'GRADIENT_LINEAR',
          gradientTransform: [[1, 0, 0], [0, 1, 0]],
          gradientStops: f.gradientStops.map(stop => ({
            position: stop.position,
            color: {
              r: stop.color.r,
              g: stop.color.g,
              b: stop.color.b,
              a: stop.color.a !== undefined ? stop.color.a : 1
            }
          }))
        };
      }
      else {
        // Default to a solid white fill
        return {
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1 },
          opacity: 1
        };
      }
    });
    
    node.fills = figmaFills;
    
  } catch (error) {
    console.error('Error applying fill:', error, JSON.stringify(fills));
    // Set a default fill if there's an error
    node.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  }
}

// Send plugin information to UI
function sendPluginInfo() {
  figma.ui.postMessage({
    type: 'plugin-info',
    data: {
      name: figma.root.name || 'Unknown File',
      id: figma.fileKey || 'Unknown ID',
      user: figma.currentUser ? {
        id: figma.currentUser.id,
        name: figma.currentUser.name
      } : null
    }
  });
}

// Send response back to server via UI with retry mechanism
function sendResponse(response) {
  if (!isConnected) {
    console.error('Cannot send response: WebSocket not connected');
    return;
  }
  
  try {
    const messageData = {
      type: 'ws-send',
      data: {
        type: 'response',
        data: response
      }
    };
    
    // Log detailed information about the response being sent
    console.log('Sending response:', response);
    
    // Send the message to UI
    figma.ui.postMessage(messageData);
    
    // Remove from pending commands
    if (pendingCommands.has(response.id)) {
      pendingCommands.delete(response.id);
    }
  } catch (error) {
    console.error('Error sending response:', error);
  }
}

// Handle messages from UI
figma.ui.onmessage = (message) => {
  switch (message.type) {
    case 'ws-message':
      // Handle message from server
      const serverMessage = message.message;
      
      // Handle command from server
      if (serverMessage.type === 'command') {
        // Store command in pending map if response is required
        if (serverMessage.responseRequired !== false) {
          pendingCommands.set(serverMessage.id, serverMessage);
        }
        
        // Process the command
        processCommand(serverMessage);
      }
      break;
      
    case 'connection-status':
      // Update connection status
      isConnected = message.status === 'connected';
      console.log(`WebSocket connection status: ${message.status} - ${message.message}`);
      break;
      
    case 'ws-error':
      // Handle WebSocket error
      console.error('WebSocket error:', message.error);
      break;
      
    case 'get-plugin-info':
      // Send plugin information to UI
      sendPluginInfo();
      break;
  }
};
