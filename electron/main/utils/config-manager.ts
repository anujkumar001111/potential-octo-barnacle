  /**
   * Get final model configuration with priority: user config > env > default
   */
  public getModelConfig(provider: ProviderType): ModelConfig | null {
    const userConfigs = this.getUserModelConfigs();

    let apiKey: string;
    let config: ModelConfig | null = null;

    switch (provider) {
      case 'deepseek':
        apiKey = userConfigs.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY || '';
        config = {
          provider: 'deepseek',
          model: userConfigs.deepseek?.model || 'deepseek-chat',
          apiKey,
          baseURL: userConfigs.deepseek?.baseURL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
        };
        break;

      case 'qwen':
        apiKey = userConfigs.qwen?.apiKey || process.env.QWEN_API_KEY || '';
        config = {
          provider: 'openai',
          model: userConfigs.qwen?.model || 'qwen-max',
          apiKey,
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        };
        break;

      case 'google':
        apiKey = userConfigs.google?.apiKey || process.env.GOOGLE_API_KEY || '';
        config = {
          provider: 'google',
          model: userConfigs.google?.model || 'gemini-1.5-flash-latest',
          apiKey
        };
        break;

      case 'anthropic':
        apiKey = userConfigs.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY || '';
        config = {
          provider: 'anthropic',
          model: userConfigs.anthropic?.model || 'claude-3-5-sonnet-latest',
          apiKey
        };
        break;

      case 'openrouter':
        apiKey = userConfigs.openrouter?.apiKey || process.env.OPENROUTER_API_KEY || '';
        config = {
          provider: 'openrouter',
          model: userConfigs.openrouter?.model || 'anthropic/claude-3.5-sonnet',
          apiKey
        };
        break;

      case 'custom':
        apiKey = userConfigs.custom?.apiKey || process.env.CUSTOM_API_KEY || '';
        config = {
          provider: 'openai',
          model: userConfigs.custom?.model || 'gpt-4o',
          apiKey,
          baseURL: userConfigs.custom?.baseURL || process.env.CUSTOM_API_URL || 'http://143.198.174.251:8317'
        };
        break;

      default:
        return null;
    }

    // Store in secure cache and setup zeroization
    if (apiKey) {
      const secureKey = new SecureString(apiKey);
      this.apiKeyCache.set(provider, secureKey);

      // Zeroize after 1 minute
      setTimeout(() => {
        const cachedKey = this.apiKeyCache.get(provider);
        if (cachedKey) {
          cachedKey.zeroize();
          this.apiKeyCache.delete(provider);
        }
      }, 60000);
    }

    return config;
  }