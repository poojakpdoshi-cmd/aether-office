# AetherOffice

**AetherOffice** is a local-first AI software company workspace. It starts a browser interface on your own computer, scopes all controlled tools to the workspace you choose, and keeps provider credentials in a local encrypted vault. The default interaction is the text-free animated office map; DeepDiscuss, proposals, controlled tools, audit history, tests, and guarded Git actions remain available through direct in-office interactions.

> AetherOffice does **not** automatically push to a Git remote. It does **not** place API keys in the browser, source code, Git history, or application logs.

## Install

The planned public distribution target is `@aetheroffice/cli`. The Owner must first create or obtain the `@aetheroffice` npm organization and publish the package; until then, install it from a packed release artifact during verification.

```bash
npm install --global @aetheroffice/cli
```

The package requires **Node.js 22 or newer** and npm. It supports Windows, macOS, and Linux desktop environments. npm installs the global `aetheroffice` executable; no Git clone, source editing, project-local dependency installation, `.env` file, or manually set environment variable is required for end users.

## Run

Run AetherOffice inside the directory you want it to access:

```bash
cd /path/to/your/project
aetheroffice
```

You may also provide a workspace path directly:

```bash
aetheroffice /absolute/path/to/your/project
```

The CLI starts the local backend and local web interface on `127.0.0.1`, chooses an available local port when the preferred port is occupied, opens the default browser where possible, and prints the URL when it cannot open a browser. Press `Ctrl+C` in the terminal to stop AetherOffice cleanly.

## First run

When no usable external provider is configured, `aetheroffice` begins an interactive terminal setup wizard before it starts the workspace. It walks through each supported configurable provider **one at a time** in a fixed order—without a provider-selection screen. Every credential is masked, never printed, and written only to the existing encrypted local vault. You can explicitly skip any provider. After the sequence, at least one usable provider is required; if none were configured, the wizard retries. Once one or more providers are ready, AetherOffice automatically starts the selected local workspace and opens localhost.

| Provider route | Credential requested by setup | Important behavior |
|---|---|---|
| Google Gemini | Gemini API key | General AI reasoning and assistance. |
| Mistral | Mistral API key | Software planning and implementation. |
| DeepSeek | DeepSeek API key | Backend, systems, and debugging work. |
| Arcee AI | Arcee API key | Also asks for an endpoint and model because they are necessary for this configurable route. |
| Grok | Grok API key | Research and comparative analysis. |
| SambaNova | SambaNova API key | Fast analysis and synthesis. |
| OpenRouter / North Mini Code | OpenRouter API key | Gateway access for North Mini Code and compatible models. |
| Devstral Small 2 | Devstral API key | Explicitly retired-gated; it warns and requires acknowledgement before configuration. |
| Nemotron 3 Ultra | NVIDIA API key | Reasoning and systems work through NVIDIA API Catalog. |

Enter credentials only in the interactive wizard or through the physical **Provider Locker** inside the locally running Manager Cabin. Never paste an API key into a GitHub issue, source file, commit, browser console, or chat message.

The automatic first-run flow does not run optional provider connection checks, so completing setup does not make an extra provider request. You can use the Provider Locker later if you want to adjust a configured provider; provider keys are never printed by the CLI.

## CLI reference

| Command | Purpose |
|---|---|
| `aetheroffice` | **Primary command.** Configure on first run, then open the current directory as the controlled workspace. |
| `aetheroffice <workspace>` | Open a specific existing directory as the controlled workspace. |
| `aetheroffice setup` | Reconfigure encrypted provider credentials without starting the browser interface. |
| `aetheroffice doctor` | Check the Node version, installed bundle, local configuration presence, provider readiness, and preferred loopback port without reading or printing credentials. |
| `aetheroffice --help` | Show safe usage guidance. |
| `aetheroffice --version` | Print the installed package version. |
| `AetherOffice`, `aether` | Compatibility aliases for `aetheroffice`. |

Use npm for package lifecycle operations:

```bash
npm update --global @aetheroffice/cli
npm uninstall --global @aetheroffice/cli
```

There is intentionally no `aetheroffice update` command: software updates should remain visible and user-controlled through npm.

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
| `aetheroffice` is not found | Verify npm’s global binary directory is on your `PATH`, then reopen the terminal. |
| Setup cannot mask input | Run `aetheroffice setup` from a normal interactive terminal, or start AetherOffice and use the physical Provider Locker. Do not use a shared/logged terminal session for credentials. |
| No provider is ready | Run `aetheroffice setup`, safely skip providers you do not use, and enter a key for at least one provider you have an account for. |
| A provider connection check fails | Check your key, billing/account access, selected model, and endpoint; rerun setup. For Devstral, confirm the retired model is still available to your Mistral account. |
| The preferred port is occupied | The server searches the next available local port. Run `AetherOffice doctor` to see the preferred-port result. |
| A workspace is rejected | Supply an existing directory, for example `aetheroffice /absolute/path/to/project`. |
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

### Windows PowerShell

This source repository is pinned to **pnpm** because it uses a pnpm lockfile and a patched dependency. Do **not** run `npm install` in a cloned checkout. With Node.js 22 installed, use Corepack to obtain the pinned pnpm version without globally installing pnpm through npm:

```powershell
cd "$HOME\aether-office"
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The `dev` command is cross-platform and sets development mode internally, so PowerShell does not need `NODE_ENV=...` syntax. When the server starts, open the printed `http://localhost:<port>` URL in your browser. If `corepack` is not found, install the current Node.js 22 LTS release, reopen PowerShell, and repeat the commands above.

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
