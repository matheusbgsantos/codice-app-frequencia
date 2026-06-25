import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  ChevronLeft,
  Play,
  Pause,
  Check,
  Flame,
  Lock,
  Repeat,
} from "lucide-react";
import { getJourney } from "@shared/journeys";
import { frequencyData } from "@shared/frequencies";
import { FrequencyCover } from "@/components/FrequencyCover";
import { ProgressRing } from "@/components/ProgressRing";
import { JourneyTimeline } from "@/components/JourneyTimeline";
import { usePlayer } from "@/context/PlayerContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Trilha() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  // Player GLOBAL — usado SÓ para tocar dentro do contexto da jornada.
  // A navegação permanece nesta tela (NÃO vamos para /player/:id da biblioteca).
  const {
    playJourney,
    togglePlay,
    seek,
    toggleLoop,
    loop,
    journeyId: playingJourneyId,
    isPlaying,
    progress,
    currentTime,
    duration,
    hasAudio,
  } = usePlayer();
  const [email, setEmail] = useState<string | null>(null);

  const journeyId = params.id || "";
  const journey = getJourney(journeyId);

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      setLocation("/");
      return;
    }
    setEmail(userEmail);
  }, [setLocation]);

  const utils = trpc.useUtils();
  const progressQuery = trpc.progress.get.useQuery(
    { email: email ?? "" },
    { enabled: !!email },
  );

  const startMutation = trpc.progress.startJourney.useMutation({
    onSuccess: () => {
      utils.progress.get.invalidate();
      toast.success("Jornada iniciada! Bons 30 dias.");
    },
  });

  const completeMutation = trpc.progress.completeDay.useMutation({
    onSuccess: (data) => {
      utils.progress.get.invalidate();
      utils.progress.stats.invalidate();
      const streak = data?.streakCount ?? 0;
      toast.success(`Dia concluído! 🔥 ${streak} dia(s) seguido(s).`);
    },
  });

  if (!journey) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#EAEAEA]/60">Jornada não encontrada.</p>
          <button
            onClick={() => setLocation("/jornada")}
            className="mt-4 text-[#C5A059] underline"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const progress_ = progressQuery.data;
  const isActiveHere = progress_?.activeJourneyId === journeyId;
  const currentDay = isActiveHere ? progress_?.currentDay ?? 1 : 1;
  const streak = isActiveHere ? progress_?.streakCount ?? 0 : 0;

  // Frequência do dia de hoje (usada só para texto/visual do card).
  const todayEntry =
    journey.days.find((d) => d.day === currentDay) ?? journey.days[0];
  const todayFreq = frequencyData[todayEntry.frequencyId];

  // Já concluiu hoje? (lastSessionDate == hoje em UTC)
  const todayYmd = new Date().toISOString().slice(0, 10);
  const completedToday =
    isActiveHere && progress_?.lastSessionDate === todayYmd;

  // Esta jornada está carregada/tocando no player global?
  const isThisJourneyLoaded = playingJourneyId === journeyId;
  const journeyHasAudio = !!journey.audioUrl && journey.audioUrl.length > 0;

  const handleStart = () => {
    if (!email) return;
    startMutation.mutate({ email, journeyId });
  };

  // Toca o ÁUDIO PRÓPRIO da jornada, SEM sair desta tela.
  const handlePlayToday = () => {
    if (isThisJourneyLoaded) {
      // Já carregada: só alterna play/pause (continua na trilha).
      togglePlay();
      return;
    }
    const started = playJourney({
      id: journey.id,
      title: journey.title,
      subtitle: `Dia ${currentDay} • ${journey.subtitle}`,
      cover: journey.coverImage,
      audioUrl: journey.audioUrl,
    });
    if (!started) {
      toast("Áudio desta jornada em breve — você ainda pode concluir o dia.");
    }
  };

  const handleCompleteDay = () => {
    if (!email || !isActiveHere) return;
    completeMutation.mutate({
      email,
      journeyId,
      day: currentDay,
      frequencyId: todayEntry.frequencyId,
    });
  };

  const finished =
    isActiveHere && currentDay >= journey.totalDays && completedToday;

  // Play/pause visual reflete apenas se ESTA jornada está no player.
  const playingHere = isThisJourneyLoaded && isPlaying;

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

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Fundo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#C5A059]/8 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur-sm border-b border-[#C5A059]/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setLocation("/jornada")}
            className="flex items-center text-[#EAEAEA]/60 hover:text-[#C5A059] text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Jornadas
          </button>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-[#D4AF37]">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-medium">{streak} dias</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 md:py-8 pb-44">
        {/* Título da trilha */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl text-[#EAEAEA] font-semibold tracking-tight">
            {journey.title}
          </h1>
          <p className="text-[#C5A059] text-sm md:text-base mt-1">
            {journey.subtitle}
          </p>
        </div>

        {!isActiveHere ? (
          /* ---- Trilha ainda não iniciada ---- */
          <div className="rounded-xl border border-[#C5A059]/25 bg-[#0a0a0a] p-6 text-center">
            <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-xl border border-[#C5A059]/20">
              <FrequencyCover
                iconName={journey.iconName}
                imageSrc={journey.coverImage}
                size="lg"
                className="h-full w-full"
              />
            </div>
            <p className="text-[#EAEAEA]/70 text-sm leading-relaxed mb-6">
              {journey.description}
            </p>
            <button
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="w-full rounded-lg bg-[#C5A059] py-4 text-sm font-semibold uppercase tracking-[0.15em] text-[#050505] transition-all hover:bg-[#D4AF37] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {startMutation.isPending ? "Iniciando..." : "Começar jornada"}
            </button>
            {progress_?.activeJourneyId && (
              <p className="mt-3 text-[11px] text-[#EAEAEA]/40">
                Isso substituirá sua jornada ativa atual.
              </p>
            )}
          </div>
        ) : (
          /* ---- Trilha ativa ---- */
          <>
            {/* Anel de progresso */}
            <div className="flex justify-center mb-8">
              <ProgressRing current={currentDay} total={journey.totalDays} />
            </div>

            {/* Card HOJE — com PLAYER EMBUTIDO (não sai da jornada) */}
            <section className="mb-8">
              <h2 className="text-[#C5A059] text-xs uppercase tracking-[0.2em] mb-3">
                {finished ? "Jornada concluída 🎉" : "Hoje"}
              </h2>
              <div className="rounded-xl border border-[#C5A059]/30 bg-gradient-to-b from-[#0a0a0a] to-[#050505] p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayToday}
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[#C5A059]/20"
                    aria-label={playingHere ? "Pausar" : "Tocar"}
                  >
                    <FrequencyCover
                      iconName={journey.iconName}
                      imageSrc={journey.coverImage}
                      size="lg"
                      className="h-full w-full"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                      {playingHere ? (
                        <Pause
                          className="h-7 w-7 text-[#D4AF37]"
                          fill="#D4AF37"
                        />
                      ) : (
                        <Play
                          className="h-7 w-7 text-[#D4AF37]"
                          fill="#D4AF37"
                        />
                      )}
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#EAEAEA]/40">
                      Dia {currentDay} • {todayFreq.frequency}
                    </p>
                    <h3 className="text-lg font-semibold text-[#EAEAEA] truncate">
                      {todayFreq.title}
                    </h3>
                    <p className="text-xs text-[#C5A059]/80 italic mt-0.5 line-clamp-2">
                      "{todayEntry.focusText}"
                    </p>
                  </div>
                </div>

                {/* Player embutido: progresso + tempos (aparece quando esta
                    jornada está carregada e tem áudio). Tudo DENTRO da trilha. */}
                {isThisJourneyLoaded && journeyHasAudio && (
                  <div className="mt-4">
                    <div
                      className="h-1 cursor-pointer overflow-hidden rounded-full bg-[#1a1a1a]"
                      onClick={handleProgressClick}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-[#EAEAEA]/40">
                      <span>{formatTime(currentTime)}</span>
                      <span>{duration ? formatTime(duration) : "0:00"}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={handlePlayToday}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#C5A059] py-3 text-sm font-semibold text-[#050505] transition-all hover:bg-[#D4AF37]"
                  >
                    {playingHere ? (
                      <>
                        <Pause className="h-4 w-4" fill="#050505" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" fill="#050505" />
                        Tocar
                      </>
                    )}
                  </button>
                  {/* Loop infinito (mesmo conforto do player da biblioteca) */}
                  {isThisJourneyLoaded && journeyHasAudio && (
                    <button
                      onClick={toggleLoop}
                      title={loop ? "Loop infinito ativado" : "Loop desligado"}
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-all ${
                        loop
                          ? "bg-[#C5A059]/20 text-[#C5A059]"
                          : "border border-[#C5A059]/30 text-[#EAEAEA]/50 hover:text-[#EAEAEA]"
                      }`}
                    >
                      <Repeat className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={handleCompleteDay}
                    disabled={completedToday || completeMutation.isPending}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                      completedToday
                        ? "bg-[#C5A059]/15 text-[#D4AF37] cursor-default"
                        : "border border-[#C5A059]/40 text-[#EAEAEA] hover:border-[#C5A059] hover:bg-[#C5A059]/10"
                    } disabled:opacity-70`}
                  >
                    {completedToday ? (
                      <>
                        <Check className="h-4 w-4" />
                        Concluído hoje
                      </>
                    ) : completeMutation.isPending ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Concluir dia
                      </>
                    )}
                  </button>
                </div>
                {!journeyHasAudio && (
                  <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-[#EAEAEA]/40">
                    <Lock className="h-3 w-3" />
                    Áudio em breve — você ainda pode concluir o dia.
                  </p>
                )}
              </div>
            </section>

            {/* Linha do tempo */}
            <section>
              <h2 className="text-[#C5A059] text-xs uppercase tracking-[0.2em] mb-3">
                Linha do tempo • 30 dias
              </h2>
              <JourneyTimeline days={journey.days} currentDay={currentDay} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
