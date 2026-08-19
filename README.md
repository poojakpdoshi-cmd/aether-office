# AetherOffice

**AetherOffice** is a local-first AI software company workspace. It starts a browser interface on your own computer, scopes all controlled tools to the workspace you choose, and keeps provider credentials in a local encrypted vault. The default interaction is the text-free animated office map; DeepDiscuss, proposals, controlled tools, audit history, tests, and guarded Git actions remain available through direct in-office interactions.

> AetherOffice does **not** automatically push to a Git remote. It does **not** place API keys in the browser, source code, Git history, or application logs.

## Install

The planned public distribution target is `@aetheroffice/cli`. The Owner must first create or obtain the `@aetheroffice` npm organization and publish the package; until then, install it from a packed release artifact during verification.

```bash
npm install --global @aetheroffice/cli
```

The package requires **Node.js 22 or newer** and npm. It supports Windows, macOS, and Linux desktop environments. npm installs the global `AetherOffice` executable; no Git clone, source editing, or project-local dependency installation is required for end users.

## Run

Run AetherOffice inside the directory you want it to access:

```bash
cd /path/to/your/project
AetherOffice
```

You may also provide a workspace path directly:

```bash
AetherOffice /absolute/path/to/your/project
```

The CLI starts the local backend and local web interface on `127.0.0.1`, chooses an available local port when the preferred port is occupied, opens the default browser where possible, and prints the URL when it cannot open a browser. Press `Ctrl+C` in the terminal to stop AetherOffice cleanly.

## First run

When no usable external provider is configured, `AetherOffice` begins an interactive terminal setup wizard before it starts the workspace. The wizard asks you to choose only the provider or providers you intend to use; it does **not** require every provider key.

| Provider route | Credential requested by setup | Important behavior |
|---|---|---|
| Gemini | `GEMINI_API_KEY` | Direct provider route. |
| Mistral | `MISTRAL_API_KEY` | Direct provider route. |
| DeepSeek | `DEEPSEEK_API_KEY` | Direct provider route. |
| Arcee | `ARCEE_API_KEY` | Also requests the actual chat-completions endpoint and model identifier because no default is configured. |
| Grok | `GROK_API_KEY` | Direct xAI route. |
| SambaNova | `SAMBANOVA_API_KEY` | Direct provider route. |
| OpenRouter / North Mini Code | `OPENROUTER_API_KEY` | One OpenRouter key supports its gateway route and the configured North Mini Code route. |
| Devstral Small 2 | `DEVSTRAL_API_KEY` | Requires an explicit acknowledgement because this retired Mistral-compatible model may no longer be served. |
| Nemotron 3 Ultra | `NVIDIA_API_KEY` | Uses the fixed NVIDIA API Catalog endpoint and model route. |

Enter credentials only in the interactive wizard or through the physical **Provider Locker** inside the locally running Manager Cabin. Never paste an API key into a GitHub issue, source file, commit, browser console, or chat message.

The wizard may offer an optional connection check. It is always opt-in because it contacts the selected provider and may use quota. A failed check never prints your key; it offers a safe reconfiguration path instead.

## CLI reference

| Command | Purpose |
|---|---|
| `AetherOffice` | Configure on first run, then open the current directory as the controlled workspace. |
| `AetherOffice <workspace>` | Open a specific existing directory as the controlled workspace. |
| `AetherOffice setup` | Add or replace selected encrypted provider configuration without starting the browser interface. |
| `AetherOffice doctor` | Check the Node version, installed bundle, local configuration presence, provider readiness, and preferred loopback port without reading or printing credentials. |
| `AetherOffice --help` | Show safe usage guidance. |
| `AetherOffice --version` | Print the installed package version. |
| `aether` | Compatibility alias for `AetherOffice`. |

Use npm for package lifecycle operations:

```bash
npm update --global @aetheroffice/cli
npm uninstall --global @aetheroffice/cli
```

There is intentionally no `AetherOffice update` command: software updates should remain visible and user-controlled through npm.

## Local configuration and security

Provider configuration is stored locally under `~/.aether-office/`. The provider vault uses AES-256-GCM encryption, with the encryption key and encrypted payload written as separate local files. On POSIX systems, the configuration directory is restricted to mode `0700` and the vault/key to mode `0600`.

| Local artifact | Purpose | Git behavior |
|---|---|---|
| `~/.aether-office/vault.key` | Local vault encryption key. | Never created in the repository. |
| `~/.aether-office/providers.enc.json` | Encrypted selected provider configuration. | Never created in the repository. |
| `~/.aether-office/runtime-state.json` | Local runtime state. | Never created in the repository. |
| `~/.aether-office/audit/` | Local protected audit records. | Never created in the repository. |

The project you choose at launch is the only workspace exposed to AetherOffice controlled tools. DeepDiscuss in the default **Safe Mode** creates a TEAM PROPOSAL before meaningful workspace changes. You remain responsible for reviewing proposals, diffs, commands, tests, and guarded Git actions.

Uninstalling the npm package removes the executable and installed program files, but deliberately does **not** erase local credentials or audit data. If you want to permanently erase local AetherOffice data, first stop the process and then remove `~/.aether-office/` yourself using an operating-system appropriate secure deletion method.

## Troubleshooting

| Situation | Recommended action |
|---|---|
| `AetherOffice` is not found | Verify npm’s global binary directory is on your `PATH`, then reopen the terminal. |
| Setup cannot mask input | Run `AetherOffice setup` from a normal interactive terminal, or start AetherOffice and use the physical Provider Locker. Do not use a shared/logged terminal session for credentials. |
| No provider is ready | Run `AetherOffice setup`, select an actual provider you have an account for, and enter its key. |
| A provider connection check fails | Check your key, billing/account access, selected model, and endpoint; rerun setup. For Devstral, confirm the retired model is still available to your Mistral account. |
| The preferred port is occupied | The server searches the next available local port. Run `AetherOffice doctor` to see the preferred-port result. |
| A workspace is rejected | Supply an existing directory, for example `AetherOffice /absolute/path/to/project`. |
| A vault is unreadable | Keep a backup of your local configuration directory if needed, then rerun setup to create fresh provider settings. |

## Development

Contributors use the repository workflow rather than the global npm workflow:

```bash
git clone https://github.com/poojakpdoshi-cmd/aether-office.git
cd aether-office
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

To test the production CLI from a local checkout after a build, run:

```bash
node bin/aether-office.mjs --help
node bin/aether-office.mjs doctor
```

## Publishing for the Owner

The `@aetheroffice/cli` scope must be owned by the publishing npm account or an npm organization before this exact public name can be released. Create an npm account, enable two-factor authentication, create or obtain the `@aetheroffice` organization, grant the publisher the required access, and authenticate in your own terminal with `npm login`. Do not send an npm access token in chat or store one in this repository.

After reviewing the release package, publish manually and explicitly:

```bash
pnpm check
pnpm test
pnpm build
npm pack --dry-run
npm publish --access public
```

See [the npm release guide](docs/npm-publishing.md) for the required Owner-controlled preflight and rollback considerations. The project intentionally does not publish itself or perform npm actions that require your account authorization.

## License

MIT. See [LICENSE](LICENSE).
