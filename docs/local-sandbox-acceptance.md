# Local Employee Sandbox Acceptance

This checklist verifies the real local container boundary after installing Docker Desktop or Podman. It is an Owner or maintainer acceptance procedure, not part of normal end-user launch instructions.

## Preconditions

The container runtime must be installed and running. Launch the published AetherOffice package normally, then enter an employee room through the office and use the owner-authorized sandbox controls.

## Required evidence

| Check | Expected outcome |
|---|---|
| Runtime detection | `AetherOffice doctor` identifies Docker or Podman as available. |
| Start | Starting an employee sandbox builds `aetheroffice/employee-sandbox:1.0.0` when needed and runs a per-employee container. |
| Isolation | Each employee has a distinct `aetheroffice-employee-*` container and `aetheroffice-workspace-*` volume. |
| Hardening | The container uses a non-root user, read-only root filesystem, no network, dropped capabilities, no-new-privileges, CPU/memory/PID limits, and writable `/tmp` plus the employee workspace volume. |
| Persistence | A file created through one employee terminal remains after that employee sandbox is stopped and restarted. |
| Cross-employee separation | A second employee cannot see the first employee workspace file through their own `/workspace`. |
| Network boundary | A command attempting outbound network access fails because the container uses `--network none`. |
| Termination | Stopping an active process ends the container-backed command and records a cancelled process state. |
| Destroy | The explicit owner-confirmed destroy action removes only the selected employee container and persistent volume. |

The acceptance result must use real container inspection and real terminal output. No visual status alone counts as evidence.
