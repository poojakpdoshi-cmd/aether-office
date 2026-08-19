# AetherOffice npm Release Guide

## Purpose

This guide describes the **Owner-controlled** path for publishing the AetherOffice CLI. It does not authorize automated publishing, long-lived repository tokens, or sending npm credentials through chat.

The intended public package name is **`@aetheroffice/cli`**, which installs the `AetherOffice` command. npm is the cross-platform installer: it installs the compiled runtime, its dependencies, and the executable without asking end users to clone the repository.

## One-time npm account preparation

| Requirement | Owner action |
|---|---|
| npm account | Create or use an npm account at [npmjs.com](https://www.npmjs.com/). |
| Account protection | Enable two-factor authentication and keep recovery codes secure. |
| Package scope | Create or obtain ownership of the `@aetheroffice` npm organization/scope. |
| Publish permission | Give the release account sufficient organization permission to publish `@aetheroffice/cli`. |
| Local login | Run `npm login` in your own terminal and complete npm’s authentication flow. |

> Do not provide an npm password, one-time code, access token, or browser session in a message, project secret, source file, or Git commit.

## Preflight

Run the following from a clean working tree. The project must pass its complete validation suite before any release is considered.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
npm pack --dry-run
```

Inspect the `npm pack --dry-run` manifest. The publishable package must include the compiled `dist/` output, `bin/`, `README.md`, `LICENSE`, and package metadata. It must not include `.env` files, provider vaults, runtime state, audit data, test fixtures with credentials, development caches, or local uploads.

Check name and scope ownership from the authenticated Owner terminal:

```bash
npm view @aetheroffice/cli name version
```

If npm reports the name/scope is unavailable, do not impersonate another organization. Use the fallback Owner-controlled scope `@poojakpdoshi-cmd/aether-office`, update the package name and documentation as one reviewed change, rerun the entire verification suite, and then publish under that scope.

## Isolated installation proof

Before publishing, prove the packed artifact works without the repository checkout:

```bash
TARBALL=$(npm pack --silent)
PREFIX=$(mktemp -d)
npm install --global --prefix "$PREFIX" "./$TARBALL"
"$PREFIX/bin/AetherOffice" --version
"$PREFIX/bin/AetherOffice" --help
```

Run the `doctor`, first-run setup, selected-workspace startup, restart, port-conflict, update, and uninstall scenarios described in the release test checklist. Use temporary configuration homes and test credentials only; never use real production API keys in automated test output.

## Publish

Publishing is an external public action. Complete it only after the Owner reviews the tarball contents, exact version, package scope, changelog, and public access mode.

```bash
npm publish --access public
```

Verify the published package from a separate clean npm prefix:

```bash
npm install --global --prefix "$PREFIX" @aetheroffice/cli
"$PREFIX/bin/AetherOffice" --version
```

## Versioning, update, and unpublish policy

Use semantic versioning: patch for backward-compatible fixes, minor for backward-compatible functionality, and major for breaking CLI/configuration changes. End users update with:

```bash
npm update --global @aetheroffice/cli
```

Do not use unpublish as a routine rollback mechanism. Publish a corrected newer version or deprecate a problematic version with a clear user message after assessing the impact. The local provider vault is intentionally outside the npm package and remains untouched by updates or uninstallation.

## Release test checklist

| Scenario | Expected result |
|---|---|
| Fresh global install | The global executable works without the Git checkout. |
| `--help` and `--version` | Output is concise and no secrets are accessed. |
| First run with no setup | Interactive configuration is required before normal startup. |
| Selected-provider setup | Only the chosen provider secret is requested, masked in supported terminals, and encrypted locally. |
| Devstral setup | Explicit retired-model acknowledgement is required. |
| Missing/invalid provider | The user receives a redacted recovery message. |
| Port occupied | Local startup chooses a next available loopback port. |
| Restart | Existing encrypted configuration is reused without re-prompting. |
| Update | `npm update --global` retains local configuration. |
| Uninstall | The executable/package is removed while local credentials remain until the Owner explicitly removes them. |
