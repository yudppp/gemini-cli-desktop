/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/icon/icon.js';
import { AVAILABLE_MODELS } from '../constants/models';
import './ModelSelector.css';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  // Click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className={`model-selector ${className || ''}`}>
      <div className="model-selector-dropdown" ref={dropdownRef}>
        <button
          type="button"
          className="model-selector-button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          {...(isOpen ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
          aria-label="Select model"
        >
          <span className="model-name">{currentModel.name}</span>
          <md-icon className="dropdown-icon">
            {isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
          </md-icon>
        </button>

        {isOpen && (
          <div className="model-selector-menu">
            {AVAILABLE_MODELS.map((model) => (
              <button
                type="button"
                key={model.id}
                className={`model-option ${model.id === selectedModel ? 'selected' : ''}`}
                onClick={() => handleModelSelect(model.id)}
              >
                <div className="model-option-content">
                  <div className="model-option-header">
                    <span className="model-option-name md-typescale-body-large">
                      {model.name}
                    </span>
                    <span
                      className={`model-option-category md-typescale-label-small category-${model.category}`}
                    >
                      {model.category}
                    </span>
                  </div>
                  <span className="model-option-description md-typescale-body-small">
                    {model.description}
                  </span>
                </div>
                {model.id === selectedModel && (
                  <md-icon className="check-icon">check</md-icon>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
