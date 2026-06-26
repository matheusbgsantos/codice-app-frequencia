import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { 
  isEmailAuthorized, 
  getAuthorizedEmail, 
  addAuthorizedEmail, 
  deactivateEmail, 
  activateEmail,
  deleteAuthorizedEmail,
  listAuthorizedEmails,
  listWebhookLogs,
  registerVisitor,
  listVisitors,
  getProgress,
  startJourney,
  completeDay,
  logSession,
  getStats
} from "./db";

export const appRouter = router({
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

  // Verifica se o email está autorizado (comprou o produto)
  visitors: router({
    verifyEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        // Verifica se o email existe na tabela de emails autorizados
        const isAuthorized = await isEmailAuthorized(input.email);
        
        if (isAuthorized) {
          // Também registra como visitante
          await registerVisitor(input.email);
          return { authorized: true };
        }
        
        return { authorized: false };
      }),
  }),

  // Acesso livre - salva email no banco e permite entrada
  access: router({
    // Registra email e permite acesso (acesso livre)
    checkEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        // Salva o email no banco de dados (tabela visitors)
        await registerVisitor(input.email);
        
        // Sempre autoriza o acesso
        return {
          authorized: true,
          name: null,
          productName: null,
        };
      }),
  }),

  // Painel administrativo - apenas para admins
  admin: router({
    // Lista todos os emails autorizados (compradores)
    listEmails: adminProcedure.query(async () => {
      const emails = await listAuthorizedEmails();
      return emails;
    }),

    // Lista todos os visitantes/leads
    listVisitors: adminProcedure.query(async () => {
      const visitors = await listVisitors();
      return visitors;
    }),

    // Adiciona um email manualmente
    addEmail: adminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        productName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await addAuthorizedEmail({
          email: input.email,
          name: input.name || null,
          productName: input.productName || null,
          addedBy: 'manual',
          isActive: true,
        });
        return { success: true };
      }),

    // Desativa um email
    deactivateEmail: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await deactivateEmail(input.email);
        return { success: true };
      }),

    // Reativa um email
    activateEmail: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await activateEmail(input.email);
        return { success: true };
      }),

    // Deleta um email permanentemente
    deleteEmail: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await deleteAuthorizedEmail(input.email);
        return { success: true };
      }),

    // Lista logs de webhook
    listWebhookLogs: adminProcedure
      .input(z.object({ limit: z.number().optional().default(50) }))
      .query(async ({ input }) => {
        const logs = await listWebhookLogs(input.limit);
        return logs;
      }),
  }),

  // Progresso do usuário — jornadas, streak, sessões, stats (Épico 4)
  progress: router({
    // Estado atual (trilha ativa, dia, streak)
    get: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return await getProgress(input.email);
      }),

    // Inicia (ou troca) uma jornada
    startJourney: publicProcedure
      .input(z.object({ email: z.string().email(), journeyId: z.string() }))
      .mutation(async ({ input }) => {
        return await startJourney(input.email, input.journeyId);
      }),

    // Conclui o dia atual da jornada (recalcula streak no servidor)
    completeDay: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          journeyId: z.string(),
          day: z.number().int().min(1).max(30),
          frequencyId: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        return await completeDay(
          input.email,
          input.journeyId,
          input.day,
          input.frequencyId,
        );
      }),

    // Telemetria de sessão de áudio
    logSession: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          frequencyId: z.string(),
          mode: z.enum(["ambiente", "puro"]),
          durationSeconds: z.number().min(0).default(0),
        }),
      )
      .mutation(async ({ input }) => {
        await logSession(
          input.email,
          input.frequencyId,
          input.mode,
          input.durationSeconds,
        );
        return { success: true };
      }),

    // Estatísticas agregadas
    stats: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return await getStats(input.email);
      }),

    // Analytics geral do app (protegido por chave simples)
    analytics: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        if (input.key !== "freq2026") {
          throw new Error("Não autorizado");
        }
        const { getAppAnalytics } = await import("./db");
        return await getAppAnalytics();
      }),
  }),
});

export type AppRouter = typeof appRouter;
