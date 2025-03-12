/**
 * General test helpers that can be used in both unit and integration tests
 */

/**
 * Wait for a specified condition to be true
 * @param condition Function that returns a boolean
 * @param timeout Timeout in milliseconds
 * @param interval Interval between checks in milliseconds
 * @returns Promise that resolves when condition is true or rejects on timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 10000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms timeout`);
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log with timestamp
 * @param message Message to log
 * @param args Additional arguments
 */
export function logWithTimestamp(message: string, ...args: any[]): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...args);
}