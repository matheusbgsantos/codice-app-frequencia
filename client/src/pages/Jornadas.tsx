import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { journeyData, journeyOrder, type JourneyData } from "@shared/journeys";
import { FrequencyCover } from "@/components/FrequencyCover";
import { trpc } from "@/lib/trpc";

export default function Jornadas() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      setLocation("/");
      return;
    }
    setEmail(userEmail);
  }, [setLocation]);

  const progressQuery = trpc.progress.get.useQuery(
    { email: email ?? "" },
    { enabled: !!email },
  );

  const activeJourneyId = progressQuery.data?.activeJourneyId ?? null;
  const currentDay = progressQuery.data?.currentDay ?? 1;

  // Ordena: jornada ativa primeiro.
  const ordered = [...journeyOrder].sort((a, b) => {
    if (a === activeJourneyId) return -1;
    if (b === activeJourneyId) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Fundo místico */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#C5A059]/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-[#C5A059]/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 md:py-8 pb-44">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl text-[#EAEAEA] font-semibold tracking-tight">
            Jornadas Guiadas
          </h1>
          <p className="text-[#C5A059] text-sm md:text-base mt-1">
            30 dias para transformar sua frequência
          </p>
        </header>

        <div className="space-y-4">
          {ordered.map((id) => {
            const journey = journeyData[id];
            const isActive = id === activeJourneyId;
            return (
              <JourneyCard
                key={id}
                journey={journey}
                isActive={isActive}
                currentDay={isActive ? currentDay : 0}
                onOpen={() => setLocation(`/jornada/${id}`)}
              />
            );
          })}
        </div>

        <p className="mt-10 text-center text-[#EAEAEA]/20 text-xs tracking-wider">
          Uma frequência por dia. Constância gera transformação.
        </p>
      </div>
    </div>
  );
}

function JourneyCard({
  journey,
  isActive,
  currentDay,
  onOpen,
}: {
  journey: JourneyData;
  isActive: boolean;
  currentDay: number;
  onOpen: () => void;
}) {
  const pct = isActive
    ? Math.min(100, Math.round((currentDay / journey.totalDays) * 100))
    : 0;

  return (
    <button
      onClick={onOpen}
      className={`group flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-all active:scale-[0.99] ${
        isActive
          ? "border-[#C5A059]/60 bg-gradient-to-br from-[#1a1408]/60 to-[#0a0a0a] shadow-[0_0_30px_rgba(197,160,89,0.15)]"
          : "border-[#C5A059]/20 bg-[#0a0a0a] hover:border-[#C5A059]/50"
      }`}
    >
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[#C5A059]/20">
        <FrequencyCover
          iconName={journey.iconName}
          imageSrc={journey.coverImage}
          size="lg"
          className="h-full w-full"
        />
      </div>

      <div className="min-w-0 flex-1">
        {isActive && (
          <span className="mb-1 inline-block rounded-full bg-[#C5A059]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#D4AF37]">
            Em andamento
          </span>
        )}
        <h2 className="truncate text-base md:text-lg font-semibold text-[#EAEAEA]">
          {journey.title}
        </h2>
        <p className="truncate text-xs md:text-sm text-[#C5A059]">
          {journey.subtitle}
        </p>

        {isActive ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-[#EAEAEA]/50">
              <span>
                Dia {currentDay}/{journey.totalDays}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-1 line-clamp-2 text-xs text-[#EAEAEA]/40 leading-snug">
            {journey.description}
          </p>
        )}
      </div>

      <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#C5A059]/50 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
