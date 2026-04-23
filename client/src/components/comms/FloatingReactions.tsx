import { useState, useEffect, useCallback, useRef } from "react";

export interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  userId: string;
  timestamp: number;
}

interface FloatingReactionsProps {
  reactions: Reaction[];
  onSendReaction?: (emoji: string, x: number, y: number) => void;
  showReactionBar?: boolean;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "🎉"];

const ANIMATION_DURATION = 2000;

function FloatingEmoji({ reaction }: { reaction: Reaction }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), ANIMATION_DURATION);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${reaction.x}%`,
        top: `${reaction.y}%`,
        animation: `floatUpFade ${ANIMATION_DURATION}ms ease-out forwards`,
      }}
    >
      <span className="text-3xl drop-shadow-lg select-none">{reaction.emoji}</span>
    </div>
  );
}

export function FloatingReactions({
  reactions,
  onSendReaction,
  showReactionBar = true,
}: FloatingReactionsProps) {
  const [visibleReactions, setVisibleReactions] = useState<Reaction[]>([]);
  const cleanupRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (reactions.length > 0) {
      const latest = reactions[reactions.length - 1];
      setVisibleReactions((prev) => {
        const filtered = prev.filter(
          (r) => Date.now() - r.timestamp < ANIMATION_DURATION
        );
        return [...filtered, latest];
      });
    }
  }, [reactions]);

  useEffect(() => {
    cleanupRef.current = setInterval(() => {
      setVisibleReactions((prev) =>
        prev.filter((r) => Date.now() - r.timestamp < ANIMATION_DURATION)
      );
    }, 500);
    return () => {
      if (cleanupRef.current) clearInterval(cleanupRef.current);
    };
  }, []);

  const handleQuickReaction = useCallback(
    (emoji: string) => {
      const x = 30 + Math.random() * 40;
      const y = 50 + Math.random() * 30;
      onSendReaction?.(emoji, x, y);
    },
    [onSendReaction]
  );

  return (
    <>
      <style>
        {`
          @keyframes floatUpFade {
            0% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            50% {
              opacity: 0.8;
              transform: translateY(-60px) scale(1.2);
            }
            100% {
              opacity: 0;
              transform: translateY(-120px) scale(0.8);
            }
          }
        `}
      </style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        {visibleReactions.map((reaction) => (
          <FloatingEmoji key={reaction.id} reaction={reaction} />
        ))}
      </div>

      {showReactionBar && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-800/80 backdrop-blur-md border border-gray-700/40">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleQuickReaction(emoji)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-700/60 active:scale-90 transition-all text-lg"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function ReactionBar({
  onSendReaction,
}: {
  onSendReaction: (emoji: string, x: number, y: number) => void;
}) {
  const handleClick = useCallback(
    (emoji: string) => {
      const x = 30 + Math.random() * 40;
      const y = 50 + Math.random() * 30;
      onSendReaction(emoji, x, y);
    },
    [onSendReaction]
  );

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-800/80 backdrop-blur-md border border-gray-700/40">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-700/60 active:scale-90 transition-all text-lg"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
