import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { frequencyData, type FrequencyData } from "@shared/frequencies";

export type PlayerMode = "ambiente" | "puro";

/**
 * Descritor unificado do que está tocando agora — pode vir da BIBLIOTECA
 * (uma frequência, com modos ambiente/puro) ou de uma JORNADA (áudio próprio
 * da trilha). São contextos de áudio SEPARADOS. O mini-player e demais UIs
 * leem este descritor para mostrar capa, título e subtítulo corretos.
 */
export interface NowPlaying {
  kind: "frequency" | "journey";
  id: string;
  title: string;
  /** Linha secundária: Hz da frequência ou subtítulo da jornada. */
  subtitle: string;
  /** Imagem de capa (caminho /covers/...). */
  cover: string;
}

interface PlayJourneyArgs {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  audioUrl: string;
}

interface PlayerContextValue {
  /** Frequência atualmente carregada (apenas contexto BIBLIOTECA; null fora dele). */
  current: FrequencyData | null;
  currentId: string | null;
  /** Descritor unificado do que toca agora (biblioteca OU jornada). */
  nowPlaying: NowPlaying | null;
  /** id da jornada tocando agora (ou null). */
  journeyId: string | null;
  mode: PlayerMode;
  isPlaying: boolean;
  /** Progresso 0-100. */
  progress: number;
  currentTime: number;
  duration: number;
  loop: boolean;
  /** A frequência/modo atual possui áudio disponível? */
  hasAudio: boolean;
  /** Minutos do sleep-timer ativo (null = ∞, sem timer / loop infinito). */
  sleepTimerMinutes: number | null;
  /** Segundos restantes do sleep-timer ativo (0 se não houver timer). */
  sleepRemainingSeconds: number;
  /** Carrega e toca uma frequência da BIBLIOTECA (continua entre telas). */
  playFrequency: (id: string, mode?: PlayerMode) => void;
  /**
   * Toca o áudio PRÓPRIO de uma JORNADA (contexto separado da biblioteca).
   * Se a URL estiver vazia, lida graciosamente: não toca, mas registra o
   * "now playing" para a UI mostrar "áudio em breve". Retorna se há áudio.
   */
  playJourney: (args: PlayJourneyArgs) => boolean;
  togglePlay: () => void;
  /** seek por porcentagem 0-1. */
  seek: (percent: number) => void;
  setMode: (mode: PlayerMode) => void;
  toggleLoop: () => void;
  /** Define o sleep-timer. null = ∞ (loop infinito, sem desligar). */
  setSleepTimer: (minutes: number | null) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function getAudioUrl(
  freq: FrequencyData | null,
  mode: PlayerMode,
): string | undefined {
  if (!freq) return undefined;
  const url = mode === "ambiente" ? freq.audioUrlAmbiente : freq.audioUrlPuro;
  return url && url.length > 0 ? url : undefined;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  // Estado do contexto JORNADA (separado da biblioteca).
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [journeyMeta, setJourneyMeta] = useState<NowPlaying | null>(null);
  const [journeyHasAudio, setJourneyHasAudio] = useState(false);

  const [mode, setModeState] = useState<PlayerMode>("ambiente");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(true);

  // Sleep-timer: null = ∞ (loop infinito, não desliga). Caso contrário, minutos.
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(
    null,
  );
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState(0);
  // Referências para limpar o timer/intervalo ao trocar/pausar/desmontar.
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs espelham o estado para uso dentro de callbacks estáveis.
  const loopRef = useRef(loop);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const current = currentId ? frequencyData[currentId] ?? null : null;
  const hasAudio = journeyId
    ? journeyHasAudio
    : !!getAudioUrl(current, mode);

  // Descritor unificado do que toca agora.
  const nowPlaying: NowPlaying | null = journeyId
    ? journeyMeta
    : current
      ? {
          kind: "frequency",
          id: current.id,
          title: current.title,
          subtitle: current.frequency,
          cover: `/covers/${current.id}.png`,
        }
      : null;

  const loadAndPlay = useCallback(
    (freq: FrequencyData, m: PlayerMode, autoPlay: boolean) => {
      const url = getAudioUrl(freq, m);
      const audio = audioRef.current;
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      if (!audio || !url) {
        // Sem áudio disponível: estado gracioso, nada toca.
        if (audio) audio.pause();
        setIsPlaying(false);
        return;
      }
      if (audio.src !== url) {
        audio.src = url;
        audio.load();
      }
      audio.loop = loopRef.current;
      if (autoPlay) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    },
    [],
  );

  const playFrequency = useCallback(
    (id: string, requestedMode?: PlayerMode) => {
      const freq = frequencyData[id];
      if (!freq) return;

      let m: PlayerMode = "ambiente";
      if (requestedMode === "ambiente" || requestedMode === "puro") {
        m = requestedMode;
      } else {
        const saved = localStorage.getItem(`mode_${id}`);
        if (saved === "ambiente" || saved === "puro") m = saved;
      }

      // Sai do contexto jornada ao tocar algo da biblioteca.
      setJourneyId(null);
      setJourneyMeta(null);
      setJourneyHasAudio(false);

      setCurrentId(id);
      setModeState(m);
      localStorage.setItem(`mode_${id}`, m);
      loadAndPlay(freq, m, true);
    },
    [loadAndPlay],
  );

  // Toca o áudio próprio de uma JORNADA. Contexto separado da biblioteca.
  const playJourney = useCallback((args: PlayJourneyArgs): boolean => {
    const audio = audioRef.current;
    const url = args.audioUrl && args.audioUrl.length > 0 ? args.audioUrl : "";

    // Sai do contexto biblioteca ao tocar uma jornada.
    setCurrentId(null);

    setJourneyId(args.id);
    setJourneyMeta({
      kind: "journey",
      id: args.id,
      title: args.title,
      subtitle: args.subtitle,
      cover: args.cover,
    });
    setJourneyHasAudio(!!url);

    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    if (!audio || !url) {
      // Áudio ainda não disponível: estado gracioso, nada toca.
      if (audio) audio.pause();
      setIsPlaying(false);
      return false;
    }

    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.loop = loopRef.current;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
    return true;
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || Number.isNaN(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(1, percent)) * audio.duration;
  }, []);

  const setMode = useCallback(
    (newMode: PlayerMode) => {
      if (!currentId) {
        setModeState(newMode);
        return;
      }
      const freq = frequencyData[currentId];
      if (!freq) return;
      const wasPlaying = isPlayingRef.current;
      setModeState(newMode);
      localStorage.setItem(`mode_${currentId}`, newMode);
      loadAndPlay(freq, newMode, wasPlaying);
    },
    [currentId, loadAndPlay],
  );

  const toggleLoop = useCallback(() => {
    setLoop((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.loop = next;
      return next;
    });
  }, []);

  // Limpa qualquer timer/intervalo de sleep ativo e zera o estado.
  const clearSleepTimer = useCallback(() => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }
    setSleepRemainingSeconds(0);
  }, []);

  // Define o sleep-timer. null = ∞ (loop infinito, nunca desliga).
  // Após X minutos o player pausa automaticamente.
  // IMPORTANTE: com qualquer timer ativo (∞ ou X min), o áudio SEMPRE
  // toca em loop — assim uma faixa de 3 min repete até completar o tempo
  // escolhido (ex.: 15 min = ~5 repetições) e só então pausa.
  const setSleepTimer = useCallback(
    (minutes: number | null) => {
      clearSleepTimer();
      setSleepTimerMinutes(minutes);
      // Garante loop ligado para o tempo ser respeitado independente da
      // duração do arquivo.
      loopRef.current = true;
      setLoop(true);
      if (audioRef.current) audioRef.current.loop = true;
      if (minutes === null || minutes <= 0) {
        return; // ∞ — não agenda desligamento (toca pra sempre).
      }
      const totalSeconds = minutes * 60;
      setSleepRemainingSeconds(totalSeconds);
      // Pausa automática após o tempo escolhido.
      sleepTimeoutRef.current = setTimeout(() => {
        const audio = audioRef.current;
        if (audio) audio.pause();
        setIsPlaying(false);
        clearSleepTimer();
        setSleepTimerMinutes(null);
      }, totalSeconds * 1000);
      // Contagem regressiva visível (1 em 1 segundo).
      sleepIntervalRef.current = setInterval(() => {
        setSleepRemainingSeconds((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    },
    [clearSleepTimer],
  );

  // Limpa o timer ao desmontar o provider.
  useEffect(() => {
    return () => {
      if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    clearSleepTimer();
    setSleepTimerMinutes(null);
    setIsPlaying(false);
    setCurrentId(null);
    setJourneyId(null);
    setJourneyMeta(null);
    setJourneyHasAudio(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [clearSleepTimer]);

  return (
    <PlayerContext.Provider
      value={{
        current,
        currentId,
        nowPlaying,
        journeyId,
        mode,
        isPlaying,
        progress,
        currentTime,
        duration,
        loop,
        hasAudio,
        sleepTimerMinutes,
        sleepRemainingSeconds,
        playFrequency,
        playJourney,
        togglePlay,
        seek,
        setMode,
        toggleLoop,
        setSleepTimer,
        stop,
      }}
    >
      {/* Elemento <audio> ÚNICO e global. Vive no topo da árvore, então
          o som persiste ao navegar entre as telas (comportamento Spotify). */}
      <audio
        ref={audioRef}
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio) return;
          const total = audio.duration;
          setCurrentTime(audio.currentTime);
          if (total && !Number.isNaN(total)) {
            setProgress((audio.currentTime / total) * 100);
          }
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (audio && audio.duration && !Number.isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
        }}
        onEnded={() => {
          if (!loopRef.current) setIsPlaying(false);
        }}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer deve ser usado dentro de <PlayerProvider>");
  }
  return ctx;
}
