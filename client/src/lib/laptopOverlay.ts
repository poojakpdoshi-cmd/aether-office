import type { CameraOverlayData } from "../../../shared/aether";

export type LaptopOverlayStatus = "IDLE" | "THINKING" | "IN_MEETING" | "CODING" | "REVIEWING" | "TESTING" | "WAITING" | "ERROR" | "COMPLETED";

export type LaptopOverlay = {
  fileScope: string;
  tool: string;
  taskStage: string;
  taskScope: string;
  summary: string;
};

const statusFields: Record<LaptopOverlayStatus, Pick<LaptopOverlay, "fileScope" | "tool" | "taskStage">> = {
  IDLE: { fileScope: "No file disclosed", tool: "No controlled tool", taskStage: "Ready" },
  THINKING: { fileScope: "Planned workspace file", tool: "Planning board", taskStage: "Preparing" },
  IN_MEETING: { fileScope: "No file disclosed", tool: "DeepDiscuss", taskStage: "Discussing" },
  CODING: { fileScope: "Approved workspace file", tool: "Controlled editor", taskStage: "Building" },
  REVIEWING: { fileScope: "Approved change set", tool: "Review checklist", taskStage: "Reviewing" },
  TESTING: { fileScope: "Approved test target", tool: "Controlled test runner", taskStage: "Testing" },
  WAITING: { fileScope: "No file disclosed", tool: "No controlled tool", taskStage: "Waiting" },
  ERROR: { fileScope: "No file disclosed", tool: "Controlled error handler", taskStage: "Attention needed" },
  COMPLETED: { fileScope: "Approved result", tool: "Completion record", taskStage: "Complete" },
};

const approvedTaskScopes = new Set([
  "Plans, assigns, and synthesizes",
  "Frontend and general engineering",
  "Algorithms and backend architecture",
  "Implementation and technical review",
  "Security and architecture critique",
  "Fast implementation observations and risk scans",
  "Technology and alternatives research",
]);

export function createLaptopOverlay(status: LaptopOverlayStatus, taskScope: string, verifiedCamera?: CameraOverlayData): LaptopOverlay {
  const fields = verifiedCamera ? { fileScope: verifiedCamera.fileScope, tool: verifiedCamera.activeTool, taskStage: verifiedCamera.taskStage } : statusFields[status];
  const safeScope = approvedTaskScopes.has(taskScope) ? taskScope : "Assigned work scope";
  return { ...fields, taskScope: safeScope, summary: `${fields.fileScope} · ${fields.tool} · ${fields.taskStage}` };
}
