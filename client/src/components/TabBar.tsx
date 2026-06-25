import { useLocation } from "wouter";
import { Compass, Library } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

/**
 * Barra de navegação inferior com 2 abas: Jornada e Biblioteca.
 * Fica ACIMA do MiniPlayer quando há áudio carregado.
 * Identidade preto/dourado, mobile-first.
 */
export function TabBar() {
  const [location, setLocation] = useLocation();
  const { currentId } = usePlayer();

  // Não exibe na tela de login nem na tela cheia do player.
  if (location === "/" || location.startsWith("/player/")) return null;

  // Se há áudio carregado, o MiniPlayer ocupa a base — sobe a TabBar.
  const liftForMiniPlayer = !!currentId;

  const isJornada =
    location === "/jornada" || location.startsWith("/jornada/");
  const isBiblioteca =
    location === "/biblioteca" || location === "/dashboard";

  const tabs = [
    {
      key: "jornada",
      label: "Jornada",
      Icon: Compass,
      active: isJornada,
      to: "/jornada",
    },
    {
      key: "biblioteca",
      label: "Biblioteca",
      Icon: Library,
      active: isBiblioteca,
      to: "/biblioteca",
    },
  ];

  return (
    <nav
      className="fixed left-0 right-0 z-40 px-2 pb-2 md:px-4 md:pb-3"
      style={{ bottom: liftForMiniPlayer ? "76px" : "0px" }}
    >
      <div className="mx-auto flex max-w-3xl items-stretch gap-2 rounded-xl border border-[#C5A059]/25 bg-[#0a0a0a]/95 p-1.5 shadow-[0_-4px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
        {tabs.map(({ key, label, Icon, active, to }) => (
          <button
            key={key}
            onClick={() => setLocation(to)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-all ${
              active
                ? "bg-[#C5A059]/10 text-[#D4AF37]"
                : "text-[#EAEAEA]/45 hover:text-[#EAEAEA]/80"
            }`}
            aria-label={label}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-medium tracking-wide">
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
