import React, { useState, useEffect } from 'react';
import { Select, Button, Input, App } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import type { UserModelConfigs } from '@/type';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

// Provider options
const PROVIDERS = [
  { value: 'deepseek', label: 'Deepseek', getKeyUrl: 'https://platform.deepseek.com/api_keys' },
  { value: 'qwen', label: 'Qwen (Alibaba)', getKeyUrl: 'https://bailian.console.aliyun.com/' },
  { value: 'google', label: 'Google Gemini', getKeyUrl: 'https://aistudio.google.com/app/apikey' },
  { value: 'anthropic', label: 'Anthropic', getKeyUrl: 'https://console.anthropic.com/settings/keys' },
  { value: 'openrouter', label: 'OpenRouter', getKeyUrl: 'https://openrouter.ai/keys' },
  { value: 'custom', label: 'Custom API', getKeyUrl: '#' },
];

// Model options for each provider
const MODELS: Record<string, string[]> = {
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  google: [
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro-002',
    'gemini-exp-1206',
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'deepseek/deepseek-coder',
    'google/gemini-flash-1.5',
    'google/gemini-pro-1.5',
    'x-ai/grok-beta',
    'mistralai/mistral-nemo',
    'qwen/qwen-110b-chat',
    'cohere/command',
  ],
  anthropic: [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-latest',
    'claude-3-5-sonnet-20240620',
    'claude-3-5-haiku-latest',
    'claude-3-opus-latest',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
  qwen: [
    'qwen-max',
    'qwen-plus',
    'qwen-vl-max',
  ],
  custom: [
    // Google models
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    // OpenAI models
    'gpt-5',
    'gpt-5-codex',
    'gpt-5-low',
    'gpt-5-medium',
    'gpt-5-high',
    // iFlow models
    'qwen3-coder-plus',
    'qwen3-max',
    'deepseek-v3.2',
    'deepseek-r1',
    'kimi-k2',
    'custom-model',
  ],
};

type ProviderType = 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter' | 'custom';

export const ModelConfigBar: React.FC = () => {
  const { t } = useTranslation('modelConfig');
  const message = App.useApp().message;

  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('deepseek');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-chat');
  const [apiKeySource, setApiKeySource] = useState<'user' | 'env' | 'none'>('none');
  const [configs, setConfigs] = useState<UserModelConfigs>({});
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Custom provider specific states
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const [tempBaseUrl, setTempBaseUrl] = useState('');
  const [isEditingCustomModel, setIsEditingCustomModel] = useState(false);
  const [tempCustomModel, setTempCustomModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // Environment variables (loaded from main process)
  const [envApiKey, setEnvApiKey] = useState('');
  const [envBaseURL, setEnvBaseURL] = useState('');

  // Load initial configurations
  useEffect(() => {
    loadConfigs();
    loadEnvVars();
  }, []);

  // Load environment variables from main process
  const loadEnvVars = async () => {
    try {
      const apiKey = await window.api.config.getEnvVar('CUSTOM_API_KEY');
      const baseURL = await window.api.config.getEnvVar('CUSTOM_API_URL');
      setEnvApiKey(apiKey);
      setEnvBaseURL(baseURL);
    } catch (error) {
      console.error('Failed to load environment variables:', error);
    }
  };

  // Update model when provider changes
  useEffect(() => {
    const models = MODELS[selectedProvider];
    if (models && models.length > 0) {
      const currentModel = configs[selectedProvider]?.model || models[0];
      setSelectedModel(currentModel);
    }
  }, [selectedProvider, configs]);

  // Fetch available models when Custom provider is selected or env vars are loaded
  useEffect(() => {
    if (selectedProvider === 'custom' && (envApiKey || envBaseURL)) {
      fetchAvailableModels();
    }
  }, [selectedProvider, configs.custom?.baseURL, configs.custom?.apiKey, envApiKey, envBaseURL]);

  const fetchAvailableModels = async () => {
    const baseURL = configs.custom?.baseURL || envBaseURL || 'http://143.198.174.251:8317';
    const apiKey = configs.custom?.apiKey || envApiKey || '';

    if (!baseURL) {
      console.warn('No base URL configured for custom provider');
      return;
    }

    setIsFetchingModels(true);
    try {
      console.log(`Fetching models from: ${baseURL}`);

      // Use Next.js API endpoint as a proxy to avoid CORS issues
      const response = await fetch('/api/config/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseURL,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // OpenAI-compatible format: { data: [{ id: "model-name" }, ...] }
      if (data.data && Array.isArray(data.data)) {
        const modelIds = data.data.map((model: any) => model.id);
        setAvailableModels(modelIds);
        console.log(`Fetched ${modelIds.length} models:`, modelIds);
        message.success(`Loaded ${modelIds.length} models from API`);
      } else if (data.error) {
        console.warn(`API error: ${data.error}`);
        message.warning(`Could not fetch models: ${data.error}`);
        setAvailableModels([]);
      } else {
        console.warn('Unexpected response format from /v1/models endpoint');
        setAvailableModels([]);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      message.warning(`Could not fetch models from API. Using preset list.`);
      setAvailableModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const userConfigs = await window.api.config.getUserModelConfigs();
      const provider = await window.api.config.getSelectedProvider();
      const source = await window.api.config.getApiKeySource(provider);

      setConfigs(userConfigs);
      setSelectedProvider(provider);
      setApiKeySource(source);
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  };

  const handleProviderChange = async (value: ProviderType) => {
    try {
      setSelectedProvider(value);
      await window.api.config.setSelectedProvider(value);
      const source = await window.api.config.getApiKeySource(value);
      setApiKeySource(source);
    } catch (error) {
      console.error('Failed to change provider:', error);
      message.error(t('provider_change_failed'));
    }
  };

  const handleModelChange = async (value: string) => {
    try {
      setSelectedModel(value);
      const updatedConfigs = {
        ...configs,
        [selectedProvider]: {
          ...configs[selectedProvider],
          model: value,
        },
      };
      await window.api.config.saveUserModelConfigs(updatedConfigs);
      setConfigs(updatedConfigs);
      message.success(t('model_updated'));
    } catch (error) {
      console.error('Failed to update model:', error);
      message.error(t('model_update_failed'));
    }
  };

  const handleEditApiKey = () => {
    setIsEditingApiKey(true);
    setTempApiKey(configs[selectedProvider]?.apiKey || '');
  };

  const handleCancelEdit = () => {
    setIsEditingApiKey(false);
    setTempApiKey('');
  };

  const handleSaveApiKey = async () => {
    // Validate API Key is not empty
    if (!tempApiKey || tempApiKey.trim() === '') {
      message.warning(t('api_key_empty_warning'));
      return;
    }

    try {
      const updatedConfigs = {
        ...configs,
        [selectedProvider]: {
          ...configs[selectedProvider],
          apiKey: tempApiKey.trim(),
        },
      };
      await window.api.config.saveUserModelConfigs(updatedConfigs);
      setConfigs(updatedConfigs);
      setIsEditingApiKey(false);
      setApiKeySource('user');
      message.success(t('api_key_saved'));
    } catch (error) {
      console.error('Failed to save API key:', error);
      message.error(t('api_key_save_failed'));
    }
  };

  // Custom provider handlers
  const handleEditBaseUrl = () => {
    setIsEditingBaseUrl(true);
    setTempBaseUrl(configs.custom?.baseURL || '');
  };

  const handleCancelBaseUrlEdit = () => {
    setIsEditingBaseUrl(false);
    setTempBaseUrl('');
  };

  const handleSaveBaseUrl = async () => {
    if (!tempBaseUrl || tempBaseUrl.trim() === '') {
      message.warning('Base URL cannot be empty');
      return;
    }

    try {
      const updatedConfigs = {
        ...configs,
        custom: {
          ...configs.custom,
          baseURL: tempBaseUrl.trim(),
        },
      };
      await window.api.config.saveUserModelConfigs(updatedConfigs);
      setConfigs(updatedConfigs);
      setIsEditingBaseUrl(false);
      message.success('Base URL saved successfully');
    } catch (error) {
      console.error('Failed to save base URL:', error);
      message.error('Failed to save base URL');
    }
  };

  const handleEditCustomModel = () => {
    setIsEditingCustomModel(true);
    setTempCustomModel(configs.custom?.model || selectedModel);
  };

  const handleCancelCustomModelEdit = () => {
    setIsEditingCustomModel(false);
    setTempCustomModel('');
  };

  const handleSaveCustomModel = async () => {
    if (!tempCustomModel || tempCustomModel.trim() === '') {
      message.warning('Model ID cannot be empty');
      return;
    }

    try {
      const modelValue = tempCustomModel.trim();
      setSelectedModel(modelValue);
      const updatedConfigs = {
        ...configs,
        custom: {
          ...configs.custom,
          model: modelValue,
        },
      };
      await window.api.config.saveUserModelConfigs(updatedConfigs);
      setConfigs(updatedConfigs);
      setIsEditingCustomModel(false);
      message.success('Model ID saved successfully');
    } catch (error) {
      console.error('Failed to save custom model:', error);
      message.error('Failed to save model ID');
    }
  };

  const currentProvider = PROVIDERS.find(p => p.value === selectedProvider);

  return (
    <div className="w-full px-4 pt-3 pb-3" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      {/* Provider and Model Selection */}
      <div className="flex gap-3 mb-3">
        <Select
          value={selectedProvider}
          onChange={handleProviderChange}
          className="flex-1 custom-select"
          size="middle"
          style={{ minWidth: '160px' }}
          styles={{
            popup: {
              root: {
                background: 'rgba(8, 12, 16, 0.96)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(145, 75, 241, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(145, 75, 241, 0.2)',
              }
            }
          }}
        >
          {PROVIDERS.map(p => (
            <Option key={p.value} value={p.value}>{p.label}</Option>
          ))}
        </Select>

        {selectedProvider === 'custom' ? (
          <div className="flex-1 flex items-center gap-2">
            <Select
              value={selectedModel}
              onChange={handleModelChange}
              className="flex-1 custom-select"
              size="middle"
              style={{ minWidth: '200px' }}
              loading={isFetchingModels}
              styles={{
                popup: {
                  root: {
                    background: 'rgba(8, 12, 16, 0.96)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(145, 75, 241, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(145, 75, 241, 0.2)',
                  }
                }
              }}
              notFoundContent={isFetchingModels ? 'Fetching models...' : 'No models available'}
            >
              {(availableModels.length > 0 ? availableModels : MODELS[selectedProvider])?.map(model => (
                <Option key={model} value={model}>{model}</Option>
              ))}
            </Select>
            <Button
              icon={<ReloadOutlined spin={isFetchingModels} />}
              onClick={fetchAvailableModels}
              size="small"
              type="text"
              className="text-gray-300 hover:text-white"
              title="Refresh model list from API"
              disabled={isFetchingModels}
            />
            <Button
              icon={<EditOutlined />}
              onClick={handleEditCustomModel}
              size="small"
              type="text"
              className="text-gray-300 hover:text-white whitespace-nowrap"
              title="Enter custom model ID"
            >
              Custom
            </Button>
          </div>
        ) : (
          <Select
            value={selectedModel}
            onChange={handleModelChange}
            className="flex-1 custom-select"
            size="middle"
            style={{ minWidth: '200px' }}
            styles={{
              popup: {
                root: {
                  background: 'rgba(8, 12, 16, 0.96)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(145, 75, 241, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(145, 75, 241, 0.2)',
                }
              }
            }}
          >
            {MODELS[selectedProvider]?.map(model => (
              <Option key={model} value={model}>{model}</Option>
            ))}
          </Select>
        )}
      </div>

      {/* Custom Model Input - Only for Custom Provider */}
      {selectedProvider === 'custom' && isEditingCustomModel && (
        <div className="flex items-center gap-2 mt-3 text-sm">
          <span className="text-gray-400 whitespace-nowrap">Custom Model ID:</span>
          <Input
            value={tempCustomModel}
            onChange={(e) => setTempCustomModel(e.target.value)}
            placeholder="Enter model ID (e.g., llama-3-70b, mistral-large)"
            className="flex-1 max-w-sm"
            size="small"
            onPressEnter={handleSaveCustomModel}
            autoFocus
          />
          <CheckOutlined
            onClick={handleSaveCustomModel}
            className="!text-green-400 hover:!text-green-300 cursor-pointer text-xs"
          />
          <CloseOutlined
            onClick={handleCancelCustomModelEdit}
            className="!text-red-400 hover:!text-red-300 cursor-pointer text-xs"
          />
        </div>
      )}

      {/* API Key Section */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-gray-400 whitespace-nowrap">
            {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key:
          </span>

          {apiKeySource === 'env' && !isEditingApiKey && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckOutlined />
              {t('api_key_env')}
            </span>
          )}

          {apiKeySource === 'user' && !isEditingApiKey && (
            <span className="flex items-center gap-1 text-blue-400">
              <CheckOutlined />
              {t('api_key_user')}
            </span>
          )}

          {apiKeySource === 'none' && !isEditingApiKey && (
            <span className="text-yellow-400">{t('api_key_not_configured')}</span>
          )}

          {isEditingApiKey && (
            <Input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder={t('api_key_placeholder')}
              className="flex-1 max-w-sm"
              size="small"
              onPressEnter={handleSaveApiKey}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditingApiKey ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={handleEditApiKey}
                size="small"
                type="text"
                className="text-gray-300 hover:text-white"
              >
                {t('edit_api_key')}
              </Button>
              <a
                href={currentProvider?.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 whitespace-nowrap"
              >
                <LinkOutlined />
                {t('get_api_key')}
              </a>
            </>
          ) : (
            <>
              <CheckOutlined
                onClick={handleSaveApiKey}
                className="!text-green-400 hover:!text-green-300 cursor-pointer text-xs"
              />
              <CloseOutlined
                onClick={handleCancelEdit}
                className="!text-red-400 hover:!text-red-300 cursor-pointer text-xs"
              />
            </>
          )}
        </div>
      </div>

      {/* Base URL Section - Only for Custom Provider */}
      {selectedProvider === 'custom' && (
        <div className="flex items-center justify-between text-sm mt-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-gray-400 whitespace-nowrap">
              Base URL:
            </span>

            {!isEditingBaseUrl && (
              <span className="text-gray-300 truncate">
                {configs.custom?.baseURL || envBaseURL || 'http://143.198.174.251:8317'}
              </span>
            )}

            {isEditingBaseUrl && (
              <Input
                value={tempBaseUrl}
                onChange={(e) => setTempBaseUrl(e.target.value)}
                placeholder="Enter base URL (e.g., http://localhost:8317)"
                className="flex-1 max-w-sm"
                size="small"
                onPressEnter={handleSaveBaseUrl}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEditingBaseUrl ? (
              <Button
                icon={<EditOutlined />}
                onClick={handleEditBaseUrl}
                size="small"
                type="text"
                className="text-gray-300 hover:text-white"
              >
                Edit URL
              </Button>
            ) : (
              <>
                <CheckOutlined
                  onClick={handleSaveBaseUrl}
                  className="!text-green-400 hover:!text-green-300 cursor-pointer text-xs"
                />
                <CloseOutlined
                  onClick={handleCancelBaseUrlEdit}
                  className="!text-red-400 hover:!text-red-300 cursor-pointer text-xs"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
