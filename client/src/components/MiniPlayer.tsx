import { useLocation } from "wouter";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { FrequencyCover } from "@/components/FrequencyCover";

/**
 * Mini-player fixo na base (estilo Spotify), na identidade preto/dourado.
 * Aparece sempre que há algo carregado — uma frequência da BIBLIOTECA ou o
 * áudio de uma JORNADA. Clicar abre a tela correspondente:
 *  - frequência -> /player/:id (tela cheia da biblioteca)
 *  - jornada    -> /jornada/:id (a própria trilha; NÃO abre a biblioteca)
 * O play/pause não muda de rota.
 */
export function MiniPlayer() {
  const { nowPlaying, journeyId, isPlaying, progress, togglePlay, hasAudio } =
    usePlayer();
  const [location, setLocation] = useLocation();

  if (!nowPlaying) return null;

  const isJourney = nowPlaying.kind === "journey";
  // Rota de destino ao clicar na barra.
  const targetRoute = isJourney
    ? `/jornada/${nowPlaying.id}`
    : `/player/${nowPlaying.id}`;

  // Não exibe sobre a própria tela de destino.
  if (location === targetRoute) return null;
  // Também esconde na própria trilha ativa (player embutido cuida disso).
  if (isJourney && journeyId && location === `/jornada/${journeyId}`)
    return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 md:px-4 md:pb-4">
      <div
        className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-[#C5A059]/30 bg-[#0a0a0a]/95 shadow-[0_-4px_30px_rgba(0,0,0,0.6)] backdrop-blur-md"
        role="button"
        tabIndex={0}
        onClick={() => setLocation(targetRoute)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setLocation(targetRoute);
        }}
      >
        {/* Barra de progresso fina dourada no topo da barra */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#1a1a1a]">
          <div
            className="h-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] transition-all"
            style={{ width: `${hasAudio ? progress : 0}%` }}
          />
        </div>

        <div className="flex items-center gap-3 p-2.5">
          {/* Capa pequena (imagem real com fallback) */}
          <FrequencyCover
            iconName="Sparkles"
            imageSrc={nowPlaying.cover}
            size="sm"
            className="h-12 w-12 flex-shrink-0 rounded-md"
          />

          {/* Nome + subtítulo */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium tracking-wide text-[#EAEAEA]">
              {nowPlaying.title}
            </p>
            <p className="truncate text-xs text-[#C5A059]">
              {nowPlaying.subtitle}
              {isJourney && (
                <span className="ml-2 text-[#EAEAEA]/40">• Jornada</span>
              )}
              {!hasAudio && (
                <span className="ml-2 text-[#EAEAEA]/40">
                  • áudio em breve
                </span>
              )}
            </p>
          </div>

          {/* Play / Pause */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            disabled={!hasAudio}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#C5A059] transition-all hover:scale-105 hover:bg-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-[#050505]" fill="#050505" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 text-[#050505]" fill="#050505" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
