import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Clock, X } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES: Record<string, { label: string; emojis: string[] }> = {
  smileys: {
    label: "Smileys",
    emojis: [
      "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊",
      "😋", "😎", "😍", "🥰", "😘", "😗", "😙", "🥲", "😚", "🙂",
      "🤗", "🤩", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣",
      "😥", "😮", "🤐", "😯", "😪", "😫", "🥱", "😴", "😌", "😛",
      "😜", "😝", "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑", "😲",
      "🥳", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "😈", "👿",
      "💀", "☠️", "💩", "🤡", "👻", "👽", "🤖", "🎃", "😺", "😸",
    ],
  },
  hearts: {
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
    ],
  },
  gestures: {
    label: "Gestures",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
      "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🙏",
      "💪", "🦾", "🖊️", "✍️", "🤳", "💅",
    ],
  },
  animals: {
    label: "Animals",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧",
      "🐦", "🐤", "🦅", "🦆", "🦉", "🐺", "🐗", "🐴", "🦄", "🐝",
      "🐛", "🦋", "🐌", "🐞", "🐜", "🪲", "🐢", "🐍", "🦎", "🐙",
    ],
  },
  food: {
    label: "Food",
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈",
      "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🌶️",
      "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🍕", "🍔", "🍟", "🌭",
      "🍿", "🧂", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🍖", "🍗",
    ],
  },
  objects: {
    label: "Objects",
    emojis: [
      "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💽", "💾", "💿",
      "📀", "🎥", "📷", "📸", "📹", "📼", "🔍", "💡", "🔦", "🏮",
      "📔", "📕", "📖", "📗", "📘", "📙", "📚", "📓", "📒", "📃",
      "🔑", "🗝️", "🔒", "🔓", "🔏", "🔐", "🔨", "⚙️", "🧲", "⚡",
    ],
  },
  symbols: {
    label: "Symbols",
    emojis: [
      "✅", "❌", "⭕", "❗", "❓", "‼️", "⁉️", "💯", "🔴", "🟠",
      "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔶", "🔷", "🔸",
      "🔹", "▪️", "▫️", "◾", "◽", "⬛", "⬜", "🔲", "🔳", "⭐",
      "🌟", "💫", "✨", "🔥", "💥", "🎵", "🎶", "➡️", "⬅️", "⬆️",
    ],
  },
};

const RECENT_KEY = "cyrus-recent-emojis";
const MAX_RECENT = 24;

function getRecentEmojis(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentEmoji(emoji: string) {
  const recent = getRecentEmojis().filter((e) => e !== emoji);
  recent.unshift(emoji);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(getRecentEmojis);

  const allEmojis = useMemo(() => {
    const result: { emoji: string; category: string }[] = [];
    for (const [cat, data] of Object.entries(EMOJI_CATEGORIES)) {
      for (const emoji of data.emojis) {
        result.push({ emoji, category: cat });
      }
    }
    return result;
  }, []);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allEmojis.filter((e) => {
      const catLabel = EMOJI_CATEGORIES[e.category]?.label.toLowerCase() || "";
      return catLabel.includes(q);
    });
  }, [search, allEmojis]);

  const handleSelect = useCallback(
    (emoji: string) => {
      saveRecentEmoji(emoji);
      setRecentEmojis(getRecentEmojis());
      onSelect(emoji);
    },
    [onSelect]
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const categoryKeys = Object.keys(EMOJI_CATEGORIES);

  return (
    <div className="w-80 max-h-96 bg-gray-900/95 backdrop-blur-xl border border-cyan-500/20 rounded-xl shadow-2xl shadow-cyan-500/10 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Emoji</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full bg-gray-800/80 text-white text-sm pl-8 pr-3 py-1.5 rounded-lg border border-gray-700/50 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder-gray-500"
          />
        </div>
      </div>

      {!search.trim() && (
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-thin">
          {recentEmojis.length > 0 && (
            <button
              onClick={() => setActiveCategory("recent")}
              className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                activeCategory === "recent"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
          {categoryKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-2 py-1 rounded-lg text-xs transition-colors shrink-0 ${
                activeCategory === key
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              {EMOJI_CATEGORIES[key].emojis[0]}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        {search.trim() ? (
          <>
            <p className="text-xs text-gray-500 mb-2">
              {filteredEmojis?.length || 0} results
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {filteredEmojis?.map((item, i) => (
                <button
                  key={`${item.emoji}-${i}`}
                  onClick={() => handleSelect(item.emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </>
        ) : activeCategory === "recent" ? (
          <>
            <p className="text-xs text-gray-500 mb-2 font-medium">Recent</p>
            <div className="grid grid-cols-8 gap-0.5">
              {recentEmojis.map((emoji, i) => (
                <button
                  key={`recent-${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2 font-medium">
              {EMOJI_CATEGORIES[activeCategory]?.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[activeCategory]?.emojis.map((emoji, i) => (
                <button
                  key={`${activeCategory}-${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
