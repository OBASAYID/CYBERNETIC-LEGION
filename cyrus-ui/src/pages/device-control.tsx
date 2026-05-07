import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { systemFetch } from "@/lib/system-api";

type Action =
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

export default function DeviceControl() {
  const { toast } = useToast();
  const [appName, setAppName] = useState("Finder");
  const [text, setText] = useState("");
  const [shortcut, setShortcut] = useState("cmd,space");
  const [dryRun, setDryRun] = useState(true);
  const [confirmToken, setConfirmToken] = useState("");
  const [action, setAction] = useState<Action>("focus_app");

  const execute = async () => {
    try {
      const body: any = { action, dryRun };
      if (action === "open_app" || action === "focus_app") body.appName = appName;
      if (action === "text") body.text = text;
      if (action === "keystroke") body.keys = [text || "a"];
      if (action === "shortcut") body.shortcut = shortcut.split(",").map((k) => k.trim());
      if (action === "pointer_move") body.x = 100;
      if (action === "scroll") body.dy = -100;
      if (!dryRun && confirmToken) body.confirmToken = confirmToken;

      const res = await systemFetch("/api/device/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Command failed");
      }
      toast({ title: "Device command", description: data.detail || "Done" });
    } catch (err: any) {
      toast({ title: "Device command failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Device Control</h1>
        <p className="text-sm text-slate-400">
          Actions are gated by server configuration, allowlist, and may run in dry-run mode by default.
        </p>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Command</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Action</Label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as Action)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
              >
                <option value="focus_app">focus_app</option>
                <option value="open_app">open_app</option>
                <option value="text">text</option>
                <option value="keystroke">keystroke</option>
                <option value="shortcut">shortcut</option>
                <option value="pointer_move">pointer_move (stub coords)</option>
                <option value="pointer_click">pointer_click</option>
                <option value="pointer_drag">pointer_drag</option>
                <option value="scroll">scroll</option>
                <option value="screenshot">screenshot</option>
              </select>
            </div>

            {(action === "open_app" || action === "focus_app") && (
              <div>
                <Label>App Name</Label>
                <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
              </div>
            )}

            {(action === "text" || action === "keystroke") && (
              <div>
                <Label>Text / Key</Label>
                <Input value={text} onChange={(e) => setText(e.target.value)} />
              </div>
            )}

            {action === "shortcut" && (
              <div>
                <Label>Shortcut (comma separated)</Label>
                <Input value={shortcut} onChange={(e) => setShortcut(e.target.value)} />
              </div>
            )}

            {!dryRun && (
              <div>
                <Label>Confirmation Token</Label>
                <Input value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                id="dryrun"
              />
              <Label htmlFor="dryrun">Dry-run</Label>
            </div>

            <Button onClick={execute} className="w-full bg-green-600 hover:bg-green-700">
              Execute
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

