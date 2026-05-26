import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { systemFetch } from "@/lib/system-api";
import { FileText, Loader2, ScrollText, Sparkles } from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import { TSODILO_HUNT_SYMBOLS_URL } from "@/lib/dashboard-backdrop";

type Mode = "full" | "convert" | "assist";

interface GeneratedDoc {
  docType: string;
  audience: string;
  confidence: string;
  assumptions: string[];
  missing: string[];
  sections: { title: string; content: string }[];
  rendered: string;
}

const docTypes = [
  "sitrep",
  "intelsum",
  "military_report",
  "ops_plan",
  "technical_report",
  "legal_admin",
  "policy_paper",
  "research_report",
  "application_evaluation",
  "executive_summary",
  "correspondence",
];

const audiences = ["military", "official", "technical", "executive"];

export default function DocumentBuilder() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("full");
  const [docType, setDocType] = useState("executive_summary");
  const [audience, setAudience] = useState("official");
  const [purpose, setPurpose] = useState("");
  const [topic, setTopic] = useState("");
  const [rawText, setRawText] = useState("");
  const [data, setData] = useState("");
  const [result, setResult] = useState<GeneratedDoc | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await systemFetch("/api/doc/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, docType, audience, purpose, topic, rawText, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setResult(json);
      toast({ title: "Document generated", description: json.docType });
    } catch (err: any) {
      toast({ title: "Generation error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuleWorkspacePageShell
      theme="dashboard"
      backdropTextureUrl={TSODILO_HUNT_SYMBOLS_URL}
      backdropPixelated
      kicker="Cyrus · Documents"
      title="Document builder"
      subtitle="Structured drafting with professional output controls"
      icon={ScrollText}
    >
      <div className="grid min-h-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:max-h-[calc(100dvh-2.75rem)] lg:items-stretch lg:gap-6 lg:overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/58 via-slate-900/76 to-slate-950/88 p-4 shadow-[0_20px_42px_rgba(0,0,0,0.36)] sm:p-5">
          <h2
            className="flex items-center gap-2.5 text-base font-semibold text-slate-100 sm:text-lg"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            <Sparkles className="h-5 w-5 text-sky-200" />
            Input configuration
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mode</Label>
              <select
                className="w-full rounded-lg border border-white/14 bg-slate-950/65 p-2.5"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                <option value="full">Full Generation</option>
                <option value="convert">Text to Professional</option>
                <option value="assist">Assisted Drafting</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <select
                className="w-full rounded-lg border border-white/14 bg-slate-950/65 p-2.5"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {docTypes.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <select
                className="w-full rounded-lg border border-white/14 bg-slate-950/65 p-2.5"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                {audiences.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input className="border-white/14 bg-slate-950/65" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Topic</Label>
              <Input className="border-white/14 bg-slate-950/65" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Raw Text (for convert/assist)</Label>
              <Textarea className="border-white/14 bg-slate-950/65" value={rawText} onChange={(e) => setRawText(e.target.value)} rows={5} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Data / Notes</Label>
              <Textarea className="border-white/14 bg-slate-950/65" value={data} onChange={(e) => setData(e.target.value)} rows={4} />
            </div>
            <div className="md:col-span-2">
              <Button
                onClick={generate}
                disabled={loading}
                className="h-11 w-full bg-gradient-to-r from-slate-300/22 to-sky-300/33 text-base text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        <aside className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/58 via-slate-900/76 to-slate-950/88 shadow-[0_20px_42px_rgba(0,0,0,0.36)] sm:min-h-[300px] lg:min-h-0 lg:h-full lg:max-h-full">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
            <h2
              className="text-base font-semibold tracking-wide text-slate-100 sm:text-lg"
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              Output preview
            </h2>
            <p className="text-sm leading-snug text-white/55">Generated structure, confidence, and document sections.</p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            {!result ? (
              <div className="rounded-xl border border-white/12 bg-slate-950/55 p-4 text-sm text-white/65">
                Run generation to view structured output here.
              </div>
            ) : (
              <section className="flex min-h-0 flex-col gap-3 rounded-xl border border-sky-300/25 bg-slate-950/55 p-3.5 sm:p-4">
                <h3
                  className="flex items-center gap-2 text-base font-semibold text-slate-100"
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  <FileText className="h-5 w-5 text-sky-200" />
                  {result.docType.toUpperCase()} · Confidence {result.confidence}
                </h3>
                {result.assumptions?.length > 0 ? (
                  <p className="text-sm text-slate-200/80">Assumptions: {result.assumptions.join("; ")}</p>
                ) : null}
                {result.missing?.length > 0 ? (
                  <p className="text-sm text-rose-300/85">Missing: {result.missing.join("; ")}</p>
                ) : null}
                <div className="space-y-3 text-sm text-slate-200/90">
                  {result.sections?.map((s, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="font-semibold text-white">{s.title}</p>
                      <p className="mt-1 whitespace-pre-wrap">{s.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </ModuleWorkspacePageShell>
  );
}

