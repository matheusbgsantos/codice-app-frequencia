import { Check } from "lucide-react";
import type { JourneyDay } from "@shared/journeys";

/**
 * Linha do tempo dos 30 dias da jornada.
 * Selos: completos = dourado preenchido, hoje = destaque, futuros = apagado.
 */
export function JourneyTimeline({
  days,
  currentDay,
  onSelectDay,
}: {
  days: JourneyDay[];
  /** Dia atual (1-30). Dias < currentDay são considerados concluídos. */
  currentDay: number;
  onSelectDay?: (day: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2.5 sm:grid-cols-10">
      {days.map((d) => {
        const isDone = d.day < currentDay;
        const isToday = d.day === currentDay;
        const isFuture = d.day > currentDay;

        return (
          <button
            key={d.day}
            onClick={() => onSelectDay?.(d.day)}
            disabled={!onSelectDay}
            title={d.focusText}
            className={`relative flex aspect-square items-center justify-center rounded-lg border text-sm font-medium transition-all ${
              isDone
                ? "border-[#C5A059] bg-gradient-to-br from-[#C5A059] to-[#D4AF37] text-[#050505]"
                : isToday
                  ? "border-[#D4AF37] bg-[#C5A059]/15 text-[#D4AF37] shadow-[0_0_14px_rgba(197,160,89,0.4)] ring-1 ring-[#D4AF37]"
                  : "border-[#C5A059]/15 bg-[#0a0a0a] text-[#EAEAEA]/30"
            } ${onSelectDay ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
          >
            {isDone ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <span className={isFuture ? "opacity-60" : ""}>{d.day}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
