# Free and Free-Tier AI Provider Research

## Google Gemini Developer API

Google’s official pricing page states that the Gemini Developer API offers a Free tier with limited access to certain models, free input and output tokens, Google AI Studio access, and content-use terms. The page does not make free access universal across every model; model-specific limits and availability must be checked before selecting a route. Source: https://ai.google.dev/gemini-api/docs/pricing

## Groq

Groq’s official rate-limit documentation was opened for review. Groq exposes rate limits and plan-dependent restrictions through its developer documentation, so a provider adapter should treat limits as runtime constraints rather than promise unlimited free use. Its model catalog and current free-tier availability require model-specific verification before implementation. Source: https://console.groq.com/docs/rate-limits

## Cerebras Inference

Cerebras’ official rate-limit page lists a Free Trial tier for `gpt-oss-120b` and `gemma-4-31b` at 5 RPM, 30K TPM, 1M TPH, and 1M TPD. The public model catalog states that public endpoint models are available on free-trial and pay-as-you-go tiers, subject to rate limits. The model catalog lists `gpt-oss-120b` and `gemma-4-31b`; the former is explicitly described in the provider search result as useful for coding. This is a strong candidate for a provider adapter with visible quota/error handling, not an unlimited-free promise. Sources: https://inference-docs.cerebras.ai/support/rate-limits and https://inference-docs.cerebras.ai/models/overview

## OpenRouter

OpenRouter’s official FAQ confirms that API access uses Bearer-token API keys and an OpenAI-compatible `/completions` and `/chat/completions` interface. It also explains that free-model rate limits are constrained and should not be treated as unlimited production capacity; the exact allowance depends on account credits and current policy. OpenRouter is therefore a low-friction candidate for additional model IDs, but the app must show free-model rate-limit caveats and preserve the existing provider-level model selection rather than silently changing models. Source: https://openrouter.ai/docs/faq
