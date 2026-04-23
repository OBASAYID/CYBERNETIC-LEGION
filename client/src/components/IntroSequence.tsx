import { useState, useRef, useEffect } from "react";

interface IntroSequenceProps {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"video" | "dissolve" | "complete">("video");
  const [smokeOpacity, setSmokeOpacity] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {
      setTimeout(() => setPhase("dissolve"), 500);
    });

    const handleEnded = () => {
      setPhase("dissolve");
    };

    const handleTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration - 1) {
        setSmokeOpacity(Math.min(1, (video.duration - video.currentTime) * -1 + 1));
      }
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    if (phase === "dissolve") {
      const smokeInterval = setInterval(() => {
        setSmokeOpacity((prev) => {
          if (prev >= 1) {
            clearInterval(smokeInterval);
            setTimeout(() => setPhase("complete"), 800);
            return 1;
          }
          return prev + 0.05;
        });
      }, 50);

      return () => clearInterval(smokeInterval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "complete") {
      const timeout = setTimeout(onComplete, 500);
      return () => clearTimeout(timeout);
    }
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          phase === "dissolve" || phase === "complete" ? "opacity-0" : "opacity-100"
        }`}
        src="/videos/intro.mp4"
        onError={() => setPhase("dissolve")}
        playsInline
        autoPlay
      />

      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: smokeOpacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-gray-900/80 to-black" />
        
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${100 + Math.random() * 300}px`,
                height: `${100 + Math.random() * 300}px`,
                background: `radial-gradient(circle, rgba(${
                  Math.random() > 0.5 ? "0,255,255" : "100,100,120"
                },${0.1 + Math.random() * 0.2}) 0%, transparent 70%)`,
                filter: "blur(40px)",
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                transform: `scale(${0.5 + Math.random()})`,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-6xl md:text-8xl font-bold tracking-[0.3em] animate-pulse"
            style={{
              background: "linear-gradient(135deg, #00ffff, #0080ff, #00ffff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 60px rgba(0,255,255,0.5)",
              opacity: phase === "complete" ? 0 : 1,
              transition: "opacity 0.5s ease-out",
            }}
          >
            CYRUS
          </div>
        </div>

        <div
          className="absolute inset-0"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.1) 2px,
                rgba(0,0,0,0.1) 4px
              )
            `,
            pointerEvents: "none",
          }}
        />
      </div>

      {phase === "complete" && (
        <div className="absolute inset-0 bg-black animate-fade-out" />
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.1); }
        }
        @keyframes fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-fade-out {
          animation: fade-out 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
