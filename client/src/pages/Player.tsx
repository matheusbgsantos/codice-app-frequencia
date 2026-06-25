import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  Play,
  Pause,
  ChevronDown,
  Headphones,
  Target,
  Moon,
  Repeat,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { frequencyData } from "@shared/frequencies";
import { getIcon } from "@/lib/getIcon";
import { FrequencyCover } from "@/components/FrequencyCover";
import { usePlayer, type PlayerMode } from "@/context/PlayerContext";
import { trpc } from "@/lib/trpc";

// Estágios de evolução mapeados por dias de prática acumulados.
// day1 = Primeiro Contato (dia 1); week1 = Reprogramação (2-7);
// month1 = Transformação (8-30); month3 = Potencial Máximo (30+).
const EVOLUTION_STAGES = [
  { key: "day1", label: "PRIMEIRO CONTATO", min: 1, max: 1 },
  { key: "week1", label: "REPROGRAMAÇÃO", min: 2, max: 7 },
  { key: "month1", label: "TRANSFORMAÇÃO", min: 8, max: 30 },
  { key: "month3", label: "POTENCIAL MÁXIMO", min: 31, max: Infinity },
] as const;

/** Índice do estágio atual a partir dos dias concluídos (0 se nenhum). */
function stageIndexForDays(days: number): number {
  if (days <= 0) return -1;
  for (let i = 0; i < EVOLUTION_STAGES.length; i++) {
    if (days <= EVOLUTION_STAGES[i].max) return i;
  }
  return EVOLUTION_STAGES.length - 1;
}

export default function Player() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = params.id || "escudo";

  const {
    currentId,
    isPlaying,
    progress,
    currentTime,
    duration,
    mode,
    hasAudio,
    loop,
    sleepTimerMinutes,
    sleepRemainingSeconds,
    playFrequency,
    togglePlay,
    seek,
    setMode,
    toggleLoop,
    setSleepTimer,
  } = usePlayer();

  const [showSleepMenu, setShowSleepMenu] = useState(false);

  const frequency = frequencyData[id];

  const logSessionMutation = trpc.progress.logSession.useMutation();

  // Progresso real do usuário (Épico 4.3) — alimenta a evolução dinâmica.
  const userEmail =
    typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
  const statsQuery = trpc.progress.stats.useQuery(
    { email: userEmail ?? "" },
    { enabled: !!userEmail },
  );
  const daysCompleted = statsQuery.data?.daysCompleted ?? 0;

  const handleLogSession = () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail || !frequencyData[id]) return;
    logSessionMutation.mutate({
      email: userEmail,
      frequencyId: id,
      mode,
      durationSeconds: Math.round(currentTime),
    });
  };

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      setLocation("/");
    }
  }, [setLocation]);

  // Garante que esta frequência esteja carregada no player global.
  // Se já é a atual (ex.: veio do mini-player), não reinicia.
  useEffect(() => {
    if (frequencyData[id] && currentId !== id) {
      playFrequency(id);
    }
  }, [id, currentId, playFrequency]);

  if (!frequency) {
    setLocation("/dashboard");
    return null;
  }

  const Icon = getIcon(frequency.iconName);
  // Só reflete play visual se a frequência atual do player é esta.
  const thisIsCurrent = currentId === id;
  const playing = thisIsCurrent && isPlaying;

  const handleModeChange = (newMode: PlayerMode) => {
    setMode(newMode);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    seek(x / rect.width);
  };

  // Formata mm:ss para a contagem regressiva do sleep-timer.
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sleepOptions: Array<{ label: string; minutes: number | null }> = [
    { label: "15 min", minutes: 15 },
    { label: "30 min", minutes: 30 },
    { label: "60 min", minutes: 60 },
    { label: "∞", minutes: null },
  ];

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header — voltar minimiza pro mini-player (áudio continua) */}
      <div className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-sm border-b border-[#C5A059]/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              handleLogSession();
              setLocation("/dashboard");
            }}
            className="text-[#EAEAEA]/60 hover:text-[#C5A059] hover:bg-transparent text-sm"
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            Minimizar
          </Button>
          <div className="flex items-center gap-2 text-[#C5A059]">
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{frequency.frequency}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 pb-28">
        {/* Title Section */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-5xl text-[#EAEAEA] tracking-[0.1em] mb-2">
            {frequency.title}
          </h1>
          <p className="text-[#C5A059] text-lg md:text-xl">
            {frequency.tagline}
          </p>
        </div>

        {/* Description */}
        <div className="mb-8 p-4 md:p-6 bg-[#0a0a0a] border border-[#C5A059]/20 rounded-xl">
          <p className="text-[#EAEAEA]/80 text-sm md:text-base leading-relaxed">
            {frequency.description}
          </p>
        </div>

        {/* Player Section */}
        <div className="mb-8 p-4 md:p-6 bg-gradient-to-b from-[#0a0a0a] to-[#050505] border border-[#C5A059]/30 rounded-xl">
          {/* Mode Selector */}
          <div className="mb-6">
            <p className="text-[#EAEAEA]/60 text-xs tracking-wider mb-3 text-center uppercase">
              Selecione a Potência
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <button
                onClick={() => handleModeChange("ambiente")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === "ambiente"
                    ? "bg-[#C5A059] text-[#050505]"
                    : "bg-[#1a1a1a] text-[#EAEAEA]/60 hover:text-[#EAEAEA]"
                }`}
              >
                🎵 AMBIENTE
              </button>
              <button
                onClick={() => handleModeChange("puro")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === "puro"
                    ? "bg-[#C5A059] text-[#050505]"
                    : "bg-[#1a1a1a] text-[#EAEAEA]/60 hover:text-[#EAEAEA]"
                }`}
              >
                ⚡ PURO
              </button>
            </div>
            <p className="text-[#C5A059]/50 text-[10px] md:text-xs text-center mt-2">
              💡 Comece no Modo Ambiente por 7 dias antes do Modo Puro
            </p>
          </div>

          {/* Visualizer — capa álbum (imagem real /covers/{id}.png) */}
          <div className="relative flex justify-center mb-6">
            <div
              className={`absolute inset-0 bg-[#C5A059]/10 rounded-full blur-3xl transition-opacity duration-1000 max-w-[220px] mx-auto ${
                playing ? "opacity-100" : "opacity-30"
              }`}
            />
            <div className="relative w-44 h-44 md:w-56 md:h-56 overflow-hidden rounded-2xl border border-[#C5A059]/30 shadow-[0_0_40px_rgba(197,160,89,0.2)]">
              <FrequencyCover
                iconName={frequency.iconName}
                frequencyId={frequency.id}
                size="lg"
                className="h-full w-full"
              />
              {/* Pulso dourado sutil quando tocando */}
              <div
                className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.25),transparent_70%)] transition-opacity duration-1000 ${
                  playing ? "opacity-100 animate-pulse" : "opacity-0"
                }`}
              />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-4">
            <div
              className="h-1 bg-[#1a1a1a] rounded-full cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] rounded-full transition-all"
                style={{ width: `${thisIsCurrent && hasAudio ? progress : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[#EAEAEA]/40 text-xs mt-2">
              <span>{thisIsCurrent ? formatTime(currentTime) : "0:00"}</span>
              <span>
                {thisIsCurrent && duration ? formatTime(duration) : "0:00"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            {/* Toggle de Loop */}
            <button
              onClick={toggleLoop}
              title={loop ? "Loop infinito ativado" : "Loop desligado"}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                loop
                  ? "bg-[#C5A059]/20 text-[#C5A059] shadow-[0_0_15px_rgba(197,160,89,0.3)]"
                  : "bg-[#1a1a1a] text-[#EAEAEA]/40 hover:text-[#EAEAEA]"
              }`}
            >
              <Repeat className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (!hasAudio) return;
                if (!thisIsCurrent) {
                  playFrequency(id, mode);
                } else {
                  togglePlay();
                }
              }}
              disabled={!hasAudio}
              className="w-16 h-16 bg-[#C5A059] rounded-full flex items-center justify-center hover:bg-[#D4AF37] transition-all hover:scale-105 shadow-[0_0_30px_rgba(197,160,89,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {playing ? (
                <Pause className="w-7 h-7 text-[#050505]" fill="#050505" />
              ) : (
                <Play className="w-7 h-7 text-[#050505] ml-1" fill="#050505" />
              )}
            </button>

            {/* Sleep-timer */}
            <div className="relative">
              <button
                onClick={() => setShowSleepMenu((v) => !v)}
                title="Sleep-timer"
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  sleepTimerMinutes !== null
                    ? "bg-[#C5A059]/20 text-[#C5A059] shadow-[0_0_15px_rgba(197,160,89,0.3)]"
                    : "bg-[#1a1a1a] text-[#EAEAEA]/40 hover:text-[#EAEAEA]"
                }`}
              >
                <Moon className="w-5 h-5" />
              </button>
              {showSleepMenu && (
                <div className="absolute bottom-14 right-0 z-20 w-44 bg-[#0a0a0a] border border-[#C5A059]/30 rounded-xl p-2 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
                  <p className="text-[#EAEAEA]/50 text-[10px] tracking-wider uppercase px-2 py-1">
                    Tocar por:
                  </p>
                  {sleepOptions.map((opt) => {
                    const active = sleepTimerMinutes === opt.minutes;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setSleepTimer(opt.minutes);
                          setShowSleepMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? "bg-[#C5A059] text-[#050505] font-medium"
                            : "text-[#EAEAEA]/70 hover:bg-[#1a1a1a] hover:text-[#EAEAEA]"
                        }`}
                      >
                        {opt.label}
                        {opt.minutes === null ? " (loop infinito)" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Status: timer ativo ou loop infinito */}
          <p className="text-center text-[#EAEAEA]/40 text-xs mt-4">
            {!hasAudio
              ? "Áudio em breve para esta frequência"
              : sleepTimerMinutes !== null && sleepRemainingSeconds > 0
                ? `⏳ Desliga em ${formatCountdown(sleepRemainingSeconds)}`
                : loop
                  ? "∞ Loop infinito ativado"
                  : "Loop desligado"}
          </p>
        </div>

        {/* HOW TO USE Section */}
        <div className="mb-8">
          <h2 className="text-[#C5A059] text-lg md:text-xl tracking-[0.1em] mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            COMO USAR
          </h2>
          <div className="bg-[#0a0a0a] border border-[#C5A059]/20 rounded-xl p-4 md:p-6 space-y-4">
            <div>
              <span className="text-[#C5A059] text-sm font-medium">🎧 Equipamento:</span>
              <p className="text-[#EAEAEA]/80 text-sm mt-1">{frequency.howToUse.equipment}</p>
            </div>
            <div>
              <span className="text-[#C5A059] text-sm font-medium">🧘 Postura:</span>
              <p className="text-[#EAEAEA]/80 text-sm mt-1">{frequency.howToUse.posture}</p>
            </div>
            <div>
              <span className="text-[#C5A059] text-sm font-medium">⏱️ Duração:</span>
              <p className="text-[#EAEAEA]/80 text-sm mt-1">{frequency.howToUse.duration}</p>
            </div>
            <div>
              <span className="text-[#C5A059] text-sm font-medium">🌅 Melhor Horário:</span>
              <p className="text-[#EAEAEA]/80 text-sm mt-1">{frequency.howToUse.bestTime}</p>
            </div>
            <div>
              <span className="text-[#C5A059] text-sm font-medium">💡 Dicas:</span>
              <ul className="mt-2 space-y-1">
                {frequency.howToUse.tips.map((tip, i) => (
                  <li key={i} className="text-[#EAEAEA]/70 text-sm flex items-start gap-2">
                    <span className="text-[#C5A059]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* EVOLUTION Section — DINÂMICA (Épico 4.3) */}
        <div className="mb-8">
          <h2 className="text-[#C5A059] text-lg md:text-xl tracking-[0.1em] mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            SUA EVOLUÇÃO
          </h2>

          {(() => {
            const currentIdx = stageIndexForDays(daysCompleted);
            const hasProgress = currentIdx >= 0;

            // Resumo de status no topo.
            let summary: React.ReactNode;
            if (!userEmail) {
              summary = (
                <p className="text-[#EAEAEA]/60 text-sm">
                  Faça login para acompanhar sua evolução.
                </p>
              );
            } else if (!hasProgress) {
              summary = (
                <p className="text-[#EAEAEA]/60 text-sm">
                  Comece uma jornada para evoluir. Cada dia de prática avança
                  você por estes estágios.
                </p>
              );
            } else {
              const stage = EVOLUTION_STAGES[currentIdx];
              const next = EVOLUTION_STAGES[currentIdx + 1];
              const daysToNext = next ? next.min - daysCompleted : 0;
              summary = (
                <p className="text-[#EAEAEA] text-sm">
                  Você está em{" "}
                  <span className="text-[#C5A059] font-semibold">
                    {stage.label}
                  </span>{" "}
                  (dia {daysCompleted}).{" "}
                  {next ? (
                    <>
                      Faltam{" "}
                      <span className="text-[#C5A059] font-semibold">
                        {daysToNext}
                      </span>{" "}
                      {daysToNext === 1 ? "dia" : "dias"} para {next.label}.
                    </>
                  ) : (
                    <span className="text-[#C5A059]">
                      Você atingiu o estágio máximo. ✦
                    </span>
                  )}
                </p>
              );
            }

            return (
              <>
                <div className="mb-5 p-4 bg-[#0a0a0a] border border-[#C5A059]/20 rounded-xl">
                  {summary}
                </div>

                <div className="space-y-4">
                  {EVOLUTION_STAGES.map((stage, idx) => {
                    const ev =
                      frequency.evolution[
                        stage.key as keyof typeof frequency.evolution
                      ];
                    const achieved = hasProgress && idx < currentIdx;
                    const isCurrent = hasProgress && idx === currentIdx;
                    const locked = !hasProgress || idx > currentIdx;

                    const containerClass = isCurrent
                      ? "bg-gradient-to-br from-[#C5A059]/20 to-[#0a0a0a] border border-[#C5A059] shadow-[0_0_25px_rgba(197,160,89,0.25)]"
                      : achieved
                        ? "bg-[#0a0a0a] border border-[#C5A059]/50"
                        : "bg-[#0a0a0a] border border-[#C5A059]/10 opacity-40";

                    return (
                      <div
                        key={stage.key}
                        className={`rounded-xl p-4 md:p-6 transition-all ${containerClass}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3
                            className={`text-base md:text-lg font-medium ${
                              isCurrent || achieved
                                ? "text-[#C5A059]"
                                : "text-[#EAEAEA]/70"
                            }`}
                          >
                            {(ev as { title: string }).title}
                          </h3>
                          <span className="flex items-center gap-1 text-[10px] tracking-wider uppercase">
                            {isCurrent && (
                              <span className="text-[#D4AF37] animate-pulse">
                                ● Você está aqui
                              </span>
                            )}
                            {achieved && (
                              <span className="text-[#C5A059]/80">
                                ✓ Alcançado
                              </span>
                            )}
                            {locked && !isCurrent && (
                              <Lock className="w-3 h-3 text-[#EAEAEA]/30" />
                            )}
                          </span>
                        </div>

                        {stage.key === "month3" ? (
                          <p className="text-[#EAEAEA] text-sm md:text-base leading-relaxed">
                            {(ev as { description: string }).description}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <span className="text-[#C5A059] text-xs tracking-wider">
                                CORPO:
                              </span>
                              <p className="text-[#EAEAEA]/80 text-sm mt-1">
                                {(ev as { physical: string }).physical}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#C5A059] text-xs tracking-wider">
                                MENTE:
                              </span>
                              <p className="text-[#EAEAEA]/80 text-sm mt-1">
                                {(ev as { mental: string }).mental}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-[#C5A059]/10">
                              <p className="text-[#C5A059]/80 text-sm italic">
                                "{(ev as { sensation: string }).sensation}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-[#C5A059]/10">
          <p className="text-[#EAEAEA]/40 text-xs">
            Use com consistência para resultados duradouros
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
