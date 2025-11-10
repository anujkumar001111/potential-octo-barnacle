import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import AISidebarHeader from '@/components/AISidebarHeader'
import { BrowserPanel } from '@/components/BrowserPanel'
import { Input, Button, App } from 'antd'
import { EkoResult, StreamCallbackMessage } from '@jarvis-agent/core/dist/types';
import { MessageList } from '@/components/chat/MessageComponents';
import { uuidv4 } from '@/common/utils';
import { SendMessage, CancleTask } from '@/icons/deepfundai-icons';
import { Task, ToolAction } from '@/models';
import { CurrentToolState } from '@/types/tool';
import { DETAIL_PANEL_AGENTS } from '@/constants/agents';
import { MessageProcessor } from '@/utils/messageTransform';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useHistoryStore } from '@/stores/historyStore';
import { scheduledTaskStorage } from '@/lib/scheduled-task-storage';
import { useTranslation } from 'react-i18next';
import { loadPersistedLayout, createDebouncedPersist, clampPanelSize } from '@/utils/panel-layout-storage';
import { calculateDetailViewBounds } from '@/utils/detail-view-bounds';
import { PanelLayoutState } from '@/type';
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

    const [showDetail, setShowDetail] = useState(false);
    const [query, setQuery] = useState('');
    const [currentUrl, setCurrentUrl] = useState<string>('');
    // Current tool information state
    const [currentTool, setCurrentTool] = useState<CurrentToolState | null>(null);
    // Tool call history
    const [toolHistory, setToolHistory] = useState<(ToolAction & { screenshot?: string, toolSequence?: number })[]>([]);
    // Current displayed history tool index, -1 means showing the latest detail panel
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);

    const [ekoRequest, setEkoRequest] = useState<Promise<any> | null>(null)

    // Panel layout state management
    const [layout, setLayout] = useState<PanelLayoutState>(() => loadPersistedLayout())
    const debouncedPersist = useMemo(() => createDebouncedPersist(500), [])

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
                // Close detail view
                if ((window.api as any).setDetailViewVisible) {
                    (window.api as any).setDetailViewVisible(false);
                }
                // Close history screenshot preview view
                if ((window.api as any).hideHistoryView) {
                    (window.api as any).hideHistoryView();
                }
                // Terminate current task
                if ((window.api as any).ekoCancelTask && taskIdRef.current) {
                    window.api.ekoCancelTask(taskIdRef.current);
                }
            }
        };
    }, []); // Empty dependency array, only executes on component mount/unmount

    // Initialize browser view bounds on mount (but keep it hidden until first message)
    useEffect(() => {
        const initBrowserViewBounds = () => {
            try {
                const bounds = calculateDetailViewBounds(window.innerWidth, layout.browserPanelSize, window.innerHeight, layoutMode);
                if (window.api?.updateDetailViewBounds) {
                    window.api.updateDetailViewBounds(bounds).catch(error => {
                        console.error('[Init] Failed to set initial browser view bounds:', error);
                    });
                }
                // Browser view stays hidden until first message is sent (except in scheduled task mode)
            } catch (error) {
                console.error('[Init] Error initializing browser view bounds:', error);
            }
        };

        initBrowserViewBounds();
    }, [layoutMode]); // Re-run when layout mode changes

    // In scheduled task detail mode, ensure browser view is visible
    useEffect(() => {
        if (isTaskDetailMode && window.api?.setDetailViewVisible) {
            window.api.setDetailViewVisible(true).catch(error => {
                console.error('[ScheduledTask] Failed to show browser view:', error);
            });
        }
    }, [isTaskDetailMode]);

    // Use window API hook for type-safe access to Electron APIs
    const { getCurrentUrl, onUrlChange } = useWindowApi();

    // Get current URL and monitor URL changes on initialization
    useEffect(() => {
        const initUrl = async () => {
            const url = await getCurrentUrl();
            setCurrentUrl(url);
        };

        // Monitor URL changes
        const unsubscribe = onUrlChange((url: string) => {
            setCurrentUrl(url);
            console.log('URL changed:', url);
        });

        initUrl();

        // Cleanup URL change listener
        return () => {
            unsubscribe();
        };
    }, [getCurrentUrl, onUrlChange]);

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

    // Get tool operation description
    const getToolOperation = (message: StreamCallbackMessage): string => {
        const toolName = (message as any).toolName || '';
        switch (toolName.toLowerCase()) {
            case 'browser':
            case 'browser_navigate':
                return t('tool_operations.browsing_web_page');
            case 'file_write':
            case 'file':
                return t('tool_operations.writing_file');
            case 'file_read':
                return t('tool_operations.reading_file');
            case 'search':
                return t('tool_operations.searching');
            default:
                return t('tool_operations.executing', { toolName });
        }
    };

    // Get tool status
    const getToolStatus = (messageType: string): 'running' | 'completed' | 'error' => {
        switch (messageType) {
            case 'tool_use':
            case 'tool_streaming':
            case 'tool_running':
                return 'running';
            case 'tool_result':
                return 'completed';
            case 'error':
                return 'error';
            default:
                return 'running';
        }
    };

    // Handle screenshot when tool call completes
    const handleToolComplete = async (message: ToolAction) => {
        try {
            if (window.api && (window.api as any).getMainViewScreenshot) {
                let result: any = null;
                // Take screenshot for Browser and File agents to show in detail panel
                if (DETAIL_PANEL_AGENTS.includes(message.agentName as any)) {
                    result = await (window.api as any).getMainViewScreenshot();
                }
                const toolMessage = {
                    ...message,
                    screenshot: result?.imageBase64,
                    toolSequence: toolHistory.length + 1
                };

                // Update local toolHistory state
                setToolHistory(prev => [...prev, toolMessage]);

                // Also save to current task's toolHistory
                if (taskIdRef.current) {
                    addToolHistory(taskIdRef.current, toolMessage);
                }

                console.log('Tool call screenshot saved:', message.type, toolMessage.toolSequence);
            }
        } catch (error) {
            console.error('Screenshot failed:', error);
        }
    };

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
        setCurrentTool,
        setShowDetail,
        handleToolComplete,
        getToolOperation,
        getToolStatus,
    });

    const callback = {
        onMessage,
    };

    // Handle tool call click, show historical screenshot
    const handleToolClick = async (message: ToolAction) => {
        console.log('Tool call clicked:', message);
        // Set current tool information
        setCurrentTool({
            toolName: message.toolName,
            operation: getToolOperation({ toolName: message.toolName } as any),
            status: getToolStatus(message.status === 'completed' ? 'tool_result' :
                message.status === 'running' ? 'tool_running' : 'error')
        });

        // Find corresponding historical tool call
        const historyTool = toolHistory.find(tool =>
            (tool as any).toolId === (message as any).toolId && tool.id === message.id
        );
        if (historyTool && historyTool.toolSequence && historyTool.screenshot) {
            setCurrentHistoryIndex(historyTool.toolSequence - 1);
            // Show detail panel
            setShowDetail(true);
            await switchToHistoryIndex(historyTool.toolSequence - 1);
        }
    };

    // Switch to specified history index
    const switchToHistoryIndex = async (newIndex: number) => {
        // If switching to the last tool, set to -1 to indicate latest state
        if ((newIndex >= toolHistory.length - 1) && !isHistoryMode) {
            setCurrentHistoryIndex(-1);
            try {
                if (window.api && (window.api as any).hideHistoryView) {
                    await (window.api as any).hideHistoryView();
                    console.log('Switched to real-time view');
                }
            } catch (error) {
                console.error('Failed to hide history view:', error);
            }
        } else {
            setCurrentHistoryIndex(newIndex);
            // Show corresponding historical screenshot
            const historyTool = toolHistory[newIndex];
            if (historyTool && historyTool.screenshot) {
                try {
                    if (window.api && (window.api as any).showHistoryView) {
                        await (window.api as any).showHistoryView(historyTool.screenshot);
                        console.log('Switched to history tool:', newIndex + 1);
                    }
                } catch (error) {
                    console.error('Failed to show history view:', error);
                }
            }
        }
    };

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
            setToolHistory(task.toolHistory || []);

            // Clear current tool state
            setShowDetail(false);
            setCurrentTool(null);
            setCurrentHistoryIndex(toolHistory.length - 1);

            // Note: message notification is shown in HistoryPanel.tsx to avoid duplication
        } catch (error) {
            console.error('Failed to load history task:', error);
            antdMessage.error(t('load_history_failed'));
        }
    };

    // EkoService stream message monitoring
    useEffect(() => {
        const handleEkoStreamMessage = (message: StreamCallbackMessage) => {
            console.log('Received EkoService stream message:', message);
            // Directly process stream messages
            callback.onMessage(message);
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
            try {
                // Transition to split layout
                transitionToSplitLayout();
                
                // Show browser view
                if (window.api?.setDetailViewVisible) {
                    await window.api.setDetailViewVisible(true);
                    console.log('[Layout] Browser view shown successfully');
                }
            } catch (error) {
                console.error('[Layout] Failed to transition to split layout:', error);
                antdMessage.warning(t('layout_transition_failed') || 'Layout transition failed, but continuing...');
                // Don't block message sending on layout transition failure
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

    // Panel resize handler with constraint validation and WebContentsView coordination
    const handleResize = useCallback((sizes: number[]) => {
        const [browserSize, sidebarSize] = sizes;

        // Validate constraints
        const clampedBrowserSize = clampPanelSize(browserSize, 40, 85);
        const clampedSidebarSize = 100 - clampedBrowserSize;

        if (Math.abs(browserSize - clampedBrowserSize) > 0.1) {
            console.warn('[PanelResize] Browser panel out of range, clamped:', browserSize, '→', clampedBrowserSize);
            return; // Don't update if out of range
        }

        // Update layout state
        const newLayout: PanelLayoutState = {
            browserPanelSize: clampedBrowserSize,
            aiSidebarSize: clampedSidebarSize,
            isCollapsed: clampedSidebarSize < 15,
            lastModified: Date.now()
        };

        setLayout(newLayout);

        // Calculate and update browser view bounds for WebContentsView coordination
        try {
            const bounds = calculateDetailViewBounds(window.innerWidth, clampedBrowserSize, window.innerHeight, layoutMode);
            if (window.api?.updateDetailViewBounds) {
                window.api.updateDetailViewBounds(bounds).catch(error => {
                    console.error('[PanelResize] Failed to update detail view bounds:', error);
                    // Non-critical: detail view may be misaligned but app remains functional
                });
            }
        } catch (error) {
            console.error('[PanelResize] Error calculating detail view bounds:', error);
        }

        // Debounced persistence to localStorage
        debouncedPersist(newLayout);
    }, [debouncedPersist, layoutMode]);

    // Browser view is always visible in the new layout
    // History view management for tool history playback
    useEffect(() => {
        // Hide history view when not in history mode or when detail panel is hidden
        if ((!showDetail || isHistoryMode) && window.api?.hideHistoryView) {
            window.api.hideHistoryView().catch(error => {
                console.error('[HistoryView] Failed to hide history view:', error);
            });
        }
    }, [showDetail, isHistoryMode]);

    return (
        <div className="h-screen w-screen overflow-hidden flex" style={{ background: 'var(--mono-darkest)' }}>
            {/* LEFT side: Empty space for Electron WebContentsView (browser) - only visible in split mode */}
            {layoutMode === 'split' && (
                <div style={{ width: `${layout.browserPanelSize}%`, flexShrink: 0 }} />
            )}
            
            {/* RIGHT side: AI Sidebar - width adjusts based on layout mode */}
            <div 
                className="h-full flex flex-col ai-sidebar"
                style={{ 
                    width: layoutMode === 'split' ? `${layout.aiSidebarSize}%` : '100%',
                    flexShrink: 0, 
                    background: 'var(--bg-ai-sidebar)',
                    transition: 'width 300ms ease-in-out'
                }}
            >
                    {/* AI Sidebar Header - relocated header functionality */}
                    <AISidebarHeader />

                    {/* AI Sidebar Content */}
                    <div className="flex flex-col h-full">
                        <div className='flex-1 h-full transition-all duration-300'>
                            <div className='w-full max-w-[636px] mx-auto flex flex-col gap-2 pt-7 pb-4 h-full relative px-4'>
                                {/* Task title and history button */}
                                <div className='absolute top-0 left-4 right-4 flex items-center justify-between'>
                                    <div className='line-clamp-1 text-xl font-semibold flex-1 text-text-01-dark'>
                                        {currentTaskId && tasks.find(task => task.id === currentTaskId)?.name}
                                        {isHistoryMode && (
                                            <span className='ml-2 text-sm text-gray-500'>{t('history_task_readonly')}</span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Message list */}
                                <div
                                    ref={scrollContainerRef}
                                    className='flex-1 h-full overflow-x-hidden overflow-y-auto px-4 pt-5'
                                    onScroll={handleScroll}
                                >
                                    <MessageList messages={messages} onToolClick={handleToolClick} />
                                </div>
                                
                                {/* Question input box */}
                                <div className='h-30 gradient-border relative'>
                                    <Input.TextArea
                                        value={query}
                                        onKeyDown={handleKeyDown}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="!h-full !bg-tool-call !text-text-01-dark !placeholder-text-12-dark !py-2"
                                        placeholder={isHistoryMode ? t('history_readonly_input') : t('input_placeholder')}
                                        disabled={isHistoryMode}
                                    />

                                    {/* Send/Cancel button - only shown in non-history mode */}
                                    {!isHistoryMode && (
                                        <div className="absolute right-3 bottom-3">
                                            {isCurrentTaskRunning ? (
                                                <span 
                                                className='bg-ask-status rounded-md flex justify-center items-center w-7 h-7 cursor-pointer'
                                                onClick={handleCancelTask}>
                                                    <CancleTask className="w-5 h-5" />
                                                </span>
                                            ) : (
                                                <span
                                                className={`bg-ask-status rounded-md flex justify-center items-center w-7 h-7 cursor-pointer ${
                                                   query ? '' : '!cursor-not-allowed opacity-60' 
                                                }`}
                                                onClick={() => sendMessage(query)}>
                                                    <SendMessage className="w-5 h-5" />
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detail Panel - using extracted BrowserPanel component */}
                        <BrowserPanel
                          isVisible={showDetail}
                          currentTool={currentTool}
                          currentUrl={currentUrl}
                          toolHistory={toolHistory}
                          currentHistoryIndex={currentHistoryIndex}
                          onHistoryIndexChange={switchToHistoryIndex}
                        />
                    </div>
            </div>
        </div>
    )
}
