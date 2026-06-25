import { useEffect, useState } from "react";
import { getIcon } from "@/lib/getIcon";
import { cn } from "@/lib/utils";

/**
 * Capa estilo "álbum".
 *
 * Preferência: imagem real em /covers/{id}.png (ou uma URL passada via
 * `imageSrc`). Caso a imagem falhe ao carregar (onError), cai graciosamente
 * para o gradiente dourado/preto + ícone lucide (visual antigo), preservando
 * a identidade preto/dourado mística.
 *
 * Uso típico:
 *   <FrequencyCover frequencyId="escudo" iconName="Shield" />   // Biblioteca
 *   <FrequencyCover imageSrc="/covers/abundancia.png" iconName="Coins" /> // Jornada
 */
export function FrequencyCover({
  iconName,
  frequencyId,
  imageSrc,
  size = "md",
  className,
}: {
  iconName: string;
  /** id da frequência -> usa /covers/{id}.png automaticamente. */
  frequencyId?: string;
  /** caminho de imagem explícito (tem prioridade sobre frequencyId). */
  imageSrc?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = getIcon(iconName);

  const iconSize =
    size === "sm" ? "w-6 h-6" : size === "lg" ? "w-20 h-20" : "w-12 h-12";

  const resolvedSrc =
    imageSrc ?? (frequencyId ? `/covers/${frequencyId}.png` : undefined);

  const [failed, setFailed] = useState(false);

  // Se a fonte mudar, tenta carregar de novo.
  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  const showImage = !!resolvedSrc && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-[#1a1408] via-[#0a0a0a] to-[#050505]",
        className,
      )}
    >
      {showImage ? (
        <img
          src={resolvedSrc}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          {/* Fallback: brilho dourado radial + ícone */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(212,175,55,0.35),transparent_60%)]" />
          <div className="absolute -top-1/4 -right-1/4 w-2/3 h-2/3 bg-[#C5A059]/10 rounded-full blur-2xl" />
          {/* Anel sutil */}
          <div className="absolute inset-[12%] rounded-full border border-[#C5A059]/15" />
          <Icon
            className={cn(
              iconSize,
              "relative z-10 text-[#D4AF37] drop-shadow-[0_0_12px_rgba(197,160,89,0.5)]",
            )}
          />
        </>
      )}
    </div>
  );
}
