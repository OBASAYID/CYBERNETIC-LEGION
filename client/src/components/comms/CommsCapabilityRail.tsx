import type { LucideIcon } from "lucide-react";
import {
  Lock,
  Mic,
  Image,
  Box,
  Smile,
  Users,
  Share2,
  Phone,
  MonitorUp,
  Radio,
  Wifi,
  UserSearch,
  Map,
  Eye,
  Shield,
  Sparkles,
  Video,
} from "lucide-react";

export type CommsModuleId = "chat" | "pshare" | "calls" | "people" | "streams" | "monitor";

type Capability = { icon: LucideIcon; label: string; accent?: "cyan" | "violet" | "emerald" };

const CAPABILITIES: Record<CommsModuleId, Capability[]> = {
  chat: [
    { icon: Lock, label: "End-to-end encrypted", accent: "emerald" },
    { icon: Mic, label: "Voice notes" },
    { icon: Image, label: "Media sharing" },
    { icon: Box, label: "3D CAD · STL · STEP" },
    { icon: Smile, label: "Reactions" },
    { icon: Users, label: "Group threads" },
  ],
  pshare: [
    { icon: Share2, label: "Field timeline", accent: "violet" },
    { icon: Sparkles, label: "Pipeline handoffs" },
    { icon: Image, label: "Rich posts" },
    { icon: Users, label: "Team visibility" },
  ],
  calls: [
    { icon: Phone, label: "HD voice & video", accent: "cyan" },
    { icon: Wifi, label: "Mesh P2P" },
    { icon: MonitorUp, label: "Screen share" },
    { icon: Users, label: "Conference bridge" },
    { icon: Video, label: "In-call chat & media" },
  ],
  people: [
    { icon: UserSearch, label: "Discovery", accent: "cyan" },
    { icon: Map, label: "Network command map" },
    { icon: Users, label: "Contacts & roster" },
    { icon: Wifi, label: "Mesh link status" },
  ],
  streams: [
    { icon: Radio, label: "Live broadcast", accent: "violet" },
    { icon: Eye, label: "Viewer mesh" },
    { icon: Video, label: "Multi-quality streams" },
  ],
  monitor: [
    { icon: Sparkles, label: "AI intelligence", accent: "violet" },
    { icon: Shield, label: "Anomaly detection" },
    { icon: Eye, label: "Admin console" },
  ],
};

export function CommsCapabilityRail({
  moduleId,
  darkMode,
}: {
  moduleId: CommsModuleId;
  darkMode: boolean;
}) {
  const items = CAPABILITIES[moduleId];

  return (
    <div
      className={`comms-capability-rail shrink-0 border-b px-3 py-2 sm:px-5 ${
        darkMode
          ? "border-cyan-500/20 bg-black/20"
          : "border-sky-200/70 bg-white/50"
      }`}
      role="list"
      aria-label="Module capabilities"
    >
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {items.map(({ icon: Icon, label, accent }) => (
          <span
            key={label}
            role="listitem"
            className={`comms-capability-chip ${
              accent === "emerald"
                ? "comms-capability-chip--emerald"
                : accent === "violet"
                  ? "comms-capability-chip--violet"
                  : accent === "cyan"
                    ? "comms-capability-chip--cyan"
                    : darkMode
                      ? "comms-capability-chip--default-dark"
                      : "comms-capability-chip--default-light"
            }`}
          >
            <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
