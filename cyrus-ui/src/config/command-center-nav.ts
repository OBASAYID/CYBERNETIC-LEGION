import type { LucideIcon } from "lucide-react";
import {
  ENGINE_MODULE_ROUTE_MAP,
  getDesignatedModuleRouteForEngine,
} from "@shared/engine-module-routes";
import {
  Activity,
  Brain,
  Cpu,
  Droplets,
  FileText,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Microscope,
  Monitor,
  Palette,
  Phone,
  Plane,
  Radio,
  Scan,
  Shield,
  Terminal,
  TrendingUp,
  Zap,
  CircuitBoard,
} from "lucide-react";

/**
 * Single source for Command Center lazy routes (`command-center-routes.tsx`),
 * dashboard pills, and the Module Orchestrator surface grid (`ModulesPage`).
 */
export type CommandCenterNavEntry = {
  path: string;
  /** Text on dashboard nav pills */
  dashboardLabel: string;
  /** Optional subtitle shown in unified dashboard cards */
  dashboardDescription?: string;
  /** Title on Module console cards (defaults to dashboardLabel if omitted) */
  surfaceLabel?: string;
  /** Subtitle on Module console; omit when this row is dashboard-only */
  sublabel?: string;
  Icon: LucideIcon;
};

export const COMMAND_CENTER_NAV: CommandCenterNavEntry[] = [
  {
    path: "/",
    dashboardLabel: "Command",
    dashboardDescription: "Primary Interface",
    surfaceLabel: "Command",
    sublabel: "Primary Interface",
    Icon: MessageSquare,
  },
  {
    path: "/algorithms",
    dashboardLabel: "Algorithms",
    dashboardDescription: "Engines & API map",
    surfaceLabel: "Algorithms",
    sublabel: "Engines & API map",
    Icon: CircuitBoard,
  },
  {
    path: "/modules",
    dashboardLabel: "Modules",
    dashboardDescription: "AI Orchestrator",
    surfaceLabel: "Modules",
    sublabel: "AI Orchestrator",
    Icon: LayoutGrid,
  },
  {
    path: "/scan",
    dashboardLabel: "Vision",
    dashboardDescription: "Optical Analysis",
    surfaceLabel: "Vision",
    sublabel: "Optical Analysis",
    Icon: Scan,
  },
  {
    path: "/files",
    dashboardLabel: "Docs",
    dashboardDescription: "Document intelligence",
    surfaceLabel: "Documents",
    sublabel: "Document intelligence (legal, long-form)",
    Icon: FileText,
  },
  {
    path: "/nav",
    dashboardLabel: "Maps",
    dashboardDescription: "Geospatial",
    surfaceLabel: "Navigation",
    sublabel: "Geospatial",
    Icon: MapPin,
  },
  {
    path: "/comms",
    dashboardLabel: "Comms",
    dashboardDescription: "NTN satellite IoT & secure channels",
    surfaceLabel: "Communications",
    sublabel:
      "Unified Comms: chat + mesh WebRTC (/cyrus-comm-io) woven into People & Calls; NTN roadmap — satellite IoT, messaging, tracking, emergency, verticals; Cortex-M4F + PSRAM/flash + cellular/sat RF",
    Icon: Phone,
  },
  {
    path: "/device",
    dashboardLabel: "Systems",
    dashboardDescription: "Hardware Control",
    surfaceLabel: "Systems",
    sublabel: "Hardware Control",
    Icon: Monitor,
  },
  {
    path: "/drone",
    dashboardLabel: "Aero",
    dashboardDescription: "UAV Operations",
    surfaceLabel: "Aerospace",
    sublabel: "UAV Operations",
    Icon: Plane,
  },
  {
    path: "/medical",
    dashboardLabel: "Medical",
    dashboardDescription: "Diagnostics",
    surfaceLabel: "Medical",
    sublabel: "Diagnostics",
    Icon: Activity,
  },
  {
    path: "/quantum",
    dashboardLabel: "Quantum",
    dashboardDescription: "Neural Net",
    surfaceLabel: "Quantum",
    sublabel: "Neural Net",
    Icon: Zap,
  },
  {
    path: "/security",
    dashboardLabel: "Security",
    dashboardDescription: "Encryption",
    surfaceLabel: "Security",
    sublabel: "Encryption",
    Icon: Shield,
  },
  {
    path: "/biology",
    dashboardLabel: "Biology",
    dashboardDescription: "Lab Analysis",
    surfaceLabel: "Biology",
    sublabel: "Lab Analysis",
    Icon: Microscope,
  },
  {
    path: "/blood",
    dashboardLabel: "Blood",
    dashboardDescription: "Sampling",
    surfaceLabel: "Blood",
    sublabel: "Sampling",
    Icon: Droplets,
  },
  {
    path: "/ops",
    dashboardLabel: "Ops",
    dashboardDescription: "Mission + Engine Control",
    surfaceLabel: "Operations",
    sublabel: "Module/Engine Console",
    Icon: Cpu,
  },
  {
    path: "/navigation",
    dashboardLabel: "Nav Pro",
    dashboardDescription: "Advanced Navigation",
    surfaceLabel: "Nav Pro",
    sublabel: "Advanced Navigation",
    Icon: MapPin,
  },
  {
    path: "/file-analysis",
    dashboardLabel: "Analyzer",
    dashboardDescription: "AI File Analyzer",
    surfaceLabel: "File Analyzer",
    sublabel: "AI File Analyzer",
    Icon: FileText,
  },
  {
    path: "/document-builder",
    dashboardLabel: "Doc Builder",
    dashboardDescription: "Automated Documents",
    surfaceLabel: "Doc Builder",
    sublabel: "Automated Documents",
    Icon: FileText,
  },
  {
    path: "/drone-control",
    dashboardLabel: "Drone UI",
    dashboardDescription: "Mission Control",
    surfaceLabel: "Drone Control",
    sublabel: "Mission Control",
    Icon: Radio,
  },
  {
    path: "/ai-dashboard",
    dashboardLabel: "AI Hub",
    dashboardDescription: "Cognitive Overview",
    surfaceLabel: "AI Hub",
    sublabel: "Cognitive Overview",
    Icon: Brain,
  },
  {
    path: "/ai-assistant",
    dashboardLabel: "Assistant",
    dashboardDescription: "Agent Console",
    surfaceLabel: "AI Assistant",
    sublabel: "Agent Console",
    Icon: Terminal,
  },
  {
    path: "/trading",
    dashboardLabel: "Trading",
    dashboardDescription: "Market Intelligence",
    surfaceLabel: "Trading",
    sublabel: "Market Intelligence",
    Icon: TrendingUp,
  },
  {
    path: "/design",
    dashboardLabel: "Design",
    dashboardDescription: "Automation Studio",
    surfaceLabel: "Design",
    sublabel: "Automation Studio",
    Icon: Palette,
  },
];

/** Rows for the Module Orchestrator “surface” grid — mirrors dashboard destinations (one tile per nav entry). */
export function getModuleOrchestratorSurfaces(): {
  path: string;
  label: string;
  sublabel: string;
  Icon: LucideIcon;
}[] {
  return COMMAND_CENTER_NAV.map((e) => {
    const sublabel = e.sublabel ?? e.dashboardDescription ?? e.dashboardLabel;
    return {
      path: e.path,
      label: e.surfaceLabel ?? e.dashboardLabel,
      sublabel,
      Icon: e.Icon,
    };
  });
}

/** Single nav entry by primary route (e.g. Command Console pipeline handoff). */
export function getCommandCenterNavByPath(path: string): CommandCenterNavEntry | undefined {
  return COMMAND_CENTER_NAV.find((e) => e.path === path);
}

/** Dashboard top nav: all quick links including cyrus-ui pages. */
export function getDashboardNavItems(): {
  href: string;
  label: string;
  description?: string;
  Icon: LucideIcon;
}[] {
  return COMMAND_CENTER_NAV.map((e) => ({
    href: e.path,
    label: e.dashboardLabel,
    description: e.dashboardDescription ?? e.sublabel,
    Icon: e.Icon,
  }));
}

/** Icon used in the Module Orchestrator page header (orchestrator branding). */
export const MODULE_ORCHESTRATOR_HEADER_ICON = Cpu;

export { ENGINE_MODULE_ROUTE_MAP, getDesignatedModuleRouteForEngine };
