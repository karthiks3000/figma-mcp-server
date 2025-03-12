# Testing Guide for Figma MCP Server

This document provides guidance on running tests and improving test coverage for the Figma MCP Server project.

## Test Structure

The project uses Jest for testing and follows a consistent structure:

```
tests/
├── __fixtures__/        # Test fixtures and sample data
├── __mocks__/           # Mock implementations
├── utils/               # Shared test utilities
│   ├── mockConfigManager.ts
│   └── testHelpers.ts
├── unit/                # Unit tests
│   └── server.test.ts
├── integration/         # Integration tests
│   ├── design-flow.test.ts
│   └── plugin-bridge-integration.test.ts
├── plugin-connection.test.ts      # Simple plugin connection test
└── plugin-bridge-connection.test.ts  # Direct PluginBridge connection test
```

## Running Tests

The following npm scripts are available for running tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in CI mode
npm run test:ci

# Run legacy tests (for backward compatibility)
npm run test:legacy
npm run test:integration:legacy
npm run test:all:legacy
npm run test:plugin-connection
npm run test:plugin-connection-js
npm run test:integration-js

# Run the new plugin bridge connection tests
npm run test:plugin-bridge
npm test -- -t "PluginBridge Integration"
```

## Plugin Bridge Tests

Two new test files have been added to test the PluginBridge functionality:

1. **tests/integration/plugin-bridge-integration.test.ts**
   - A comprehensive Jest test that verifies the PluginBridge can connect to the Figma plugin
   - Tests connection events, sending commands, and connection tracking
   - Runs as part of the integration test suite

2. **tests/plugin-bridge-connection.test.ts**
   - A simpler standalone test script that can be run directly with Node
   - Focuses on establishing a connection and sending basic commands
   - Useful for quick verification of plugin connectivity
   - Run with: `node tests/plugin-bridge-connection.test.ts`

Both tests require the Figma plugin to be running and will be skipped if no FIGMA_ACCESS_TOKEN is provided in the environment.

## Test Types

### Unit Tests

Unit tests focus on testing individual components in isolation. They use mocks to simulate dependencies and test specific functionality.

Example:
```typescript
describe('ModeManager', () => {
  let configManager: MockConfigManager;
  let modeManager: ModeManager;
  
  beforeEach(() => {
    configManager = new MockConfigManager();
    modeManager = new ModeManager(configManager);
  });
  
  test('should initialize with readonly mode', () => {
    const initialMode = modeManager.getCurrentMode();
    expect(initialMode).toBe(FigmaServerMode.READONLY);
  });
});
```

### Integration Tests

Integration tests verify that different parts of the system work together correctly. The integration tests for this project maintain real connections to the Figma plugin, similar to the original JavaScript implementation.

Example:
```typescript
test('should complete design flow successfully', async () => {
  await waitForCondition(
    () => pluginConnection !== null,
    60000
  );
  
  expect(pluginConnection).not.toBeNull();
  
  await waitForCondition(
    () => testCompleted,
    60000
  );
  
  expect(testCompleted).toBe(true);
});
```

## Improving Test Coverage

The current test coverage is:
- Statements: 30.78%
- Branches: 23.33%
- Functions: 34.32%
- Lines: 30.78%

To improve coverage:

1. **Add More Unit Tests**:
   - Focus on untested files in `src/mcp/handlers.ts` (3.5% coverage)
   - Add tests for `src/core/config.ts` (37.5% coverage)

2. **Add Component-Specific Tests**:
   - Create tests for components in `src/readonly/` and `src/write/` directories

3. **Increase Branch Coverage**:
   - Add tests that exercise different code paths
   - Test error handling and edge cases

4. **Use Test Fixtures**:
   - Create reusable test fixtures for common test scenarios

## Best Practices

1. **Follow AAA Pattern**:
   - Arrange: Set up test prerequisites
   - Act: Execute the code being tested
   - Assert: Verify the results

2. **Use Descriptive Test Names**:
   - Tests should clearly describe what they're testing
   - Use format: "should [expected behavior] when [condition]"

3. **Keep Tests Independent**:
   - Tests should not depend on each other
   - Use beforeEach/afterEach for setup and teardown

4. **Mock External Dependencies**:
   - Use mocks for external services in unit tests
   - Keep integration tests with real connections

5. **Test Edge Cases**:
   - Test error conditions
   - Test boundary values
   - Test unexpected inputs

## Continuous Integration

To ensure tests are run consistently, add the following to your CI workflow:

```yaml
- name: Run tests
  run: npm run test:ci
```

This will run all tests and generate a coverage report that can be used to track improvements over time.