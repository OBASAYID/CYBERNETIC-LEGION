import { useQuery } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";

const POSITIVE_WORDS = [
  "good", "great", "awesome", "excellent", "amazing", "wonderful", "fantastic",
  "brilliant", "outstanding", "superb", "perfect", "love", "loved", "loving",
  "happy", "glad", "pleased", "delighted", "thrilled", "excited", "joyful",
  "cheerful", "grateful", "thankful", "appreciate", "appreciated", "beautiful",
  "nice", "fine", "cool", "sweet", "kind", "generous", "helpful", "friendly",
  "warm", "caring", "gentle", "positive", "optimistic", "hopeful", "confident",
  "proud", "inspired", "motivated", "energetic", "enthusiastic", "passionate",
  "creative", "innovative", "impressive", "remarkable", "exceptional", "incredible",
  "magnificent", "marvelous", "phenomenal", "spectacular", "stunning", "terrific",
  "triumph", "victory", "success", "successful", "win", "winner", "best",
  "better", "improve", "improved", "progress", "achievement", "accomplish",
  "celebrate", "celebration", "congratulations", "congrats", "bravo", "well done",
  "fantastic", "fabulous", "glorious", "splendid", "sublime", "radiant",
  "vibrant", "lively", "refreshing", "satisfying", "fulfilling", "rewarding",
  "enjoy", "enjoyed", "enjoyable", "fun", "laugh", "smile", "grin",
  "delight", "pleasure", "bliss", "paradise", "heaven", "blessing",
  "fortunate", "lucky", "favor", "favorable", "advantage", "benefit",
  "valuable", "worthy", "merit", "virtue", "honor", "respect", "admire",
  "adore", "cherish", "treasure", "welcome", "embrace", "support",
  "encourage", "empower", "uplift", "boost", "elevate", "enhance",
  "thrive", "flourish", "prosper", "bloom", "shine", "glow", "sparkle",
];

const NEGATIVE_WORDS = [
  "bad", "terrible", "horrible", "awful", "dreadful", "disgusting", "nasty",
  "ugly", "hate", "hated", "hating", "angry", "furious", "mad", "rage",
  "sad", "unhappy", "miserable", "depressed", "depressing", "gloomy",
  "disappointed", "disappointing", "frustrating", "frustrated", "annoyed",
  "annoying", "irritated", "irritating", "boring", "bored", "tired",
  "exhausted", "stressed", "anxious", "worried", "nervous", "scared",
  "afraid", "frightened", "terrified", "horrified", "shocked", "appalled",
  "disgusted", "revolting", "repulsive", "offensive", "insulting", "rude",
  "cruel", "mean", "harsh", "brutal", "violent", "aggressive", "hostile",
  "toxic", "poisonous", "harmful", "dangerous", "threatening", "menacing",
  "evil", "wicked", "vicious", "malicious", "corrupt", "dishonest",
  "fake", "fraud", "scam", "cheat", "betray", "betrayal", "lie", "liar",
  "fail", "failed", "failure", "loss", "lose", "loser", "worst", "worse",
  "decline", "decrease", "drop", "fall", "crash", "collapse", "destroy",
  "destruction", "damage", "broken", "ruined", "wasted", "useless",
  "worthless", "pathetic", "pitiful", "tragic", "disaster", "catastrophe",
  "crisis", "emergency", "problem", "trouble", "issue", "concern",
  "complaint", "criticism", "blame", "fault", "error", "mistake",
  "wrong", "incorrect", "inaccurate", "invalid", "illegal", "unfair",
  "unjust", "unacceptable", "intolerable", "unbearable", "painful",
  "suffering", "agony", "torment", "misery", "grief", "sorrow",
  "regret", "remorse", "guilt", "shame", "embarrassed", "humiliated",
  "rejected", "abandoned", "isolated", "lonely", "neglected", "ignored",
  "hopeless", "desperate", "helpless", "powerless", "weak", "vulnerable",
];

const NEGATION_WORDS = [
  "not", "no", "never", "neither", "nobody", "nothing", "nowhere",
  "nor", "cannot", "can't", "couldn't", "wouldn't", "shouldn't",
  "won't", "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't",
  "weren't", "hasn't", "haven't", "hadn't",
];

const AMPLIFIER_WORDS = [
  "very", "extremely", "incredibly", "absolutely", "completely", "totally",
  "utterly", "really", "truly", "deeply", "highly", "strongly", "greatly",
  "remarkably", "exceptionally", "extraordinarily", "immensely", "enormously",
  "super", "so", "quite", "particularly", "especially",
];

export function analyzeTextSentiment(text: string): {
  score: number;
  label: "positive" | "neutral" | "negative";
  confidence: number;
} {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: "neutral", confidence: 0 };
  }

  const words = text.toLowerCase().replace(/[^\w\s']/g, "").split(/\s+/);
  let score = 0;
  let matchCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let wordScore = 0;

    if (POSITIVE_WORDS.includes(word)) {
      wordScore = 1;
      matchCount++;
    } else if (NEGATIVE_WORDS.includes(word)) {
      wordScore = -1;
      matchCount++;
    } else {
      continue;
    }

    const prevWord = i > 0 ? words[i - 1] : "";
    const prevPrevWord = i > 1 ? words[i - 2] : "";

    if (NEGATION_WORDS.includes(prevWord) || NEGATION_WORDS.includes(prevPrevWord)) {
      wordScore *= -0.75;
    }

    if (AMPLIFIER_WORDS.includes(prevWord)) {
      wordScore *= 1.5;
    }

    score += wordScore;
  }

  const normalizedScore = words.length > 0
    ? Math.max(-1, Math.min(1, score / Math.max(Math.sqrt(words.length), 1)))
    : 0;

  const confidence = matchCount > 0
    ? Math.min(1, matchCount / Math.max(words.length * 0.3, 1))
    : 0;

  let label: "positive" | "neutral" | "negative" = "neutral";
  if (normalizedScore > 0.1) label = "positive";
  else if (normalizedScore < -0.1) label = "negative";

  return { score: Math.round(normalizedScore * 100) / 100, label, confidence: Math.round(confidence * 100) / 100 };
}

export function useSentimentAnalysis() {
  return { analyzeTextSentiment };
}

export function useUserInsights(userId: string) {
  return useQuery({
    queryKey: ["/api/comms/intelligence/profile", userId],
    queryFn: async () => {
      const res = await systemFetch(`/api/comms/intelligence/profile/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user insights");
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });
}

export function useContactSuggestions(userId: string) {
  return useQuery({
    queryKey: ["/api/comms/intelligence/suggestions", userId],
    queryFn: async () => {
      const res = await systemFetch(`/api/comms/intelligence/suggestions/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch contact suggestions");
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });
}

export function useAnomalyAlerts(userId: string) {
  return useQuery({
    queryKey: ["/api/comms/intelligence/anomalies", userId],
    queryFn: async () => {
      const res = await systemFetch(`/api/comms/intelligence/anomalies/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch anomaly alerts");
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });
}

export function useNetworkHealth() {
  return useQuery({
    queryKey: ["/api/comms/intelligence/network-health"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/intelligence/network-health");
      if (!res.ok) throw new Error("Failed to fetch network health");
      return res.json();
    },
    refetchInterval: 15000,
  });
}
