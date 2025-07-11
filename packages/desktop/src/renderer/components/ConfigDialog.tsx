/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '@material/web/dialog/dialog.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/text-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/icon/icon.js';
import '@material/web/radio/radio.js';
import './ConfigDialog.css';

interface ConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({
  open,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [authMethod, setAuthMethod] = useState<
    'api-key' | 'oauth' | 'vertex-ai'
  >('api-key');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('');
  const [isOAuthAuthenticated, setIsOAuthAuthenticated] = useState(false);
  const dialogRef = useRef<any>(null);

  const handleSave = useCallback(async () => {
    console.log('Save button clicked - authMethod:', authMethod);
    setLoading(true);
    try {
      const settingsToSave = { apiKey, authMethod, projectId };
      console.log('Saving settings:', settingsToSave);
      await window.electronAPI.saveSettings(settingsToSave);
      // Restart the Gemini service with new settings
      await window.electronAPI.restartGeminiService();
      console.log('Settings saved and service restarted');

      // Close the dialog
      if (dialogRef.current) {
        dialogRef.current.close();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  }, [apiKey, authMethod, projectId, onClose]);

  const handleAuthMethodChange = (
    method: 'api-key' | 'oauth' | 'vertex-ai',
  ) => {
    console.log('Changing auth method to:', method);
    setAuthMethod(method);
  };

  const handleAuthenticateNow = async () => {
    console.log('Authenticate Now clicked');
    try {
      // Save settings first
      const settingsToSave = { apiKey, authMethod, projectId };
      console.log('Saving settings before auth:', settingsToSave);
      await window.electronAPI.saveSettings(settingsToSave);
      console.log('Settings saved, triggering OAuth...');

      // Trigger OAuth authentication
      const result = await window.electronAPI.triggerOAuthAuthentication();
      console.log('OAuth trigger result:', result);

      setIsOAuthAuthenticated(true);
      setAuthStatus('Authentication initiated. Please check your browser.');
    } catch (error: any) {
      console.error('Failed to initiate authentication:', error);
      console.error('Error details:', error.message);
      setAuthStatus(
        `Authentication failed: ${error.message || 'Unknown error'}`,
      );
    }
  };

  const handleCancel = () => {
    console.log('Handling cancel');
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    onClose();
  };

  const handleDialogClose = (_e: any) => {
    // Handle dialog close event
    console.log('Dialog close event');
    onClose();
  };

  useEffect(() => {
    if (open) {
      // Load current settings
      window.electronAPI.getSettings().then((settings: any) => {
        setApiKey(settings.apiKey || '');
        setAuthMethod(settings.authMethod || 'api-key');
        setProjectId(settings.projectId || '');
        // If OAuth is already saved, mark as authenticated
        if (settings.authMethod === 'oauth') {
          setIsOAuthAuthenticated(true);
        }
      });
      // Reset auth status
      setAuthStatus('');
    }
  }, [open]);

  useEffect(() => {
    // Explicitly control dialog open state
    if (dialogRef.current) {
      if (open) {
        dialogRef.current.show();
      } else {
        dialogRef.current.close();
      }
    }
  }, [open]);

  return (
    <md-dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onCancel={handleDialogClose}
    >
      <div slot="headline">
        <md-icon>settings</md-icon>
        Configuration
      </div>
      <div slot="content" className="config-dialog-content">
        <div className="config-section">
          <h3 className="md-typescale-title-medium">Authentication Method</h3>
          <div className="auth-method-group">
            <div
              className="auth-method-option"
              onClick={(_e) => {
                _e.stopPropagation();
                handleAuthMethodChange('api-key');
              }}
            >
              <input
                type="radio"
                name="auth-method"
                value="api-key"
                checked={authMethod === 'api-key'}
                onChange={() => handleAuthMethodChange('api-key')}
                style={{ marginRight: '12px' }}
                aria-label="API Key authentication method"
              />
              <span className="md-typescale-body-large">API Key</span>
              <span className="md-typescale-body-small auth-method-description">
                Use Google AI Studio API key
              </span>
            </div>
            <div
              className="auth-method-option"
              onClick={(_e) => {
                _e.stopPropagation();
                handleAuthMethodChange('oauth');
              }}
            >
              <input
                type="radio"
                name="auth-method"
                value="oauth"
                checked={authMethod === 'oauth'}
                onChange={() => handleAuthMethodChange('oauth')}
                style={{ marginRight: '12px' }}
                aria-label="OAuth authentication method"
              />
              <span className="md-typescale-body-large">OAuth</span>
              <span className="md-typescale-body-small auth-method-description">
                For personal Google accounts
              </span>
            </div>
            <div
              className="auth-method-option"
              onClick={(_e) => {
                _e.stopPropagation();
                handleAuthMethodChange('vertex-ai');
              }}
            >
              <input
                type="radio"
                name="auth-method"
                value="vertex-ai"
                checked={authMethod === 'vertex-ai'}
                onChange={() => handleAuthMethodChange('vertex-ai')}
                style={{ marginRight: '12px' }}
                aria-label="Vertex AI authentication method"
              />
              <span className="md-typescale-body-large">Vertex AI</span>
              <span className="md-typescale-body-small auth-method-description">
                Use Google Cloud Project with Vertex AI
              </span>
            </div>
          </div>
        </div>

        {authMethod === 'api-key' && (
          <div className="config-section">
            <h3 className="md-typescale-title-medium">API Configuration</h3>
            <md-outlined-text-field
              label="Gemini API Key"
              type="password"
              value={apiKey}
              onInput={(e: any) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="config-input"
            >
              <md-icon slot="leading-icon">key</md-icon>
            </md-outlined-text-field>
            <p className="config-help md-typescale-body-small">
              Get your API key from{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        )}

        {authMethod === 'oauth' && (
          <div className="config-section">
            <h3 className="md-typescale-title-medium">OAuth Configuration</h3>
            <p className="config-help md-typescale-body-medium">
              OAuth authentication will open a browser window to sign in with
              your Google account.
            </p>
            <md-outlined-text-field
              label="Google Cloud Project ID (optional)"
              value={projectId}
              onInput={(e: any) => setProjectId(e.target.value)}
              placeholder="Required for Google Workspace accounts"
              className="config-input"
            >
              <md-icon slot="leading-icon">cloud</md-icon>
            </md-outlined-text-field>
            <p className="config-help md-typescale-body-small">
              <strong>
                Note: Google Workspace accounts should use Vertex AI instead
              </strong>
              <br />• For personal Google accounts only
              <br />• Click &quot;Save and Continue&quot; to save OAuth settings
              <br />• Browser will open when you send your first message
              <br />• Sign in with your Google account
              <br />• Authorize access to Gemini API
              <br />• Tokens are saved in ~/.gemini/oauth_creds.json
            </p>
            {isOAuthAuthenticated && (
              <p
                className="auth-status md-typescale-body-small"
                style={{
                  backgroundColor: 'var(--md-sys-color-secondary-container)',
                  color: 'var(--md-sys-color-on-secondary-container)',
                }}
              >
                ✓ OAuth is already configured
              </p>
            )}
            {authStatus && (
              <p
                className="auth-status md-typescale-body-small"
                style={{
                  backgroundColor: authStatus.includes('failed')
                    ? 'var(--md-sys-color-error-container)'
                    : 'var(--md-sys-color-secondary-container)',
                  color: authStatus.includes('failed')
                    ? 'var(--md-sys-color-on-error-container)'
                    : 'var(--md-sys-color-on-secondary-container)',
                  marginTop: '8px',
                }}
              >
                {authStatus}
              </p>
            )}
            <button
              className="auth-button"
              style={{
                marginTop: '16px',
                padding: '0 24px',
                height: '36px',
                border: 'none',
                background: 'var(--md-sys-color-secondary)',
                color: 'var(--md-sys-color-on-secondary)',
                cursor: 'pointer',
                borderRadius: '18px',
                fontFamily:
                  'var(--md-sys-typescale-label-large-font-family-name)',
                fontSize: 'var(--md-sys-typescale-label-large-font-size)',
                fontWeight: 'var(--md-sys-typescale-label-large-font-weight)',
                letterSpacing:
                  'var(--md-sys-typescale-label-large-letter-spacing)',
                lineHeight: 'var(--md-sys-typescale-label-large-line-height)',
              }}
              onClick={handleAuthenticateNow}
              type="button"
            >
              Authenticate Now
            </button>
          </div>
        )}

        {authMethod === 'vertex-ai' && (
          <div className="config-section">
            <h3 className="md-typescale-title-medium">
              Vertex AI Configuration
            </h3>
            <md-outlined-text-field
              label="Google Cloud Project ID"
              value={projectId}
              onInput={(e: any) => setProjectId(e.target.value)}
              placeholder="Enter your Google Cloud Project ID"
              className="config-input"
            >
              <md-icon slot="leading-icon">cloud</md-icon>
            </md-outlined-text-field>
            <p className="config-help md-typescale-body-small">
              Make sure you have:
              <br />• Set up Google Cloud authentication (gcloud auth login)
              <br />• Enabled Vertex AI API in your project
              <br />• Set GOOGLE_CLOUD_PROJECT environment variable (optional)
            </p>
          </div>
        )}
      </div>
      <div slot="actions">
        <button
          className="md-text-button"
          style={{
            padding: '0 24px',
            height: '40px',
            border: 'none',
            background: 'transparent',
            color: 'var(--md-sys-color-primary)',
            cursor: 'pointer',
            borderRadius: '20px',
            fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
            fontSize: 'var(--md-sys-typescale-label-large-font-size)',
            fontWeight: 'var(--md-sys-typescale-label-large-font-weight)',
            letterSpacing: 'var(--md-sys-typescale-label-large-letter-spacing)',
            lineHeight: 'var(--md-sys-typescale-label-large-line-height)',
          }}
          onClick={handleCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="md-filled-button"
          style={{
            padding: '0 24px',
            height: '40px',
            border: 'none',
            background:
              loading ||
              (authMethod === 'api-key' && !apiKey) ||
              (authMethod === 'vertex-ai' && !projectId)
                ? 'var(--md-sys-color-on-surface)'
                : 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            cursor:
              loading ||
              (authMethod === 'api-key' && !apiKey) ||
              (authMethod === 'vertex-ai' && !projectId)
                ? 'not-allowed'
                : 'pointer',
            borderRadius: '20px',
            opacity:
              loading ||
              (authMethod === 'api-key' && !apiKey) ||
              (authMethod === 'vertex-ai' && !projectId)
                ? '0.38'
                : '1',
            fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
            fontSize: 'var(--md-sys-typescale-label-large-font-size)',
            fontWeight: 'var(--md-sys-typescale-label-large-font-weight)',
            letterSpacing: 'var(--md-sys-typescale-label-large-letter-spacing)',
            lineHeight: 'var(--md-sys-typescale-label-large-line-height)',
          }}
          onClick={(_e) => {
            _e.preventDefault();
            _e.stopPropagation();
            console.log('Button click event fired');
            handleSave();
          }}
          disabled={
            loading ||
            (authMethod === 'api-key' && !apiKey) ||
            (authMethod === 'vertex-ai' && !projectId)
          }
          type="button"
        >
          {loading
            ? 'Saving...'
            : authMethod === 'oauth'
              ? 'Save and Continue'
              : 'Save'}
        </button>
      </div>
    </md-dialog>
  );
};
