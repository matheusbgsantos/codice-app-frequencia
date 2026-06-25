import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  frequencyData,
  categoryOrder,
  categoryLabels,
  type FrequencyData,
} from "@shared/frequencies";
import { FrequencyCover } from "@/components/FrequencyCover";
import { usePlayer } from "@/context/PlayerContext";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const [userName, setUserName] = useState("Iniciado");
  const [, setLocation] = useLocation();
  const { playFrequency } = usePlayer();

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    const storedName = localStorage.getItem("userName");

    if (!userEmail) {
      setLocation("/");
      return;
    }

    if (storedName) {
      setUserName(storedName);
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    setLocation("/");
  };

  // Abre a tela cheia E começa a tocar (estilo Spotify).
  const handleOpen = (id: string) => {
    playFrequency(id);
    setLocation(`/player/${id}`);
  };

  const allFrequencies = Object.values(frequencyData);

  const groupedCategories = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category] ?? category,
      items: allFrequencies.filter((f) => f.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#C5A059]/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-[#C5A059]/4 rounded-full blur-[100px]" />
      </div>

      {/* pb extra pra não cobrir conteúdo com a TabBar + mini-player */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 md:py-8 pb-44">
        {/* Header / Saudação */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl text-[#EAEAEA] font-semibold tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-[#C5A059] text-sm md:text-base mt-1">
              Bem-vindo, {userName}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-[#EAEAEA]/40 hover:text-[#EAEAEA] hover:bg-transparent text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Fileiras horizontais por categoria (estilo Spotify) */}
        {groupedCategories.map((group) => (
          <section key={group.category} className="mb-7 md:mb-10">
            <div className="flex items-baseline justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-2xl text-[#EAEAEA] font-semibold tracking-tight">
                {group.label}
              </h2>
            </div>

            {/* scroll horizontal */}
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {group.items.map((freq) => (
                <AlbumCard key={freq.id} freq={freq} onOpen={handleOpen} />
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <div className="mt-8 md:mt-12 text-center">
          <p className="text-[#EAEAEA]/20 text-xs tracking-wider">
            Use fones de ouvido para melhor experiência
          </p>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function AlbumCard({
  freq,
  onOpen,
}: {
  freq: FrequencyData;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(freq.id)}
      className="group flex-shrink-0 w-36 md:w-44 snap-start text-left transition-transform duration-300 active:scale-[0.97]"
    >
      {/* Capa quadrada estilo álbum */}
      <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-xl overflow-hidden border border-[#C5A059]/20 transition-all duration-300 group-hover:border-[#C5A059]/60 group-hover:shadow-[0_0_30px_rgba(197,160,89,0.2)]">
        <FrequencyCover
          iconName={freq.iconName}
          frequencyId={freq.id}
          size="lg"
          className="w-full h-full"
        />
      </div>

      {/* Nome + Hz */}
      <div className="mt-2 px-0.5">
        <p className="text-[#EAEAEA] text-sm font-medium tracking-wide truncate">
          {freq.title}
        </p>
        <p className="text-[#C5A059] text-xs mt-0.5">{freq.frequency}</p>
        <p className="text-[#EAEAEA]/40 text-xs mt-0.5 line-clamp-2 leading-snug">
          {freq.tagline}
        </p>
      </div>
    </button>
  );
}
