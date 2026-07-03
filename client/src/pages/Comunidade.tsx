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
    refetchInterval: 20000,
  });
  const createMut = trpc.community.create.useMutation();
  const likeMut = trpc.community.like.useMutation();

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

  async function curtir(postId: number) {
    if (!email) return;
    try {
      await likeMut.mutateAsync({ postId, email });
      await listQuery.refetch();
    } catch (_) {
      /* silencioso */
    }
  }

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

  return (
    <div className="mx-auto max-w-2xl px-4 pb-40 pt-6">
      {/* Cabeçalho */}
      <div className="mb-5 text-center">
        <h1 className="font-serif text-2xl font-semibold tracking-wide text-[#C5A059]">
          Comunidade
        </h1>
        <p className="mt-1 text-sm text-[#EAEAEA]/50">
          Um espaço seguro. Você não está sozinho.
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
          <div
            key={p.id}
            className="mb-3 rounded-2xl border border-[#24242b] bg-[#101014] p-4"
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C5A059] to-[#7a6535] font-serif text-sm font-semibold text-[#1a1206]">
                {p.inicial}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#EAEAEA]">
                  {p.nome}
                  {p.mood ? (
                    <span className="ml-1 font-normal text-[#EAEAEA]/70">
                      · {p.mood}
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-[#EAEAEA]/40">
                  {tempoRelativo(p.createdAt)}
                </div>
              </div>
            </div>
            {p.texto ? (
              <div className="text-[14.5px] leading-relaxed text-[#EAEAEA]/85">
                {p.texto}
              </div>
            ) : null}
            <div className="mt-3 flex gap-5 border-t border-[#24242b] pt-2.5">
              <button
                onClick={() => curtir(p.id)}
                className="flex items-center gap-1.5 text-[13px] text-[#EAEAEA]/50 transition-colors hover:text-[#C5A059]"
              >
                ❤️ <span>{p.likes}</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
