import { eq, and, sql, desc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import {
  InsertUser,
  users,
  authorizedEmails,
  webhookLogs,
  visitors,
  InsertAuthorizedEmail,
  InsertWebhookLog,
  InsertVisitor,
  userProgress,
  journeyDayCompletions,
  frequencySessions,
  communityPosts,
  communityLikes,
  communityBanned,
  InsertCommunityPost,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance (SQLite local — standalone, sem Manus).
export async function getDb() {
  if (!_db) {
    try {
      const dbPath = process.env.DATABASE_URL || resolve(process.cwd(), "data/app.db");
      const dir = dirname(dbPath);
      if (dir && dir !== "." && !existsSync(dir)) mkdirSync(dir, { recursive: true });
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      // Auto-migrate: SQL embutido (idempotente) — não depende de arquivos externos
      try {
        const DDL = [
          `CREATE TABLE IF NOT EXISTS users (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, openId text NOT NULL UNIQUE, appId text, name text, email text, avatarUrl text, role text DEFAULT 'user' NOT NULL, createdAt integer DEFAULT (unixepoch()) NOT NULL, updatedAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS authorized_emails (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, email text NOT NULL UNIQUE, accessType text DEFAULT 'lifetime' NOT NULL, createdAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS webhook_logs (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, eventType text, email text, payload text, status text, createdAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS visitors (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, email text NOT NULL UNIQUE, firstSeenAt integer DEFAULT (unixepoch()) NOT NULL, lastSeenAt integer DEFAULT (unixepoch()) NOT NULL, visitCount integer DEFAULT 1 NOT NULL, accessType text DEFAULT 'lifetime' NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS user_progress (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, email text NOT NULL UNIQUE, activeJourneyId text, currentDay integer DEFAULT 1 NOT NULL, streakCount integer DEFAULT 0 NOT NULL, lastSessionDate text, createdAt integer DEFAULT (unixepoch()) NOT NULL, updatedAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS journey_day_completions (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, email text NOT NULL, journeyId text NOT NULL, dayNumber integer NOT NULL, frequencyId text NOT NULL, completedAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS frequency_sessions (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, email text NOT NULL, frequencyId text NOT NULL, mode text NOT NULL, durationSeconds integer DEFAULT 0 NOT NULL, startedAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS community_posts (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, email text NOT NULL, mood text, texto text, anon integer DEFAULT 1 NOT NULL, likes integer DEFAULT 0 NOT NULL, hidden integer DEFAULT 0 NOT NULL, createdAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS community_likes (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, postId integer NOT NULL, email text NOT NULL, createdAt integer DEFAULT (unixepoch()) NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS community_banned (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, email text NOT NULL UNIQUE, createdAt integer DEFAULT (unixepoch()) NOT NULL)`,
        ];
        for (const ddl of DDL) {
          try { sqlite.exec(ddl); } catch(_) {}
        }
        console.log("[Database] Tabelas garantidas (DDL embutido)");
      } catch (migErr) {
        console.warn("[Database] migrate erro:", migErr);
      }
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}


export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== AUTHORIZED EMAILS ====================

/**
 * Verifica se um email está autorizado a acessar o conteúdo
 */
export async function isEmailAuthorized(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check email: database not available");
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const result = await db
    .select()
    .from(authorizedEmails)
    .where(and(
      eq(authorizedEmails.email, normalizedEmail),
      eq(authorizedEmails.isActive, true)
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Obtém informações de um email autorizado
 */
export async function getAuthorizedEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get email: database not available");
    return null;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const result = await db
    .select()
    .from(authorizedEmails)
    .where(eq(authorizedEmails.email, normalizedEmail))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Adiciona um email à lista de autorizados
 */
export async function addAuthorizedEmail(data: InsertAuthorizedEmail): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add email: database not available");
    return;
  }

  const normalizedEmail = data.email.toLowerCase().trim();
  
  // Upsert - se já existe, atualiza; se não, insere
  await db.insert(authorizedEmails).values({
    ...data,
    email: normalizedEmail,
  }).onConflictDoUpdate({
    target: authorizedEmails.email,
    set: {
      name: data.name,
      saleId: data.saleId,
      productName: data.productName,
      isActive: data.isActive ?? true,
      addedBy: data.addedBy,
      // accessType só é sobrescrito se vier explícito (preserva 'lifetime' default).
      ...(data.accessType ? { accessType: data.accessType } : {}),
    },
  });
}

/**
 * Remove/desativa um email da lista de autorizados
 */
export async function deactivateEmail(email: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot deactivate email: database not available");
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  await db
    .update(authorizedEmails)
    .set({ isActive: false })
    .where(eq(authorizedEmails.email, normalizedEmail));
}

/**
 * Reativa um email
 */
export async function activateEmail(email: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot activate email: database not available");
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  await db
    .update(authorizedEmails)
    .set({ isActive: true })
    .where(eq(authorizedEmails.email, normalizedEmail));
}

/**
 * Lista todos os emails autorizados
 */
export async function listAuthorizedEmails() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list emails: database not available");
    return [];
  }

  return await db.select().from(authorizedEmails).orderBy(authorizedEmails.createdAt);
}

/**
 * Deleta um email permanentemente
 */
export async function deleteAuthorizedEmail(email: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete email: database not available");
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  await db.delete(authorizedEmails).where(eq(authorizedEmails.email, normalizedEmail));
}

// ==================== WEBHOOK LOGS ====================

/**
 * Registra um log de webhook recebido
 */
export async function logWebhook(data: InsertWebhookLog): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log webhook: database not available");
    return;
  }

  await db.insert(webhookLogs).values(data);
}

/**
 * Lista os últimos logs de webhook
 */
export async function listWebhookLogs(limit: number = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list webhook logs: database not available");
    return [];
  }

  return await db
    .select()
    .from(webhookLogs)
    .orderBy(webhookLogs.createdAt)
    .limit(limit);
}

// ==================== VISITORS/LEADS ====================

/**
 * Registra um visitante/lead no banco de dados
 * Se já existe, incrementa o contador de acessos
 */
export async function registerVisitor(email: string, name?: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot register visitor: database not available");
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  // Tenta inserir, se já existe atualiza o contador e último acesso
  await db.insert(visitors).values({
    email: normalizedEmail,
    name: name || null,
    accessCount: 1,
  }).onConflictDoUpdate({
    target: visitors.email,
    set: {
      accessCount: sql`${visitors.accessCount} + 1`,
      lastAccessAt: new Date(),
    },
  });
}

/**
 * Lista todos os visitantes/leads
 */
export async function listVisitors() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list visitors: database not available");
    return [];
  }

  return await db.select().from(visitors).orderBy(visitors.createdAt);
}

// ==================== PROGRESSO (Épico 4) ====================

/** Retorna 'YYYY-MM-DD' (UTC) para uma data. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Diferença em dias inteiros entre duas datas 'YYYY-MM-DD'. */
function dayDiff(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00Z").getTime();
  const b = new Date(toYmd + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Obtém (ou cria implicitamente como null) o progresso do usuário.
 */
export async function getProgress(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get progress: database not available");
    return null;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const result = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.email, normalizedEmail))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Inicia (ou troca) uma jornada para o usuário. Reseta currentDay para 1.
 * Não reseta o streak (continuidade diária é mantida entre jornadas).
 */
export async function startJourney(email: string, journeyId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot start journey: database not available");
    return null;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  await db
    .insert(userProgress)
    .values({
      email: normalizedEmail,
      activeJourneyId: journeyId,
      currentDay: 1,
      streakCount: 0,
      lastSessionDate: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProgress.email,
      set: {
        activeJourneyId: journeyId,
        currentDay: 1,
        updatedAt: now,
      },
    });

  return await getProgress(normalizedEmail);
}

/**
 * Conclui o dia atual de uma jornada.
 * - Recalcula o streak comparando lastSessionDate com hoje:
 *   ontem => +1, hoje (mesmo dia) => mantém, caso contrário => reset para 1.
 * - Grava lastSessionDate = hoje, incrementa currentDay (máx. 30).
 * - Insere registro em journeyDayCompletions (evita duplicar mesmo dia/jornada).
 */
export async function completeDay(
  email: string,
  journeyId: string,
  day: number,
  frequencyId: string,
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot complete day: database not available");
    return null;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  const today = toDateString(now);

  const existing = await getProgress(normalizedEmail);

  // Cálculo de streak no SERVIDOR.
  let newStreak = 1;
  let alreadyToday = false;
  if (existing?.lastSessionDate) {
    const diff = dayDiff(existing.lastSessionDate, today);
    if (diff === 0) {
      // Já registrou hoje: mantém streak.
      newStreak = existing.streakCount > 0 ? existing.streakCount : 1;
      alreadyToday = true;
    } else if (diff === 1) {
      // Dia consecutivo: incrementa.
      newStreak = existing.streakCount + 1;
    } else {
      // Quebrou a sequência: reinicia.
      newStreak = 1;
    }
  }

  // Avança o dia (limite 30). Só avança uma vez por dia.
  const baseDay = existing?.currentDay ?? day;
  const nextDay = alreadyToday ? baseDay : Math.min(baseDay + 1, 30);

  await db
    .insert(userProgress)
    .values({
      email: normalizedEmail,
      activeJourneyId: journeyId,
      currentDay: nextDay,
      streakCount: newStreak,
      lastSessionDate: today,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProgress.email,
      set: {
        activeJourneyId: journeyId,
        currentDay: nextDay,
        streakCount: newStreak,
        lastSessionDate: today,
        updatedAt: now,
      },
    });

  // Registra a conclusão do dia (idempotente por email+journey+dia).
  const dup = await db
    .select()
    .from(journeyDayCompletions)
    .where(
      and(
        eq(journeyDayCompletions.email, normalizedEmail),
        eq(journeyDayCompletions.journeyId, journeyId),
        eq(journeyDayCompletions.dayNumber, day),
      ),
    )
    .limit(1);

  if (dup.length === 0) {
    await db.insert(journeyDayCompletions).values({
      email: normalizedEmail,
      journeyId,
      dayNumber: day,
      frequencyId,
    });
  }

  return await getProgress(normalizedEmail);
}

/** Registra uma sessão de áudio (telemetria leve). */
export async function logSession(
  email: string,
  frequencyId: string,
  mode: "ambiente" | "puro",
  durationSeconds: number,
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log session: database not available");
    return;
  }
  const normalizedEmail = email.toLowerCase().trim();
  await db.insert(frequencySessions).values({
    email: normalizedEmail,
    frequencyId,
    mode,
    durationSeconds: Math.max(0, Math.round(durationSeconds)),
  });
}

/** Estatísticas agregadas: total de sessões, minutos e dias completos. */
export async function getStats(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get stats: database not available");
    return { totalSessions: 0, totalMinutes: 0, daysCompleted: 0, streakCount: 0 };
  }
  const normalizedEmail = email.toLowerCase().trim();

  const sessions = await db
    .select()
    .from(frequencySessions)
    .where(eq(frequencySessions.email, normalizedEmail));

  const completions = await db
    .select()
    .from(journeyDayCompletions)
    .where(eq(journeyDayCompletions.email, normalizedEmail));

  const progress = await getProgress(normalizedEmail);

  const totalSeconds = sessions.reduce(
    (acc, s) => acc + (s.durationSeconds ?? 0),
    0,
  );

  return {
    totalSessions: sessions.length,
    totalMinutes: Math.round(totalSeconds / 60),
    daysCompleted: completions.length,
    streakCount: progress?.streakCount ?? 0,
  };
}

/** Analytics geral do app de Frequência (uso real). */
export async function getAppAnalytics() {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  const progressList = await db.select().from(userProgress);
  const sessions = await db.select().from(frequencySessions);
  const completions = await db.select().from(journeyDayCompletions);

  // Usuários únicos (qualquer um que tocou áudio ou tem progresso)
  const emails = new Set<string>();
  progressList.forEach((p) => emails.add(p.email));
  sessions.forEach((s) => emails.add(s.email));

  // Frequências mais tocadas
  const freqCount: Record<string, number> = {};
  let totalSeconds = 0;
  for (const s of sessions) {
    freqCount[s.frequencyId] = (freqCount[s.frequencyId] || 0) + 1;
    totalSeconds += s.durationSeconds || 0;
  }
  const topFrequencias = Object.entries(freqCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, plays]) => ({ frequencia: id, plays }));

  // Jornadas ativas
  const comJornada = progressList.filter((p) => p.activeJourneyId).length;
  const dias = progressList.map((p) => p.currentDay || 1);
  const streaks = progressList.map((p) => p.streakCount || 0);
  const jornadaCount: Record<string, number> = {};
  for (const p of progressList) {
    if (p.activeJourneyId) jornadaCount[p.activeJourneyId] = (jornadaCount[p.activeJourneyId] || 0) + 1;
  }

  return {
    totalUsuarios: emails.size,
    totalSessoesAudio: sessions.length,
    totalMinutosOuvidos: Math.round(totalSeconds / 60),
    mediaMinutosPorUsuario: emails.size ? Math.round(totalSeconds / 60 / emails.size) : 0,
    topFrequencias,
    usuariosComJornada: comJornada,
    porJornada: jornadaCount,
    diaMedioJornada: dias.length ? Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10 : 0,
    maiorStreak: streaks.length ? Math.max(...streaks) : 0,
    diasConcluidos: completions.length,
  };
}

/** Lista usuários mais ATIVOS do app (email + engajamento), ordenado por sessões. */
export async function getUsuariosAtivos() {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  const progressList = await db.select().from(userProgress);
  const sessions = await db.select().from(frequencySessions);
  // conta sessões e segundos por email
  const stat: Record<string, { sessoes: number; segundos: number }> = {};
  for (const s of sessions) {
    const e = (s.email || "").toLowerCase();
    if (!e) continue;
    (stat[e] ??= { sessoes: 0, segundos: 0 });
    stat[e].sessoes += 1;
    stat[e].segundos += s.durationSeconds || 0;
  }
  const progByEmail: Record<string, typeof progressList[0]> = {};
  for (const p of progressList) progByEmail[(p.email || "").toLowerCase()] = p;
  const todosEmails = new Set([...Object.keys(stat), ...Object.keys(progByEmail)]);
  const lista = [...todosEmails].map((email) => {
    const p = progByEmail[email];
    const s = stat[email] || { sessoes: 0, segundos: 0 };
    return {
      email,
      sessoes: s.sessoes,
      minutos: Math.round(s.segundos / 60),
      streak: p?.streakCount ?? 0,
      diaAtual: p?.currentDay ?? 0,
      jornadaAtiva: !!p?.activeJourneyId,
      ultimaSessao: p?.lastSessionDate ?? null,
    };
  }).sort((a, b) => (b.sessoes - a.sessoes) || (b.minutos - a.minutos));
  return { total: lista.length, usuarios: lista };
}

/* ===================== COMUNIDADE ===================== */
const PALAVRAS_BLOQUEADAS = ["http://", "https://", "www.", ".com", "porra", "caralho", "viado", "puta que", "vai se fuder", "fdp", "filho da puta"];

function filtroLixo(texto: string): boolean {
  const t = (texto || "").toLowerCase();
  return !PALAVRAS_BLOQUEADAS.some((p) => t.includes(p));
}

/** Cria um post na comunidade. Retorna {ok} ou {ok:false, motivo}. */
export async function criarPost(email: string, mood: string, texto: string, anon: boolean) {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  const e = (email || "").toLowerCase().trim();
  if (!e) return { ok: false, motivo: "email obrigatório" };
  // banido?
  const ban = await db.select().from(communityBanned).where(eq(communityBanned.email, e));
  if (ban.length > 0) return { ok: false, motivo: "banido" };
  const txt = (texto || "").slice(0, 500).trim();
  if (!mood && !txt) return { ok: false, motivo: "vazio" };
  if (txt && !filtroLixo(txt)) return { ok: false, motivo: "conteúdo bloqueado" };
  await db.insert(communityPosts).values({
    email: e, mood: mood || null, texto: txt || null, anon: anon ? 1 : 0, likes: 0, hidden: 0,
  } as InsertCommunityPost);
  return { ok: true };
}

/** Lista posts visíveis (não ocultos), mais recentes primeiro. Nome anônimo no público. */
export async function listarPosts(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  const posts = await db.select().from(communityPosts)
    .where(eq(communityPosts.hidden, 0))
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit);
  return {
    posts: posts.map((p) => {
      const nome = p.anon ? "Anônimo" : (p.email.split("@")[0] || "Usuário");
      const inicial = (p.anon ? "?" : (p.email[0] || "?")).toUpperCase();
      return {
        id: p.id, mood: p.mood, texto: p.texto, likes: p.likes,
        nome, inicial,
        createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date((p.createdAt as unknown as number) * 1000)).toISOString(),
      };
    }),
  };
}

/** Curtir/descurtir um post (toggle por email). */
export async function toggleLike(postId: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  const e = (email || "").toLowerCase().trim();
  if (!e) return { ok: false };
  const existe = await db.select().from(communityLikes)
    .where(and(eq(communityLikes.postId, postId), eq(communityLikes.email, e)));
  if (existe.length > 0) {
    await db.delete(communityLikes).where(eq(communityLikes.id, existe[0].id));
    await db.update(communityPosts).set({ likes: sql`max(likes - 1, 0)` as unknown as number }).where(eq(communityPosts.id, postId));
    return { ok: true, liked: false };
  } else {
    await db.insert(communityLikes).values({ postId, email: e });
    await db.update(communityPosts).set({ likes: sql`likes + 1` as unknown as number }).where(eq(communityPosts.id, postId));
    return { ok: true, liked: true };
  }
}

/** [ADMIN] Lista TODOS os posts com email real, pro painel de moderação. */
export async function listarPostsAdmin(limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  const posts = await db.select().from(communityPosts)
    .orderBy(desc(communityPosts.createdAt)).limit(limit);
  return {
    posts: posts.map((p) => ({
      id: p.id, email: p.email, mood: p.mood, texto: p.texto, likes: p.likes,
      anon: !!p.anon, hidden: !!p.hidden,
      createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date((p.createdAt as unknown as number) * 1000)).toISOString(),
    })),
  };
}

/** [ADMIN] Oculta (deleta do feed) um post. */
export async function ocultarPost(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  await db.update(communityPosts).set({ hidden: 1 }).where(eq(communityPosts.id, postId));
  return { ok: true };
}

/** [ADMIN] Bane um email da comunidade + oculta todos os posts dele. */
export async function banirEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("[Database] not available");
  const e = (email || "").toLowerCase().trim();
  if (!e) return { ok: false };
  try { await db.insert(communityBanned).values({ email: e }); } catch (_) {}
  await db.update(communityPosts).set({ hidden: 1 }).where(eq(communityPosts.email, e));
  return { ok: true };
}
