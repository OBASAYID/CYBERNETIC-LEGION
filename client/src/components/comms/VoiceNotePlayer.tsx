import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceNotePlayerProps {
  src: string;
  duration?: number;
}

const SPEED_OPTIONS = [1, 1.5, 2];
const BAR_COUNT = 24;

export function VoiceNotePlayer({ src, duration: propDuration }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(propDuration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [bars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.85)
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      audio.pause();
      audio.src = "";
    };
  }, [src]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress);
    } else if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, updateProgress]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEED_OPTIONS[next];
    }
  }, [speedIndex]);

  const seekTo = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !totalDuration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioRef.current.currentTime = ratio * totalDuration;
      setCurrentTime(audioRef.current.currentTime);
    },
    [totalDuration]
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  return (
    <div className="flex items-center gap-2.5 bg-gray-800/60 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[200px] max-w-[280px]">
      <button
        onClick={togglePlayback}
        className="p-1.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-full transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      <div
        className="flex-1 flex items-end gap-px h-6 cursor-pointer"
        onClick={seekTo}
      >
        {bars.map((val, i) => {
          const barProgress = i / BAR_COUNT;
          const isActive = barProgress <= progress;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors duration-150 ${
                isActive ? "bg-cyan-400" : "bg-gray-600/60"
              }`}
              style={{ height: `${val * 100}%`, minHeight: "2px" }}
            />
          );
        })}
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-[10px] text-gray-400 font-mono leading-none">
          {formatTime(currentTime)}/{formatTime(totalDuration)}
        </span>
        <button
          onClick={cycleSpeed}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold leading-none transition-colors"
        >
          {SPEED_OPTIONS[speedIndex]}x
        </button>
      </div>
    </div>
  );
}
