import React from 'react';
import { Drawer, Select, Switch, Divider } from 'antd';
import { GlobalOutlined, BgColorsOutlined, BellOutlined, ApiOutlined, RobotOutlined } from '@ant-design/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ visible, onClose }) => {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation('settings');

  return (
    <Drawer
      title="Settings"
      placement="right"
      onClose={onClose}
      open={visible}
      width={360}
      styles={{
        body: {
          padding: '24px',
          background: 'var(--mono-darkest)',
          color: 'var(--mono-white)'
        },
        header: {
          background: 'var(--mono-darkest)',
          borderBottom: '1px solid var(--mono-medium)',
          color: 'var(--mono-white)'
        }
      }}
      className="settings-drawer"
    >
      {/* Language Settings */}
      <div className="settings-section">
        <div className="settings-section-header">
          <GlobalOutlined style={{ fontSize: '16px', marginRight: '8px', color: 'var(--mono-light)' }} />
          <span className="settings-section-title">Language</span>
        </div>
        <div className="settings-item">
          <Select
            value={language}
            onChange={changeLanguage}
            style={{ width: '100%' }}
            options={languages}
            size="middle"
          />
        </div>
      </div>

      <Divider style={{ borderColor: 'var(--mono-medium)', margin: '24px 0' }} />

      {/* Theme Settings */}
      <div className="settings-section">
        <div className="settings-section-header">
          <BgColorsOutlined style={{ fontSize: '16px', marginRight: '8px', color: 'var(--mono-light)' }} />
          <span className="settings-section-title">Theme</span>
        </div>
        <div className="settings-item">
          <div className="settings-item-row">
            <span>Dark Mode</span>
            <Switch defaultChecked disabled />
          </div>
          <div className="settings-item-description">
            Currently only dark mode is supported
          </div>
        </div>
      </div>

      <Divider style={{ borderColor: 'var(--mono-medium)', margin: '24px 0' }} />

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section-header">
          <BellOutlined style={{ fontSize: '16px', marginRight: '8px', color: 'var(--mono-light)' }} />
          <span className="settings-section-title">Notifications</span>
        </div>
        <div className="settings-item">
          <div className="settings-item-row">
            <span>Task Completion</span>
            <Switch defaultChecked />
          </div>
          <div className="settings-item-description">
            Get notified when tasks complete
          </div>
        </div>
        <div className="settings-item" style={{ marginTop: '16px' }}>
          <div className="settings-item-row">
            <span>Sound Effects</span>
            <Switch defaultChecked />
          </div>
          <div className="settings-item-description">
            Play sounds for notifications
          </div>
        </div>
      </div>

      <Divider style={{ borderColor: 'var(--mono-medium)', margin: '24px 0' }} />

      {/* Model Settings */}
      <div className="settings-section">
        <div className="settings-section-header">
          <RobotOutlined style={{ fontSize: '16px', marginRight: '8px', color: 'var(--mono-light)' }} />
          <span className="settings-section-title">AI Model</span>
        </div>
        <div className="settings-item">
          <div className="settings-item-description">
            Configure AI models in the model bar below the input
          </div>
        </div>
      </div>

      <Divider style={{ borderColor: 'var(--mono-medium)', margin: '24px 0' }} />

      {/* API Configuration */}
      <div className="settings-section">
        <div className="settings-section-header">
          <ApiOutlined style={{ fontSize: '16px', marginRight: '8px', color: 'var(--mono-light)' }} />
          <span className="settings-section-title">API Configuration</span>
        </div>
        <div className="settings-item">
          <div className="settings-item-description">
            API keys and configuration managed in model settings
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-section {
          margin-bottom: 8px;
        }

        .settings-section-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          font-weight: 600;
          font-size: 14px;
          color: var(--mono-white);
        }

        .settings-section-title {
          color: var(--mono-white);
        }

        .settings-item {
          color: var(--mono-light);
        }

        .settings-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: var(--mono-white);
        }

        .settings-item-description {
          margin-top: 8px;
          font-size: 12px;
          color: var(--mono-disabled);
          line-height: 1.5;
        }

        :global(.settings-drawer .ant-drawer-close) {
          color: var(--mono-light);
        }

        :global(.settings-drawer .ant-drawer-close:hover) {
          color: var(--mono-white);
        }

        :global(.settings-drawer .ant-select-selector) {
          background: var(--mono-medium) !important;
          border-color: var(--mono-disabled) !important;
          color: var(--mono-white) !important;
        }

        :global(.settings-drawer .ant-select-arrow) {
          color: var(--mono-light) !important;
        }

        :global(.settings-drawer .ant-switch-checked) {
          background: var(--mono-light) !important;
        }

        :global(.settings-drawer .ant-switch) {
          background: var(--mono-disabled);
        }
      `}</style>
    </Drawer>
  );
};
