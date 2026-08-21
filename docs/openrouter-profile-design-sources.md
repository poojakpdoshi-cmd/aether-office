# OpenRouter Profile Design Sources

The shared-key employee-profile design uses **one encrypted OpenRouter credential** for multiple local employee profiles. Each profile stores only a model identifier; it never stores or exposes an additional key. The default free-router identifier is `openrouter/free`, which selects an available free model compatible with a request's requirements. Specific free variants may also be selected using a `:free` suffix.

Free availability is not guaranteed. OpenRouter documents that available free models can change, free models can have lower rate limits and higher peak-time latency, and request responses identify the model actually used. The user interface therefore describes availability as request-time checked rather than guaranteed.

OpenRouter's current limits documentation states that free variants are subject to a 20-request-per-minute limit; daily caps depend on account credit history. Adding API keys does not increase platform rate capacity, so the product deliberately provisions profiles from the **same one owner key** without representing them as unlimited independent workers.

| Source | Relevance |
|---|---|
| [Free Models Router](https://openrouter.ai/docs/guides/routing/routers/free-router) | `openrouter/free`, specific `:free` variants, response model tracking, and availability limitations. |
| [Models API](https://openrouter.ai/docs/guides/overview/models) | Model metadata, pricing fields, and capability metadata available through the OpenRouter model catalog. |
| [API Limits](https://openrouter.ai/docs/api_reference/limits) | Free model rate limits, credit limits, and documented 429/402 behavior. |
| [API Authentication](https://openrouter.ai/docs/api_reference/authentication) | Bearer-key use and key protection guidance. |
