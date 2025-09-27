import React from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown } from 'lucide-react';
import './ModelSelector.css';

const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel, availableModels } = useApp();

  const currentModel = availableModels.find(model => model.id === selectedModel);

  return (
    <div className="model-selector">
      <label htmlFor="model-select" className="model-label">
        AI Model:
      </label>
      <div className="model-dropdown">
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="model-select"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
        <ChevronDown className="dropdown-icon" size={16} />
      </div>
      {currentModel && (
        <div className="model-info">
          <span className="model-provider">{currentModel.provider}</span>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
