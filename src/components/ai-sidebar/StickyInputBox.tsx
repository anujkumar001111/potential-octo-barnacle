/**
 * StickyInputBox Component
 *
 * Sticky input box at the bottom with attachment button and send functionality.
 */

import React, { useState, useRef } from 'react';
import { Input, Button, Upload, message } from 'antd';
import { SendOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import styles from './StickyInputBox.module.css';

const { TextArea } = Input;

interface StickyInputBoxProps {
  onSendMessage?: (message: string, attachments?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const StickyInputBox: React.FC<StickyInputBoxProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = 'Send a message...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const textAreaRef = useRef<any>(null);

  /**
   * Handle send message
   */
  const handleSend = () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue && fileList.length === 0) {
      return;
    }

    // Get actual File objects from upload files
    const attachments = fileList
      .map((file) => file.originFileObj)
      .filter((file): file is File => file !== undefined);

    if (onSendMessage) {
      onSendMessage(trimmedValue, attachments);
    }

    // Clear input and attachments
    setInputValue('');
    setFileList([]);

    // Refocus textarea
    textAreaRef.current?.focus();
  };

  /**
   * Handle key press (Ctrl/Cmd + Enter to send)
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle file upload
   */
  const handleFileChange = (info: any) => {
    const { fileList: newFileList } = info;

    // Limit to 5 files
    if (newFileList.length > 5) {
      message.warning('Maximum 5 files allowed');
      return;
    }

    // Limit file size to 10MB per file
    const validFiles = newFileList.filter((file: UploadFile) => {
      const size = file.size || 0;
      if (size > 10 * 1024 * 1024) {
        message.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setFileList(validFiles);
  };

  return (
    <div className={styles.stickyInputBox}>
      {/* File list preview */}
      {fileList.length > 0 && (
        <div className={styles.fileListPreview}>
          {fileList.map((file) => (
            <div key={file.uid} className={styles.fileTag}>
              <span className={styles.fileName}>{file.name}</span>
              <button
                className={styles.fileRemove}
                onClick={() => setFileList(fileList.filter((f) => f.uid !== file.uid))}
                aria-label="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div className={styles.inputRow}>
        {/* Attachment button */}
        <Upload
          fileList={fileList}
          onChange={handleFileChange}
          beforeUpload={() => false} // Prevent auto upload
          showUploadList={false}
          multiple
        >
          <Button
            icon={<PaperClipOutlined />}
            className={styles.attachButton}
            disabled={isLoading}
            aria-label="Attach files"
          />
        </Upload>

        {/* Text input */}
        <TextArea
          ref={textAreaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className={styles.textArea}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isLoading}
        />

        {/* Send button */}
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={isLoading || (!inputValue.trim() && fileList.length === 0)}
          loading={isLoading}
          className={styles.sendButton}
          aria-label="Send message"
        />
      </div>

      {/* Hint text */}
      <div className={styles.hintText}>
        Press Cmd/Ctrl + Enter to send
      </div>
    </div>
  );
};

export default StickyInputBox;
