# Live Employee Workspace and Project Browser Architecture

## Scope and integrity rule

The requested experience is feasible as an **event-driven local development workspace**. AetherOffice must show only events originating from controlled workspace operations, selected-project files, bounded commands, browser evidence, and approved meeting state. It must never fabricate terminal lines, browser actions, completion percentages, or hidden chain-of-thought.

## Existing local-first foundations

| Existing component | Reused role |
|---|---|
| `server/aether/state.ts` | Restart-persistent meeting state, employee states, approvals, and safe activity summaries. |
| `server/aether/workspace.ts` | Selected workspace boundary, bounded commands, execution output, controlled file operations, and append-only local audit events. |
| `server/aether/providers.ts` / encrypted vault | Local provider configuration with secrets kept out of browser payloads and audit records. |
| `client/src/components/LiveOffice.tsx` | Physical employee, laptop, desk, Discussion Room, Manager, and Test Lab navigation. |
| `client/src/pages/Home.tsx` | Existing workspace, diff, tests, camera, and verified activity surfaces. |

## Implementation milestones

The first milestone will add an employee inspection panel backed by existing audit events and execution state. It will expose safe task summaries, active controlled command output, touched file paths, recorded activity, and existing diff/test evidence. It will not claim a per-agent shell unless a real isolated process was created for that agent.

The second milestone will add a local project preview record with a guarded loopback URL, discovered development-server port, reload state, captured console/network evidence, and screenshot metadata. The browser panel will be a project preview interface; a full browser engine is not reimplemented in the client.

The proof workflow will assemble real build/test command results, selected workspace diffs, browser evidence, and captured screenshots into a local report. Failures can produce a safe handoff record for a configured Tester/Debugger workflow, but no AI changes run automatically without the existing approval controls.

Competition mode requires a later dedicated environment manager. Each team must receive a different workspace root, execution registry, audit/evidence root, and loopback port. It is intentionally not enabled before those boundaries are implemented and tested; sharing the current single workspace would violate the requested isolation requirement.

## Explicit boundaries

The local npm application can support a single owner-selected local workspace, bounded project commands, and loopback previews. Durable multi-team browser automation or concurrent sandboxes require a separate isolated-runner layer rather than reusing a shared process or filesystem. Secrets, raw provider requests, hidden reasoning, and unrestricted host-machine access remain out of scope for every view.

## Competition-team isolation design

Competition mode is a **future environment-manager feature**, not a flag on the current single-workspace controller. A team receives one immutable team identifier and an `IsolatedTeamRuntime` record containing only its own canonical workspace root, execution registry, browser profile directory, evidence directory, reserved loopback port, and append-only audit stream. The manager must reject any path, process ID, browser context, report, or evidence reference whose team identifier does not match the requesting team.

| Boundary | Required isolation rule | Verification criterion |
|---|---|---|
| Workspace | Each team starts from its own cloned or copied workspace root; no team root may be a parent or child of another team root. | Canonical-path tests reject traversal, symlink escape, and cross-team file access. |
| Commands and processes | Each team owns a separate bounded execution registry and process group. Cancellation, retry, and timeout operations resolve only within that registry. | A process ID issued to Team A cannot be queried or cancelled by Team B. |
| Browser | Each team receives an independent Chromium context and user-data directory, plus a separately allocated loopback port. | Cookies, storage, screenshots, console records, and network logs cannot cross team identifiers. |
| Evidence and reports | Audit logs, screenshots, browser artifacts, and proof reports live under a team-hashed local evidence root. | Report retrieval rejects unknown or foreign evidence identifiers. |
| Git | Each team operates on its own local clone and branch state. Remote push remains unavailable. | A team diff, commit, or revert cannot affect another team’s clone. |
| Providers and secrets | Provider credentials remain in the owner vault and are injected only at request time; they are never copied into a team directory, browser profile, audit log, or proof report. | Secret-scanning regression tests find no credential material in all team artifacts. |

The environment manager should create a team runtime atomically, reserve its loopback port before launch, and persist a minimal ownership map with restrictive permissions. Cleanup must terminate only the team’s process group, remove only the team’s browser/evidence roots, and append a final owner-visible audit event. It must never recursively remove a shared parent directory.

Before competition mode is enabled, acceptance tests must demonstrate simultaneous teams with different workspace files, independent command cancellation, independent browser cookies and screenshots, distinct proof reports, cross-team access denial, and complete cleanup isolation. Until those tests exist, the current product remains intentionally single-workspace and cannot represent shared-state execution as isolated competition mode.
