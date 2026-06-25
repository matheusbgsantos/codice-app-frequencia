/**
 * Anel de progresso circular (SVG) — Dia X de 30 e percentual no centro.
 * Identidade preto/dourado.
 */
export function ProgressRing({
  current,
  total,
  size = 200,
  strokeWidth = 12,
}: {
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C5A059" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>
        {/* Trilho de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={strokeWidth}
        />
        {/* Progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGold)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s ease",
            filter: "drop-shadow(0 0 6px rgba(197,160,89,0.5))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#EAEAEA]/40">
          Dia
        </span>
        <span className="text-4xl font-semibold text-[#EAEAEA] leading-none">
          {current}
        </span>
        <span className="text-xs text-[#C5A059] mt-1">de {total}</span>
        <span className="mt-1 text-[11px] text-[#EAEAEA]/40">{pct}%</span>
      </div>
    </div>
  );
}
