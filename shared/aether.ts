export const EMPLOYEE_STATUSES = [
  "IDLE",
  "THINKING",
  "IN_MEETING",
  "CODING",
  "REVIEWING",
  "TESTING",
  "WAITING",
  "ERROR",
  "COMPLETED",
] as const;

export const APPROVAL_MODES = ["Safe Mode", "Team Mode", "Autonomous Mode"] as const;
export const PROPOSAL_ACTIONS = ["Approve", "Modify Plan", "Reject"] as const;
export const PROVIDER_IDS = ["manus", "gemini", "mistral", "deepseek", "arcee", "grok", "sambanova", "openrouter", "northmini", "devstral", "nemotron"] as const;
export const DEEP_DISCUSS_ROUNDS = ["analysis", "critique", "debate", "synthesis"] as const;
export const AUDIT_FIELDS = ["WHO", "WHAT", "WHICH FILE", "WHEN", "WHY"] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
export type ApprovalMode = (typeof APPROVAL_MODES)[number];
export type ProposalAction = (typeof PROPOSAL_ACTIONS)[number];
export type DeepDiscussRound = (typeof DEEP_DISCUSS_ROUNDS)[number];
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type EmployeeId = "Manus" | "Gemini" | "Mistral" | "DeepSeek" | "Arcee" | "Grok" | "SambaNova" | "North Mini Code" | "Devstral Small 2" | "Nemotron 3 Ultra";

export type EmployeeProfile = {
  id: EmployeeId;
  role: string;
  provider: ProviderId;
  status: EmployeeStatus;
  taskCount: number;
  averageScore: number | null;
  recentPerformance: number[];
  temporaryUntil?: number;
};

export type DiscussionMessage = {
  id: string;
  employee: EmployeeId;
  provider: ProviderId;
  round: DeepDiscussRound;
  content: string;
  createdAt: number;
};

export type TeamProposal = {
  objective: string;
  techStack: string[];
  filesToCreateModify: string[];
  risks: string[];
  confidencePercent: number;
};

export type MeetingState = "PENDING_APPROVAL" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "ERROR";

export type Meeting = {
  id: string;
  task: string;
  selectedEmployees: EmployeeId[];
  messages: DiscussionMessage[];
  proposal: TeamProposal | null;
  state: MeetingState;
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
};

export type CameraOverlayData = {
  fileScope: string;
  activeTool: string;
  taskStage: string;
};

export type ActivityEvent = {
  id: string;
  kind: "meeting" | "provider" | "approval" | "tool" | "workspace" | "system";
  message: string;
  createdAt: number;
  employee?: EmployeeId;
  camera?: CameraOverlayData;
};

export const REVIEW_RUBRIC = {
  Correctness: 30,
  Requirements: 20,
  "Code Quality": 20,
  Security: 10,
  Performance: 10,
  Maintainability: 10,
} as const;

export const CONTROLLED_TOOLS = [
  "read_file",
  "write_file",
  "edit_file",
  "create_file",
  "create_directory",
  "delete_file",
  "list_directory",
  "search_files",
  "move_file",
  "run_command",
  "run_tests",
  "git_diff",
  "git_status",
] as const;

export type ControlledTool = (typeof CONTROLLED_TOOLS)[number];
