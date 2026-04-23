import type { Express } from "express";
import { executeDeviceCommand } from "./controller.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { API_PATHS, DeviceCommandSchema } from "../../shared/api-contracts.js";

const execFileAsync = promisify(execFile);

export function registerDeviceRoutes(app: Express) {
  app.get(API_PATHS.device.status, async (_req, res) => {
    const platform = process.platform;
    res.json({
      enabled: process.env.DEVICE_CONTROL_ENABLED === "true",
      platform,
      allowedApps: [],
      dryRunDefault: true,
    });
  });

  app.post(API_PATHS.device.execute, async (req, res) => {
    const parsed = DeviceCommandSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    try {
      if (parsed.data.dryRun === false) {
        const required = process.env.DEVICE_CONFIRM_TOKEN;
        if (!required) {
          return res.status(403).json({ error: "Confirmation token not configured on server" });
        }
        if (parsed.data.confirmToken !== required) {
          return res.status(403).json({ error: "Invalid confirmation token" });
        }
      }
      const { confirmToken, ...rest } = parsed.data;
      const result = await executeDeviceCommand(rest);
      res.json(result);
    } catch (err) {
      console.error("Device command failed", err);
      res.status(500).json({ error: "Device command failed" });
    }
  });

  app.get("/api/device/capabilities", async (_req, res) => {
    const platform = process.platform;
    const hasCliclick = await (async () => {
      try {
        await execFileAsync("which", ["cliclick"]);
        return true;
      } catch {
        return false;
      }
    })();
    const hasScreencap = platform === "darwin"; // screencapture is standard on macOS

    res.json({
      enabled: process.env.DEVICE_CONTROL_ENABLED === "true",
      platform,
      actions: {
        open_app: true,
        focus_app: true,
        keystroke: true,
        text: true,
        shortcut: true,
        pointer_move: hasCliclick,
        pointer_click: hasCliclick,
        pointer_drag: hasCliclick,
        scroll: hasCliclick,
        screenshot: hasScreencap,
      },
      requirements: {
        cliclick: hasCliclick,
      },
    });
  });
}

