import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { APPROVAL_MODES, PROPOSAL_ACTIONS, PROVIDER_IDS } from "../shared/aether";
import { inspectVisualReference, runDeepDiscuss } from "./aether/deepDiscuss";
import { respondToManagerChat } from "./aether/managerChat";
import { evaluateImplementation } from "./aether/evaluation";
import { configureProvider, listProviderStatuses, recognizeAndConfigureProvider, removeConfiguredProvider } from "./aether/providers";
import { applyProposalAction, assertExecutionAllowed, getDashboardState, getEmployeeRoom, getEmployeeSandbox, getSandboxProcess, listEmployeeRooms, listSandboxProcesses, provisionEmployees, provisionOpenRouterProfiles, setApprovalMode } from "./aether/state";
import { destroyEmployeeSandbox, restartEmployeeSandbox, runEmployeeSandboxCommand, startEmployeeSandbox, stopEmployeeSandbox, stopEmployeeSandboxProcess } from "./aether/sandboxManager";
import { competitionIsolationStatus } from "./aether/teamIsolation";
import { BROWSER_TEST_SCENARIOS, cancelWorkspaceExecution, configureProjectPreview, createGitCommit, createWorkspaceDirectory, createWorkspaceFile, deleteWorkspaceFile, editWorkspaceFile, generateProofReport, getEmployeeInspection, getEvidenceGallery, getGitDiff, getGitHistory, getGitStatus, getLatestBrowserEvidence, getLatestProofReport, getProjectPreview, getWorkspaceExecution, getWorkspaceSummary, getWorkspaceTree, importWorkspaceUpload, listDirectory, moveWorkspaceFile, readEvidenceReport, readEvidenceScreenshot, readWorkspaceFile, readWorkspaceImage, revertGitCommit, runProjectBrowserTest, runWorkspaceCommand, runWorkspaceTests, searchWorkspaceFiles, selectWorkspace, startWorkspaceCommand, startWorkspaceTests, writeWorkspaceFile } from "./aether/workspace";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  aether: router({
    dashboard: publicProcedure.query(async () => {
      const dashboard = getDashboardState();
      const configuredProviders = new Set((await listProviderStatuses()).filter((provider) => provider.configured).map((provider) => provider.id));
      return {
        ...dashboard,
        setupRequiredEmployeeIds: dashboard.employees.filter((employee) => !configuredProviders.has(employee.provider)).map((employee) => employee.id),
      };
    }),
    competitionIsolation: publicProcedure.query(() => competitionIsolationStatus()),
    providers: publicProcedure.query(() => listProviderStatuses()),
    provisionEmployees: ownerProcedure.input(z.object({ provider: z.enum(PROVIDER_IDS), count: z.number().int().min(1).max(5), ownerConfirmed: z.literal(true) })).mutation(async ({ input }) => { const status = (await listProviderStatuses()).find((provider) => provider.id === input.provider); if (!status?.configured) throw new Error(`${status?.label ?? input.provider} must be configured before employees can be provisioned.`); return provisionEmployees(input.provider, input.count); }),
    provisionOpenRouterProfiles: ownerProcedure.input(z.object({ model: z.string().trim().min(3).max(160), count: z.number().int().min(1).max(5), ownerConfirmed: z.literal(true) })).mutation(async ({ input }) => { const status = (await listProviderStatuses()).find((provider) => provider.id === "openrouter"); if (!status?.configured) throw new Error("Configure the encrypted OpenRouter key before creating OpenRouter employee profiles."); return provisionOpenRouterProfiles(input.model, input.count); }),
    configureProvider: ownerProcedure
      .input(z.object({ provider: z.enum(PROVIDER_IDS).exclude(["manus"]), apiKey: z.string().trim().min(8).max(1000), baseUrl: z.string().url().max(1000).optional(), model: z.string().trim().max(300).optional(), compatibilityAcknowledged: z.boolean().optional() }))
      .mutation(({ input }) => configureProvider(input)),
    recognizeEmployee: ownerProcedure
      .input(z.object({ apiKey: z.string().trim().min(8).max(1000) }))
      .mutation(({ input }) => recognizeAndConfigureProvider(input.apiKey)),
    removeProvider: ownerProcedure
      .input(z.object({ provider: z.enum(PROVIDER_IDS).exclude(["manus"]) }))
      .mutation(({ input }) => removeConfiguredProvider(input.provider)),
    setApprovalMode: ownerProcedure
      .input(z.object({ mode: z.enum(APPROVAL_MODES) }))
      .mutation(({ input }) => ({ approvalMode: setApprovalMode(input.mode) })),
    startDeepDiscuss: ownerProcedure
      .input(z.object({ task: z.string().trim().min(3).max(12_000) }))
      .mutation(async ({ input }) => runDeepDiscuss(input.task)),
    managerChat: ownerProcedure
      .input(z.object({ message: z.string().trim().min(1).max(2_000) }))
      .mutation(async ({ input }) => respondToManagerChat(input.message)),
    proposalAction: ownerProcedure
      .input(z.object({ meetingId: z.string().uuid(), action: z.enum(PROPOSAL_ACTIONS), note: z.string().trim().max(2_000).optional() }))
      .mutation(({ input }) => applyProposalAction(input.meetingId, input.action, input.note)),
    workspace: ownerProcedure.query(() => getWorkspaceSummary()),
    selectWorkspace: ownerProcedure.input(z.object({ path: z.string().trim().min(1).max(10_000) })).mutation(({ input }) => selectWorkspace(input.path)),
    listDirectory: ownerProcedure.input(z.object({ path: z.string().max(10_000).default(".") })).query(({ input }) => listDirectory(input.path)),
    workspaceTree: ownerProcedure.query(() => getWorkspaceTree()),
    readFile: ownerProcedure.input(z.object({ path: z.string().min(1).max(10_000) })).query(({ input }) => readWorkspaceFile(input.path)),
    searchFiles: ownerProcedure.input(z.object({ query: z.string().min(2).max(300) })).query(({ input }) => searchWorkspaceFiles(input.query)),
    gitStatus: ownerProcedure.query(() => getGitStatus()),
    gitDiff: ownerProcedure.query(() => getGitDiff()),
    gitHistory: ownerProcedure.query(() => getGitHistory()),
    writeFile: ownerProcedure.input(z.object({ path: z.string().min(1).max(10_000), content: z.string().max(1_000_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return writeWorkspaceFile(input.path, input.content, input.who as "Manus", input.why); }),
    createFile: ownerProcedure.input(z.object({ path: z.string().min(1).max(10_000), content: z.string().max(1_000_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return createWorkspaceFile(input.path, input.content, input.who as "Manus", input.why); }),
    createDirectory: ownerProcedure.input(z.object({ path: z.string().min(1).max(10_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return createWorkspaceDirectory(input.path, input.who as "Manus", input.why); }),
    editFile: ownerProcedure.input(z.object({ path: z.string().min(1).max(10_000), find: z.string().min(1).max(1_000_000), replace: z.string().max(1_000_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return editWorkspaceFile(input.path, input.find, input.replace, input.who as "Manus", input.why); }),
    deleteFile: ownerProcedure.input(z.object({ path: z.string().min(1).max(10_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return deleteWorkspaceFile(input.path, input.who as "Manus", input.why); }),
    moveFile: ownerProcedure.input(z.object({ from: z.string().min(1).max(10_000), to: z.string().min(1).max(10_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return moveWorkspaceFile(input.from, input.to, input.who as "Manus", input.why); }),
    runCommand: ownerProcedure.input(z.object({ command: z.string().min(1).max(100), args: z.array(z.string().max(1_000)).max(30), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return runWorkspaceCommand(input.command, input.args, input.who as "Manus", input.why); }),
    runTests: ownerProcedure.input(z.object({ who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return runWorkspaceTests(input.who as "Manus", input.why); }),
    startCommand: ownerProcedure.input(z.object({ command: z.string().min(1).max(100), args: z.array(z.string().max(1_000)).max(30), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return startWorkspaceCommand(input.command, input.args, input.who as "Manus", input.why); }),
    startTests: ownerProcedure.input(z.object({ who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return startWorkspaceTests(input.who as "Manus", input.why); }),
    executionStatus: ownerProcedure.input(z.object({ id: z.string().uuid() })).query(({ input }) => getWorkspaceExecution(input.id)),
    employeeInspection: ownerProcedure.input(z.object({ employee: z.enum(["Manus", "Gemini", "Mistral", "DeepSeek", "Grok", "SambaNova", "North Mini Code", "Devstral Small 2", "Nemotron 3 Ultra"]) })).query(({ input }) => getEmployeeInspection(input.employee)),
    employeeRooms: ownerProcedure.query(() => listEmployeeRooms()),
    employeeRoom: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160) })).query(({ input }) => ({ room: getEmployeeRoom(input.employee), sandbox: getEmployeeSandbox(input.employee), processes: listSandboxProcesses(input.employee) })),
    startEmployeeSandbox: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160) })).mutation(({ input }) => startEmployeeSandbox(input.employee)),
    stopEmployeeSandbox: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160), ownerConfirmed: z.literal(true) })).mutation(({ input }) => stopEmployeeSandbox(input.employee)),
    restartEmployeeSandbox: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160), ownerConfirmed: z.literal(true) })).mutation(({ input }) => restartEmployeeSandbox(input.employee)),
    destroyEmployeeSandbox: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160), ownerConfirmed: z.literal(true) })).mutation(({ input }) => destroyEmployeeSandbox(input.employee, input.ownerConfirmed)),
    runEmployeeSandboxCommand: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160), command: z.string().trim().min(1).max(160), args: z.array(z.string().max(1_000)).max(30), ownerConfirmed: z.literal(true) })).mutation(({ input }) => runEmployeeSandboxCommand(input)),
    employeeSandboxProcess: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160), processId: z.string().uuid() })).query(({ input }) => { const process = getSandboxProcess(input.processId); if (!process || process.employeeId !== input.employee) throw new Error("Sandbox process not found for this employee."); return process; }),
    stopEmployeeSandboxProcess: ownerProcedure.input(z.object({ employee: z.string().trim().min(1).max(160), processId: z.string().uuid(), ownerConfirmed: z.literal(true) })).mutation(({ input }) => stopEmployeeSandboxProcess(input.employee, input.processId, input.ownerConfirmed)),
    projectPreview: publicProcedure.query(() => getProjectPreview()),
    configureProjectPreview: publicProcedure.input(z.object({ url: z.string().trim().min(16).max(2_000) })).mutation(({ input }) => configureProjectPreview(input.url)),
    latestBrowserEvidence: publicProcedure.query(() => getLatestBrowserEvidence()),
    runProjectBrowserTest: publicProcedure.input(z.object({ meetingId: z.string().uuid().optional(), ownerConfirmed: z.literal(true), scenario: z.enum(BROWSER_TEST_SCENARIOS).default("page-load") })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return runProjectBrowserTest(input.scenario); }),
    evidenceGallery: publicProcedure.query(() => getEvidenceGallery()),
    readEvidenceReport: publicProcedure.input(z.object({ id: z.string().regex(/^proof-[a-z0-9-]{4,120}$/i) })).query(({ input }) => readEvidenceReport(input.id)),
    readEvidenceScreenshot: publicProcedure.input(z.object({ id: z.string().regex(/^browser-[a-z0-9-]{4,120}$/i) })).query(({ input }) => readEvidenceScreenshot(input.id)),
    latestProofReport: publicProcedure.query(() => getLatestProofReport()),
    generateProofReport: publicProcedure.mutation(() => generateProofReport()),
    cancelExecution: publicProcedure.input(z.object({ id: z.string().uuid(), who: z.string().default("Owner"), why: z.string().trim().min(3).max(2_000) })).mutation(({ input }) => cancelWorkspaceExecution(input.id, input.who as "Owner", input.why)),
    createCommit: publicProcedure.input(z.object({ message: z.string().trim().min(3).max(300), who: z.string().default("Owner"), why: z.string().trim().min(3).max(2_000), ownerConfirmed: z.boolean() })).mutation(({ input }) => createGitCommit(input.message, input.who as "Owner", input.why, input.ownerConfirmed)),
    revertCommit: publicProcedure.input(z.object({ commit: z.string().trim().min(4).max(100), who: z.string().default("Owner"), why: z.string().trim().min(3).max(2_000), ownerConfirmed: z.boolean() })).mutation(({ input }) => revertGitCommit(input.commit, input.who as "Owner", input.why, input.ownerConfirmed)),
    importUpload: publicProcedure.input(z.object({ fileName: z.string().min(1).max(300), mimeType: z.string().max(300), base64: z.string().min(1).max(30_000_000), who: z.string().default("Owner"), why: z.string().trim().min(3).max(2_000), ownerConfirmed: z.literal(true) })).mutation(({ input }) => importWorkspaceUpload({ ...input, who: input.who as "Owner" })),
    inspectImage: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000), prompt: z.string().trim().min(3).max(2_000) })).mutation(async ({ input }) => { const image = await readWorkspaceImage(input.path, "Manus", "Inspect owner-provided visual reference."); return { analysis: await inspectVisualReference(image.dataUrl, input.prompt), mimeType: image.mimeType }; }),
    evaluate: ownerProcedure.input(z.object({ employee: z.enum(["Manus", "Gemini", "Mistral", "DeepSeek", "Grok", "SambaNova"]), correctness: z.number().min(0).max(100), requirements: z.number().min(0).max(100), codeQuality: z.number().min(0).max(100), security: z.number().min(0).max(100), performance: z.number().min(0).max(100), maintainability: z.number().min(0).max(100), reasoning: z.string().trim().min(3).max(4_000), recommendations: z.string().trim().min(3).max(4_000) })).mutation(({ input }) => evaluateImplementation(input.employee, input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
