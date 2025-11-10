import React, { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { HistoryOutlined, ToolOutlined, SettingOutlined } from '@ant-design/icons'
import { useRouter } from 'next/router'
import { HistoryPanel } from '@/components/HistoryPanel'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { useHistoryStore } from '@/stores/historyStore'
import { useTranslation } from 'react-i18next'

export default function AISidebarHeader() {
  const router = useRouter()
  const { taskId, executionId } = router.query
  const { t } = useTranslation('header')
  const [showSettings, setShowSettings] = useState(false)

  // Check if in scheduled task detail mode
  const isTaskDetailMode = !!taskId && !!executionId

  // Using Zustand store for history panel management
  const { showHistoryPanel, setShowHistoryPanel, selectHistoryTask } = useHistoryStore()

  const navigateHome = async () => {
    router.push('/home')
  }

  const onSelectTask = (task: any) => {
    // Use store to select history task
    selectHistoryTask(task);

    // If not on main page, navigate to it
    if (router.pathname !== '/main') {
      router.push('/main');
    }
  }

  return (
    <div className="ai-sidebar-header">
      {/* Main header row */}
      <div className="header-main-row">
        {/* Loᥫ᭡li Logo - updated branding */}
        {!isTaskDetailMode && (
          <div
            onClick={() => navigateHome()}
            className="logo"
            role="button"
            aria-label="Navigate to home page"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateHome();
              }
            }}
          >
            Loᥫ᭡li
          </div>
        )}

        {/* Scheduled task badge - conditional display */}
        {isTaskDetailMode && (
          <div className="scheduled-task-badge">
            <span className="badge-label">{t('scheduled_task')}</span>
            {taskId && (
              <span className="badge-id">#{String(taskId).slice(-6)}</span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="action-buttons">
          {/* Toolbox button - only show on home page and not in scheduled task mode */}
          {!isTaskDetailMode && (router.pathname === '/home' || router.pathname === '/') && (
            <Tooltip title={t('toolbox')} placement="bottom" mouseEnterDelay={0.2}>
              <Button
                type="text"
                icon={<ToolOutlined />}
                size="small"
                onClick={() => router.push('/toolbox')}
                className="toolbox-button"
                aria-label={t('toolbox')}
              />
            </Tooltip>
          )}

          {/* History button - icon only */}
          <Tooltip title={isTaskDetailMode ? t('execution_history') : t('history')} placement="bottom" mouseEnterDelay={0.2}>
            <Button
              type="text"
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => setShowHistoryPanel(true)}
              className="history-button"
              aria-label={isTaskDetailMode ? t('execution_history') : t('history')}
            />
          </Tooltip>

          {/* Settings button - replaces language switcher */}
          <Tooltip title="Settings" placement="bottom" mouseEnterDelay={0.2}>
            <Button
              type="text"
              icon={<SettingOutlined />}
              size="small"
              onClick={() => setShowSettings(true)}
              className="settings-button"
              aria-label="Settings"
            />
          </Tooltip>
        </div>
      </div>

      {/* Global history task panel */}
      <HistoryPanel
        visible={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        onSelectTask={onSelectTask}
        currentTaskId=""
        isTaskDetailMode={isTaskDetailMode}
        scheduledTaskId={taskId as string}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <style jsx>{`
        .ai-sidebar-header {
          background: var(--bg-ai-sidebar);
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: var(--text-primary-mono);
          -webkit-app-region: drag;
        }

        .header-main-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          -webkit-app-region: no-drag;
        }

        /* Loᥫ᭡li Logo - premium monochrome styling */
        .logo {
          font-size: 1.875rem; /* text-3xl = 30px */
          font-weight: 700; /* font-bold */
          letter-spacing: -0.025em; /* tracking-tight for modern look */
          cursor: pointer;
          margin-left: 2rem; /* ml-8 */
          display: flex;
          align-items: center;
          font-family: system-ui, -apple-system, sans-serif; /* Clean modern font */
          transition: all 200ms ease-out; /* Subtle transition */
          color: var(--mono-white); /* Primary white from palette */
          position: relative;
        }

        .logo:hover {
          color: var(--mono-light); /* Subtle hover effect with secondary color */
          transform: translateY(-1px); /* Subtle lift effect */
        }

        /* Clean flat design - no gradients or shadows */
        .logo::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background: var(--mono-disabled); /* Subtle underline on hover */
          transition: width 200ms ease-out;
        }

        .logo:hover::after {
          width: 100%;
        }

        .action-buttons {
          display: flex;
          gap: 1rem; /* gap-4 */
          align-items: center;
        }

        /* Scheduled task badge - premium monochrome styling */
        .scheduled-task-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem; /* gap-2 */
          margin-left: 2rem; /* ml-8 */
          padding: 0.25rem 0.75rem; /* px-3 py-1 */
          background: var(--mono-medium); /* Elevated surface from palette */
          border-radius: 0.375rem; /* rounded-md */
          border: 1px solid var(--mono-disabled); /* Subtle border */
        }

        .badge-label {
          color: var(--mono-light); /* Secondary text from palette */
          font-size: 0.75rem; /* text-xs */
          font-weight: 500; /* font-medium */
        }

        .badge-id {
          color: var(--mono-disabled); /* Disabled text from palette */
          font-size: 0.75rem; /* text-xs */
        }

        /* Button styling - premium monochrome */
        :global(.toolbox-button) {
          color: var(--text-primary-mono) !important;
        }

        :global(.toolbox-button:hover) {
          background-color: var(--mono-medium) !important;
        }

        :global(.history-button) {
          color: var(--text-primary-mono) !important;
        }

        :global(.history-button:hover) {
          background-color: var(--mono-medium) !important;
        }

        :global(.settings-button) {
          color: var(--text-primary-mono) !important;
        }

        :global(.settings-button:hover) {
          background-color: var(--mono-medium) !important;
        }
      `}</style>
    </div>
  )
}