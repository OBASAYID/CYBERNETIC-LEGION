import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import { API_PATHS } from "@shared/api-contracts";

export type DeviceAction =
  | "open_app"
  | "focus_app"
  | "keystroke"
  | "text"
  | "pointer_move"
  | "pointer_click"
  | "pointer_drag"
  | "scroll"
  | "shortcut"
  | "screenshot";

export interface DeviceCommand {
  action: DeviceAction;
  appName?: string;
  bundleId?: string;
  text?: string;
  keys?: string[];
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
  button?: "left" | "right" | "middle";
  shortcut?: string[];
  dryRun?: boolean;
  confirmToken?: string;
}

export interface DeviceResult {
  success: boolean;
  detail: string;
  platform: string;
  dryRun: boolean;
  confirmToken?: string;
}

export interface DeviceStatus {
  enabled: boolean;
  platform: string;
  allowedApps: string[];
  dryRunDefault: boolean;
}

export function useDeviceControl() {
  const [lastResult, setLastResult] = useState<DeviceResult | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    command: DeviceCommand;
    token: string;
  } | null>(null);

  const statusQuery = useQuery<DeviceStatus>({
    queryKey: [API_PATHS.device.status],
    queryFn: async () => {
      const res = await systemFetch(API_PATHS.device.status);
      if (!res.ok) throw new Error("Failed to fetch device status");
      return res.json();
    },
  });

  const executeCommand = useMutation({
    mutationFn: async (command: DeviceCommand) => {
      const res = await systemFetch(API_PATHS.device.execute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Command execution failed");
      }
      const result = await res.json();
      setLastResult(result);
      if (result.confirmToken) {
        setPendingConfirm({ command, token: result.confirmToken });
      }
      return result;
    },
  });

  const confirmCommand = useMutation({
    mutationFn: async () => {
      if (!pendingConfirm) throw new Error("No pending confirmation");
      const res = await systemFetch(API_PATHS.device.execute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingConfirm.command,
          confirmToken: pendingConfirm.token,
          dryRun: false,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Command execution failed");
      }
      const result = await res.json();
      setLastResult(result);
      setPendingConfirm(null);
      return result;
    },
  });

  const cancelConfirm = () => {
    setPendingConfirm(null);
  };

  const openApp = (appName: string, dryRun = true) =>
    executeCommand.mutate({ action: "open_app", appName, dryRun });

  const focusApp = (appName: string, dryRun = true) =>
    executeCommand.mutate({ action: "focus_app", appName, dryRun });

  const typeText = (text: string, dryRun = true) =>
    executeCommand.mutate({ action: "text", text, dryRun });

  const pressKeys = (keys: string[], dryRun = true) =>
    executeCommand.mutate({ action: "keystroke", keys, dryRun });

  const shortcut = (keys: string[], dryRun = true) =>
    executeCommand.mutate({ action: "shortcut", shortcut: keys, dryRun });

  const moveMouse = (x: number, y: number, dryRun = true) =>
    executeCommand.mutate({ action: "pointer_move", x, y, dryRun });

  const click = (
    x: number,
    y: number,
    button: "left" | "right" | "middle" = "left",
    dryRun = true
  ) => executeCommand.mutate({ action: "pointer_click", x, y, button, dryRun });

  const drag = (
    x: number,
    y: number,
    dx: number,
    dy: number,
    dryRun = true
  ) => executeCommand.mutate({ action: "pointer_drag", x, y, dx, dy, dryRun });

  const scroll = (dx: number, dy: number, dryRun = true) =>
    executeCommand.mutate({ action: "scroll", dx, dy, dryRun });

  const takeScreenshot = (dryRun = true) =>
    executeCommand.mutate({ action: "screenshot", dryRun });

  return {
    status: statusQuery.data,
    lastResult,
    pendingConfirm,
    isExecuting: executeCommand.isPending || confirmCommand.isPending,
    isLoading: statusQuery.isLoading,
    executeCommand,
    confirmCommand,
    cancelConfirm,
    openApp,
    focusApp,
    typeText,
    pressKeys,
    shortcut,
    moveMouse,
    click,
    drag,
    scroll,
    takeScreenshot,
  };
}
