#!/usr/bin/env node
import { extractFigmaIds } from './utils.js';
import { DesignManager } from './design-manager.js';
import { DesignCreator } from './design-creator.js';
import { FigmaApiClient } from './api-client.js';
import { ComponentUtilizer } from './component-utilizer.js';

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Global test results tracking
let totalPassedTests = 0;
let totalFailedTests = 0;
let totalTests = 0;

// Helper function to log test results
function logResult(testName: string, passed: boolean, message?: string) {
  totalTests++;
  if (passed) {
    totalPassedTests++;
    console.log(`${COLORS.green}✓ PASS${COLORS.reset} ${testName}`);
    if (message) {
      console.log(`  ${message}`);
    }
  } else {
    totalFailedTests++;
    console.log(`${COLORS.red}✗ FAIL${COLORS.reset} ${testName}`);
    if (message) {
      console.log(`  ${COLORS.red}${message}${COLORS.reset}`);
    }
  }
}

/**
 * Test the creation and modification capabilities of the Figma MCP server
 */
class FigmaCreationTester {
  private accessToken: string;
  private fileKey: string = '';
  private createdFileUrl: string = '';
  private apiClient: FigmaApiClient | null = null;
  private designCreator: DesignCreator | null = null;
  private designManager: DesignManager | null = null;
  
  // Track created nodes for cleanup and verification
  private createdNodes: Record<string, string> = {
    page: '',
    frame: '',
    rectangle: '',
    ellipse: '',
    text: '',
    component: '',
    instance: ''
  };
  
  constructor() {
    // Get the Figma access token from environment variables
    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
    }
    this.accessToken = token;
  }
  
  /**
   * Run all creation tests
   */
  async runTests() {
    console.log(`${COLORS.bright}Starting Figma Creation Tests${COLORS.reset}`);
    
    try {
      // 1. Use an existing file instead of creating one
      const fileAvailable = await this.useExistingFile();
      
      // If we can't access a test file, we can't continue
      if (!fileAvailable || !this.fileKey) {
        console.log(`${COLORS.red}No accessible test file, cannot continue tests${COLORS.reset}`);
        return;
      }
      
      // Initialize API client and design creator with the new file
      this.apiClient = new FigmaApiClient(this.fileKey, this.accessToken);
      this.designCreator = new DesignCreator(this.fileKey, this.accessToken);
      this.designManager = new DesignManager(this.createdFileUrl, this.accessToken);
      
      // 2. Test creating frames
      await this.testCreateFrames();
      
      // 3. Test creating shapes
      await this.testCreateShapes();
      
      // 4. Test creating text
      await this.testCreateText();
      
      // 5. Test creating components
      await this.testCreateComponents();
      
      // 6. Test component instances
      await this.testCreateComponentInstances();
      
      // 7. Test updating nodes
      await this.testUpdateNodes();
      
      // 8. Test modifying styles
      await this.testModifyStyles();
      
      // 9. Test smart element creation
      await this.testSmartCreateElement();
      
      // Print test summary
      this.printTestSummary();
    } catch (error) {
      console.error(`${COLORS.red}Test failed with error:${COLORS.reset}`, error);
    }
  }
  
  /**
   * Use an existing Figma file for testing
   * This replaces the file creation test since Figma API doesn't support creating files
   */
  async useExistingFile() {
    console.log(`\n${COLORS.blue}Using Existing File for Testing${COLORS.reset}`);
    
    // Check if a test file URL was provided in environment variables
    const testFileUrl = process.env.FIGMA_TEST_FILE_URL;
    
    if (!testFileUrl) {
      console.log(`${COLORS.yellow}⚠ Warning: No test file URL provided in FIGMA_TEST_FILE_URL environment variable.${COLORS.reset}`);
      console.log(`${COLORS.yellow}Tests will be skipped. Please set FIGMA_TEST_FILE_URL to a Figma file URL you have access to.${COLORS.reset}`);
      return false;
    }
    
    try {
      // Extract file key from URL and set instance variables
      const { fileId } = extractFigmaIds(testFileUrl);
      this.fileKey = fileId;
      this.createdFileUrl = testFileUrl;
      
      // Verify we have access to the file by retrieving file info
      const designManager = new DesignManager(this.createdFileUrl, this.accessToken);
      const retrievedInfo = await designManager.getFileInfo();
      
      logResult('Verify file access', true, `File name: ${retrievedInfo.name}`);
      
      return true;
    } catch (error) {
      logResult('Verify file access', false, `Error accessing file: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test creating frames
   */
  async testCreateFrames() {
    console.log(`\n${COLORS.blue}Testing Frame Creation${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.designManager) {
        throw new Error('DesignCreator or DesignManager not initialized');
      }
      
      // First get the page ID - typically the first top-level node is the first page
      const topLevelNodes = await this.designManager.getTopLevelNodes();
      if (!topLevelNodes || topLevelNodes.length === 0) {
        throw new Error('No top-level nodes found in the file');
      }
      
      const pageId = topLevelNodes[0].id;
      this.createdNodes.page = pageId;
      
      logResult('Get page ID', true, `Working with page ID: ${pageId}`);
      
      // Create a frame
      const frameId = await this.designCreator.createFrame(
        pageId,
        'Test Frame',
        100,
        100,
        400,
        300
      );
      
      this.createdNodes.frame = frameId;
      
      logResult('Create frame', !!frameId, `Created frame with ID: ${frameId}`);
      
      // Verify frame was created by getting its details
      const frameDetails = await this.designManager.getNodeDetails(frameId);
      
      logResult('Verify frame details', 
        frameDetails.name === 'Test Frame' && frameDetails.type === 'FRAME',
        `Frame name: ${frameDetails.name}, type: ${frameDetails.type}`
      );
      
      return true;
    } catch (error) {
      logResult('Create frames', false, `Error creating frames: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test creating shapes
   */
  async testCreateShapes() {
    console.log(`\n${COLORS.blue}Testing Shape Creation${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.designManager || !this.createdNodes.frame) {
        throw new Error('DesignCreator, DesignManager, or parent frame not initialized');
      }
      
      // Create a rectangle
      const rectangleId = await this.designCreator.createRectangle(
        this.createdNodes.frame,
        'Test Rectangle',
        50,
        50,
        200,
        100,
        {
          type: 'SOLID',
          color: { r: 0.8, g: 0.1, b: 0.1, a: 1 },
          opacity: 1
        },
        8 // corner radius
      );
      
      this.createdNodes.rectangle = rectangleId;
      
      logResult('Create rectangle', !!rectangleId, `Created rectangle with ID: ${rectangleId}`);
      
      // Create an ellipse
      const ellipseId = await this.designCreator.createEllipse(
        this.createdNodes.frame,
        'Test Ellipse',
        300,
        50,
        100,
        100,
        {
          type: 'SOLID',
          color: { r: 0.1, g: 0.8, b: 0.1, a: 1 },
          opacity: 1
        }
      );
      
      this.createdNodes.ellipse = ellipseId;
      
      logResult('Create ellipse', !!ellipseId, `Created ellipse with ID: ${ellipseId}`);
      
      // Verify shapes were created
      const rectangleDetails = await this.designManager.getNodeDetails(rectangleId);
      logResult('Verify rectangle', 
        rectangleDetails.name === 'Test Rectangle' && rectangleDetails.type === 'RECTANGLE',
        `Rectangle name: ${rectangleDetails.name}, type: ${rectangleDetails.type}`
      );
      
      const ellipseDetails = await this.designManager.getNodeDetails(ellipseId);
      logResult('Verify ellipse', 
        ellipseDetails.name === 'Test Ellipse' && ellipseDetails.type === 'ELLIPSE',
        `Ellipse name: ${ellipseDetails.name}, type: ${ellipseDetails.type}`
      );
      
      return true;
    } catch (error) {
      logResult('Create shapes', false, `Error creating shapes: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test creating text elements
   */
  async testCreateText() {
    console.log(`\n${COLORS.blue}Testing Text Creation${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.designManager || !this.createdNodes.frame) {
        throw new Error('DesignCreator, DesignManager, or parent frame not initialized');
      }
      
      // Create a text element
      const textId = await this.designCreator.createText(
        this.createdNodes.frame,
        'Test Text',
        50,
        200,
        300,
        50,
        'Hello, Figma MCP!',
        {
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 24,
          textAlignHorizontal: 'CENTER',
          textAlignVertical: 'CENTER'
        }
      );
      
      this.createdNodes.text = textId;
      
      logResult('Create text element', !!textId, `Created text element with ID: ${textId}`);
      
      // Verify text was created
      const textDetails = await this.designManager.getNodeDetails(textId);
      
      // Using 'any' to bypass TypeScript's strict checking for demonstration purposes
      const textNode = textDetails as any;
      
      logResult('Verify text element', 
        textNode.name === 'Test Text' && textNode.type === 'TEXT' && textNode.characters === 'Hello, Figma MCP!',
        `Text name: ${textNode.name}, type: ${textNode.type}, content: ${textNode.characters}`
      );
      
      return true;
    } catch (error) {
      logResult('Create text element', false, `Error creating text: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test creating components
   */
  async testCreateComponents() {
    console.log(`\n${COLORS.blue}Testing Component Creation${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.designManager || !this.createdNodes.frame) {
        throw new Error('DesignCreator, DesignManager, or parent frame not initialized');
      }
      
      // Create a simple button component
      const componentId = await this.designCreator.createComponent(
        this.createdNodes.frame,
        'Button Component',
        50,
        300,
        120,
        40,
        [] // We'll add children later using update operations
      );
      
      this.createdNodes.component = componentId;
      
      logResult('Create component', !!componentId, `Created component with ID: ${componentId}`);
      
      // Verify component was created
      const componentDetails = await this.designManager.getNodeDetails(componentId);
      
      logResult('Verify component', 
        componentDetails.name === 'Button Component' && componentDetails.type === 'COMPONENT',
        `Component name: ${componentDetails.name}, type: ${componentDetails.type}`
      );
      
      // Now add a fill to the component using the updateNode method
      const updateResult = await this.designCreator.updateNode(componentId, {
        fills: [{
          type: 'SOLID',
          color: { r: 0.1, g: 0.1, b: 0.8, a: 1 },
          opacity: 1
        }],
        cornerRadius: 4
      });
      
      logResult('Update component with fill', updateResult, `Updated component with fill`);
      
      return true;
    } catch (error) {
      logResult('Create component', false, `Error creating component: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test creating component instances
   */
  async testCreateComponentInstances() {
    console.log(`\n${COLORS.blue}Testing Component Instance Creation${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.designManager || !this.createdNodes.frame || !this.createdNodes.component) {
        throw new Error('Required resources not initialized');
      }
      
      // First, get the component key from the component ID
      const componentDetails = await this.designManager.getNodeDetails(this.createdNodes.component);
      
      // In a real implementation, you would extract the component key
      // For this test, we'll simulate it
      const randomKey = `${Math.random().toString(36).substring(2, 10)}:${Math.random().toString(36).substring(2, 10)}`;
      
      // Create a component instance
      // Note: In a real implementation, you'd use the actual component key
      const instanceId = await this.designCreator.createComponentInstance(
        this.createdNodes.frame,
        randomKey, // In a real test we'd use the actual component key
        'Button Instance',
        200,
        300,
        1.2, // Scale X
        1.0  // Scale Y
      );
      
      this.createdNodes.instance = instanceId;
      
      // We may not be able to get an actual instance ID due to test limitations,
      // but we can demonstrate the method call
      if (instanceId) {
        logResult('Create component instance', true, `Created component instance with ID: ${instanceId}`);
      } else {
        console.log(`${COLORS.yellow}⚠ Note: Component instance creation may fail in test environment${COLORS.reset}`);
        logResult('Create component instance', false, 'Could not create component instance');
      }
      
      return true;
    } catch (error) {
      // Creating instances may fail in test environment without real component keys
      console.log(`${COLORS.yellow}⚠ Note: Component instance creation may fail in test environment${COLORS.reset}`);
      logResult('Create component instance', false, `Error creating component instance: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test updating nodes
   */
  async testUpdateNodes() {
    console.log(`\n${COLORS.blue}Testing Node Updates${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.createdNodes.rectangle) {
        throw new Error('DesignCreator or rectangle node not initialized');
      }
      
      // Update rectangle properties
      const updateResult = await this.designCreator.updateNode(this.createdNodes.rectangle, {
        cornerRadius: 16,  // Increase corner radius
        opacity: 0.8,      // Make it slightly transparent
        name: 'Updated Rectangle'
      });
      
      logResult('Update node properties', updateResult, `Updated rectangle properties`);
      
      // Move rectangle
      const moveResult = await this.designCreator.moveNode(this.createdNodes.rectangle, 100, 100);
      
      logResult('Move node', moveResult, `Moved rectangle to new position`);
      
      // Resize rectangle
      const resizeResult = await this.designCreator.resizeNode(this.createdNodes.rectangle, 300, 150);
      
      logResult('Resize node', resizeResult, `Resized rectangle to new dimensions`);
      
      return true;
    } catch (error) {
      logResult('Update nodes', false, `Error updating nodes: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test modifying styles
   */
  async testModifyStyles() {
    console.log(`\n${COLORS.blue}Testing Style Modifications${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.createdNodes.ellipse || !this.createdNodes.text) {
        throw new Error('Required resources not initialized');
      }
      
      // Set a new fill on the ellipse
      const fillResult = await this.designCreator.setSolidFill(
        this.createdNodes.ellipse,
        { r: 0.9, g: 0.6, b: 0.1, a: 1 },  // Orange color
        0.9
      );
      
      logResult('Set fill', fillResult, `Set new fill on ellipse`);
      
      // Set a stroke on the ellipse
      const strokeResult = await this.designCreator.setStroke(
        this.createdNodes.ellipse,
        [{
          type: 'SOLID',
          color: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
          opacity: 1
        }],
        2 // Stroke weight
      );
      
      logResult('Set stroke', strokeResult, `Set stroke on ellipse`);
      
      // Set effects (shadow)
      const effectsResult = await this.designCreator.setEffects(
        this.createdNodes.ellipse,
        [{
          type: 'DROP_SHADOW',
          visible: true,
          radius: 10,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 4, y: 4 },
          spread: 0
        }]
      );
      
      logResult('Set effects', effectsResult, `Set shadow effect on ellipse`);
      
      return true;
    } catch (error) {
      logResult('Modify styles', false, `Error modifying styles: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Test smart element creation (with component reuse)
   */
  async testSmartCreateElement() {
    console.log(`\n${COLORS.blue}Testing Smart Element Creation${COLORS.reset}`);
    
    try {
      if (!this.designCreator || !this.createdNodes.frame) {
        throw new Error('Required resources not initialized');
      }
      
      // Create an element using smart creation (will use components if available)
      const elementId = await this.designCreator.smartCreateElement(
        this.createdNodes.frame,
        'rectangle',
        'Smart Rectangle',
        400,
        300,
        150,
        80,
        {
          fill: {
            type: 'SOLID',
            color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
            opacity: 1
          },
          cornerRadius: 8
        }
      );
      
      logResult('Smart create element', !!elementId, `Created element with ID: ${elementId}`);
      
      return true;
    } catch (error) {
      logResult('Smart create element', false, `Error in smart create: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Print test summary
   */
  private printTestSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(`${COLORS.bright}Test Summary${COLORS.reset}`);
    console.log('='.repeat(50));
    console.log(`Total Tests: ${COLORS.bright}${totalTests}${COLORS.reset}`);
    console.log(`Passed: ${COLORS.green}${totalPassedTests}${COLORS.reset}`);
    console.log(`Failed: ${COLORS.red}${totalFailedTests}${COLORS.reset}`);
    console.log('='.repeat(50));
    
    if (this.fileKey) {
      console.log(`\nCreated file available at: ${COLORS.blue}https://www.figma.com/file/${this.fileKey}${COLORS.reset}`);
    }
  }
}

/**
 * Run the tests
 */
const tester = new FigmaCreationTester();
tester.runTests().catch(console.error);
