/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, KeyboardEvent, useCallback } from 'react';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import './InputArea.css';

interface InputAreaProps {
  onSendMessage: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
}

interface AttachedFile {
  file: File;
  id: string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  disabled,
}) => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if ((trimmedInput || attachedFiles.length > 0) && !disabled) {
      const files = attachedFiles.map((af) => af.file);
      onSendMessage(trimmedInput, files.length > 0 ? files : undefined);
      setInput('');
      setAttachedFiles([]);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((af) => af.id !== id));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const newFiles = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  return (
    <div className="input-area" onDragOver={handleDragOver} onDrop={handleDrop}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.csv,.txt,.pdf,.svg"
        onChange={handleFileSelect}
        className="file-input-hidden"
        aria-label="Select files to attach"
      />
      {attachedFiles.length > 0 && (
        <div className="attached-files">
          <div className="file-chips">
            {attachedFiles.map(({ file, id }) => (
              <div key={id} className="file-chip">
                <md-icon className="file-chip-icon">
                  {file.type.startsWith('image/')
                    ? 'image'
                    : file.name.toLowerCase().endsWith('.csv')
                      ? 'table_chart'
                      : file.type.includes('pdf')
                        ? 'picture_as_pdf'
                        : 'description'}
                </md-icon>
                <span className="file-chip-label">{file.name}</span>
                <button
                  className="file-chip-remove"
                  onClick={() => handleRemoveFile(id)}
                  type="button"
                  aria-label={`Remove ${file.name}`}
                >
                  <md-icon>close</md-icon>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="input-container">
        <button
          aria-label="Add attachment"
          className="attach-button-wrapper"
          disabled={disabled}
          onClick={handleAttachClick}
          type="button"
        >
          <md-icon>attach_file</md-icon>
        </button>
        <div className="input-field-wrapper">
          <textarea
            ref={textareaRef}
            className="input-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="Enter your prompt for Gemini"
            disabled={disabled}
            rows={1}
          />
        </div>
        <md-icon-button
          onClick={handleSubmit}
          disabled={
            disabled || (!input.trim() && attachedFiles.length === 0)
              ? true
              : undefined
          }
          aria-label="Send message"
          className="send-button"
        >
          <md-icon>send</md-icon>
        </md-icon-button>
      </div>
    </div>
  );
};
