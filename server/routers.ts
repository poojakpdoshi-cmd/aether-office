import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { APPROVAL_MODES, PROPOSAL_ACTIONS, PROVIDER_IDS } from "../shared/aether";
import { inspectVisualReference, runDeepDiscuss } from "./aether/deepDiscuss";
import { evaluateImplementation } from "./aether/evaluation";
import { configureProvider, listProviderStatuses, recognizeAndConfigureProvider, removeConfiguredProvider } from "./aether/providers";
import { applyProposalAction, assertExecutionAllowed, getDashboardState, setApprovalMode } from "./aether/state";
import { createGitCommit, createWorkspaceDirectory, createWorkspaceFile, deleteWorkspaceFile, editWorkspaceFile, getGitDiff, getGitHistory, getGitStatus, getWorkspaceSummary, importWorkspaceUpload, listDirectory, moveWorkspaceFile, readWorkspaceFile, readWorkspaceImage, revertGitCommit, runWorkspaceCommand, runWorkspaceTests, searchWorkspaceFiles, selectWorkspace, writeWorkspaceFile } from "./aether/workspace";

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
    dashboard: publicProcedure.query(() => getDashboardState()),
    providers: publicProcedure.query(() => listProviderStatuses()),
    configureProvider: publicProcedure
      .input(z.object({ provider: z.enum(PROVIDER_IDS).exclude(["manus"]), apiKey: z.string().trim().min(8).max(1000), baseUrl: z.string().url().max(1000).optional(), model: z.string().trim().max(300).optional() }))
      .mutation(({ input }) => configureProvider(input)),
    recognizeEmployee: publicProcedure
      .input(z.object({ apiKey: z.string().trim().min(8).max(1000) }))
      .mutation(({ input }) => recognizeAndConfigureProvider(input.apiKey)),
    removeProvider: publicProcedure
      .input(z.object({ provider: z.enum(PROVIDER_IDS).exclude(["manus"]) }))
      .mutation(({ input }) => removeConfiguredProvider(input.provider)),
    setApprovalMode: publicProcedure
      .input(z.object({ mode: z.enum(APPROVAL_MODES) }))
      .mutation(({ input }) => ({ approvalMode: setApprovalMode(input.mode) })),
    startDeepDiscuss: publicProcedure
      .input(z.object({ task: z.string().trim().min(3).max(12_000) }))
      .mutation(async ({ input }) => runDeepDiscuss(input.task)),
    proposalAction: publicProcedure
      .input(z.object({ meetingId: z.string().uuid(), action: z.enum(PROPOSAL_ACTIONS), note: z.string().trim().max(2_000).optional() }))
      .mutation(({ input }) => applyProposalAction(input.meetingId, input.action, input.note)),
    workspace: publicProcedure.query(() => getWorkspaceSummary()),
    selectWorkspace: publicProcedure.input(z.object({ path: z.string().trim().min(1).max(10_000) })).mutation(({ input }) => selectWorkspace(input.path)),
    listDirectory: publicProcedure.input(z.object({ path: z.string().max(10_000).default(".") })).query(({ input }) => listDirectory(input.path)),
    readFile: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000) })).query(({ input }) => readWorkspaceFile(input.path)),
    searchFiles: publicProcedure.input(z.object({ query: z.string().min(2).max(300) })).query(({ input }) => searchWorkspaceFiles(input.query)),
    gitStatus: publicProcedure.query(() => getGitStatus()),
    gitDiff: publicProcedure.query(() => getGitDiff()),
    gitHistory: publicProcedure.query(() => getGitHistory()),
    writeFile: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000), content: z.string().max(1_000_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return writeWorkspaceFile(input.path, input.content, input.who as "Manus", input.why); }),
    createFile: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000), content: z.string().max(1_000_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return createWorkspaceFile(input.path, input.content, input.who as "Manus", input.why); }),
    createDirectory: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return createWorkspaceDirectory(input.path, input.who as "Manus", input.why); }),
    editFile: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000), find: z.string().min(1).max(1_000_000), replace: z.string().max(1_000_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return editWorkspaceFile(input.path, input.find, input.replace, input.who as "Manus", input.why); }),
    deleteFile: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return deleteWorkspaceFile(input.path, input.who as "Manus", input.why); }),
    moveFile: publicProcedure.input(z.object({ from: z.string().min(1).max(10_000), to: z.string().min(1).max(10_000), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return moveWorkspaceFile(input.from, input.to, input.who as "Manus", input.why); }),
    runCommand: publicProcedure.input(z.object({ command: z.string().min(1).max(100), args: z.array(z.string().max(1_000)).max(30), who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return runWorkspaceCommand(input.command, input.args, input.who as "Manus", input.why); }),
    runTests: publicProcedure.input(z.object({ who: z.string().default("Manus"), why: z.string().trim().min(3).max(2_000), meetingId: z.string().uuid().optional(), ownerConfirmed: z.boolean().default(false) })).mutation(({ input }) => { assertExecutionAllowed(input.meetingId, input.ownerConfirmed); return runWorkspaceTests(input.who as "Manus", input.why); }),
    createCommit: publicProcedure.input(z.object({ message: z.string().trim().min(3).max(300), who: z.string().default("Owner"), why: z.string().trim().min(3).max(2_000), ownerConfirmed: z.boolean() })).mutation(({ input }) => createGitCommit(input.message, input.who as "Owner", input.why, input.ownerConfirmed)),
    revertCommit: publicProcedure.input(z.object({ commit: z.string().trim().min(4).max(100), who: z.string().default("Owner"), why: z.string().trim().min(3).max(2_000), ownerConfirmed: z.boolean() })).mutation(({ input }) => revertGitCommit(input.commit, input.who as "Owner", input.why, input.ownerConfirmed)),
    importUpload: publicProcedure.input(z.object({ fileName: z.string().min(1).max(300), mimeType: z.string().max(300), base64: z.string().min(1).max(30_000_000), who: z.string().default("Owner"), why: z.string().trim().min(3).max(2_000), ownerConfirmed: z.literal(true) })).mutation(({ input }) => importWorkspaceUpload({ ...input, who: input.who as "Owner" })),
    inspectImage: publicProcedure.input(z.object({ path: z.string().min(1).max(10_000), prompt: z.string().trim().min(3).max(2_000) })).mutation(async ({ input }) => { const image = await readWorkspaceImage(input.path, "Manus", "Inspect owner-provided visual reference."); return { analysis: await inspectVisualReference(image.dataUrl, input.prompt), mimeType: image.mimeType }; }),
    evaluate: publicProcedure.input(z.object({ employee: z.enum(["Manus", "Gemini", "Mistral", "DeepSeek", "Arcee", "Grok", "SambaNova"]), correctness: z.number().min(0).max(100), requirements: z.number().min(0).max(100), codeQuality: z.number().min(0).max(100), security: z.number().min(0).max(100), performance: z.number().min(0).max(100), maintainability: z.number().min(0).max(100), reasoning: z.string().trim().min(3).max(4_000), recommendations: z.string().trim().min(3).max(4_000) })).mutation(({ input }) => evaluateImplementation(input.employee, input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
