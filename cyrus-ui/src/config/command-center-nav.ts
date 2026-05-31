import type { LucideIcon } from "lucide-react";
import {
  ENGINE_MODULE_ROUTE_MAP,
  getDesignatedModuleRouteForEngine,
} from "@shared/engine-module-routes";
import {
  Activity,
  Brain,
  CircuitBoard,
  Cpu,
  FileText,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Phone,
  Scan,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";

/**
 * Single source for Command Center lazy routes (`command-center-routes.tsx`),
 * dashboard pills, and the Module Orchestrator surface grid (`ModulesPage`).
 * Only operational surfaces — no demo or duplicate entries.
 */
export type CommandCenterNavEntry = {
  path: string;
  /** Short label for dashboard pills / collapsed tooltips */
  dashboardLabel: string;
  /** Full professional name in the module sidebar */
  sidebarLabel: string;
  dashboardDescription?: string;
  surfaceLabel?: string;
  sublabel?: string;
  Icon: LucideIcon;
};

export const COMMAND_CENTER_NAV: CommandCenterNavEntry[] = [
  {
    path: "/",
    dashboardLabel: "Command",
    sidebarLabel: "Command Center",
    dashboardDescription: "Primary Interface",
    surfaceLabel: "Command",
    sublabel: "Primary Interface",
    Icon: MessageSquare,
  },
  {
    path: "/intelligence",
    dashboardLabel: "Intelligence",
    sidebarLabel: "Intelligence Hub",
    dashboardDescription: "Mine, grow & automate",
    surfaceLabel: "Intelligence Hub",
    sublabel: "Assets, knowledge growth, missions, MCP",
    Icon: Brain,
  },
  {
    path: "/files",
    dashboardLabel: "Docs",
    sidebarLabel: "Document Intelligence",
    dashboardDescription: "Document intelligence",
    surfaceLabel: "Documents",
    sublabel: "Upload, analyze, generate",
    Icon: FileText,
  },
  {
    path: "/scan",
    dashboardLabel: "Vision",
    sidebarLabel: "Vision Analysis",
    dashboardDescription: "Optical Analysis",
    surfaceLabel: "Vision",
    sublabel: "OCR, QR, translate, analyze",
    Icon: Scan,
  },
  {
    path: "/comms",
    dashboardLabel: "Comms",
    sidebarLabel: "Communications",
    dashboardDescription: "Secure messaging & calls",
    surfaceLabel: "Communications",
    sublabel: "Chat, WebRTC, group work assessment",
    Icon: Phone,
  },
  {
    path: "/modules",
    dashboardLabel: "Modules",
    sidebarLabel: "Module Orchestrator",
    dashboardDescription: "AI Orchestrator",
    surfaceLabel: "Modules",
    sublabel: "Engine status & routing",
    Icon: LayoutGrid,
  },
  {
    path: "/algorithms",
    dashboardLabel: "Algorithms",
    sidebarLabel: "Algorithms Catalog",
    dashboardDescription: "Engines & API map",
    surfaceLabel: "Algorithms",
    sublabel: "REST catalog reference",
    Icon: CircuitBoard,
  },
  {
    path: "/document-builder",
    dashboardLabel: "Doc Builder",
    sidebarLabel: "Document Builder",
    dashboardDescription: "Structured documents",
    surfaceLabel: "Doc Builder",
    sublabel: "Sitrep, intelsum, reports",
    Icon: FileText,
  },
  {
    path: "/device",
    dashboardLabel: "Systems",
    sidebarLabel: "Device Systems",
    dashboardDescription: "Hardware Control",
    surfaceLabel: "Systems",
    sublabel: "Device automation (when enabled)",
    Icon: Monitor,
  },
  {
    path: "/medical",
    dashboardLabel: "Medical",
    sidebarLabel: "Medical Diagnostics",
    dashboardDescription: "Diagnostics",
    surfaceLabel: "Medical",
    sublabel: "Symptom analysis & health data",
    Icon: Activity,
  },
  {
    path: "/quantum",
    dashboardLabel: "Quantum",
    sidebarLabel: "Quantum Simulation",
    dashboardDescription: "Circuit simulation",
    surfaceLabel: "Quantum",
    sublabel: "Simulate & create circuits",
    Icon: Zap,
  },
  {
    path: "/ops",
    dashboardLabel: "Ops",
    sidebarLabel: "Operations Center",
    dashboardDescription: "Intelligence automation",
    surfaceLabel: "Operations",
    sublabel: "Growth, automation, asset resume",
    Icon: Cpu,
  },
  {
    path: "/settings",
    dashboardLabel: "Settings",
    sidebarLabel: "System Settings",
    dashboardDescription: "System configuration",
    surfaceLabel: "Settings",
    sublabel: "Access codes, API keys, admin controls",
    Icon: Settings,
  },
  {
    path: "/settings/command",
    dashboardLabel: "Command",
    sidebarLabel: "CYRUS Command",
    dashboardDescription: "AI operator console",
    surfaceLabel: "CYRUS Command",
    sublabel: "Launch AI console under system settings",
    Icon: Terminal,
  },
];

export function getModuleOrchestratorSurfaces(): {
  path: string;
  label: string;
  sublabel: string;
  Icon: LucideIcon;
}[] {
  return COMMAND_CENTER_NAV.filter((e) => e.path !== "/settings/command").map((e) => {
    const sublabel = e.sublabel ?? e.dashboardDescription ?? e.dashboardLabel;
    return {
      path: e.path,
      label: e.surfaceLabel ?? e.dashboardLabel,
      sublabel,
      Icon: e.Icon,
    };
  });
}

export function getCommandCenterNavByPath(path: string): CommandCenterNavEntry | undefined {
  return COMMAND_CENTER_NAV.find((e) => e.path === path);
}

export function getDashboardNavItems(): {
  href: string;
  label: string;
  description?: string;
  Icon: LucideIcon;
}[] {
  return COMMAND_CENTER_NAV.filter((e) => e.path !== "/settings/command").map((e) => ({
    href: e.path,
    label: e.dashboardLabel,
    description: e.dashboardDescription ?? e.sublabel,
    Icon: e.Icon,
  }));
}

export const MODULE_ORCHESTRATOR_HEADER_ICON = Cpu;

export { ENGINE_MODULE_ROUTE_MAP, getDesignatedModuleRouteForEngine };
