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
    isLoading,
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

  return (
    <ModuleWorkspacePageShell
      title="Hardware Control"
      subtitle="System and device management"
      icon={Cpu}
      headerEnd={
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-1.5">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-4 w-4 rounded accent-amber-500"
          />
          <span className="text-sm text-gray-300">Safe Mode</span>
        </label>
      }
    >
      <div className="mx-auto max-w-cyrus-wide">
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">Apps</span>
              </div>
              <p className="text-lg font-bold text-blue-400">Control</p>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Keyboard className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">Input</span>
              </div>
              <p className="text-lg font-bold text-purple-400">Ready</p>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Mouse className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-gray-400">Mouse</span>
              </div>
              <p className="text-lg font-bold text-green-400">Active</p>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs text-gray-400">Mode</span>
              </div>
              <p className={`text-lg font-bold ${dryRun ? "text-amber-400" : "text-red-400"}`}>
                {dryRun ? "Safe" : "Live"}
              </p>
            </div>
          </div>

          {status && (
            <div
              className={`mb-6 p-4 rounded-xl border backdrop-blur-sm ${
                status.enabled
                  ? "bg-emerald-900/20 border-emerald-500/30"
                  : "bg-red-900/20 border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  status.enabled ? "bg-emerald-500/20" : "bg-red-500/20"
                }`}>
                  <Settings className={`w-5 h-5 ${status.enabled ? "text-emerald-400" : "text-red-400"}`} />
                </div>
                <div>
                  <p className={`font-medium ${status.enabled ? "text-emerald-400" : "text-red-400"}`}>
                    Device Control: {status.enabled ? "Enabled" : "Disabled"}
                  </p>
                  <p className="text-sm text-gray-400">
                    Platform: {status.platform} | Safe Mode Default: {status.dryRunDefault ? "Yes" : "No"}
                  </p>
                  {status.allowedApps.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Allowed Apps: {status.allowedApps.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {pendingConfirm && (
            <div className="mb-6 bg-amber-900/20 border border-amber-500/30 rounded-xl p-5 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-400 mb-1">
                    Confirm Command Execution
                  </p>
                  <p className="text-sm text-gray-300">
                    Action: <span className="text-white font-medium">{pendingConfirm.command.action}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Token: {pendingConfirm.token.slice(0, 8)}...
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => confirmCommand.mutate()}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Confirm
                    </button>
                    <button
                      onClick={cancelConfirm}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-white" />
                  </div>
                  <span>Application Control</span>
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Application name (e.g., Safari, Finder)"
                    className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/50 placeholder-gray-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openApp(appName, dryRun)}
                      disabled={!appName.trim() || isExecuting}
                      className="py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Open App
                    </button>
                    <button
                      onClick={() => focusApp(appName, dryRun)}
                      disabled={!appName.trim() || isExecuting}
                      className="py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Focus App
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Keyboard className="w-4 h-4 text-white" />
                  </div>
                  <span>Keyboard Input</span>
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={textToType}
                    onChange={(e) => setTextToType(e.target.value)}
                    placeholder="Text to type"
                    className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700/50 placeholder-gray-500"
                  />
                  <button
                    onClick={() => typeText(textToType, dryRun)}
                    disabled={!textToType.trim() || isExecuting}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
                  >
                    Type Text
                  </button>

                  <div className="border-t border-gray-700/50 pt-4 mt-4">
                    <input
                      type="text"
                      value={shortcutKeys}
                      onChange={(e) => setShortcutKeys(e.target.value)}
                      placeholder="Shortcut keys (e.g., cmd,c or ctrl,alt,delete)"
                      className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-gray-700/50 placeholder-gray-500"
                    />
                    <button
                      onClick={() =>
                        shortcut(
                          shortcutKeys.split(",").map((k) => k.trim()),
                          dryRun
                        )
                      }
                      disabled={!shortcutKeys.trim() || isExecuting}
                      className="w-full mt-3 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                      <Terminal className="w-4 h-4" />
                      Execute Shortcut
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Mouse className="w-4 h-4 text-white" />
                  </div>
                  <span>Mouse Control</span>
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">X Position</label>
                      <input
                        type="number"
                        value={mouseX}
                        onChange={(e) => setMouseX(e.target.value)}
                        placeholder="X"
                        className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-700/50 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Y Position</label>
                      <input
                        type="number"
                        value={mouseY}
                        onChange={(e) => setMouseY(e.target.value)}
                        placeholder="Y"
                        className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-700/50 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        moveMouse(parseInt(mouseX), parseInt(mouseY), dryRun)
                      }
                      disabled={!mouseX || !mouseY || isExecuting}
                      className="py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
                    >
                      Move Cursor
                    </button>
                    <button
                      onClick={() =>
                        click(parseInt(mouseX), parseInt(mouseY), "left", dryRun)
                      }
                      disabled={!mouseX || !mouseY || isExecuting}
                      className="py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
                    >
                      Click
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <span>Screenshot Capture</span>
                </h2>

                <button
                  onClick={() => takeScreenshot(dryRun)}
                  disabled={isExecuting}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {isExecuting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                  Capture Screenshot
                </button>
              </div>

              {lastResult && (
                <div
                  className={`bg-gray-900/60 backdrop-blur-sm rounded-xl border p-5 ${
                    lastResult.success ? "border-emerald-500/30" : "border-red-500/30"
                  }`}
                >
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    {lastResult.success ? (
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <X className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    <span>Execution Result</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <span className="text-gray-400">Status</span>
                      <span className={lastResult.success ? "text-emerald-400" : "text-red-400"}>
                        {lastResult.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <span className="text-gray-400">Platform</span>
                      <span className="text-white">{lastResult.platform}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <span className="text-gray-400">Safe Mode</span>
                      <span className={lastResult.dryRun ? "text-amber-400" : "text-red-400"}>
                        {lastResult.dryRun ? "Yes" : "No"}
                      </span>
                    </div>
                    <p className="text-gray-300 mt-3 p-3 bg-gray-800/30 rounded-lg">{lastResult.detail}</p>
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
