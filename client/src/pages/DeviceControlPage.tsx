import { useState } from "react";
import { useDeviceControl } from "../hooks/useDeviceControl";
import { CyrusHumanoid } from "../components/CyrusHumanoid";
import {
  Monitor,
  Mouse,
  Keyboard,
  Camera,
  Play,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Settings,
  Cpu,
  Zap,
  Terminal,
  Shield,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

const PANEL: React.CSSProperties = {
  background: "rgba(13,13,30,0.75)",
  backdropFilter: "blur(12px)",
};

const INNER: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
};

export function DeviceControlPage() {
  const [appName, setAppName] = useState("");
  const [textToType, setTextToType] = useState("");
  const [mouseX, setMouseX] = useState("");
  const [mouseY, setMouseY] = useState("");
  const [shortcutKeys, setShortcutKeys] = useState("");
  const [dryRun, setDryRun] = useState(true);

  const {
    status,
    lastResult,
    pendingConfirm,
    isExecuting,
    openApp,
    focusApp,
    typeText,
    shortcut,
    moveMouse,
    click,
    takeScreenshot,
    confirmCommand,
    cancelConfirm,
  } = useDeviceControl();

  const inputClass = "w-full rounded-xl px-4 py-3 text-white border border-white/[0.08] bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-[#e11d48]/30 placeholder-white/30 text-sm";

  return (
    <ModuleWorkspacePageShell
      title="Hardware Control"
      subtitle="System and device management"
      icon={Cpu}
      headerEnd={
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-1.5">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-4 w-4 rounded accent-[#e11d48]"
          />
          <span className="text-sm text-white/70">Safe Mode</span>
        </label>
      }
    >
      <div className="mx-auto max-w-6xl">
        {/* Status cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { Icon: Monitor, label: "Apps", value: "Control", color: "text-[#06b6d4]", border: "border-cyan-500/20", glow: "rgba(6,182,212,0.1)" },
            { Icon: Keyboard, label: "Input", value: "Ready", color: "text-purple-400", border: "border-purple-500/20", glow: "rgba(168,85,247,0.1)" },
            { Icon: Mouse, label: "Mouse", value: "Active", color: "text-emerald-400", border: "border-emerald-500/20", glow: "rgba(34,197,94,0.1)" },
            { Icon: Shield, label: "Mode", value: dryRun ? "Safe" : "Live", color: dryRun ? "text-amber-400" : "text-[#e11d48]", border: dryRun ? "border-amber-500/20" : "border-[#e11d48]/20", glow: dryRun ? "rgba(245,158,11,0.1)" : "rgba(225,29,72,0.1)" },
          ].map(({ Icon, label, value, color, border, glow }) => (
            <div key={label} className={`rounded-xl border ${border} p-4`} style={{ ...PANEL, boxShadow: `0 0 16px ${glow}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ background: glow.replace("0.1", "0.15") }}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="text-xs text-white/50">{label}</span>
              </div>
              <p className={`text-lg font-bold ${color}`} style={{ fontFamily: "'Orbitron', system-ui" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Status banner */}
        {status && (
          <div className={`mb-6 p-4 rounded-xl border ${status.enabled ? "border-emerald-500/30 bg-emerald-500/10" : "border-[#e11d48]/30 bg-[#e11d48]/10"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.enabled ? "bg-emerald-500/20" : "bg-[#e11d48]/20"}`}>
                <Settings className={`w-5 h-5 ${status.enabled ? "text-emerald-400" : "text-[#e11d48]"}`} />
              </div>
              <div>
                <p className={`font-medium ${status.enabled ? "text-emerald-400" : "text-[#e11d48]"}`}>
                  Device Control: {status.enabled ? "Enabled" : "Disabled"}
                </p>
                <p className="text-sm text-white/50">
                  Platform: {status.platform} | Safe Mode Default: {status.dryRunDefault ? "Yes" : "No"}
                </p>
                {status.allowedApps.length > 0 && (
                  <p className="text-xs text-white/40 mt-1">Allowed Apps: {status.allowedApps.join(", ")}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending confirm */}
        {pendingConfirm && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-400 mb-1">Confirm Command Execution</p>
                <p className="text-sm text-white/70">
                  Action: <span className="text-white font-medium">{pendingConfirm.command.action}</span>
                </p>
                <p className="text-xs text-white/40 mt-1">Token: {pendingConfirm.token.slice(0, 8)}...</p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => confirmCommand.mutate()}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                  >
                    <Check className="w-4 h-4" />Confirm
                  </button>
                  <button
                    onClick={cancelConfirm}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#be123c] hover:to-[#9f1239] rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                  >
                    <X className="w-4 h-4" />Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* App control */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <div className="w-8 h-8 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-lg flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-white" />
                </div>
                Application Control
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Application name (e.g., Safari, Finder)"
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openApp(appName, dryRun)}
                    disabled={!appName.trim() || isExecuting}
                    className="py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Play className="w-4 h-4" />Open App
                  </button>
                  <button
                    onClick={() => focusApp(appName, dryRun)}
                    disabled={!appName.trim() || isExecuting}
                    className="py-3 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:from-[#0891b2] hover:to-[#0e7490] rounded-xl font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Zap className="w-4 h-4" />Focus App
                  </button>
                </div>
              </div>
            </div>

            {/* Keyboard */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-[#e11d48] rounded-lg flex items-center justify-center">
                  <Keyboard className="w-4 h-4 text-white" />
                </div>
                Keyboard Input
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={textToType}
                  onChange={(e) => setTextToType(e.target.value)}
                  placeholder="Text to type"
                  className={inputClass}
                />
                <button
                  onClick={() => typeText(textToType, dryRun)}
                  disabled={!textToType.trim() || isExecuting}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-[#e11d48] hover:from-purple-500 hover:to-[#be123c] rounded-xl font-medium disabled:opacity-50 transition-all text-sm"
                >
                  Type Text
                </button>
                <div className="border-t border-white/[0.06] pt-4">
                  <input
                    type="text"
                    value={shortcutKeys}
                    onChange={(e) => setShortcutKeys(e.target.value)}
                    placeholder="Shortcut keys (e.g., cmd,c or ctrl,alt,delete)"
                    className={inputClass}
                  />
                  <button
                    onClick={() => shortcut(shortcutKeys.split(",").map((k) => k.trim()), dryRun)}
                    disabled={!shortcutKeys.trim() || isExecuting}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#be123c] hover:to-[#9f1239] rounded-xl font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Terminal className="w-4 h-4" />Execute Shortcut
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Mouse */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-[#06b6d4] rounded-lg flex items-center justify-center">
                  <Mouse className="w-4 h-4 text-white" />
                </div>
                Mouse Control
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-mono uppercase tracking-wider">X Position</label>
                    <input type="number" value={mouseX} onChange={(e) => setMouseX(e.target.value)} placeholder="X" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-mono uppercase tracking-wider">Y Position</label>
                    <input type="number" value={mouseY} onChange={(e) => setMouseY(e.target.value)} placeholder="Y" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => moveMouse(parseInt(mouseX), parseInt(mouseY), dryRun)}
                    disabled={!mouseX || !mouseY || isExecuting}
                    className="py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-medium disabled:opacity-50 transition-all text-sm"
                  >
                    Move Cursor
                  </button>
                  <button
                    onClick={() => click(parseInt(mouseX), parseInt(mouseY), "left", dryRun)}
                    disabled={!mouseX || !mouseY || isExecuting}
                    className="py-3 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:from-[#0891b2] hover:to-[#0e7490] rounded-xl font-medium disabled:opacity-50 transition-all text-sm"
                  >
                    Click
                  </button>
                </div>
              </div>
            </div>

            {/* Screenshot */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                Screenshot Capture
              </h2>
              <button
                onClick={() => takeScreenshot(dryRun)}
                disabled={isExecuting}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isExecuting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                Capture Screenshot
              </button>
            </div>

            {/* Last result */}
            {lastResult && (
              <div className={`rounded-xl border p-5 ${lastResult.success ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-[#e11d48]/30 bg-[#e11d48]/[0.06]"}`} style={{ backdropFilter: "blur(12px)" }}>
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                  {lastResult.success ? (
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-[#e11d48]/20 rounded-lg flex items-center justify-center">
                      <X className="w-4 h-4 text-[#e11d48]" />
                    </div>
                  )}
                  Execution Result
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Status", value: lastResult.success ? "Success" : "Failed", color: lastResult.success ? "text-emerald-400" : "text-[#e11d48]" },
                    { label: "Platform", value: lastResult.platform, color: "text-white" },
                    { label: "Safe Mode", value: lastResult.dryRun ? "Yes" : "No", color: lastResult.dryRun ? "text-amber-400" : "text-[#e11d48]" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06]" style={INNER}>
                      <span className="text-white/50">{label}</span>
                      <span className={color}>{value}</span>
                    </div>
                  ))}
                  <p className="text-white/70 mt-3 p-3 rounded-lg border border-white/[0.06]" style={INNER}>{lastResult.detail}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <CyrusHumanoid
        module="systems"
        context={`User is in device control module. Dry run mode: ${dryRun ? "enabled" : "disabled"}. ${lastResult ? `Last result: ${lastResult.success ? "success" : "failed"}` : "No recent actions"}`}
        compact={true}
      />
    </ModuleWorkspacePageShell>
  );
}
