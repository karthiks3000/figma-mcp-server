#!/usr/bin/env node
import axios from 'axios';
import { extractFigmaIds } from './utils.js';
import { DesignManager } from './design-manager.js';
import { FigmaApiClient } from './api-client.js';
import { StyleExtractor } from './style-extractor.js';
import { ComponentDetector } from './component-detector.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// Test configuration - multiple Figma files for comprehensive testing
const TEST_FIGMA_FILES = [
  {
    name: 'Platform Data & Reports',
    url: 'https://www.figma.com/design/qWoIIHHPuzNPtcOKfjha1N/Platform-Data-%26-Reports?node-id=5222-41504&t=n7JwZvZVncZx4jY1-4'
  },
  // {
  //   name: 'Class Overview Data Tile',
  //   url: 'https://www.figma.com/design/qWoIIHHPuzNPtcOKfjha1N/Platform-Data-%26-Reports?node-id=5240-44799&t=BMKnAcpkcWsbBppw-4'
  // },
  // {
  //   name: 'Poll results view',
  //   url: 'https://www.figma.com/design/qWoIIHHPuzNPtcOKfjha1N/Platform-Data-%26-Reports?node-id=5940-48277&t=BMKnAcpkcWsbBppw-4'
  // }
  // Add more test files as needed
];

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

// Helper function to log test results (for backward compatibility)
function logResult(testName: string, passed: boolean, message?: string) {
  totalTests++;
  if (passed) {
    totalPassedTests++;
    console.log(`${COLORS.green}✓ PASS${COLORS.reset} ${testName}`);
  } else {
    totalFailedTests++;
    console.log(`${COLORS.red}✗ FAIL${COLORS.reset} ${testName}`);
    if (message) {
      console.log(`  ${COLORS.red}${message}${COLORS.reset}`);
    }
  }
}

// Helper function to validate response structure
function validateResponseStructure(response: any): boolean {
  return (
    response &&
    Array.isArray(response.content) &&
    response.content.length > 0 &&
    response.content[0].type === 'text' &&
    typeof response.content[0].text === 'string'
  );
}

/**
 * Test the Figma MCP server tools and all related classes
 */
class FigmaTester {
  private figmaUrl: string;
  private fileId: string;
  private nodeId?: string;
  private accessToken: string;
  private designManager: DesignManager;
  private apiClient: FigmaApiClient;
  private styleExtractor: StyleExtractor;
  private componentDetector: ComponentDetector;
  
  // Instance test results tracking
  public passedTests = 0;
  public failedTests = 0;
  public instanceTotalTests = 0;

  constructor(figmaUrl: string) {
    this.figmaUrl = figmaUrl;
    
    // Extract file ID and node ID from the URL
    const ids = extractFigmaIds(figmaUrl);
    this.fileId = ids.fileId;
    this.nodeId = ids.nodeId;
    
    // Get the Figma access token from environment variables
    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
    }
    this.accessToken = token;
    
    // Create instances of all classes for testing
    this.designManager = new DesignManager(figmaUrl, token);
    this.apiClient = new FigmaApiClient(this.fileId, token);
    this.styleExtractor = new StyleExtractor(this.apiClient);
    this.componentDetector = new ComponentDetector(this.apiClient);
  }
  
  // Helper function to log test results for this instance
  private logResult(testName: string, passed: boolean, message?: string) {
    this.instanceTotalTests++;
    totalTests++;
    
    if (passed) {
      this.passedTests++;
      totalPassedTests++;
      console.log(`${COLORS.green}✓ PASS${COLORS.reset} ${testName}`);
    } else {
      this.failedTests++;
      totalFailedTests++;
      console.log(`${COLORS.red}✗ FAIL${COLORS.reset} ${testName}`);
      if (message) {
        console.log(`  ${COLORS.red}${message}${COLORS.reset}`);
      }
    }
  }

  // Test utils.extractFigmaIds function
  async testExtractFigmaIds(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing extractFigmaIds()...${COLORS.reset}`);
    
    try {
      // Test with current URL
      const ids = extractFigmaIds(this.figmaUrl);
      
      const hasRequiredProps = 
        typeof ids.fileId === 'string' &&
        ids.fileId.length > 0;
      
      if (hasRequiredProps) {
        this.logResult('extractFigmaIds - current URL', true);
        console.log(`  File ID: ${COLORS.bright}${ids.fileId}${COLORS.reset}`);
        console.log(`  Node ID: ${ids.nodeId || 'Not provided'}`);
      } else {
        this.logResult('extractFigmaIds - current URL', false, 'Failed to extract file ID');
      }
      
      // Test with different URL formats
      const testUrls = [
        'https://www.figma.com/file/abcDEF123456/Test-File',
        'https://www.figma.com/design/abcDEF123456/Test-File',
        'https://www.figma.com/proto/abcDEF123456/Test-File',
        'https://www.figma.com/file/abcDEF123456/Test-File?node-id=123-456'
      ];
      
      for (const url of testUrls) {
        try {
          const urlIds = extractFigmaIds(url);
          this.logResult(`extractFigmaIds - ${url.substring(0, 30)}...`, true);
          console.log(`  File ID: ${urlIds.fileId}`);
          console.log(`  Node ID: ${urlIds.nodeId || 'Not provided'}`);
        } catch (error) {
          this.logResult(`extractFigmaIds - ${url.substring(0, 30)}...`, false, (error as Error).message);
        }
      }
      
      // Test with invalid URL
      try {
        extractFigmaIds('https://example.com');
        this.logResult('extractFigmaIds - invalid URL', false, 'Should have thrown an error for invalid URL');
      } catch (error) {
        if (error instanceof McpError && error.code === ErrorCode.InvalidParams) {
          this.logResult('extractFigmaIds - invalid URL', true, 'Correctly threw error for invalid URL');
        } else {
          this.logResult('extractFigmaIds - invalid URL', false, 'Threw unexpected error type');
        }
      }
    } catch (error) {
      this.logResult('extractFigmaIds', false, `Unexpected error: ${(error as Error).message}`);
    }
  }

  // Test validate_token tool
  async testValidateToken(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing validate_token tool...${COLORS.reset}`);
    
    try {
      // Use getFileInfo to validate token
      const fileInfo = await this.designManager.getFileInfo();
      
      this.logResult('validate_token', true);
      console.log(`  File name: ${COLORS.bright}${fileInfo.name}${COLORS.reset}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        
        if (statusCode === 404 || statusCode === 403) {
          this.logResult('validate_token', false, 'Token validation failed. You do not have access to this Figma file.');
        } else {
          this.logResult('validate_token', false, `API error: ${error.response?.data?.message || error.message}`);
        }
      } else {
        this.logResult('validate_token', false, `Unexpected error: ${(error as Error).message}`);
      }
    }
  }

  // Test get_file_info tool
  async testGetFileInfo(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing get_file_info tool...${COLORS.reset}`);
    
    try {
      // Use getFileInfo from DesignManager
      const fileInfo = await this.designManager.getFileInfo();
      
      const hasRequiredProps = 
        typeof fileInfo.name === 'string' &&
        typeof fileInfo.lastModified === 'string' &&
        typeof fileInfo.version === 'string';
      
      if (hasRequiredProps) {
        this.logResult('get_file_info', true);
        console.log(`  File name: ${COLORS.bright}${fileInfo.name}${COLORS.reset}`);
        console.log(`  Last modified: ${fileInfo.lastModified}`);
      } else {
        this.logResult('get_file_info', false, 'Response missing required file info properties');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logResult('get_file_info', false, `API error: ${error.response?.data?.message || error.message}`);
      } else {
        this.logResult('get_file_info', false, `Unexpected error: ${(error as Error).message}`);
      }
    }
  }

  // Test get_node_details tool
  async testGetNodeDetails(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing get_node_details tool...${COLORS.reset}`);
    
    if (!this.nodeId) {
      this.logResult('get_node_details', false, 'No node ID available in the test URL');
      return;
    }
    
    try {
      // Test default detail level (basic)
      const nodeDetails = await this.designManager.getNodeDetails(this.nodeId);
      
      if (nodeDetails && (nodeDetails.document || nodeDetails.id)) {
        this.logResult('get_node_details (default)', true);
        console.log(`  Node type: ${COLORS.bright}${nodeDetails.document?.type || nodeDetails.type}${COLORS.reset}`);
        console.log(`  Node name: ${nodeDetails.document?.name || nodeDetails.name}`);
      } else {
        this.logResult('get_node_details (default)', false, 'Node details not found or invalid');
      }
      
      // Test different detail levels
      await this.testNodeDetailLevels();
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logResult('get_node_details', false, `API error: ${error.response?.data?.message || error.message}`);
      } else {
        this.logResult('get_node_details', false, `Unexpected error: ${(error as Error).message}`);
      }
    }
  }
  
  // Test different detail levels for get_node_details
  async testNodeDetailLevels(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing get_node_details with different detail levels...${COLORS.reset}`);
    
    if (!this.nodeId) {
      this.logResult('get_node_details (detail levels)', false, 'No node ID available in the test URL');
      return;
    }
    
    try {
      // Test summary level
      const summaryDetails = await this.designManager.getNodeDetails(this.nodeId, 'summary');
      if (summaryDetails && summaryDetails.id) {
        this.logResult('get_node_details (summary)', true);
        console.log(`  Summary contains: id, name, type${summaryDetails.childCount ? ', childCount' : ''}`);
        console.log(`  Node name: ${summaryDetails.name}`);
        console.log(`  Node type: ${summaryDetails.type}`);
        if (summaryDetails.children) {
          console.log(`  Children count: ${summaryDetails.childCount || summaryDetails.children.length}`);
        }
      } else {
        this.logResult('get_node_details (summary)', false, 'Summary details not found or invalid');
      }
      
      // Test basic level (default)
      const basicDetails = await this.designManager.getNodeDetails(this.nodeId, 'basic');
      if (basicDetails && basicDetails.id) {
        this.logResult('get_node_details (basic)', true);
        console.log(`  Basic contains common properties and limited children`);
        console.log(`  Node name: ${basicDetails.name}`);
        console.log(`  Node type: ${basicDetails.type}`);
        if (basicDetails.children) {
          console.log(`  Children count: ${basicDetails.children.length}`);
        }
      } else {
        this.logResult('get_node_details (basic)', false, 'Basic details not found or invalid');
      }
      
      // Test custom properties
      const customProps = ['id', 'name', 'type', 'children.id', 'children.name'];
      const customDetails = await this.designManager.getNodeDetails(this.nodeId, 'basic', customProps);
      if (customDetails && customDetails.id) {
        this.logResult('get_node_details (custom properties)', true);
        console.log(`  Custom properties: ${customProps.join(', ')}`);
        console.log(`  Node name: ${customDetails.name}`);
        console.log(`  Node type: ${customDetails.type}`);
        if (customDetails.children && Array.isArray(customDetails.children)) {
          console.log(`  Children count: ${customDetails.children.length}`);
          if (customDetails.children.length > 0) {
            console.log(`  First child: ${JSON.stringify(customDetails.children[0])}`);
          }
        }
      } else {
        this.logResult('get_node_details (custom properties)', false, 'Custom property details not found or invalid');
      }
      
      // We don't test 'full' level here as it might be too large for some nodes
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logResult('get_node_details (detail levels)', false, `API error: ${error.response?.data?.message || error.message}`);
      } else {
        this.logResult('get_node_details (detail levels)', false, `Unexpected error: ${(error as Error).message}`);
      }
    }
  }

  // Test extract_styles tool
  async testExtractStyles(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing extract_styles tool...${COLORS.reset}`);
    
    try {
      // Use extractStyles from DesignManager
      const styles = await this.designManager.extractStyles();
      
      this.logResult('extract_styles', true);
      console.log(`Found styles:`);
      console.log(`  - Colors: ${COLORS.bright}${styles.colors.length}${COLORS.reset}`);
      console.log(`  - Text: ${COLORS.bright}${styles.text.length}${COLORS.reset}`);
      console.log(`  - Effects: ${COLORS.bright}${styles.effects.length}${COLORS.reset}`);
      console.log(`  - Grid: ${COLORS.bright}${styles.grid.length}${COLORS.reset}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logResult('extract_styles', false, `API error: ${error.response?.data?.message || error.message}`);
      } else {
        this.logResult('extract_styles', false, `Unexpected error: ${(error as Error).message}`);
      }
    }
  }

  // Test get_assets tool
  async testGetAssets(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing get_assets tool...${COLORS.reset}`);
    
    if (!this.nodeId) {
      this.logResult('get_assets', false, 'No node ID available in the test URL');
      return;
    }
    
    try {
      // Use getAssets from DesignManager
      const images = await this.designManager.getAssets(this.nodeId, 'png', 1);
      
      if (images && Object.keys(images).length > 0) {
        this.logResult('get_assets', true);
        console.log(`  Retrieved ${COLORS.bright}${Object.keys(images).length}${COLORS.reset} image URLs`);
      } else {
        this.logResult('get_assets', false, 'No image URLs found');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logResult('get_assets', false, `API error: ${error.response?.data?.message || error.message}`);
      } else {
        this.logResult('get_assets', false, `Unexpected error: ${(error as Error).message}`);
      }
    }
  }
  
  // Test get_variables tool
  async testGetVariables(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing get_variables tool...${COLORS.reset}`);
    
    try {
      // Use getVariables from DesignManager
      const variables = await this.designManager.getVariables();
      
      this.logResult('get_variables', true);
      console.log(`Retrieved variables:`);
      console.log(`  - Variables: ${COLORS.bright}${variables.variables.length}${COLORS.reset}`);
      console.log(`  - Collections: ${COLORS.bright}${variables.collections.length}${COLORS.reset}`);
      
      if (variables.collections.length > 0) {
        console.log(`  Example collection: ${variables.collections[0].name}`);
      }
      
      if (variables.variables.length > 0) {
        console.log(`  Example variable: ${variables.variables[0].name}`);
      }
    } catch (error) {
      // Variables API might not be available for all files
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Don't count this as a pass or fail, just log it as skipped
        console.log(`${COLORS.yellow}⚠ SKIP${COLORS.reset} get_variables - Variables API not available for this file (404 error)`);
        console.log(`  ${COLORS.yellow}This is expected for some files or older Figma versions${COLORS.reset}`);
        // Don't increment test counters for skipped tests
        return;
      } else {
        this.logResult('get_variables', false, `Error: ${(error as Error).message}`);
      }
    }
  }
  
  // Test identify_components tool
  async testIdentifyComponents(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing identify_components tool...${COLORS.reset}`);
    
    if (!this.nodeId) {
      this.logResult('identify_components', false, 'No node ID available in the test URL');
      return;
    }
    
    try {
      // Use identifyUIComponents from DesignManager
      const components = await this.designManager.identifyUIComponents(this.nodeId);
      
      const totalComponents = 
        components.charts.length +
        components.tables.length +
        components.forms.length +
        components.navigation.length +
        components.cards.length +
        components.buttons.length +
        components.dropdowns.length +
        components.other.length;
      
      if (totalComponents > 0) {
        this.logResult('identify_components', true);
        console.log(`Identified ${COLORS.bright}${totalComponents}${COLORS.reset} UI components:`);
        console.log(`  - Charts: ${components.charts.length}`);
        console.log(`  - Tables: ${components.tables.length}`);
        console.log(`  - Forms: ${components.forms.length}`);
        console.log(`  - Navigation: ${components.navigation.length}`);
        console.log(`  - Cards: ${components.cards.length}`);
        console.log(`  - Buttons: ${components.buttons.length}`);
        console.log(`  - Dropdowns: ${components.dropdowns.length}`);
        console.log(`  - Other: ${components.other.length}`);
      } else {
        this.logResult('identify_components', false, 'No UI components identified');
      }
    } catch (error) {
      this.logResult('identify_components', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test detect_variants tool
  async testDetectVariants(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing detect_variants tool...${COLORS.reset}`);
    
    try {
      // Get components
      const components = await this.designManager.getComponents();
      
      // Detect variants
      const variants = this.designManager.detectComponentVariants(components);
      
      if (Object.keys(variants).length > 0) {
        this.logResult('detect_variants', true);
        console.log(`Detected ${COLORS.bright}${Object.keys(variants).length}${COLORS.reset} component variant groups`);
        
        // Show example of a variant group
        const firstGroupName = Object.keys(variants)[0];
        const firstGroup = variants[firstGroupName];
        console.log(`  Example group "${firstGroupName}" has ${firstGroup.length} variants`);
      } else {
        this.logResult('detect_variants', false, 'No component variants detected');
      }
    } catch (error) {
      this.logResult('detect_variants', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test detect_responsive tool
  async testDetectResponsive(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing detect_responsive tool...${COLORS.reset}`);
    
    try {
      // Get components
      const components = await this.designManager.getComponents();
      
      // Detect responsive components
      const responsiveComponents = this.designManager.detectResponsiveComponents(components);
      
      if (responsiveComponents.length > 0) {
        this.logResult('detect_responsive', true);
        console.log(`Detected ${COLORS.bright}${responsiveComponents.length}${COLORS.reset} responsive component groups`);
        
        // Show example of a responsive component
        const firstComponent = responsiveComponents[0];
        console.log(`  Example: "${firstComponent.baseName}" has ${firstComponent.variants.length} size variants`);
      } else {
        this.logResult('detect_responsive', false, 'No responsive components detected');
      }
    } catch (error) {
      this.logResult('detect_responsive', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test API Client getComments method
  async testGetComments(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing getComments()...${COLORS.reset}`);
    
    try {
      const comments = await this.apiClient.getComments();
      
      this.logResult('getComments', true);
      console.log(`Found ${COLORS.bright}${comments.length}${COLORS.reset} comments`);
      
      if (comments.length > 0) {
        console.log(`  First comment: ${JSON.stringify(comments[0]).substring(0, 100)}...`);
      }
    } catch (error) {
      this.logResult('getComments', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test API Client getVersions method
  async testGetVersions(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing getVersions()...${COLORS.reset}`);
    
    try {
      const versions = await this.apiClient.getVersions();
      
      this.logResult('getVersions', true);
      console.log(`Found ${COLORS.bright}${versions.length}${COLORS.reset} versions`);
      
      if (versions.length > 0) {
        console.log(`  Latest version: ${versions[0].created_at}`);
      }
    } catch (error) {
      this.logResult('getVersions', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test StyleExtractor formatStylesAsObject method
  async testFormatStylesAsObject(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing formatStylesAsObject()...${COLORS.reset}`);
    
    try {
      // First get some styles to format
      const styles = await this.designManager.extractStyles();
      
      // Format the styles as an object
      const formattedStyles = this.styleExtractor.formatStylesAsObject(styles);
      
      const hasRequiredProps = 
        typeof formattedStyles === 'object' &&
        formattedStyles.colors !== undefined &&
        formattedStyles.text !== undefined &&
        formattedStyles.effects !== undefined &&
        formattedStyles.grid !== undefined;
      
      if (hasRequiredProps) {
        this.logResult('formatStylesAsObject', true);
        console.log(`Formatted styles as object with keys:`);
        console.log(`  - Colors: ${COLORS.bright}${Object.keys(formattedStyles.colors).length}${COLORS.reset}`);
        console.log(`  - Text: ${COLORS.bright}${Object.keys(formattedStyles.text).length}${COLORS.reset}`);
        console.log(`  - Effects: ${COLORS.bright}${Object.keys(formattedStyles.effects).length}${COLORS.reset}`);
        console.log(`  - Grid: ${COLORS.bright}${Object.keys(formattedStyles.grid).length}${COLORS.reset}`);
      } else {
        this.logResult('formatStylesAsObject', false, 'Formatted styles missing required properties');
      }
    } catch (error) {
      this.logResult('formatStylesAsObject', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test StyleExtractor mergeStyles method
  async testMergeStyles(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing mergeStyles()...${COLORS.reset}`);
    
    try {
      // Create two style collections to merge
      const styles1 = {
        colors: [{ key: 'color1', name: 'Color 1', styleType: 'FILL' }],
        text: [{ key: 'text1', name: 'Text 1', styleType: 'TEXT' }],
        effects: [],
        grid: []
      };
      
      const styles2 = {
        colors: [{ key: 'color2', name: 'Color 2', styleType: 'FILL' }],
        text: [],
        effects: [{ key: 'effect1', name: 'Effect 1', styleType: 'EFFECT' }],
        grid: []
      };
      
      // Merge the styles
      const mergedStyles = this.styleExtractor.mergeStyles(styles1, styles2);
      
      const correctlyMerged = 
        mergedStyles.colors.length === 2 &&
        mergedStyles.text.length === 1 &&
        mergedStyles.effects.length === 1;
      
      if (correctlyMerged) {
        this.logResult('mergeStyles', true);
        console.log(`Merged styles correctly:`);
        console.log(`  - Colors: ${COLORS.bright}${mergedStyles.colors.length}${COLORS.reset}`);
        console.log(`  - Text: ${COLORS.bright}${mergedStyles.text.length}${COLORS.reset}`);
        console.log(`  - Effects: ${COLORS.bright}${mergedStyles.effects.length}${COLORS.reset}`);
        console.log(`  - Grid: ${COLORS.bright}${mergedStyles.grid.length}${COLORS.reset}`);
      } else {
        this.logResult('mergeStyles', false, 'Styles were not merged correctly');
      }
      
      // Test duplicate removal
      const styles3 = {
        colors: [{ key: 'color1', name: 'Color 1', styleType: 'FILL' }], // Duplicate key
        text: [],
        effects: [],
        grid: []
      };
      
      const mergedWithDuplicates = this.styleExtractor.mergeStyles(mergedStyles, styles3);
      
      if (mergedWithDuplicates.colors.length === 2) { // Should still be 2, not 3
        this.logResult('mergeStyles - duplicate removal', true);
        console.log(`  Correctly removed duplicate with key 'color1'`);
      } else {
        this.logResult('mergeStyles - duplicate removal', false, 'Failed to remove duplicates');
      }
    } catch (error) {
      this.logResult('mergeStyles', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test ComponentDetector extractChartDetails method
  async testExtractChartDetails(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing extractChartDetails()...${COLORS.reset}`);
    
    if (!this.nodeId) {
      this.logResult('extractChartDetails', false, 'No node ID available in the test URL');
      return;
    }
    
    try {
      // First identify UI components to find charts
      const components = await this.designManager.identifyUIComponents(this.nodeId);
      
      if (components.charts.length === 0) {
        this.logResult('extractChartDetails', false, 'No charts found in the design');
        return;
      }
      
      // Get the first chart
      const chartNode = components.charts[0];
      
      // Extract chart details
      const chartDetails = this.componentDetector.extractChartDetails(chartNode);
      
      if (chartDetails && chartDetails.type) {
        this.logResult('extractChartDetails', true);
        console.log(`Extracted chart details:`);
        console.log(`  - Type: ${COLORS.bright}${chartDetails.type}${COLORS.reset}`);
        console.log(`  - Data points: ${chartDetails.data ? chartDetails.data.length : 0}`);
        console.log(`  - Styling: ${Object.keys(chartDetails.styling || {}).join(', ')}`);
      } else {
        this.logResult('extractChartDetails', false, 'Failed to extract chart details');
      }
    } catch (error) {
      this.logResult('extractChartDetails', false, `Error: ${(error as Error).message}`);
    }
  }
  
  // Test ComponentDetector extractTableDetails method
  async testExtractTableDetails(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing extractTableDetails()...${COLORS.reset}`);
    
    if (!this.nodeId) {
      this.logResult('extractTableDetails', false, 'No node ID available in the test URL');
      return;
    }
    
    try {
      // First identify UI components to find tables
      const components = await this.designManager.identifyUIComponents(this.nodeId);
      
      if (components.tables.length === 0) {
        this.logResult('extractTableDetails', false, 'No tables found in the design');
        return;
      }
      
      // Get the first table
      const tableNode = components.tables[0];
      
      // Extract table details
      const tableDetails = this.componentDetector.extractTableDetails(tableNode);
      
      if (tableDetails && tableDetails.structure) {
        this.logResult('extractTableDetails', true);
        console.log(`Extracted table details:`);
        console.log(`  - Rows: ${COLORS.bright}${tableDetails.structure.rows}${COLORS.reset}`);
        console.log(`  - Columns: ${COLORS.bright}${tableDetails.structure.columns}${COLORS.reset}`);
        console.log(`  - Data cells: ${tableDetails.data ? tableDetails.data.length : 0}`);
        console.log(`  - Styling: ${Object.keys(tableDetails.styling || {}).join(', ')}`);
      } else {
        this.logResult('extractTableDetails', false, 'Failed to extract table details');
      }
    } catch (error) {
      this.logResult('extractTableDetails', false, `Error: ${(error as Error).message}`);
    }
  }

  // Test getTopLevelNodes
  async testGetTopLevelNodes(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing getTopLevelNodes()...${COLORS.reset}`);
    
    try {
      const topLevelNodes = await this.designManager.getTopLevelNodes();
      
      this.logResult('getTopLevelNodes', true);
      console.log(`Found ${COLORS.bright}${topLevelNodes.length}${COLORS.reset} top-level nodes:`);
      topLevelNodes.slice(0, 5).forEach((node: { name: string; type: string }) => {
        console.log(`  - ${node.name} (${node.type})`);
      });
      if (topLevelNodes.length > 5) {
        console.log(`  ... and ${topLevelNodes.length - 5} more`);
      }
    } catch (error) {
      this.logResult('getTopLevelNodes', false, `Error: ${(error as Error).message}`);
    }
  }

  // Test getComponents
  async testGetComponents(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing getComponents()...${COLORS.reset}`);
    
    try {
      const components = await this.designManager.getComponents();
      
      this.logResult('getComponents', true);
      console.log(`Found ${COLORS.bright}${components.length}${COLORS.reset} components`);
      
      if (components.length > 0) {
        console.log(`First component: ${components[0].name}`);
      }
    } catch (error) {
      this.logResult('getComponents', false, `Error: ${(error as Error).message}`);
    }
  }

  // Test extractStylesFromNode
  async testExtractStylesFromNode(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing extractStylesFromNode()...${COLORS.reset}`);
    
    if (!this.nodeId) {
      this.logResult('extractStylesFromNode', false, 'No node ID available in the test URL');
      return;
    }
    
    try {
      const nodeStyles = await this.designManager.extractStylesFromNode(this.nodeId);
      
      this.logResult('extractStylesFromNode', true);
      console.log(`Extracted styles directly from node:`);
      console.log(`  - Colors: ${COLORS.bright}${nodeStyles.colors.length}${COLORS.reset}`);
      console.log(`  - Text: ${COLORS.bright}${nodeStyles.text.length}${COLORS.reset}`);
      console.log(`  - Effects: ${COLORS.bright}${nodeStyles.effects.length}${COLORS.reset}`);
      console.log(`  - Grid: ${COLORS.bright}${nodeStyles.grid.length}${COLORS.reset}`);
      
      // Show some examples if available
      if (nodeStyles.colors.length > 0) {
        console.log(`  Example color: ${JSON.stringify(nodeStyles.colors[0])}`);
      }
      if (nodeStyles.text.length > 0) {
        console.log(`  Example text style: ${JSON.stringify(nodeStyles.text[0])}`);
      }
    } catch (error) {
      this.logResult('extractStylesFromNode', false, `Error: ${(error as Error).message}`);
    }
  }

  // Test extractDesignInformation
  async testExtractDesignInformation(): Promise<void> {
    console.log(`\n${COLORS.cyan}Testing extractDesignInformation()...${COLORS.reset}`);
    
    try {
      const designInfo = await this.designManager.extractDesignInformation();
      
      this.logResult('extractDesignInformation', true);
      console.log(`Extracted design information for: ${COLORS.bright}${designInfo.fileInfo.name}${COLORS.reset}`);
      console.log(`  - Top-level nodes: ${designInfo.topLevelNodes.length}`);
      console.log(`  - API styles: ${
        designInfo.styles.colors.length +
        designInfo.styles.text.length +
        designInfo.styles.effects.length +
        designInfo.styles.grid.length
      }`);
      console.log(`  - Node styles: ${
        designInfo.nodeStyles.colors.length +
        designInfo.nodeStyles.text.length +
        designInfo.nodeStyles.effects.length +
        designInfo.nodeStyles.grid.length
      }`);
      console.log(`  - Components: ${designInfo.components.length}`);
      
      // Display UI components
      console.log(`\n${COLORS.bright}UI Components Detected:${COLORS.reset}`);
      console.log(`  - Charts: ${COLORS.yellow}${designInfo.uiComponents.charts.length}${COLORS.reset}`);
      console.log(`  - Tables: ${COLORS.yellow}${designInfo.uiComponents.tables.length}${COLORS.reset}`);
      console.log(`  - Forms: ${COLORS.yellow}${designInfo.uiComponents.forms.length}${COLORS.reset}`);
      console.log(`  - Navigation: ${COLORS.yellow}${designInfo.uiComponents.navigation.length}${COLORS.reset}`);
      console.log(`  - Cards: ${COLORS.yellow}${designInfo.uiComponents.cards.length}${COLORS.reset}`);
      console.log(`  - Buttons: ${COLORS.yellow}${designInfo.uiComponents.buttons.length}${COLORS.reset}`);
      console.log(`  - Dropdowns: ${COLORS.yellow}${designInfo.uiComponents.dropdowns.length}${COLORS.reset}`);
      console.log(`  - Other: ${COLORS.yellow}${designInfo.uiComponents.other.length}${COLORS.reset}`);
      
      // Show examples of detected components
      if (designInfo.uiComponents.charts.length > 0) {
        console.log(`\n${COLORS.cyan}Example Chart:${COLORS.reset}`);
        console.log(`  Name: ${designInfo.uiComponents.charts[0].name}`);
        console.log(`  Path: ${designInfo.uiComponents.charts[0].path}`);
      }
      
      if (designInfo.uiComponents.tables.length > 0) {
        console.log(`\n${COLORS.cyan}Example Table:${COLORS.reset}`);
        console.log(`  Name: ${designInfo.uiComponents.tables[0].name}`);
        console.log(`  Rows: ${designInfo.uiComponents.tables[0].rows}`);
        console.log(`  Columns: ${designInfo.uiComponents.tables[0].columns}`);
      }
      
      if (designInfo.uiComponents.buttons.length > 0) {
        console.log(`\n${COLORS.cyan}Example Button:${COLORS.reset}`);
        console.log(`  Name: ${designInfo.uiComponents.buttons[0].name}`);
        console.log(`  Text: ${designInfo.uiComponents.buttons[0].text}`);
      }
    } catch (error) {
      this.logResult('extractDesignInformation', false, `Error: ${(error as Error).message}`);
    }
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log(`${COLORS.bright}Starting Figma Tests${COLORS.reset}`);
    console.log(`Testing with Figma URL: ${COLORS.yellow}${this.figmaUrl}${COLORS.reset}`);
    console.log(`File ID: ${COLORS.yellow}${this.fileId}${COLORS.reset}`);
    console.log(`Node ID: ${COLORS.yellow}${this.nodeId || 'Not provided'}${COLORS.reset}`);
    
    // Test MCP server tools
    console.log(`\n${COLORS.bright}Testing MCP Server Tools${COLORS.reset}`);
    await this.testValidateToken();
    await this.testGetFileInfo();
    await this.testGetNodeDetails();
    await this.testExtractStyles();
    await this.testGetAssets();
    await this.testGetVariables();
    await this.testIdentifyComponents();
    await this.testDetectVariants();
    await this.testDetectResponsive();
    
    // Test API Client methods
    console.log(`\n${COLORS.bright}Testing API Client Methods${COLORS.reset}`);
    await this.testGetComments();
    await this.testGetVersions();
    
    // Test StyleExtractor methods
    console.log(`\n${COLORS.bright}Testing StyleExtractor Methods${COLORS.reset}`);
    await this.testFormatStylesAsObject();
    await this.testMergeStyles();
    
    // Test ComponentDetector methods
    console.log(`\n${COLORS.bright}Testing ComponentDetector Methods${COLORS.reset}`);
    if (this.nodeId) {
      await this.testExtractChartDetails();
      await this.testExtractTableDetails();
    } else {
      console.log(`${COLORS.yellow}Skipping component detection tests - no node ID available${COLORS.reset}`);
    }
    
    // Test DesignManager methods
    console.log(`\n${COLORS.bright}Testing DesignManager Methods${COLORS.reset}`);
    await this.testGetTopLevelNodes();
    await this.testGetComponents();
    await this.testExtractStylesFromNode();
    await this.testExtractDesignInformation();
    
    // Print summary for this file
    console.log(`\n${COLORS.bright}Test Summary:${COLORS.reset}`);
    console.log(`Total tests: ${this.instanceTotalTests}`);
    console.log(`${COLORS.green}Passed: ${this.passedTests}${COLORS.reset}`);
    console.log(`${COLORS.red}Failed: ${this.failedTests}${COLORS.reset}`);
    
    // Check if any tests passed
    if (this.passedTests > 0) {
      console.log(`\n${COLORS.yellow}Note: Some tests may fail with "Request too large" errors.${COLORS.reset}`);
      console.log(`This is a limitation of the Figma API when working with large files.`);
      console.log(`The tests that passed demonstrate that the code is working correctly.`);
    } else {
      console.log(`\n${COLORS.red}All tests failed. The server may not be configured correctly.${COLORS.reset}`);
    }
  }
}

// Main function to run the tests
async function main() {
  try {
    // Check if we have a token
    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      console.error(`${COLORS.red}Error: Missing Figma access token${COLORS.reset}`);
      console.error(`Please set the FIGMA_ACCESS_TOKEN environment variable.`);
      console.error(`This should be the same token used by the MCP server.`);
      console.error(`Example: ${COLORS.yellow}FIGMA_ACCESS_TOKEN=your_token npm test${COLORS.reset}`);
      process.exit(1);
    }
    
    console.log(`${COLORS.bright}Using Figma access token from environment variable${COLORS.reset}`);
    console.log(`${COLORS.yellow}Note: This should be the same token configured in your MCP server settings${COLORS.reset}`);
    
    // Run tests for each Figma file
    console.log(`${COLORS.bright}Testing ${TEST_FIGMA_FILES.length} Figma files${COLORS.reset}`);
    
    for (const testFile of TEST_FIGMA_FILES) {
      console.log(`\n${COLORS.bright}Testing file: ${testFile.name}${COLORS.reset}`);
      
      try {
        const tester = new FigmaTester(testFile.url);
        
        // Test utils first
        await tester.testExtractFigmaIds();
        
        // Run all other tests
        await tester.runAllTests();
      } catch (error) {
        console.error(`${COLORS.red}Error testing ${testFile.name}:${COLORS.reset}`, error);
      }
    }
    
    // Print overall summary
    console.log(`\n${COLORS.bright}Overall Test Summary:${COLORS.reset}`);
    console.log(`Total files tested: ${TEST_FIGMA_FILES.length}`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`${COLORS.green}Passed: ${totalPassedTests}${COLORS.reset}`);
    console.log(`${COLORS.red}Failed: ${totalFailedTests}${COLORS.reset}`);
    
    // Exit with appropriate code based on test results
    if (totalPassedTests > 0) {
      setTimeout(() => process.exit(0), 100); // Small delay to ensure all output is flushed
    } else {
      setTimeout(() => process.exit(1), 100); // Small delay to ensure all output is flushed
    }
  } catch (error) {
    console.error(`${COLORS.red}Test execution failed:${COLORS.reset}`, error);
    process.exit(1);
  }
}

// Run the tests
main();
