# AetherOffice Living-Office Feature Plan

## Product direction

AetherOffice should feel like a living software company rather than a decorative animation. The office map remains the only default launch surface, but every visible movement must be traceable to a real application event. The reference video’s strongest ideas—delegation, visible movement, collaboration, workstation activity, and an observability command center—will be adapted to AetherOffice’s existing DeepDiscuss, approval, controlled-tool, audit, and physical-hotspot model.

## Proposed feature set

| Feature | Physical entry point | Real source of truth | Visible behavior |
|---|---|---|---|
| Event-driven walking routes | Discussion Room, employee figure, desk | DeepDiscuss rounds and employee state transitions | Employees walk from meeting space to assigned cabins/workstations after real state changes |
| Live activity ribbon | Desk or corridor workstation | Audit log and controlled execution events | Shows the latest verified stage, file scope, tool, and timestamp without exposing secrets |
| Meeting attendance flow | Discussion Room | DeepDiscuss participant and round events | Employees enter, deliberate, return to work, and expose round-specific detail on tap |
| Task Progress console | Test Lab or active workstation | Bounded command execution, tests, approvals, and retries | Shows queued/running/blocked/completed state, output summary, cancellation, and retry limits |
| Collaboration graph | Discussion Room table | Real DeepDiscuss delegation and response relationships | Displays which employee requested, reviewed, synthesized, or approved work |
| Camera timeline | Employee laptop or Cameras view | Verified camera metadata and audit events | Provides a chronological, safe activity view rather than fake webcam footage |
| Approval queue | Manager Cabin desk | Owner approval records and TEAM PROPOSAL state | Makes pending approvals physically discoverable and keeps execution gated |
| Local office triggers | Test Lab, files pile, Provider Locker | Explicit user actions and local runtime events | Allows safe actions such as rerun tests, inspect diff, request files, or open provider setup |

## Safety and truth constraints

The visual layer must never invent work, progress, conversations, tool output, file activity, or employee status. An idle state is preferable to fake activity. The activity ribbon, cameras, and collaboration graph must use allowlisted metadata only: task stage, approved file scope, active tool, event type, timestamp, employee, and bounded status. Secrets, raw provider prompts, unrelated workspace files, and arbitrary command output must remain excluded from visual metadata.

The current text-free launch constraint remains unchanged. New discovery should happen through physical objects, employee figures, laptops, desks, the Discussion Room, Test Lab, and Manager Cabin. Any detail panel must open only after a physical hotspot click and must retain a clear return path without adding a permanent sidebar to the office launch.

## Implementation order

First, introduce a typed event-to-office-state projection so walking, workstation state, camera metadata, and activity details all consume one verified event model. Next, add the activity ribbon and task-progress view because they build directly on existing audit and controlled-execution data. Then add meeting attendance and collaboration relationships from DeepDiscuss rounds. Finally, refine the physical hotspots and performance behavior, including transform-only movement, reduced-motion handling, bounded polling, and no animation for missing events.

## Acceptance criteria

The expanded experience is complete only when a real DeepDiscuss run visibly produces a meeting sequence, real employee state changes drive walking, a controlled command produces a task-progress event sequence, an employee laptop reveals only verified safe metadata, the collaboration graph reflects actual discussion relationships, and the full office remains text-free at launch. Existing provider, upload, workspace, Git, approval, and secret-handling regressions must continue to pass.
