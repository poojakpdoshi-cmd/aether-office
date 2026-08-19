# AetherOffice — Your AI Software Company

AetherOffice is a **local-first AI development workspace**. Its browser interface is opened by a local Node.js server, while the CLI chooses the project directory that the AI company may access. The user remains the Owner: the team discusses a task, produces a plan, and must obtain approval before meaningful workspace changes unless the Owner has explicitly chosen Autonomous Mode.

## What is included

| Capability | Current behavior |
|---|---|
| DeepDiscuss | Runs four real orchestration rounds: analysis, cross-critique, debate, and Manus synthesis. The app does not invent messages when no provider call occurs. |
| Provider settings | Provider keys are accepted by the local backend and encrypted with AES-256-GCM in the user’s local configuration folder. Keys are never returned to the browser, committed to Git, or included in application logs. |
| Owner approvals | A structured **TEAM PROPOSAL** has the required `objective`, `tech stack`, `files to create/modify`, `risks`, and `confidence %` sections, with **Approve**, **Modify Plan**, and **Reject** actions. |
| Workspace tools | The local server scopes reads, writes, edits, moves, deletes, commands, tests, and Git inspection to the selected project folder. Traversal outside that folder is blocked. |
| Audit trail | Every controlled tool action writes `WHO`, `WHAT`, `WHICH FILE`, `WHEN`, and `WHY` to a local protected NDJSON audit file. |
| Git | Status, diffs, history, commits, and guarded reverts are available. The code has no remote-push implementation, and destructive operations require explicit confirmation. |

## Install and start

For development, clone the repository and run:

```bash
pnpm install
pnpm dev
```

The development server selects an available port. For an installed package, build and install it globally:

```bash
pnpm build
npm install -g .
aether
```

To select the current project explicitly, run:

```bash
aether .
```

To open a specific project:

```bash
aether /path/to/project
```

The CLI starts a local server bound to **127.0.0.1**, then opens the default browser where the operating system supports it. Press `Ctrl+C` to stop the server and its child process cleanly.

### Platform notes

| Platform | CLI behavior | Workspace path example |
|---|---|---|
| Windows | The launcher uses `cmd /c start` to open the default browser. Use a normal absolute path when selecting a project. | `aether C:\Users\Owner\projects\my-app` |
| macOS | The launcher uses the system `open` command to open the default browser. | `aether /Users/owner/projects/my-app` |
| Linux | The launcher uses `xdg-open` where it is available. If a desktop opener is unavailable, the terminal still prints the local URL. | `aether /home/owner/projects/my-app` |

The browser UI is served locally; it is not exposed to other devices unless a future configuration explicitly changes the local-only binding.

## Configure providers safely

Open **Settings → Providers** in AetherOffice. Paste a provider key into the local setup form; it is sent to the local backend only, stored encrypted at rest, then cleared from the browser form. Local installations may alternatively provide server-side variables such as `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `ARCEE_API_KEY`, `GROK_API_KEY`, `SAMBANOVA_API_KEY`, or `OPENROUTER_API_KEY` through their secure runtime configuration. See the safe [local configuration template](docs/local-config.template.md) for variable names only. Never paste a secret into a public issue, commit it to Git, or place it in client-side JavaScript.

External adapters use OpenAI-style chat-completions semantics where available. Each provider also accepts an optional model ID and endpoint override for a local installation. The built-in Manus provider coordinates synthesis using the server-side model helper.

## Security model

> AetherOffice never grants an AI employee unrestricted access to the entire computer. The Owner must select a workspace, and the controlled-tool layer resolves every path within that workspace before it touches the filesystem.

The default **Safe Mode** requires an approved proposal and a per-change owner confirmation. **Team Mode** permits scoped work after plan approval. **Autonomous Mode** is opt-in and remains limited to the selected workspace and allowed command policy. Allowed commands do not run through a shell, block shell-control characters, and have time and output limits.

## Architecture

```text
CLI → local Node server → browser workspace UI
                         ↓
                  DeepDiscuss orchestrator
                         ↓
            provider adapters / Manus synthesis
                         ↓
          controlled tools → selected project workspace
                         ↓
              audit trail, tests, Git safeguards
```

## Validate the project

```bash
pnpm check
pnpm test
pnpm build
node bin/aether.mjs --help
```

## Important limitations

The project implements the local-first core architecture and secure provider setup. Provider calls require a valid configured provider, and UI/image understanding requires a vision-capable model and its applicable provider configuration. The implementation intentionally does not auto-push to any Git remote.
