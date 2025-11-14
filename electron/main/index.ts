/// <reference types="vite/client" />
import {
  app,
  BrowserWindow,
  dialog,
  WebContentsView,
  protocol,
} from "electron";
import log from "electron-log";
import path from "node:path";
import * as pkg from "../../package.json";
// ✅ SECURITY FIX: Uncomment auto-updater (now disabled by default, user-configurable)
import { setupAutoUpdater } from './utils/auto-update';
import { isDev } from "./utils/constants";
import { setupMenu } from "./ui/menu";
import { createTray } from "./ui/tray";
import { initCookies } from "./utils/cookie";
import { reloadOnChange } from "./utils/reload";
import { registerClientProtocol } from "./utils/protocol";
import { ConfigManager } from "./utils/config-manager";
// ✅ SECURITY FIX: Import migration manager
import { runMigrations } from "./utils/migration-manager";

// Initialize configuration manager
ConfigManager.getInstance().initialize();

import { createView } from "./ui/view";
import { EkoService } from "./services/eko-service";
import { ServerManager } from "./services/server-manager";
import { MainWindowManager } from "./windows/main-window";
import { taskScheduler } from "./services/task-scheduler";
import { windowContextManager, type WindowContext } from "./services/window-context-manager";
import { cwd } from "node:process";
import { registerAllIpcHandlers } from "./ipc";
// ✅ PHASE 2: Import error handler for initialization
import { errorHandler, ErrorCategory, ErrorSeverity } from "./utils/error-handler";
// ✅ PHASE 3: Import performance optimization systems
import { memoryManager } from "./utils/memory-manager";
import { screenshotCache } from "./utils/screenshot-cache";
import { initializeModelCache } from "./utils/model-cache";

/**
 * Validate and adjust bounds to ensure they're within window constraints
 * Requirements 4.1, 4.2, 8.3, 8.4, 8.5: Validate bounds before applying to WebContentsView
 */
function validateBounds(
  bounds: { x: number; y: number; width: number; height: number },
  windowWidth: number,
  windowHeight: number
): { x: number; y: number; width: number; height: number } {
  const originalBounds = { ...bounds };
  let adjusted = false;

  // Ensure non-negative values
  if (bounds.x < 0) {
    bounds.x = 0;
    adjusted = true;
  }
  if (bounds.y < 0) {
    bounds.y = 0;
    adjusted = true;
  }
  if (bounds.width < 0) {
    bounds.width = 100;
    adjusted = true;
  }
  if (bounds.height < 0) {
    bounds.height = 100;
    adjusted = true;
  }

  // Requirement 8.3, 8.4: Ensure minimum dimensions (100px width/height)
  if (bounds.width < 100) {
    bounds.width = 100;
    adjusted = true;
  }
  if (bounds.height < 100) {
    bounds.height = 100;
    adjusted = true;
  }

  // Requirement 8.5: Ensure bounds don't exceed window dimensions
  if (bounds.x + bounds.width > windowWidth) {
    bounds.width = Math.max(100, windowWidth - bounds.x);
    adjusted = true;
  }
  if (bounds.y + bounds.height > windowHeight) {
    bounds.height = Math.max(100, windowHeight - bounds.y);
    adjusted = true;
  }

  // Ensure bounds fit within window
  if (bounds.x >= windowWidth) {
    bounds.x = Math.max(0, windowWidth - bounds.width);
    adjusted = true;
  }
  if (bounds.y >= windowHeight) {
    bounds.y = Math.max(0, windowHeight - bounds.height);
    adjusted = true;
  }

  // Requirement 8.5: Log warnings for adjusted bounds
  if (adjusted) {
    console.warn('[BrowserViewBounds] Bounds adjusted to fit within window:', {
      original: originalBounds,
      adjusted: bounds,
      window: { width: windowWidth, height: windowHeight }
    });
  }

  return bounds;
}

Object.assign(console, log.functions);

console.debug("main: import.meta.env:", import.meta.env);
console.log("main: isDev:", isDev);
console.log("NODE_ENV:", global.process.env.NODE_ENV);
console.log("isPackaged:", app.isPackaged);

// Log unhandled errors
process.on("uncaughtException", async (error) => {
  console.log("Uncaught Exception:", error);
});

process.on("unhandledRejection", async (error) => {
  console.log("Unhandled Rejection:", error);
});

(() => {
  const root =
    global.process.env.APP_PATH_ROOT ?? import.meta.env.VITE_APP_PATH_ROOT;

  if (root === undefined) {
    console.log(
      "no given APP_PATH_ROOT or VITE_APP_PATH_ROOT. default path is used."
    );
    return;
  }

  if (!path.isAbsolute(root)) {
    console.log("APP_PATH_ROOT must be absolute path.");
    global.process.exit(1);
  }

  console.log(`APP_PATH_ROOT: ${root}`);

  const subdirName = pkg.name;

  for (const [key, val] of [
    ["appData", ""],
    ["userData", subdirName],
    ["sessionData", subdirName],
  ] as const) {
    app.setPath(key, path.join(root, val));
  }

  app.setAppLogsPath(path.join(root, subdirName, "Logs"));
})();

console.log("appPath:", app.getAppPath());

// Register custom protocol scheme before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'client',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);

const keys: Parameters<typeof app.getPath>[number][] = [
  "home",
  "appData",
  "userData",
  "sessionData",
  "logs",
  "temp",
];
keys.forEach((key) => console.log(`${key}:`, app.getPath(key)));

// Initialize server manager
const serverManager = new ServerManager();

// Start Next.js server in production environment
if (!isDev) {
  try {
    serverManager.startServer();
    console.log('Next.js server started successfully');
  } catch (error) {
    console.error('Failed to start Next.js server:', error);
  }
}

let mainWindow: BrowserWindow;
let detailView: WebContentsView;
let historyView: WebContentsView | null = null;
let ekoService: EkoService;
let mainWindowManager: MainWindowManager;

/**
 * Initialize main window and all related components
 * Including: detailView, ekoService, windowContext registration
 */
async function initializeMainWindow(): Promise<BrowserWindow> {
  console.log('[Main] Starting main window initialization...');

  // Create main window (includes transition page and service waiting logic)
  mainWindow = await mainWindowManager.createMainWindow();

  mainWindow.contentView.setBounds({
    x: 0,
    y: 0,
    width: mainWindow.getBounds().width,
    height: mainWindow.getBounds().height,
  });

  // Create browser view (main browsing area on the LEFT side)
  detailView = createView(`https://www.google.com`, "view", '1');
  mainWindow.contentView.addChildView(detailView);
  
  // Position browser view on the LEFT side (75% of window width by default)
  const windowBounds = mainWindow.getBounds();
  const browserWidth = Math.floor(windowBounds.width * 0.75); // 75% for browser panel
  
  // Validate bounds before applying (Requirements 4.1, 4.2, 8.3, 8.4, 8.5)
  const initialBounds = validateBounds(
    {
      x: 0,
      y: 0,
      width: browserWidth,
      height: windowBounds.height,
    },
    windowBounds.width,
    windowBounds.height
  );
  
  detailView.setBounds(initialBounds);

  // Browser view is HIDDEN by default - only shows after first message is sent
  detailView.setVisible(false);

  detailView.webContents.setWindowOpenHandler(({url}) => {
    detailView.webContents.loadURL(url);
    return {
      action: "deny",
    }
  })

  // Listen for detail view URL changes
  detailView.webContents.on('did-navigate', (_event, url) => {
    console.log('detail view did-navigate:', url);
    mainWindow?.webContents.send('url-changed', url);
  });

  detailView.webContents.on('did-navigate-in-page', (_event, url) => {
    console.log('detail view did-navigate-in-page:', url);
    mainWindow?.webContents.send('url-changed', url);
  });

  // Initialize EkoService
  ekoService = new EkoService(mainWindow, detailView);

  // Register main window to windowContextManager
  const mainWindowContext: WindowContext = {
    window: mainWindow,
    detailView,
    historyView,
    ekoService,
    webContentsId: mainWindow.webContents.id,
    windowType: 'main'
  };
  windowContextManager.registerWindow(mainWindowContext);
  console.log('[Main] Main window registered to WindowContextManager');

  // Listen for window close event (close: triggered before closing, can be prevented)
  // Unified handling for Mac and Windows: check task status, prompt user
  mainWindow.on('close', async (event) => {
    // Check if any task is running
    const hasRunningTask = ekoService.hasRunningTask();

    if (hasRunningTask) {
      // Prevent default close behavior
      event.preventDefault();

      // Show confirmation dialog
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Task Running',
        message: 'A task is currently running. Closing the window will cause the task to fail',
        detail: 'Please choose an action:',
        buttons: process.platform === 'darwin'
          ? ['Cancel', 'Stop Task and Close']
          : ['Cancel', 'Stop Task and Minimize'],
        defaultId: 0,
        cancelId: 0
      });

      if (response === 1) {
        // Stop task
        console.log('[Main] User chose to stop task');

        // Get all task IDs
        const allTaskIds = ekoService['eko']?.getAllTaskId() || [];

        // Abort all tasks
        await ekoService.abortAllTasks();

        // Send abort event (frontend will listen and update IndexedDB)
        allTaskIds.forEach(taskId => {
          mainWindow.webContents.send('task-aborted-by-system', {
            taskId,
            reason: 'User closed window, task terminated',
            timestamp: new Date().toISOString()
          });
        });

        // Delay to ensure message delivery and processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (process.platform === 'darwin') {
          // Mac: actually close window
          mainWindow.destroy();
        } else {
          // Windows/Linux: hide window
          mainWindow.hide();
        }
      }
      // response === 0: cancel close, do nothing
    } else {
      // No task running
      if (process.platform !== 'darwin') {
        // Windows/Linux: hide to tray
        event.preventDefault();
        mainWindow.hide();
        console.log('[Main] Main window hidden to tray');
      }
      // Mac: use default behavior (close window but keep app running)
    }
  });

  // Listen for window closed event (closed: triggered after window is closed)
  // Clean up context
  mainWindow.on('closed', () => {
    console.log('[Main] Main window closed, cleaning up context');
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        windowContextManager.unregisterWindow(mainWindow.webContents.id);
      }
    } catch (error) {
      console.error('[Main] Failed to clean up main window context:', error);
    }
  });

  console.log('[Main] Main window initialization completed');
  return mainWindow;
}

(async () => {
  await app.whenReady();
  console.log("App is ready");

  // ✅ SECURITY FIX: Run data migrations before anything else
  try {
    await runMigrations();
    console.log('[Migration] All data migrations completed successfully');
  } catch (error: any) {
    console.error('[Migration] Failed to run migrations:', error);
    // Show error dialog to user
    dialog.showErrorBox(
      'Migration Error',
      `Failed to migrate application data: ${error.message}\n\nPlease report this issue.`
    );
    // Don't quit app - allow user to recover
  }

  // ✅ PHASE 2: Initialize error handler system
  errorHandler;  // Force initialization of singleton
  console.log('[ErrorHandler] Centralized error handler initialized');

  // Register error callbacks for critical errors
  errorHandler.onError(ErrorCategory.IPC, (error) => {
    if (error.severity === ErrorSeverity.CRITICAL) {
      console.error('[ErrorHandler] Critical IPC error:', error.message);
    }
  });

  errorHandler.onError(ErrorCategory.AGENT, (error) => {
    if (error.severity === ErrorSeverity.CRITICAL) {
      console.error('[ErrorHandler] Critical agent error:', error.message);
    }
  });

  // Register all IPC handlers FIRST (before creating windows)
  registerAllIpcHandlers();
  console.log('[IPC] All IPC handlers registered');

  // ✅ PHASE 3: Initialize performance optimization systems
  memoryManager;  // Force initialization of singleton
  screenshotCache;  // Force initialization of singleton
  initializeModelCache();
  console.log('[Performance] Optimization systems initialized (memory manager, screenshot cache, model cache)');

  // Register global client protocol
  registerClientProtocol(protocol);

  if (isDev) {
    const iconPath = path.join(cwd(), "assets/icons/logo.png");
    console.log("Setting app icon:", iconPath);
    app.dock?.setIcon(iconPath);
  }

  // Load any existing cookies from ElectronStore, set as cookie
  await initCookies();

  // Initialize main window manager
  mainWindowManager = new MainWindowManager(serverManager);

  // Initialize main window and all related components
  mainWindow = await initializeMainWindow();

  // Create system tray
  createTray(mainWindow);
  console.log('[Main] System tray created');

  // Start task scheduler
  taskScheduler.start();
  console.log('[Main] TaskScheduler started');

  // macOS activate event handler
  app.on("activate", async () => {
    // Check if main window exists (regardless of task windows)
    const hasMainWindow = mainWindow && !mainWindow.isDestroyed();

    if (!hasMainWindow) {
      // Create main window if it doesn't exist (even if task windows exist)
      console.log('[Main] App activated, main window does not exist, creating main window');
      mainWindow = await initializeMainWindow();
      setupMenu(mainWindow);
    } else {
      // Main window exists, show and focus
      console.log('[Main] App activated, main window exists, showing and focusing');
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return mainWindow;
})().then((win) => setupMenu(win));

// Don't quit app when all windows are closed, keep running in background (for scheduled tasks)
// User needs to use "Quit" option in tray menu to actually quit the app
app.on("window-all-closed", () => {
  console.log('[Main] All windows closed, app continues running in background');
  // Don't call app.quit(), let app continue running
  // Scheduled tasks will continue executing in background
});

reloadOnChange();

// ✅ SECURITY FIX: Setup auto-updater (disabled by default, user must enable in settings)
if (!isDev) {
  setupAutoUpdater().catch((err) => {
    log.error('[Auto-Update] Failed to setup auto-updater:', err);
  });
}
