# Local Provider Configuration Template

Use the **Settings → Providers** screen to enter a key once into the local encrypted provider vault. The application only reports whether a provider is configured; it does not return the key value to the browser.

For non-interactive local deployments, set these values in the server runtime only. Do not create or commit an environment file in the repository.

| Provider | Server-side variable |
|---|---|
| Gemini | `GEMINI_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Arcee | `ARCEE_API_KEY` |
| Grok | `GROK_API_KEY` |
| SambaNova | `SAMBANOVA_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |

Provider model IDs and endpoints can be configured through the UI when a provider requires an override. Never place an API key in source code, a README, client configuration, an issue, or a Git commit.
