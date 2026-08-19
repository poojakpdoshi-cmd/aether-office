# Secure GitHub Publication and Expanded Employee Roster Plan

## Goal

Publish the reviewed AetherOffice source code to a new **private** GitHub repository without placing a GitHub personal access token, provider API key, encrypted vault, runtime state, or audit log in chat or Git. Complete the pending model-roster safeguards so Manus is temporary for seven days and the requested North Mini Code, Devstral Small 2, and Nemotron 3 Ultra routes are safe, explicit, and testable.

## Key Decisions

| Decision | Approach |
| --- | --- |
| GitHub authentication | Do not accept a PAT in chat. First use the existing authenticated GitHub CLI account if available; otherwise use its browser/device authorization flow, which keeps the credential outside the conversation and repository. |
| Repository visibility | Create the repository as **private** by default. |
| Publishing consent | Ask for one explicit confirmation immediately before the irreversible repository creation and first push. |
| Remote behavior | Add only the newly created `origin` remote. Automatic pushes remain prohibited by the application; this one manually confirmed initial push is the sole exception for the handoff. |
| North Mini Code | Configure as an OpenRouter-backed model using `cohere/north-mini-code:free`; it may reuse an already encrypted OpenRouter key locally. |
| Devstral Small 2 | Keep it opt-in behind an Owner acknowledgement because Mistral documents `labs-devstral-small-2512` as retired. Require a compatible endpoint/account check before it can participate in DeepDiscuss. |
| Nemotron 3 Ultra | Use exactly one route after the Owner identifies the issuer of their key: OpenRouter (`nvidia/nemotron-3-ultra-550b-a55b:free`) or NVIDIA API Catalog (`nvidia/nemotron-3-ultra-550b-a55b`). Do not guess or probe a key. |
| Manus lifecycle | Persist a seven-day temporary expiration, remove Manus from active office/meeting selection after expiry, show the expiry in the non-default Employee Profiles view, and select an active configured employee to synthesize plans after expiry. |

## Implementation Steps

1. **Validate the local publishable state.** Review the repository status, current remotes, ignore rules, and tracked files. Confirm that encrypted provider state, vault keys, runtime state, audit logs, uploads, and any secret-risk files are ignored and untracked. Run the full type check, test suite, and production build before publishing.

2. **Finish and verify roster safeguards.** Add behavioral tests for Manus at and after `temporaryUntil`, including its removal from active office and DeepDiscuss selection. Keep the owner-visible expiry notice in the non-default profiles view. Add direct tests showing that Devstral cannot join meetings until its explicit compatibility acknowledgement is present.

3. **Finalize provider-specific behavior.** Retain North Mini Code as a safe OpenRouter model override. Retain Devstral only with its warning and acknowledgement. Ask the Owner whether the Nemotron key is issued by OpenRouter or NVIDIA before selecting that single route; then add a configuration test for the chosen path. Keys will be entered only through the local physical Provider Locker, never through chat.

4. **Verify expanded office allocation.** Configure test fixtures for North Mini Code, Devstral Small 2, and Nemotron 3 Ultra, then validate that each appears only when configured and receives the assigned physical desk, laptop, and workstation interaction target. Preserve the text-free default office launch.

5. **Authenticate securely with GitHub.** Attempt to use the already authenticated GitHub CLI identity. If it is not authenticated, start a browser/device login flow and have the Owner complete it. Do not request, receive, paste, log, or store a PAT.

6. **Obtain publish confirmation.** Present the proposed repository name (default: `aether-office`) and private visibility. Explicitly ask the Owner to confirm creation and the initial push after authentication is ready.

7. **Create and publish the repository.** Create the private repository using the authenticated account, create an auditable local commit if required, add the repository as `origin`, and perform the single Owner-confirmed initial push. Verify the remote URL, branch, commit SHA, and that no secret-risk files are present on the remote. Do not enable ongoing automatic pushes.

8. **Checkpoint and deliver.** Run final validation, save a checkpoint, share the private repository URL and the confirmation that provider keys remain local-only, then document how to configure each provider through the Provider Locker.

## Test Plan

| Area | Verification |
| --- | --- |
| Temporary Manus lifecycle | Unit test active before expiry and inactive at/after expiry; dashboard excludes expired Manus; DeepDiscuss safely selects a configured fallback synthesizer. |
| Provider safety | Tests confirm North/OpenRouter mapping, Devstral acknowledgement requirement, no provider-key value in UI/API responses, and exactly one selected Nemotron route. |
| Office integration | Tests and visual checks confirm all three configured new employees map to real cabin, desk, and laptop targets without visible launch text. |
| Git safety | Confirm no remote before consent; inspect staged/tracked files; run a secret-risk path scan; confirm repository is private and only the Owner-authorized initial push occurs. |
| Regression | Run `pnpm check`, `pnpm test`, and `pnpm build`. |

## Assumptions and Open Risks

The repository will default to the name **`aether-office`** and private visibility unless the Owner chooses another name. The Owner must identify whether the Nemotron credential is from OpenRouter or NVIDIA before that model is enabled. Devstral Small 2 may no longer be accepted by a current Mistral endpoint because the documented model is retired; the application will not present it as available until the Owner explicitly acknowledges compatibility and the configured endpoint is tested. GitHub publication cannot proceed until secure authentication and the final create/push confirmation are completed.
