import { registerEkoHandlers } from "./eko-handlers";
import { registerViewHandlers } from "./view-handlers";
import { registerHistoryHandlers } from "./history-handlers";
import { registerConfigHandlers } from "./config-handlers";
import { registerAgentHandlers } from "./agent-handlers";
import { setupAgentContextHandlers } from "./agent-context-handlers";
import { setupMCPHandlers } from "./mcp-tools";
import { registerErrorHandlers } from "./error-handlers";
import { registerPerformanceHandlers } from "./performance-handlers";

/**
 * Register all IPC handlers
 * Centralized registration point for all IPC communication handlers
 */
export function registerAllIpcHandlers() {
  registerEkoHandlers();
  registerViewHandlers();
  registerHistoryHandlers();
  registerConfigHandlers();
  registerAgentHandlers();
  setupAgentContextHandlers();
  setupMCPHandlers();
  registerErrorHandlers();
  registerPerformanceHandlers();

  console.log('[IPC] All IPC handlers registered successfully');
}

// Export individual registration functions for selective use if needed
export {
  registerEkoHandlers,
  registerViewHandlers,
  registerHistoryHandlers,
  registerConfigHandlers,
  registerAgentHandlers,
  setupAgentContextHandlers,
  setupMCPHandlers,
  registerErrorHandlers,
  registerPerformanceHandlers
};
