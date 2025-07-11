/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import {
  ToolApprovalRequest,
  ToolConfirmationOutcome,
} from '../../types/approval';
import '@material/web/dialog/dialog.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import './ToolApprovalDialog.css';

interface ToolApprovalDialogProps {
  request: ToolApprovalRequest | null;
  onResponse: (outcome: ToolConfirmationOutcome) => void;
}

export const ToolApprovalDialog: React.FC<ToolApprovalDialogProps> = ({
  request,
  onResponse,
}) => {
  const dialogRef = React.useRef<any>(null);

  const handleResponse = useCallback(
    (outcome: ToolConfirmationOutcome) => {
      if (dialogRef.current) {
        dialogRef.current.open = false;
      }
      onResponse(outcome);
    },
    [onResponse],
  );

  useEffect(() => {
    if (request && dialogRef.current) {
      dialogRef.current.open = true;
    }
  }, [request]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!request) return;

      if (e.key === 'Escape') {
        handleResponse(ToolConfirmationOutcome.Cancel);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleResponse(ToolConfirmationOutcome.ProceedOnce);
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleResponse(ToolConfirmationOutcome.ProceedAlways);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request, handleResponse]);

  if (!request) return null;

  const details = request.details;

  const renderContent = () => {
    switch (details.type) {
      case 'mcp':
        return (
          <div className="approval-content">
            <div className="approval-header">
              <md-icon>extension</md-icon>
              <h3>MCP Tool Approval</h3>
            </div>
            <p className="mcp-info">
              <strong>Server:</strong> {details.serverName}
              <br />
              <strong>Tool:</strong>{' '}
              {details.toolDisplayName || details.toolName}
            </p>
          </div>
        );

      case 'info':
        return (
          <div className="approval-content">
            <div className="approval-header">
              <md-icon>info</md-icon>
              <h3>Information Access Approval</h3>
            </div>
            <p className="info-prompt">{details.prompt}</p>
            {details.urls && details.urls.length > 0 && (
              <div className="urls-list">
                <strong>URLs:</strong>
                {details.urls.map((url, i) => (
                  <div key={i} className="url-item">
                    {url}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="approval-content">
            <div className="approval-header">
              <md-icon>help</md-icon>
              <h3>Unknown Tool Type</h3>
            </div>
            <p>Unknown tool type: {(details as any).type}</p>
          </div>
        );
    }
  };

  return (
    <md-dialog ref={dialogRef} modal>
      <div slot="headline">Tool Approval Required</div>
      <div slot="content">
        {renderContent()}
        <div className="keyboard-hints">
          <div className="hint-item">
            <kbd>Enter</kbd> Allow once
          </div>
          <div className="hint-item">
            <kbd>Shift+Enter</kbd> Always allow
          </div>
          <div className="hint-item">
            <kbd>Esc</kbd> Cancel
          </div>
        </div>
      </div>
      <div slot="actions">
        <md-text-button
          onClick={() => handleResponse(ToolConfirmationOutcome.Cancel)}
        >
          Cancel
        </md-text-button>
        <md-text-button
          onClick={() => handleResponse(ToolConfirmationOutcome.ProceedAlways)}
        >
          Always Allow
        </md-text-button>
        <md-filled-button
          onClick={() => handleResponse(ToolConfirmationOutcome.ProceedOnce)}
        >
          Allow Once
        </md-filled-button>
      </div>
    </md-dialog>
  );
};
