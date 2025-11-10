import React, { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { HistoryOutlined, ToolOutlined, SettingOutlined } from '@ant-design/icons'
import { useRouter } from 'next/router'
import { HistoryPanel } from '@/components/HistoryPanel'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { useHistoryStore } from '@/stores/historyStore'
import { useTranslation } from 'react-i18next'

export default function Header() {
  const router = useRouter()
  const { taskId, executionId } = router.query
  const { t } = useTranslation('header')
  const [showSettings, setShowSettings] = useState(false)

  // Check if in scheduled task detail mode
  const isTaskDetailMode = !!taskId && !!executionId

  // Using Zustand store, as simple as Pinia!
  const { showHistoryPanel, setShowHistoryPanel, selectHistoryTask } = useHistoryStore()

  const goback = async () => {
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
    <div className=' flex justify-between items-center h-12 w-full px-7 bg-header text-text-01-dark' style={{
            WebkitAppRegion: 'drag'
          } as React.CSSProperties}>
      {/* Don't show back button in scheduled task mode */}
      {!isTaskDetailMode && (
        <div
          style={{
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
          onClick={() => goback()}
          className='cursor-pointer ml-8 flex items-center'
        >
          <span className='text-3xl font-bold tracking-tight hover:scale-105 transition-all duration-200 relative' style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Loᥫ᭡li
          </span>
        </div>
      )}
      {isTaskDetailMode && (
        <div className='flex items-center gap-2 ml-8 px-3 py-1 bg-blue-500/20 rounded-md border border-blue-500/50'>
          <span className='text-blue-400 text-xs font-medium'>{t('scheduled_task')}</span>
          {taskId && (
            <span className='text-blue-300 text-xs opacity-70'>#{String(taskId).slice(-6)}</span>
          )}
        </div>
      )}
      <div className='flex justify-center items-center gap-4'>
        {/* Toolbox button - only show in home page */}
        {!isTaskDetailMode && (router.pathname === '/home' || router.pathname === '/') && (
          <Tooltip title={t('toolbox')} placement="bottom" mouseEnterDelay={0.2}>
            <Button
              type="text"
              icon={<ToolOutlined />}
              size="small"
              onClick={() => router.push('/toolbox')}
              className='!text-text-01-dark hover:!bg-blue-500/10'
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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
            className='!text-text-01-dark'
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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
            className='!text-text-01-dark'
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            aria-label="Settings"
          />
        </Tooltip>
      </div>

      {/* Global history task panel - passing scheduled task info */}
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
    </div>
  )
}
