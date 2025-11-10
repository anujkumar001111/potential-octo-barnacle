/**
 * WorkspaceSelector Component
 *
 * Dropdown selector for switching between workspaces.
 */

import React from 'react';
import { Select } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { Workspace } from '@/type';
import styles from './WorkspaceSelector.module.css';

const { Option } = Select;

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onWorkspaceSwitch: (workspaceId: string) => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  workspaces,
  activeWorkspace,
  onWorkspaceSwitch
}) => {
  return (
    <Select
      className={styles.workspaceSelector}
      value={activeWorkspace?.id}
      onChange={onWorkspaceSwitch}
      suffixIcon={<FolderOutlined />}
      placeholder="Select workspace"
      dropdownClassName={styles.workspaceDropdown}
    >
      {workspaces.map((workspace) => (
        <Option key={workspace.id} value={workspace.id}>
          <div className={styles.workspaceOption}>
            {workspace.icon && <span className={styles.workspaceIcon}>{workspace.icon}</span>}
            <span className={styles.workspaceName}>{workspace.name}</span>
            <span className={styles.workspaceTabCount}>({workspace.tabIds.length})</span>
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default WorkspaceSelector;
