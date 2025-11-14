import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import AISidebarHeader from '@/components/AISidebarHeader'
import { BrowserArea } from '@/components/BrowserArea'
import RoundedContainer from '@/components/RoundedContainer'
import { Input, Button, App, Tooltip, Space } from 'antd'
import { PauseOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { EkoResult, StreamCallbackMessage } from '@jarvis-agent/core/dist/types';
import { MessageList } from '@/components/chat/MessageComponents';
import { uuidv4 } from '@/common/utils';
import { SendMessage, CancleTask } from '@/icons/deepfundai-icons';
import { Task, ToolAction } from '@/models';
import { MessageProcessor } from '@/utils/messageTransform';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useHistoryStore } from '@/stores/historyStore';
import { scheduledTaskStorage } from '@/lib/scheduled-task-storage';
import { useTranslation } from 'react-i18next';
import { loadPersistedLayout, createDebouncedPersist, clampPanelSize } from '@/utils/panel-layout-storage';
import { calculateDetailViewBounds, validateBounds } from '@/utils/detail-view-bounds';
import { optimizedSplitLayoutTransition, createDebouncedBoundsUpdate } from '@/utils/layout-transition';
import { PanelLayoutState, DetailViewBounds } from '@/type';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useEkoEvents } from '@/hooks/useEkoEvents';
import { useWindowApi } from '@/hooks/useWindowApi';
import { useEkoStreamHandler } from '@/hooks/useEkoStreamHandler';
// Resize handle styles are now in globals.css


export default function Main() {
    const { t } = useTranslation('main');
    const { message: antdMessage } = App.useApp();
    const router = useRouter();
    const { taskId: urlTaskId, executionId: urlExecutionId } = router.query;

    // Check if in task detail mode (opened from scheduled task window)
    const isTaskDetailMode = !!urlTaskId && !!urlExecutionId;

    // Scheduled task's scheduledTaskId (from URL)
    const scheduledTaskIdFromUrl = typeof urlTaskId === 'string' ? urlTaskId : undefined;

    // Use task management Hook
    const {
        tasks,
        messages,
        currentTaskId,
        isHistoryMode,
        setCurrentTaskId,
        updateTask,
        createTask,
        updateMessages,
        addToolHistory,
        replaceTaskId,
        enterHistoryMode,
    } = useTaskManager();

    // Use Zustand history state management
    const { selectedHistoryTask, clearSelectedHistoryTask, setTerminateCurrentTaskFn } = useHistoryStore();

    const [query, setQuery] = useState('');
    const [currentUrl, setCurrentUrl] = useState<string>('');
    // Navigation state for browser controls
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [ekoRequest, setEkoRequest] = useState<Promise<any> | null>(null)

    // Phase 4: Checkpoint system state for pause/resume
    const [isTaskPaused, setIsTaskPaused] = useState(false);
    const [checkpointStatus, setCheckpointStatus] = useState<{ createdAt?: number; stateSize?: number } | null>(null);

    // Panel layout state management
    const [layout, setLayout] = useState<PanelLayoutState>(() => loadPersistedLayout())
    const debouncedPersist = useMemo(() => createDebouncedPersist(500), [])
    
    // Requirement 8.2: Optimized debounced bounds update using requestAnimationFrame
    // Creates a debounced version that batches DOM operations to avoid layout thrashing
    const debouncedUpdateBounds = useMemo(() => createDebouncedBoundsUpdate(16), [])

    // Layout mode management (full-width vs split)
    // In scheduled task detail mode, always use split layout
    const { layoutMode: hookLayoutMode, transitionToSplitLayout, isFirstMessage } = useLayoutMode()
    const layoutMode = isTaskDetailMode ? 'split' : hookLayoutMode

    // Check if current task is running
    const isCurrentTaskRunning = useMemo(() => {
        if (!currentTaskId || isHistoryMode) return false;

        const currentTask = tasks.find(task => task.id === currentTaskId);
        return currentTask?.status === 'running';
    }, [currentTaskId, isHistoryMode, tasks]);

    // Task ID reference
    const taskIdRef = useRef<string>(currentTaskId);
    // Message processor
    const messageProcessorRef = useRef(new MessageProcessor());
    // Execution ID reference, generate new unique identifier for each task execution
    const executionIdRef = useRef<string>('');
    // Scroll related state and references
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout>(null);

    // Synchronize taskIdRef
    useEffect(() => {
        taskIdRef.current = currentTaskId;
    }, [currentTaskId]);

    // NOTE: Browser view visibility is now managed separately - it's always visible
    // The old showDetail state was for browser automation overlay, not the main browser view

    // Cleanup logic when page is destroyed
    useEffect(() => {
        return () => {
            console.log('Main page unloaded, performing cleanup');
            if (window.api) {
                // Requirement 7.3: Handle layout transition failures gracefully during cleanup
                // Close detail view
                if ((window.api as any).setDetailViewVisible) {
                    try {
                        (window.api as any).setDetailViewVisible(false);
                    } catch (error) {
                        console.error('[Cleanup] Failed to hide detail view:', error);
                        // Non-blocking - page is unloading anyway
                    }
                }
                // Close history screenshot preview view
                if ((window.api as any).hideHistoryView) {
                    try {
                        (window.api as any).hideHistoryView();
                    } catch (error) {
                        console.error('[Cleanup] Failed to hide history view:', error);
                        // Non-blocking - page is unloading anyway
                    }
                }
                // Terminate current task
                if ((window.api as any).ekoCancelTask && taskIdRef.current) {
                    try {
                        window.api.ekoCancelTask(taskIdRef.current);
                    } catch (error) {
                        console.error('[Cleanup] Failed to cancel task:', error);
                        // Non-blocking - page is unloading anyway
                    }
                }
            }
        };
    }, []); // Empty dependency array, only executes on component mount/unmount

    // Coordinate WebContentsView visibility with layout mode
    // Requirement 6.5: Update WebContentsView visibility based on layout mode
    useEffect(() => {
        const updateViewVisibility = async () => {
            try {
                if (window.api?.view?.setDetailViewVisible) {
                    // Show WebContentsView only when layoutMode === 'split'
                    // Hide WebContentsView when layoutMode === 'full-width'
                    const shouldBeVisible = layoutMode === 'split';
                    await window.api.view.setDetailViewVisible(shouldBeVisible);
                    console.log('[LayoutMode] WebContentsView visibility updated:', shouldBeVisible);
                }
            } catch (error) {
                console.error('[LayoutMode] Failed to update WebContentsView visibility:', error);
                // Non-blocking - visibility update failed but layout mode changed
            }
        };
        
        updateViewVisibility();
    }, [layoutMode]); // Re-run when layout mode changes

    // Update browser view bounds when layout mode changes
    // Requirement 8.2: Use optimized bounds update with requestAnimationFrame
    useEffect(() => {
        // Only update bounds when in split mode (browser area is visible)
        if (layoutMode !== 'split') {
            return;
        }
        
        // Requirement 7.3: Handle layout transition failures gracefully
        const updateBounds = async () => {
            try {
                const bounds = calculateDetailViewBounds(
                    window.innerWidth, 
                    layout.browserPanelSize, 
                    window.innerHeight, 
                    layoutMode,
                    48, // tabBarHeight
                    16  // windowMargins
                );
                // Use debounced update with requestAnimationFrame for smooth transitions
                await debouncedUpdateBounds(bounds);
                console.log('[LayoutMode] Browser view bounds updated for layout mode:', layoutMode);
            } catch (error) {
                // Requirement 7.3: Log error, keep current layout
                console.error('[LayoutMode] Failed to update browser view bounds:', error);
                // Don't show user notification - this is a background operation
                // Browser view will keep its current bounds until next successful update
            }
        };
        
        updateBounds();
    }, [layoutMode, layout.browserPanelSize, debouncedUpdateBounds]); // Re-run when layout mode or browser panel size changes

    // Handle window resize to update WebContentsView bounds
    // Requirement 8.2: Use optimized bounds update with requestAnimationFrame
    useEffect(() => {
        const handleWindowResize = async () => {
            try {
                const bounds = calculateDetailViewBounds(
                    window.innerWidth,
                    layout.browserPanelSize,
                    window.innerHeight,
                    layoutMode,
                    48, // tabBarHeight
                    16  // windowMargins
                );
                // Debounced update with requestAnimationFrame batching
                await debouncedUpdateBounds(bounds);
            } catch (error) {
                console.error('[WindowResize] Error calculating detail view bounds:', error);
            }
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [layout.browserPanelSize, layoutMode, debouncedUpdateBounds]);

    // In scheduled task detail mode, ensure browser view is visible
    useEffect(() => {
        if (isTaskDetailMode && window.api?.setDetailViewVisible) {
            // Requirement 7.3: Handle layout transition failures gracefully
            window.api.setDetailViewVisible(true).catch(error => {
                console.error('[ScheduledTask] Failed to show browser view:', error);
                // Show non-blocking warning message
                antdMessage.warning(t('layout_transition_failed') || 'Layout transition failed, but continuing...');
                // Keep current layout - user can still view task details in AI panel
            });
        }
    }, [isTaskDetailMode, antdMessage, t]);

    // Use window API hook for type-safe access to Electron APIs
    const { getCurrentUrl, onUrlChange } = useWindowApi();

    // Get current URL and monitor URL changes on initialization
    useEffect(() => {
        const initUrl = async () => {
            const url = await getCurrentUrl();
            setCurrentUrl(url);
            
            // Also get initial navigation state
            if (window.api?.view?.getNavigationState) {
                try {
                    const navState = await window.api.view.getNavigationState();
                    setCanGoBack(navState.canGoBack);
                    setCanGoForward(navState.canGoForward);
                } catch (error) {
                    console.error('[Navigation] Failed to get initial navigation state:', error);
                }
            }
        };

        // Monitor URL changes
        const unsubscribe = onUrlChange((url: string) => {
            setCurrentUrl(url);
            console.log('URL changed:', url);
            
            // Update navigation state when URL changes
            if (window.api?.view?.getNavigationState) {
                window.api.view.getNavigationState().then(navState => {
                    setCanGoBack(navState.canGoBack);
                    setCanGoForward(navState.canGoForward);
                }).catch(error => {
                    console.error('[Navigation] Failed to update navigation state:', error);
                });
            }
        });

        initUrl();

        // Cleanup URL change listener
        return () => {
            unsubscribe();
        };
    }, [getCurrentUrl, onUrlChange]);

    // Navigation handlers for BrowserArea
    // Requirement 3.2, 3.3, 3.4: Handle invalid URLs gracefully with user-friendly error messages
    const handleNavigate = useCallback(async (url: string) => {
        try {
            setIsLoading(true);
            if (window.api?.view?.navigateTo) {
                const result = await window.api.view.navigateTo(url);
                if (result && !result.success) {
                    // IPC returned error result
                    console.error('[Navigation] Navigation failed:', result.error);
                    antdMessage.error(t('navigation_failed') || 'Failed to navigate to URL');
                    // Current page remains loaded - no additional action needed
                } else {
                    console.log('[Navigation] Navigated to:', url);
                }
            }
        } catch (error) {
            // Requirement 3.2, 3.3, 3.4: Show user-friendly error message and keep current page loaded
            console.error('[Navigation] Failed to navigate:', error);
            antdMessage.error(t('navigation_failed') || 'Failed to navigate to URL');
            // Current page remains loaded - no additional action needed
        } finally {
            setIsLoading(false);
        }
    }, [antdMessage, t]);

    const handleBack = useCallback(async () => {
        try {
            if (window.api?.view?.goBack) {
                const result = await window.api.view.goBack();
                if (!result.success) {
                    console.warn('[Navigation] Go back failed:', result.error);
                    // Show user-friendly error message
                    antdMessage.warning(t('navigation_back_failed') || 'Cannot go back');
                }
            }
        } catch (error) {
            console.error('[Navigation] Failed to go back:', error);
            antdMessage.error(t('navigation_back_failed') || 'Failed to go back');
        }
    }, [antdMessage, t]);

    const handleForward = useCallback(async () => {
        try {
            if (window.api?.view?.goForward) {
                const result = await window.api.view.goForward();
                if (!result.success) {
                    console.warn('[Navigation] Go forward failed:', result.error);
                    // Show user-friendly error message
                    antdMessage.warning(t('navigation_forward_failed') || 'Cannot go forward');
                }
            }
        } catch (error) {
            console.error('[Navigation] Failed to go forward:', error);
            antdMessage.error(t('navigation_forward_failed') || 'Failed to go forward');
        }
    }, [antdMessage, t]);

    const handleReload = useCallback(async () => {
        try {
            setIsLoading(true);
            if (window.api?.view?.reload) {
                const result = await window.api.view.reload();
                if (result && !result.success) {
                    // IPC returned error result
                    console.error('[Navigation] Reload failed:', result.error);
                    antdMessage.error(t('navigation_reload_failed') || 'Failed to reload page');
                } else {
                    console.log('[Navigation] Page reloaded');
                }
            }
        } catch (error) {
            // Show user-friendly error message and keep current page loaded
            console.error('[Navigation] Failed to reload:', error);
            antdMessage.error(t('navigation_reload_failed') || 'Failed to reload page');
        } finally {
            setIsLoading(false);
        }
    }, [antdMessage, t]);

    // Handle implicit message passing from home page
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const pendingMessage = sessionStorage.getItem('pendingMessage');
            if (pendingMessage) {
                console.log('Detected pending message:', pendingMessage);
                setQuery(pendingMessage);
                // Clear message to avoid duplicate sending
                sessionStorage.removeItem('pendingMessage');
                // Automatically send message
                setTimeout(() => {
                    sendMessage(pendingMessage);
                }, 100);
            }
        }
    }, []);

    // Monitor history task selection from Zustand store (as elegant as Pinia's watch!)
    useEffect(() => {
        if (selectedHistoryTask) {
            handleSelectHistoryTask(selectedHistoryTask);
            // Clear selection after processing
            clearSelectedHistoryTask();
        }
    }, [selectedHistoryTask]);

    // Use centralized event handling hook for IPC events
    useEkoEvents({
        isTaskDetailMode,
        tasks,
        updateTask,
        scheduledTaskIdFromUrl,
        taskIdRef,
    });

    // Generic function to terminate current task
    const terminateCurrentTask = useCallback(async (reason: string = 'User manually terminated') => {
        console.log(taskIdRef.current)
        if (!currentTaskId || !isCurrentTaskRunning) {
            return false; // No task to terminate
        }

        try {
            const result = await window.api.ekoCancelTask(currentTaskId);
            updateTask(currentTaskId, { status: 'abort' });
            console.log(`Task terminated, reason: ${reason}`, result);
            return true; // Termination successful
        } catch (error) {
            console.error('Failed to terminate task:', error);
            return false; // Termination failed
        }
    }, [currentTaskId, isCurrentTaskRunning, updateTask]);

    // Register termination function in store for use by other components
    useEffect(() => {
        setTerminateCurrentTaskFn(terminateCurrentTask);
    }, [terminateCurrentTask]);

    // Scroll to bottom function
    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    // Handle scroll events
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const isBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
        setIsAtBottom(isBottom);

        // User active scrolling marker
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 150);
    };

    // Monitor message changes, auto scroll to bottom
    useEffect(() => {
        if (isAtBottom && !isUserScrolling) {
            setTimeout(() => scrollToBottom(), 50); // Slight delay to ensure DOM updates
        }
    }, [messages, isAtBottom, isUserScrolling]);

    // Tool operation and status functions removed - BrowserPanel component has been removed

    // Screenshot handling removed - BrowserPanel component has been removed

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Handle sending message logic
            console.log('Sending message');
            sendMessage(query);
        }
    };

    // Use stream handler hook for message processing
    const { onMessage } = useEkoStreamHandler({
        isHistoryMode,
        messageProcessorRef,
        taskIdRef,
        currentTaskId,
        setCurrentTaskId,
        replaceTaskId,
        updateTask,
    });

    const callback = {
        onMessage,
    };

    // Tool click handler removed - BrowserPanel component has been removed

    // Handle history task selection
    const handleSelectHistoryTask = async (task: Task) => {
        try {
            // If there's a currently running task, terminate it first
            if (currentTaskId && isCurrentTaskRunning) {
                const terminated = await terminateCurrentTask('Switching to history task view mode');
                if (terminated) {
                    console.log('Switched to history task, current task terminated');
                }
            }

            // Use Hook to enter history mode
            enterHistoryMode(task);

            // Note: message notification is shown in HistoryPanel.tsx to avoid duplication
        } catch (error) {
            console.error('Failed to load history task:', error);
            antdMessage.error(t('load_history_failed'));
        }
    };

    // EkoService stream message monitoring with batch message handling
    useEffect(() => {
        const handleEkoStreamMessage = (data: any) => {
            console.log('[StreamHandler] Received message:', data);

            // Handle batched messages from IPC batch manager
            if (data?.type === 'batch' && Array.isArray(data.messages)) {
                console.log(`[StreamHandler] Processing batch with ${data.messages.length} messages`);
                let successCount = 0;
                let errorCount = 0;

                // Process each message in the batch
                for (let i = 0; i < data.messages.length; i++) {
                    const batchMessage = data.messages[i];
                    try {
                        // Extract the actual StreamCallbackMessage from BatchMessage wrapper
                        // BatchMessage structure: { channel, data, id, timestamp }
                        const actualMessage = batchMessage.data || batchMessage;

                        if (!actualMessage || typeof actualMessage !== 'object') {
                            console.warn(`[StreamHandler] Message ${i} has invalid structure:`, batchMessage);
                            errorCount++;
                            continue;
                        }

                        const msgType = actualMessage.type || 'unknown';
                        console.log(`[StreamHandler] Msg ${i}/${data.messages.length}: type=${msgType}, taskId=${actualMessage.taskId || 'none'}`);

                        callback.onMessage(actualMessage);
                        successCount++;
                    } catch (error) {
                        console.error(`[StreamHandler] Error in message ${i}:`, error);
                        errorCount++;
                    }
                }
                console.log(`[StreamHandler] Batch complete: ${successCount} processed, ${errorCount} failed`);
            } else {
                // Handle single messages (backward compatibility)
                const msgType = data?.type || 'unknown';
                console.log(`[StreamHandler] Single message: type=${msgType}`);
                callback.onMessage(data);
            }
        };

        // Monitor stream messages from main thread
        window.api.onEkoStreamMessage(handleEkoStreamMessage);

        return () => {
            window.api.removeAllListeners('eko-stream-message');
        };
    }, [callback]);

    const sendMessage = async (message: string) => {
        if (!message) {
            antdMessage.warning(t('enter_question'));
            return;
        }
        // Prohibit sending messages in history mode
        if (isHistoryMode) {
            antdMessage.warning(t('history_readonly'));
            return;
        }

        console.log('Sending message', message);

        // Check if this is the first message and transition layout if needed
        const isFirst = isFirstMessage();
        if (isFirst) {
            console.log('[Layout] First message detected, transitioning to split layout');
            // Requirement 6.1, 6.2, 6.3, 6.4, 7.3: Handle layout transition failures gracefully
            // Requirement 8.2: Use requestAnimationFrame for coordinated updates
            // Update React state first, then WebContentsView
            // Avoid layout thrashing by batching DOM reads/writes
            try {
                const result = await optimizedSplitLayoutTransition(
                    transitionToSplitLayout,
                    layout.browserPanelSize,
                    window.innerWidth,
                    window.innerHeight,
                    48, // tabBarHeight
                    16  // windowMargins
                );
                
                if (!result.success) {
                    console.warn('[Layout] Layout transition completed with warnings:', result.error);
                    // Non-blocking warning - layout may be partially applied
                    antdMessage.warning(t('layout_transition_partial') || 'Layout transition partially completed');
                } else {
                    console.log('[Layout] Layout transition completed successfully');
                }
            } catch (error) {
                // Requirement 6.1, 6.2, 7.3: Log error, show non-blocking warning, keep current layout
                console.error('[Layout] Layout transition failed:', error);
                antdMessage.warning(t('layout_transition_failed') || 'Layout transition failed, but continuing...');
                // Don't block message sending on layout transition failure - keep current layout
                // User can still send messages and interact with AI in full-width mode
            }
        }

        // Generate new execution ID for each task execution
        const newExecutionId = uuidv4();
        executionIdRef.current = newExecutionId;
        messageProcessorRef.current.setExecutionId(newExecutionId);

        // Add user message to message processor
        const updatedMessages = messageProcessorRef.current.addUserMessage(message.trim());

        // If no current task, create temporary task immediately to display user message
        if (!taskIdRef.current) {
            const tempTaskId = `temp-${newExecutionId}`;
            taskIdRef.current = tempTaskId;
            setCurrentTaskId(tempTaskId);

            // Create temporary task with user message
            createTask(tempTaskId, {
                name: 'Processing...',
                messages: updatedMessages,
                status: 'running',
                taskType: isTaskDetailMode ? 'scheduled' : 'normal',
                scheduledTaskId: isTaskDetailMode ? scheduledTaskIdFromUrl : undefined,
                startTime: new Date(),
            });
        } else {
            // Update existing task's messages
            updateMessages(taskIdRef.current, updatedMessages);
            // Set existing task to running state
            updateTask(taskIdRef.current, { status: 'running' });
        }

        // Clear input field
        setQuery('');

        let result: EkoResult | null = null;

        if (ekoRequest && isCurrentTaskRunning) {
            console.log('Waiting for current request to finish, avoiding conflicts');
            await window.api.ekoCancelTask(taskIdRef.current);
            await ekoRequest;
        } else if (ekoRequest && !isCurrentTaskRunning) {
            // Task is finished but promise still exists, just wait for it to cleanup
            console.log('Previous request finished, waiting for cleanup');
            await ekoRequest;
        }

        try {
            // Check if current task is temporary
            const isTemporaryTask = taskIdRef.current.startsWith('temp-');

            if (isTemporaryTask) {
                // Use IPC to call main thread's EkoService to run new task
                const req = window.api.ekoRun(message.trim());
                setEkoRequest(req);
                result = await req;
                // Note: real taskId will be set via stream callback's replaceTaskId
            } else {
                // Modify existing task
                const req = window.api.ekoModify(taskIdRef.current, message.trim());
                setEkoRequest(req);
                result = await req;
            }

            // Update task status based on result (directly using eko-core status)
            if (result && taskIdRef.current) {
                updateTask(taskIdRef.current, {
                    status: result.stopReason
                });
            }

        } catch (error) {
            // Set task to error state when sending fails
            if (taskIdRef.current) {
                updateTask(taskIdRef.current, { status: 'error' });
            }
            console.error('Failed to send message:', error);
            antdMessage.error(t('failed_send_message'));
        } finally {
            // Clear ekoRequest after completion
            setEkoRequest(null);
        }
    }


    // Task termination handling (manual click cancel button)
    const handleCancelTask = async () => {
        if (!currentTaskId) {
            antdMessage.error(t('no_task_running'));
            return;
        }

        const success = await terminateCurrentTask('User manually terminated');
        if (success) {
            antdMessage.success(t('task_terminated'));
        } else {
            antdMessage.error(t('terminate_failed'));
        }
    };

    // Phase 4: Checkpoint pause handler
    const handlePauseTask = async () => {
        if (!currentTaskId || !isCurrentTaskRunning) {
            antdMessage.warning('No task running to pause');
            return;
        }

        try {
            const result = await (window.api as any).eko.ekoPauseTask(currentTaskId);
            if (result.success) {
                setIsTaskPaused(true);
                setCheckpointStatus({ createdAt: Date.now() });
                antdMessage.success('Task paused at checkpoint. You can resume later.');
            } else {
                antdMessage.error(result.error || 'Failed to pause task');
            }
        } catch (error) {
            antdMessage.error('Error pausing task: ' + String(error));
            console.error('[Checkpoint] Pause error:', error);
        }
    };

    // Phase 4: Checkpoint resume handler
    const handleResumeTask = async () => {
        if (!currentTaskId || !isTaskPaused) {
            antdMessage.warning('No paused task to resume');
            return;
        }

        try {
            const result = await (window.api as any).eko.ekoResumeTask(currentTaskId);
            if (result.success) {
                setIsTaskPaused(false);
                setCheckpointStatus(null);
                antdMessage.success('Task resumed from checkpoint.');
            } else {
                antdMessage.error(result.error || 'Failed to resume task');
            }
        } catch (error) {
            antdMessage.error('Error resuming task: ' + String(error));
            console.error('[Checkpoint] Resume error:', error);
        }
    };

    // Panel resize handler with constraint validation and WebContentsView coordination
    // Requirement 8.2: Use optimized bounds update with requestAnimationFrame
    const handleResize = useCallback(async (sizes: number[]) => {
        try {
            const [browserSize, sidebarSize] = sizes;

            // Validate constraints
            const clampedBrowserSize = clampPanelSize(browserSize, 40, 85);
            const clampedSidebarSize = 100 - clampedBrowserSize;

            if (Math.abs(browserSize - clampedBrowserSize) > 0.1) {
                console.warn('[PanelResize] Browser panel out of range, clamped:', browserSize, '→', clampedBrowserSize);
                return; // Don't update if out of range
            }

            // Update layout state (React state update)
            const newLayout: PanelLayoutState = {
                browserPanelSize: clampedBrowserSize,
                aiSidebarSize: clampedSidebarSize,
                isCollapsed: clampedSidebarSize < 15,
                lastModified: Date.now()
            };

            setLayout(newLayout);

            // Calculate and update browser view bounds for WebContentsView coordination
            // Uses requestAnimationFrame batching to avoid layout thrashing
            try {
                const bounds = calculateDetailViewBounds(
                    window.innerWidth, 
                    clampedBrowserSize, 
                    window.innerHeight, 
                    layoutMode,
                    48, // tabBarHeight
                    16  // windowMargins
                );
                // Debounced update with requestAnimationFrame batching
                await debouncedUpdateBounds(bounds);
            } catch (boundsError) {
                console.error('[PanelResize] Error calculating detail view bounds:', boundsError);
                // Non-blocking - panel resize succeeded, bounds update failed
            }

            // Debounced persistence to localStorage
            try {
                debouncedPersist(newLayout);
            } catch (persistError) {
                console.error('[PanelResize] Error persisting layout:', persistError);
                // Non-blocking - layout updated in memory, persistence failed
            }
        } catch (error) {
            console.error('[PanelResize] Unexpected error during panel resize:', error);
            // Keep current layout if resize fails completely
        }
    }, [debouncedPersist, debouncedUpdateBounds, layoutMode]);

    // Browser view is always visible in the new layout

    return (
        <div
          className="h-screen w-screen overflow-hidden flex"
          style={{ background: 'var(--color-bg-primary)', padding: '16px' }}
          role="main"
          aria-label="AI Browser main interface"
        >
            {/* LEFT side: BrowserArea with tab bar - only visible when layoutMode === 'split' */}
            {/* Requirement 6.5: Show tab bar and browser area only in split mode */}
            {layoutMode === 'split' && (
                <BrowserArea
                    currentUrl={currentUrl}
                    onNavigate={handleNavigate}
                    onBack={handleBack}
                    onForward={handleForward}
                    onReload={handleReload}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    isLoading={isLoading}
                    isVisible={true}
                    width={`${layout.browserPanelSize}%`}
                />
            )}

            {/* RIGHT side: AI Sidebar - width adjusts based on layout mode */}
            {/* Full width (100%) when layoutMode === 'full-width', partial width when layoutMode === 'split' */}
            <div
                className="h-full flex flex-col ai-sidebar"
                style={{
                    width: layoutMode === 'split' ? `${layout.aiSidebarSize}%` : '100%',
                    flexShrink: 0,
                    transition: 'width 300ms ease-in-out'
                }}
                role="region"
                aria-label="AI assistant panel"
            >
                <RoundedContainer className="ai-chat-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* AI Sidebar Header - relocated header functionality */}
                    <div style={{ flexShrink: 0 }}>
                        <AISidebarHeader />
                    </div>

                    {/* AI Sidebar Content - takes remaining space */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        <div className='w-full max-w-[636px] mx-auto flex flex-col h-full px-4'>
                            {/* Task title - fixed at top */}
                            <div className='flex items-center justify-between py-3' style={{ flexShrink: 0 }}>
                                <div className='line-clamp-1 text-xl font-semibold flex-1 text-text-01-dark'>
                                    {currentTaskId && tasks.find(task => task.id === currentTaskId)?.name}
                                    {isHistoryMode && (
                                        <span className='ml-2 text-sm text-gray-500'>{t('history_task_readonly')}</span>
                                    )}
                                </div>
                            </div>

                            {/* Message list - scrollable area */}
                            <div
                                ref={scrollContainerRef}
                                style={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto' }}
                                onScroll={handleScroll}
                                role="log"
                                aria-live="polite"
                                aria-label="Chat messages"
                            >
                                <MessageList messages={messages} />
                            </div>

                            {/* Question input box - fixed at bottom */}
                            <div
                              className='gradient-border relative bg-gradient-to-t from-white via-white to-transparent pt-2 pb-4'
                              style={{ flexShrink: 0 }}
                              role="form"
                              aria-label="Message input form"
                            >
                                    <Input.TextArea
                                        value={query}
                                        onKeyDown={handleKeyDown}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="!bg-tool-call !text-text-01-dark !placeholder-text-12-dark !py-2"
                                        placeholder={isHistoryMode ? t('history_readonly_input') : t('input_placeholder')}
                                        disabled={isHistoryMode}
                                        aria-label={isHistoryMode ? t('history_readonly_input') : t('input_placeholder')}
                                        role="textbox"
                                        aria-multiline="true"
                                        tabIndex={0}
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                    />

                                    {/* Send/Cancel button - only shown in non-history mode */}
                                    {!isHistoryMode && (
                                        <div className="absolute right-3 bottom-3 flex gap-2 items-center">
                                            {/* Phase 4: Pause/Resume controls when task is running */}
                                            {isCurrentTaskRunning && (
                                                <Space size={4}>
                                                    {isTaskPaused ? (
                                                        <Tooltip title="Resume task from checkpoint">
                                                            <Button
                                                                type="text"
                                                                icon={<PlayCircleOutlined />}
                                                                size="small"
                                                                onClick={handleResumeTask}
                                                                className="checkpoint-resume-btn"
                                                                aria-label="Resume task"
                                                            />
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="Pause task at checkpoint">
                                                            <Button
                                                                type="text"
                                                                icon={<PauseOutlined />}
                                                                size="small"
                                                                onClick={handlePauseTask}
                                                                className="checkpoint-pause-btn"
                                                                aria-label="Pause task"
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Space>
                                            )}

                                            {isCurrentTaskRunning ? (
                                                <span
                                                className='bg-ask-status rounded-md flex justify-center items-center w-7 h-7 cursor-pointer'
                                                onClick={handleCancelTask}
                                                role="button"
                                                aria-label={t('terminate_task')}
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleCancelTask();
                                                  }
                                                }}
                                                >
                                                    <CancleTask className="w-5 h-5" />
                                                </span>
                                            ) : (
                                                <span
                                                className={`bg-ask-status rounded-md flex justify-center items-center w-7 h-7 cursor-pointer ${
                                                   query ? '' : '!cursor-not-allowed opacity-60'
                                                }`}
                                                onClick={() => sendMessage(query)}
                                                role="button"
                                                aria-label={t('send_message')}
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    sendMessage(query);
                                                  }
                                                }}
                                                >
                                                    <SendMessage className="w-5 h-5" />
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                        </div>
                    </div>
                </RoundedContainer>
            </div>
        </div>
    )
}

/**
 * Force server-side rendering for main page
 * This page requires window/browser APIs and cannot be statically generated
 */
export async function getServerSideProps() {
  return {
    props: {},
  };
}
