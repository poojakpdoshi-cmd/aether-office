# Provider Model Routing

This project keeps provider API keys only in the local encrypted vault. Model identifiers are configuration values, not credentials.

| Requested employee | Provider route | Verified model identifier | Status |
| --- | --- | --- | --- |
| North Mini Code | OpenRouter | `cohere/north-mini-code:free` | Supported as an OpenRouter model override. |
| Devstral Small 2 | Mistral | `labs-devstral-small-2512` | Model is listed as retired by Mistral as of 2026-03-31; retain as an explicit override only when an existing compatible account endpoint still serves it. |
| Nemotron 3 Ultra | NVIDIA API Catalog | `nvidia/nemotron-3-ultra-550b-a55b` | Owner selected NVIDIA API Catalog; AetherOffice uses its `https://integrate.api.nvidia.com/v1/chat/completions` endpoint. |

North Mini Code is an agentic coding model from Cohere. NVIDIA describes Nemotron 3 Ultra as a long-context reasoning and agentic workflow model. Mistral's current model documentation marks Devstral Small 2 as retired, so its use must remain opt-in and tested against the configured account.

## Sources

1. [OpenRouter: Cohere North Mini Code](https://openrouter.ai/cohere/north-mini-code:free)
2. [Mistral Models Overview](https://docs.mistral.ai/models)
3. [NVIDIA Nemotron 3 Ultra API Reference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-ultra-550b-a55b)
4. [Cohere North Mini Code Documentation](https://docs.cohere.com/docs/north-mini-code-1.0)
