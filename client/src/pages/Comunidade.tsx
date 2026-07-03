import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const MOODS = [
  { emoji: "🕊️", label: "Em paz" },
  { emoji: "🌫️", label: "Confuso" },
  { emoji: "🔥", label: "Desperto" },
  { emoji: "😔", label: "Pra baixo" },
  { emoji: "✨", label: "Grato" },
];

function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

// Card de post com comentários expansíveis
function PostCard({ post, email, onChanged }: { post: any; email: string; onChanged: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [anonC, setAnonC] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const likeMut = trpc.community.like.useMutation();
  const commentMut = trpc.community.comment.useMutation();
  const commentsQuery = trpc.community.comments.useQuery(
    { postId: post.id },
    { enabled: aberto },
  );
  const comentarios = commentsQuery.data?.comentarios ?? [];

  async function curtir() {
    try { await likeMut.mutateAsync({ postId: post.id, email }); onChanged(); } catch (_) {}
  }
  async function enviarComentario() {
    if (!comentario.trim() || enviando) return;
    setEnviando(true);
    try {
      await commentMut.mutateAsync({ postId: post.id, email, texto: comentario.trim(), anon: anonC });
      setComentario("");
      await commentsQuery.refetch();
      onChanged();
    } catch (_) {} finally { setEnviando(false); }
  }

  return (
    <div className="mb-3 rounded-2xl border border-[#24242b] bg-[#101014] p-4">
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C5A059] to-[#7a6535] font-serif text-sm font-semibold text-[#1a1206]">
          {post.inicial}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#EAEAEA]">
            {post.nome}
            {post.mood ? <span className="ml-1 font-normal text-[#EAEAEA]/70">· {post.mood}</span> : null}
          </div>
          <div className="text-[11px] text-[#EAEAEA]/40">{tempoRelativo(post.createdAt)}</div>
        </div>
      </div>
      {post.texto ? (
        <div className="text-[14.5px] leading-relaxed text-[#EAEAEA]/85">{post.texto}</div>
      ) : null}
      <div className="mt-3 flex gap-5 border-t border-[#24242b] pt-2.5">
        <button onClick={curtir} className="flex items-center gap-1.5 text-[13px] text-[#EAEAEA]/50 transition-colors hover:text-[#C5A059]">
          ❤️ <span>{post.likes}</span>
        </button>
        <button onClick={() => setAberto((v) => !v)} className="flex items-center gap-1.5 text-[13px] text-[#EAEAEA]/50 transition-colors hover:text-[#C5A059]">
          💬 <span>{post.comentarios || 0}</span>
        </button>
      </div>

      {/* Comentários */}
      {aberto ? (
        <div className="mt-3 border-t border-[#24242b] pt-3">
          {commentsQuery.isLoading ? (
            <div className="py-2 text-center text-xs text-[#EAEAEA]/40">Carregando...</div>
          ) : comentarios.length === 0 ? (
            <div className="py-2 text-center text-xs text-[#EAEAEA]/40">Seja o primeiro a apoiar. 🫂</div>
          ) : (
            comentarios.map((c) => (
              <div key={c.id} className="mb-2.5 flex gap-2.5">
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#24242b] text-xs font-semibold text-[#C5A059]">
                  {c.inicial}
                </div>
                <div className="flex-1 rounded-xl bg-[#0a0a0a] px-3 py-2">
                  <div className="text-[12px] font-semibold text-[#EAEAEA]/80">
                    {c.nome} <span className="ml-1 font-normal text-[#EAEAEA]/35">{tempoRelativo(c.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-[#EAEAEA]/75">{c.texto}</div>
                </div>
              </div>
            ))
          )}
          {/* Campo de novo comentário */}
          <div className="mt-2 flex items-end gap-2">
            <input
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 400))}
              onKeyDown={(e) => { if (e.key === "Enter") enviarComentario(); }}
              placeholder="Escreva um apoio ou resposta..."
              className="flex-1 rounded-full border border-[#24242b] bg-[#0a0a0a] px-4 py-2.5 text-[13px] text-[#EAEAEA] placeholder:text-[#EAEAEA]/25 focus:border-[#C5A059]/50 focus:outline-none"
            />
            <button
              onClick={enviarComentario}
              disabled={enviando || !comentario.trim()}
              className="rounded-full bg-[#C5A059] px-4 py-2.5 text-[12px] font-semibold text-[#1a1206] disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-[#EAEAEA]/45">
            <input type="checkbox" checked={anonC} onChange={(e) => setAnonC(e.target.checked)} className="accent-[#C5A059]" />
            Comentar anônimo
          </label>
        </div>
      ) : null}
    </div>
  );
}

export default function Comunidade() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string | null>(null);
  const [mood, setMood] = useState<string>("🕊️ Em paz");
  const [texto, setTexto] = useState("");
  const [anon, setAnon] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      setLocation("/");
      return;
    }
    setEmail(userEmail);
  }, [setLocation]);

  const listQuery = trpc.community.list.useQuery(undefined, {
    refetchInterval: 25000,
  });
  const createMut = trpc.community.create.useMutation();

  const posts = listQuery.data?.posts ?? [];

  async function compartilhar() {
    if (!email || enviando) return;
    if (!texto.trim() && !mood) return;
    setEnviando(true);
    try {
      await createMut.mutateAsync({ email, mood, texto: texto.trim(), anon });
      setTexto("");
      await listQuery.refetch();
    } catch (_) {
      /* silencioso */
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-40 pt-6">
      {/* Cabeçalho */}
      <div className="mb-5 text-center">
        <h1 className="font-serif text-2xl font-semibold tracking-wide text-[#C5A059]">
          Comunidade
        </h1>
        <p className="mt-1 text-sm text-[#EAEAEA]/50">
          Um espaço seguro pra desabafar. Você não está sozinho.
        </p>
      </div>

      {/* Composer */}
      <div className="mb-6 rounded-2xl border border-[#24242b] bg-gradient-to-b from-[#101014] to-[#16161c] p-4">
        <div className="mb-3 font-serif text-[15px] text-[#EAEAEA]">
          Como você está se sentindo hoje?
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {MOODS.map((m) => {
            const val = `${m.emoji} ${m.label}`;
            const sel = mood === val;
            return (
              <button
                key={m.label}
                onClick={() => setMood(val)}
                className={`min-w-[60px] flex-1 rounded-xl border px-1 py-2.5 text-center transition-all ${
                  sel
                    ? "border-[#C5A059] bg-[#C5A059]/10"
                    : "border-[#24242b] bg-[#0a0a0a]"
                }`}
              >
                <div className="text-[22px]">{m.emoji}</div>
                <div className="mt-0.5 text-[10px] text-[#EAEAEA]/50">
                  {m.label}
                </div>
              </button>
            );
          })}
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 500))}
          placeholder="Compartilhe o que está sentindo... (opcional)"
          className="min-h-[64px] w-full resize-none rounded-xl border border-[#24242b] bg-[#0a0a0a] p-3 text-sm text-[#EAEAEA] placeholder:text-[#EAEAEA]/25 focus:border-[#C5A059]/50 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[#EAEAEA]/60">
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
              className="accent-[#C5A059]"
            />
            Postar anônimo
          </label>
          <button
            onClick={compartilhar}
            disabled={enviando}
            className="rounded-lg bg-gradient-to-b from-[#D4AF37] to-[#C5A059] px-6 py-2.5 text-[13px] font-semibold text-[#1a1206] disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Compartilhar"}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-[#EAEAEA]/40">
        Sentimentos da comunidade
      </div>

      {listQuery.isLoading ? (
        <div className="py-10 text-center text-sm text-[#EAEAEA]/40">
          Carregando...
        </div>
      ) : posts.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#EAEAEA]/40">
          Seja o primeiro a compartilhar como está se sentindo. 🕊️
        </div>
      ) : (
        posts.map((p) => (
          <PostCard key={p.id} post={p} email={email ?? ""} onChanged={() => listQuery.refetch()} />
        ))
      )}
    </div>
  );
}

