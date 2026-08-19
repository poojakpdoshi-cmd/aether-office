# Development-Only Local Provider Environment Reference

The published `AetherOffice` npm CLI uses its first-run terminal setup wizard and encrypted local provider vault. This document is only for contributors who intentionally run the application from a source checkout and need server-side environment configuration during development.

> Do not commit a local `.env.local` file. Do not place provider keys in browser code, issue comments, test fixtures, or chat messages.

| Environment variable | Actual provider route | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Gemini | Direct route with the built-in Gemini default endpoint/model. |
| `MISTRAL_API_KEY` | Mistral | Direct Mistral route; Devstral may inherit this key only when encrypted Devstral-specific configuration is absent and its acknowledgement requirement is satisfied. |
| `DEEPSEEK_API_KEY` | DeepSeek | Direct route. |
| `ARCEE_API_KEY` | Arcee | Requires an endpoint and model override because no default endpoint/model is set. |
| `GROK_API_KEY` | Grok | Direct xAI route. |
| `SAMBANOVA_API_KEY` | SambaNova | Direct route. |
| `OPENROUTER_API_KEY` | OpenRouter / North Mini Code | North Mini Code uses OpenRouter’s fixed route and can inherit this key. |
| `DEVSTRAL_API_KEY` | Devstral Small 2 | Uses the Mistral-compatible endpoint; the retired-model acknowledgement still applies. |
| `NVIDIA_API_KEY` | Nemotron 3 Ultra | Uses the NVIDIA API Catalog endpoint and fixed model route. |

The platform-bound Manus adapter is not configured through a normal end-user environment variable. It uses platform-provided service credentials in the managed development environment and is not a substitute for an end user’s external provider setup.
