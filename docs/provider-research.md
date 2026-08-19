# Provider Adapter Research Notes

This implementation uses direct provider adapters only from the server-side local runtime. API keys are sent in server requests and are never returned through the browser API, displayed in UI, written to logs, or committed to Git.

| Provider | Verified connection detail | Intended adapter use |
|---|---|---|
| Gemini | Google's OpenAI-compatible API uses the base URL `https://generativelanguage.googleapis.com/v1beta/openai/` with a Gemini API key. | Send OpenAI-style chat-completions requests after local configuration. |
| DeepSeek | The official API reference documents `POST /chat/completions`, JSON requests, a required model identifier, and available `deepseek-v4-flash` / `deepseek-v4-pro` values. | Send chat-completions requests through its direct adapter after local configuration. |

These notes are implementation references only. Actual provider model identifiers and availability should be checked at configuration time because provider APIs evolve.

## Sources

- [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
- [DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
