import { Eko, Log, SimpleSseMcpClient, type LLMs, type StreamCallbackMessage } from "@jarvis-agent/core";
import { BrowserAgent, FileAgent } from "@jarvis-agent/electron";
import type { EkoResult } from "@jarvis-agent/core/types";
import { BrowserWindow, WebContentsView, app } from "electron";
import path from "node:path";
import { ConfigManager } from "../utils/config-manager";
import { taskCheckpointManager, type Checkpoint } from "./task-checkpoint";
import { agentContextManager } from "./agent-context-manager";
// ✅ PHASE 2: Import centralized logging and error handling
import { createLogger } from "../utils/logger";
import { ErrorCategory, ErrorSeverity } from "../utils/error-handler";
// Phase 1, 2 & 3: Import browser tools
import {
  browserGetMarkdownTool,
  browserReadLinksTool,
  browserGoForwardTool,
  browserGetTextTool,
  browserPressKeyTool,
  browserScrollTool,
  // Phase 2: Tab management tools
  browserNewTabTool,
  browserCloseTabTool,
  browserSwitchTabTool,
  // Phase 3: Core interaction tools
  browserPasteTextTool,
  browserWaitForElementTool,
  // Phase 5: Advanced gesture tools
  browserDragAndDropTool,
  browserSetZoomTool,
  browserPinchZoomTool,
  browserKeyboardMouseComboTool,
  browserScrollHorizontalTool
} from "./browser-tools";

// Phase 4: Import advanced browser tools
import {
  // Element extraction tools (7 tools)
  extractElementStylesTool,
  extractElementStructureTool,
  extractElementEventsTool,
  extractElementAnimationsTool,
  extractElementAssetsTool,
  extractRelatedFilesTool,
  cloneElementCompleteTool,
  // JavaScript function management tools (9 tools)
  discoverGlobalFunctionsTool,
  discoverObjectMethodsTool,
  callJavaScriptFunctionTool,
  inspectFunctionSignatureTool,
  createPersistentFunctionTool,
  injectAndExecuteScriptTool,
  executeFunctionSequenceTool,
  getExecutionContextsTool,
  getFunctionExecutorInfoTool,
  // CDP command tools (2 tools)
  executeCdpCommandTool,
  listCdpCommandsTool,
  // CDP extraction tools (2 tools)
  extractElementStylesCdpTool,
  extractCompleteElementCdpTool,
  // File operations tools (2 tools)
  cloneElementToFileTool,
  extractCompleteElementToFileTool
} from "./advanced-browser-tools";

export class EkoService {
  private eko: Eko | null = null;
  private mainWindow: BrowserWindow;
  private detailView: WebContentsView;
  private mcpClient!: SimpleSseMcpClient;
  private agents!: any[];
  private activeCheckpoints: Map<string, Checkpoint> = new Map();
  // ✅ Task tracking map for getTaskStatus() (P0.8)
  private taskStatus: Map<string, { status: 'running' | 'completed' | 'failed' | 'cancelled'; progress: number; startTime: Date; endTime?: Date; error?: string }> = new Map();
  // ✅ PHASE 2: Logger instance for standardized logging
  private logger = createLogger('EkoService');

  constructor(mainWindow: BrowserWindow, detailView: WebContentsView) {
    this.mainWindow = mainWindow;
    this.detailView = detailView;
    this.initializeEko();
  }

  /**
   * Create stream callback handler
   */
  private createCallback() {
    return {
      onMessage: (message: StreamCallbackMessage): Promise<void> => {
        // ✅ PHASE 2: Use standardized logger instead of Log.info
        this.logger.debug('Stream callback received', { type: message.type, toolName: message.toolName });

        // Window destroyed, return directly to avoid errors
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
          this.logger.warn('Main window is destroyed, cannot process stream message');
          return Promise.resolve();
        }

        return new Promise((resolve) => {
           // Send stream message to renderer process via IPC
        this.mainWindow.webContents.send('eko-stream-message', message);

        // When file is modified, main view window loads file content display page
        if (message.type === 'tool_streaming' && message.toolName === 'file_write') {

          let args;
          try {
            args = JSON.parse(message.paramsText);
          } catch (error) {
            // ✅ PHASE 2: Proper error logging with context
            this.logger.error(
              'Failed to parse file stream params',
              error,
              { paramsText: message.paramsText?.substring(0, 50) },
              ErrorCategory.FILE_SYSTEM,
              ErrorSeverity.MEDIUM,
              true
            );
          }

          // Try fallback parsing if first attempt failed
          if (!args) {
            try {
              args = JSON.parse(`${message.paramsText}\"}`);
            } catch (error) {
              this.logger.error(
                'Failed to parse file stream with fallback',
                error,
                { paramsText: message.paramsText?.substring(0, 50) },
                ErrorCategory.FILE_SYSTEM,
                ErrorSeverity.MEDIUM,
                true
              );
            }
          }

          if (args && args.content) {
            this.logger.info('File content updated, loading file-view', {
              contentLength: args.content?.length || 0
            });
            const url = this.detailView.webContents.getURL();
            if (!url.includes('file-view')) {
              const fileViewUrl = ConfigManager.getInstance().getFileViewUrl();
              this.logger.debug('Loading file-view URL', { url: fileViewUrl });
              this.detailView.webContents.loadURL(fileViewUrl);
              this.detailView.webContents.once('did-finish-load', () => {
                this.detailView.webContents.send('file-updated', 'code', args.content);
                resolve();
              });
            } else {
              this.detailView.webContents.send('file-updated',  'code', args.content);
              resolve();
            }
          } else {
            resolve();
          }
        } else {
          resolve();
        }
        })
      },
      onHuman: (message: any) => {
        // ✅ PHASE 2: Use logger for human interaction callbacks
        this.logger.info('Human interaction required', {
          type: message.type,
          prompt: message.prompt?.substring(0, 100)
        });
      }
    };
  }

  private initializeEko() {
    // Get LLMs configuration from ConfigManager
    // Priority: user config > env > default
    const configManager = ConfigManager.getInstance();
    const llms: LLMs = configManager.getLLMsConfig();

    // Get agent configuration
    const agentConfig = configManager.getAgentConfig();

    // Get correct application path
    const appPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'static')  // Packaged path
      : path.join(process.cwd(), 'public', 'static');    // Development environment path

    // ✅ PHASE 2: Use standardized logger
    this.logger.info('Initializing FileAgent', { workingPath: appPath });

    // MCP client configuration - configure based on your MCP server address
    const sseUrl = ConfigManager.getInstance().getMcpSseUrl();
    this.mcpClient = new SimpleSseMcpClient(sseUrl);

    // Create agents with custom prompts
    this.agents = [];

    // Feature flag: Enable advanced tools (set to false if your API has payload size limits)
    const ENABLE_ADVANCED_TOOLS = true;  // Set to true to enable Phase 4 tools (22 additional tools)
    const ENABLE_GESTURE_TOOLS = true;   // Gesture tools are lightweight, can stay enabled

    if (agentConfig.browserAgent.enabled) {
      // Create browser agent
      const browserAgent = new BrowserAgent(
        this.detailView,
        this.mcpClient,
        agentConfig.browserAgent.customPrompt
      );

      // Phase 1: Register advanced browser tools
      // These tools extend the existing BrowserAgent with additional capabilities
      browserAgent.addTool(browserGetMarkdownTool);
      browserAgent.addTool(browserReadLinksTool);
      browserAgent.addTool(browserGoForwardTool);
      browserAgent.addTool(browserGetTextTool);
      browserAgent.addTool(browserPressKeyTool);
      browserAgent.addTool(browserScrollTool);

      // Phase 2: Register tab management tools
      browserAgent.addTool(browserNewTabTool);
      browserAgent.addTool(browserCloseTabTool);
      browserAgent.addTool(browserSwitchTabTool);

      // Phase 3: Register core interaction tools
      browserAgent.addTool(browserPasteTextTool);
      browserAgent.addTool(browserWaitForElementTool);

      // Phase 4: Register advanced browser tools (conditional)
      if (ENABLE_ADVANCED_TOOLS) {
        // Element extraction tools (7 tools)
        browserAgent.addTool(extractElementStylesTool);
        browserAgent.addTool(extractElementStructureTool);
        browserAgent.addTool(extractElementEventsTool);
        browserAgent.addTool(extractElementAnimationsTool);
        browserAgent.addTool(extractElementAssetsTool);
        browserAgent.addTool(extractRelatedFilesTool);
        browserAgent.addTool(cloneElementCompleteTool);

        // JavaScript function management tools (9 tools)
        browserAgent.addTool(discoverGlobalFunctionsTool);
        browserAgent.addTool(discoverObjectMethodsTool);
        browserAgent.addTool(callJavaScriptFunctionTool);
        browserAgent.addTool(inspectFunctionSignatureTool);
        browserAgent.addTool(createPersistentFunctionTool);
        browserAgent.addTool(injectAndExecuteScriptTool);
        browserAgent.addTool(executeFunctionSequenceTool);
        browserAgent.addTool(getExecutionContextsTool);
        browserAgent.addTool(getFunctionExecutorInfoTool);

        // CDP command tools (2 tools)
        browserAgent.addTool(executeCdpCommandTool);
        browserAgent.addTool(listCdpCommandsTool);

        // CDP extraction tools (2 tools)
        browserAgent.addTool(extractElementStylesCdpTool);
        browserAgent.addTool(extractCompleteElementCdpTool);

        // File operations tools (2 tools)
        browserAgent.addTool(cloneElementToFileTool);
        browserAgent.addTool(extractCompleteElementToFileTool);
      }

      // Phase 5: Register advanced gesture tools (conditional)
      if (ENABLE_GESTURE_TOOLS) {
        browserAgent.addTool(browserDragAndDropTool);
        browserAgent.addTool(browserSetZoomTool);
        browserAgent.addTool(browserPinchZoomTool);
        browserAgent.addTool(browserKeyboardMouseComboTool);
        browserAgent.addTool(browserScrollHorizontalTool);
      }

      this.agents.push(browserAgent);
      // ✅ PHASE 2: Structured logging with configuration details
      this.logger.info('BrowserAgent initialized', {
        customPrompt: agentConfig.browserAgent.customPrompt ? 'Yes' : 'No',
        phase1Tools: 6,
        phase2Tools: 3,
        phase3Tools: 2,
        phase4Tools: ENABLE_ADVANCED_TOOLS ? 22 : 0,
        phase5Tools: ENABLE_GESTURE_TOOLS ? 5 : 0
      });
      Log.info('Phase 2 browser tools registered: 3 tab management tools added');
      Log.info('Phase 3 browser tools registered: 2 core interaction tools added');
      if (ENABLE_ADVANCED_TOOLS) {
        Log.info('Phase 4 advanced browser tools registered: 22 tools added (7 element extraction + 9 JS functions + 2 CDP commands + 2 CDP extraction + 2 file operations)');
      } else {
        Log.info('Phase 4 advanced browser tools: DISABLED (enable via ENABLE_ADVANCED_TOOLS flag)');
      }
      if (ENABLE_GESTURE_TOOLS) {
        Log.info('Phase 5 gesture tools registered: 5 tools added (drag-drop, zoom, pinch-zoom, keyboard-mouse-combo, horizontal-scroll)');
      } else {
        Log.info('Phase 5 gesture tools: DISABLED (enable via ENABLE_GESTURE_TOOLS flag)');
      }
    }

    if (agentConfig.fileAgent.enabled) {
      this.agents.push(
        new FileAgent(
          this.detailView,
          appPath,
          this.mcpClient,
          agentConfig.fileAgent.customPrompt
        )
      );
      // ✅ PHASE 2: Use logger for FileAgent initialization
      this.logger.info('FileAgent initialized', {
        customPrompt: agentConfig.fileAgent.customPrompt ? 'Yes' : 'No',
        workingPath: appPath
      });
    }

    // Create callback and initialize Eko instance
    const callback = this.createCallback();
    this.eko = new Eko({ llms, agents: this.agents, callback });
    // ✅ PHASE 2: Structured initialization logging
    this.logger.info('EkoService fully initialized', {
      model: llms.default?.model,
      agents: this.agents.length,
      llmProvider: llms.default?.provider
    });
  }

  /**
   * Reload LLM configuration and reinitialize Eko instance
   * Called when user changes model configuration in UI
   */
  public reloadConfig(): void {
    // ✅ PHASE 2: Use logger for configuration reload
    this.logger.info('Reloading EkoService configuration');

    // Abort all running tasks before reloading
    if (this.eko) {
      const allTaskIds = this.eko.getAllTaskId();
      allTaskIds.forEach(taskId => {
        try {
          this.eko!.abortTask(taskId, 'config-reload');
        } catch (error) {
          // ✅ PHASE 2: Proper error logging for task abort
          this.logger.error(
            'Failed to abort task during config reload',
            error,
            { taskId },
            ErrorCategory.AGENT,
            ErrorSeverity.MEDIUM,
            true
          );
        }
      });
    }

    // Get new LLMs configuration
    const configManager = ConfigManager.getInstance();
    const llms: LLMs = configManager.getLLMsConfig();

    // ✅ PHASE 2: Structured configuration logging
    this.logger.info('New LLM configuration loaded', {
      model: llms.default?.model,
      provider: llms.default?.provider
    });

    // Create new Eko instance with updated config and fresh callback
    const callback = this.createCallback();
    this.eko = new Eko({ llms, agents: this.agents, callback });

    this.logger.info('EkoService configuration reloaded successfully');

    // Notify frontend about config reload
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('eko-config-reloaded', {
      model: llms.default?.model,
      provider: llms.default?.provider
    });
  }

  /**
   * Run new task
   */
  async run(message: string): Promise<EkoResult | null> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      // ✅ PHASE 2: Use logger for initialization errors
      this.logger.error(
        errorMsg,
        new Error(errorMsg),
        undefined,
        ErrorCategory.AGENT,
        ErrorSeverity.CRITICAL,
        false
      );
      this.sendErrorToFrontend(errorMsg);
      return null;
    }

    // ✅ PHASE 2: Use logger instead of console.log
    this.logger.info('Starting task execution', { messageLength: message.length });
    let result = null;
    try {
      result = await this.eko.run(message);
      // ✅ Track task status (P0.8)
      if (result && result.taskId) {
        this.taskStatus.set(result.taskId, {
          status: result.error ? 'failed' : 'completed',
          progress: 100,
          startTime: new Date(),
          endTime: new Date(),
          error: result.error?.toString()
        });
      }
    } catch (error: any) {
      // ✅ PHASE 2: Proper error logging with recovery strategy
      this.logger.error(
        'Task execution failed',
        error,
        { messageLength: message.length },
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );

      // Extract error message
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      this.sendErrorToFrontend(errorMessage, error);
    }
    return result;
  }

  /**
   * Send error message to frontend
   */
  private sendErrorToFrontend(errorMessage: string, error?: any, taskId?: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      // ✅ PHASE 2: Use logger for window state issues
      this.logger.warn('Main window is destroyed, cannot send error message', { hasError: !!error });
      return;
    }

    this.mainWindow.webContents.send('eko-stream-message', {
      type: 'error',
      error: errorMessage,
      detail: error?.stack || error?.toString() || errorMessage,
      taskId: taskId // Include taskId if available
    });
  }

  /**
   * Modify existing task
   */
  async modify(taskId: string, message: string): Promise<EkoResult | null> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      // ✅ PHASE 2: Use logger for initialization errors
      this.logger.error(
        errorMsg,
        new Error(errorMsg),
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.CRITICAL,
        false
      );
      this.sendErrorToFrontend(errorMsg, undefined, taskId);
      return null;
    }

    this.logger.info('Modifying task', { taskId, messageLength: message.length });
    let result = null;
    try {
      await this.eko.modify(taskId, message);
      result = await this.eko.execute(taskId);
    } catch (error: any) {
      // ✅ PHASE 2: Detailed error logging for task modification
      this.logger.error(
        'Failed to modify task',
        error,
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
      const errorMessage = error?.message || error?.toString() || 'Failed to modify task';
      this.sendErrorToFrontend(errorMessage, error, taskId);
    }
    return result;
  }

  /**
   * Execute task
   */
  async execute(taskId: string): Promise<EkoResult | null> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      // ✅ PHASE 2: Use logger for initialization errors
      this.logger.error(
        errorMsg,
        new Error(errorMsg),
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.CRITICAL,
        false
      );
      this.sendErrorToFrontend(errorMsg, undefined, taskId);
      return null;
    }

    // ✅ PHASE 2: Use logger instead of console.log
    this.logger.info('Executing task', { taskId });
    try {
      return await this.eko.execute(taskId);
    } catch (error: any) {
      // ✅ PHASE 2: Detailed error logging for task execution
      this.logger.error(
        'Failed to execute task',
        error,
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
      const errorMessage = error?.message || error?.toString() || 'Failed to execute task';
      this.sendErrorToFrontend(errorMessage, error, taskId);
      return null;
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<any> {
    if (!this.eko) {
      // ✅ PHASE 2: Use logger for initialization errors
      this.logger.error(
        'Eko service not initialized',
        new Error('Cannot get task status'),
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.CRITICAL,
        false
      );
      throw new Error('Eko service not initialized');
    }

    // ✅ Return tracked task status (P0.8)
    const trackedTask = this.taskStatus.get(taskId);
    if (trackedTask) {
      // ✅ PHASE 2: Log task status retrieval
      this.logger.debug('Task status retrieved from tracking', {
        taskId,
        status: trackedTask.status,
        progress: trackedTask.progress
      });
      return {
        taskId,
        status: trackedTask.status,
        progress: trackedTask.progress,
        startTime: trackedTask.startTime,
        endTime: trackedTask.endTime,
        error: trackedTask.error
      };
    }

    // Fallback for tasks not in our map (legacy or external tasks)
    this.logger.debug('Task status not found in tracking, returning unknown', { taskId });
    return {
      taskId,
      status: 'unknown',
      progress: 0
    };
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string): Promise<any> {
    if (!this.eko) {
      // ✅ PHASE 2: Use logger for initialization errors
      this.logger.error(
        'Eko service not initialized',
        new Error('Cannot cancel task'),
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.CRITICAL,
        false
      );
      throw new Error('Eko service not initialized');
    }

    try {
      this.logger.info('Cancelling task', { taskId });
      const res = await this.eko.abortTask(taskId, 'cancel');

      // ✅ PHASE 2: Log successful cancellation
      this.logger.info('Task cancelled successfully', { taskId });
      return res;
    } catch (error: any) {
      // ✅ PHASE 2: Log task cancellation errors
      this.logger.error(
        'Failed to cancel task',
        error,
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
      throw error;
    }
  }

  /**
   * Check if any task is running
   */
  hasRunningTask(): boolean {
    if (!this.eko) {
      return false;
    }

    const allTaskIds = this.eko.getAllTaskId();

    // Iterate through all tasks, check if any task is not terminated
    for (const taskId of allTaskIds) {
      const context = this.eko.getTask(taskId);
      if (context && !context.controller.signal.aborted) {
        // Task exists and not terminated, meaning it may be running
        return true;
      }
    }

    return false;
  }

  /**
   * Abort all running tasks
   */
  async abortAllTasks(): Promise<void> {
    if (!this.eko) {
      return;
    }

    const allTaskIds = this.eko.getAllTaskId();
    // ✅ PHASE 2: Log task abort operations
    this.logger.info('Aborting all running tasks', { count: allTaskIds.length });

    try {
      const abortPromises = allTaskIds.map(taskId => this.eko!.abortTask(taskId, 'window-closing'));
      await Promise.all(abortPromises);

      this.logger.info('All tasks aborted successfully', { taskCount: allTaskIds.length });
    } catch (error: any) {
      // ✅ PHASE 2: Log errors during mass abort
      this.logger.error(
        'Error aborting all tasks',
        error,
        { taskCount: allTaskIds.length },
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
    }
  }

  /**
   * ✅ NEW: Run task with periodic checkpoint saves (Phase 1)
   * Enables pause/resume capability with 12-Factor Agent patterns
   */
  async runWithCheckpoint(
    prompt: string,
    checkpointInterval: number = 10,
    agents?: string[]
  ): Promise<{ id: string; promise: Promise<any> }> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      // ✅ PHASE 2: Use logger for initialization errors
      this.logger.error(
        errorMsg,
        new Error(errorMsg),
        { hasCheckpoint: true },
        ErrorCategory.AGENT,
        ErrorSeverity.CRITICAL,
        false
      );
      this.sendErrorToFrontend(errorMsg);
      throw new Error(errorMsg);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const windowId = this.mainWindow.webContents.id;
    // ✅ PHASE 2: Log checkpoint initialization
    this.logger.info('Starting task with checkpoint support', {
      taskId,
      checkpointInterval,
      windowId,
      agentCount: agents?.length || 0
    });

    try {
      // Phase 2: Initialize agent context for this window
      await agentContextManager.initializeWindowContext(windowId);
      this.logger.debug('Agent context initialized for checkpoint task', { windowId, taskId });

    const executionPromise = (async () => {
      try {
        // Execute task using standard Eko.run
        const result = await this.eko!.run(prompt);

        // Create completion checkpoint
        const checkpoint = await taskCheckpointManager.loadCheckpoint(taskId);
        if (checkpoint) {
          await taskCheckpointManager.completeCheckpoint(taskId, result);
          this.activeCheckpoints.delete(taskId);
          Log.info(`[Checkpoint] Task ${taskId} completed and checkpoint saved`);
        }

        // Phase 2: Save final agent state to context
        if (agents && agents.length > 0) {
          for (const agentName of agents) {
            await agentContextManager.saveAgentState(
              windowId,
              agentName,
              { taskStatus: 'completed', result },
              {}
            );
          }
          Log.info(`[Checkpoint] Final agent state saved for ${agents.length} agents in task ${taskId}`);
        }

        // Phase 2: Clear context on task completion
        await agentContextManager.clearWindowContext(windowId);

        return result;
      } catch (error: any) {
        Log.error(`[Checkpoint] Task ${taskId} failed:`, error);

        // Save failure checkpoint for recovery
        const checkpoint = await taskCheckpointManager.loadCheckpoint(taskId);
        if (checkpoint) {
          await taskCheckpointManager.failCheckpoint(
            taskId,
            { message: error.message, code: 'EXECUTION_ERROR' },
            'eko_run_error'
          );
        }

        // Phase 2: Save error state to agent context for recovery
        if (agents && agents.length > 0) {
          for (const agentName of agents) {
            await agentContextManager.saveAgentState(
              windowId,
              agentName,
              { taskStatus: 'failed', error: error.message },
              {}
            );
          }
        }

        this.sendErrorToFrontend(
          `Checkpoint task failed: ${error.message}`,
          error,
          taskId
        );
        throw error;
      }
    })();

    // Create initial checkpoint
    try {
      const initialCheckpoint = await taskCheckpointManager.createCheckpoint(
        taskId,
        prompt, // Store prompt as workflow for now
        0,
        [],
        { variables: {}, sessionState: {} },
        { variables: {} },
        {
          iteration: 0,
          totalIterations: 0,
          toolResults: [],
        }
      );

      this.activeCheckpoints.set(taskId, initialCheckpoint);

      // Phase 2: Initialize agent states in context
      if (agents && agents.length > 0) {
        for (const agentName of agents) {
          await agentContextManager.saveAgentState(
            windowId,
            agentName,
            { taskId, prompt, status: 'initialized' },
            {}
          );
        }
        Log.info(`[Checkpoint] Initialized agent context for ${agents.length} agents`);
      }

      // Emit checkpoint created event
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        Log.warn('Main window destroyed, cannot emit checkpoint event');
      } else {
        this.mainWindow.webContents.send('eko-stream-message', {
          type: 'checkpoint_saved',
          checkpointId: initialCheckpoint.id,
          taskId,
          progress: 0,
        });
      }

      Log.info(`[Checkpoint] Initial checkpoint ${initialCheckpoint.id} created for task ${taskId}`);
    } catch (error: any) {
      Log.error('[Checkpoint] Failed to create initial checkpoint:', error);
    }

    return {
      id: taskId,
      promise: executionPromise,
    };
    } catch (error: any) {
      // Catch for the outer try block at line 694
      this.logger.error(
        'Failed to initialize checkpoint task',
        error,
        { taskId },
        ErrorCategory.AGENT,
        ErrorSeverity.HIGH,
        true
      );
      throw error;
    }
  }

  /**
   * ✅ NEW: Resume task from checkpoint (Phase 1)
   * Enhanced with Phase 2 Agent Context Manager integration
   */
  async resumeFromCheckpoint(taskId: string): Promise<{ id: string; promise: Promise<any> }> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      Log.error(errorMsg);
      this.sendErrorToFrontend(errorMsg);
      throw new Error(errorMsg);
    }

    const windowId = this.mainWindow.webContents.id;
    Log.info(`[Checkpoint] Resuming task ${taskId} from checkpoint for window ${windowId}`);

    const checkpoint = await taskCheckpointManager.loadCheckpoint(taskId);
    if (!checkpoint) {
      const errorMsg = `No checkpoint found for task ${taskId}`;
      Log.error(`[Checkpoint] ${errorMsg}`);
      this.sendErrorToFrontend(errorMsg);
      throw new Error(errorMsg);
    }

    if (!['paused', 'failed'].includes(checkpoint.status)) {
      const errorMsg = `Cannot resume task with status: ${checkpoint.status}`;
      Log.error(`[Checkpoint] ${errorMsg}`);
      this.sendErrorToFrontend(errorMsg);
      throw new Error(errorMsg);
    }

    // Phase 2: Ensure agent context exists for recovery
    await agentContextManager.initializeWindowContext(windowId);

    // Update checkpoint status to in_progress
    await taskCheckpointManager.updateCheckpoint(taskId, {
      status: 'in_progress',
      retryCount: checkpoint.retryCount + 1,
      lastRetryTimestamp: Date.now(),
    });

    const executionPromise = (async () => {
      try {
        // Phase 2: Restore agent states from context before resuming
        const allAgentStates = await agentContextManager.getAllAgentStates(windowId);
        Log.info(`[Checkpoint] Restoring ${allAgentStates.size} agent states for resume`);

        // Re-execute using original prompt from checkpoint
        const prompt = checkpoint.workflowXml; // Stored as prompt
        const result = await this.eko!.run(prompt);

        // Complete checkpoint
        await taskCheckpointManager.completeCheckpoint(taskId, result);
        this.activeCheckpoints.delete(taskId);

        Log.info(`[Checkpoint] Task ${taskId} resumed and completed successfully`);

        // Phase 2: Save final state and clear context
        for (const [agentName, agentState] of allAgentStates) {
          await agentContextManager.saveAgentState(
            windowId,
            agentName,
            { ...agentState.variables, taskStatus: 'completed', result },
            agentState.sessionState
          );
        }
        await agentContextManager.clearWindowContext(windowId);

        // Emit completion event
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
          Log.warn('Main window destroyed, cannot emit completion event');
        } else {
          this.mainWindow.webContents.send('eko-stream-message', {
            type: 'completed',
            taskId,
            message: 'Task resumed and completed',
          });
        }

        return result;
      } catch (error: any) {
        Log.error(`[Checkpoint] Task ${taskId} resume failed:`, error);

        // Phase 2: Save error state for debugging
        const allAgentStates = await agentContextManager.getAllAgentStates(windowId);
        for (const [agentName, agentState] of allAgentStates) {
          await agentContextManager.saveAgentState(
            windowId,
            agentName,
            { ...agentState.variables, taskStatus: 'failed', resumeError: error.message },
            agentState.sessionState
          );
        }

        // Update failure checkpoint
        await taskCheckpointManager.failCheckpoint(
          taskId,
          { message: error.message, code: 'RESUME_ERROR' },
          'eko_resume_error'
        );

        this.sendErrorToFrontend(
          `Failed to resume task: ${error.message}`,
          error,
          taskId
        );
        throw error;
      }
    })();

    // Emit resume started event
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      Log.warn('Main window destroyed, cannot emit resume event');
    } else {
      this.mainWindow.webContents.send('eko-stream-message', {
        type: 'checkpoint_saved',
        checkpointId: checkpoint.id,
        taskId,
        message: 'Resuming from checkpoint',
        progress: checkpoint.currentNodeIndex,
      });
    }

    return {
      id: taskId,
      promise: executionPromise,
    };
  }

  /**
   * Destroy service
   */
  destroy() {
    console.log('EkoService destroyed');
    this.eko = null;
  }
}