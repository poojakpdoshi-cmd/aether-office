# AetherOffice Employee Sandbox Architecture

## Decision

AetherOffice will remain **local-first**. Each employee’s executable workspace will be a real local Docker Desktop or Podman container rather than a host child process, visual mock, or shared workspace. The normal global launch remains `AetherOffice`; its first sandbox use detects a supported local runtime and reports a clear installation requirement when neither runner is available. It never falls back to host execution.

## Current-State Gap

The existing controlled workspace service starts allowlisted processes with `spawn()` in one selected host workspace and associates activity with a display-name `who` field. Its terminal evidence is real but shared-host execution; it is not a sandbox. Current employee inspection, provider routing, and most Aether routes are public procedures. The new design replaces execution only for employee rooms while retaining the existing controlled owner workspace tools during migration.

## Runtime Boundary

| Boundary | Design |
| --- | --- |
| Runtime selection | Detect `docker` first, then `podman`, with non-interactive version and daemon checks. No runner means sandbox state `runtime-unavailable`; no host-process fallback is allowed. |
| Sandbox image | A packaged, versioned local image based on a supported Node runtime. Its entrypoint initializes a named volume, then drops to a fixed non-root `aether` user. |
| Employee filesystem | One named persistent volume per immutable sandbox ID, mounted only at `/workspace`. A separate tmpfs backs `/tmp`; no application workspace or home directory is mounted. |
| Process boundary | One container per employee. Commands use argument arrays passed to the container runtime, never host-shell interpolation. Each tracked command runs only through that employee’s container. |
| Resource boundary | `--network none`, read-only root filesystem, all Linux capabilities dropped, `no-new-privileges`, PID cap, CPU cap, memory cap, and bounded temporary storage. |
| Persistence | Named volumes outlive stop/restart. Explicit destroy removes the container and only removes the employee volume after a separate owner confirmation. |
| Network | Disabled by default. There is no hidden egress fallback. A future explicitly approved per-sandbox allowlist would require a separate design and migration. |

## Local Authorization

The existing globally installed CLI launches a loopback-only local server. It will create a local owner session seed in the encrypted configuration area and exchange its one-time launch nonce for an HttpOnly loopback cookie. Sandbox endpoints will require this local authenticated session even though the server is bound to `127.0.0.1`.

Server-side policy will distinguish owner, supervisor, and employee principals. The initial local CLI owner is the only administrator. Employees can read and execute only against their own room and sandbox. Supervisors can inspect explicitly granted employee snapshots and events but cannot execute commands or terminate processes. Owner-only lifecycle and destructive actions require an additional confirmation flag. Client-side hiding is never treated as permission enforcement.

## Data and Event Contracts

The existing restart-persistent runtime state will gain stable IDs for employee rooms, sandbox records, persistent volume names, lifecycle status, and bounded process records. Activity records will distinguish sandbox lifecycle, terminal connection, command start/finish, process start/stop, and file events. They will record safe metadata and redacted bounded output, not secrets or fabricated work.

Every event carries employee and sandbox ownership. Monitoring queries apply authorization before loading activity or terminal evidence, and the UI loads detailed room/sandbox data only after a room opens.

## UI Migration

The owner-selected office map remains the primary launch surface. Below it, a continuous Employee Rooms section lists only active configured employees. Opening a room shows the employee identity, genuine current task/activity, persistent workspace browser, real sandbox status, process list, and a live terminal backed by that employee’s container. The old compact inspection panel becomes a summary/entry point rather than a substitute fake terminal.

## Provider Cleanup

The approved provider cleanup occurs after the sandbox contracts exist so provider changes do not obscure runtime migration. It includes provider IDs, seeded profiles, provisioner labels, adapters, vault/config references, router enums, DeepDiscuss selection and fallback logic, office slots, UI labels, README/setup prompts, and test fixtures. Other approved providers are not substituted or renamed.

## Migration and Validation Order

1. Add runtime detection and a packaged non-root sandbox image.
2. Add persistent sandbox registry and server-side authorization contracts.
3. Implement lifecycle, real command execution, process control, and bounded event streaming.
4. Add employee rooms and lazy monitored details.
5. Complete the approved provider cleanup comprehensively.
6. Test cross-employee access denial, cross-sandbox command denial, process termination boundaries, runtime-unavailable behavior, persistence across restart, no-network configuration, no-host fallback, and global CLI startup.

## Non-Goals for the First Sandbox Release

The first release does not claim multi-host orchestration, arbitrary internet access, container escape prevention beyond the configured local-runtime security boundary, or background execution after AetherOffice itself exits. It also does not silently build a substitute host terminal when Docker Desktop or Podman is absent.
