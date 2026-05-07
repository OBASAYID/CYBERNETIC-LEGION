import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { systemFetch } from "@/lib/system-api";

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
    <div className="min-h-screen bg-transparent text-white p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Document Builder</h1>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded p-2"
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
                className="w-full bg-slate-800 border border-slate-700 rounded p-2"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {docTypes.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded p-2"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                {audiences.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Raw Text (for convert/assist)</Label>
              <Textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Data / Notes</Label>
              <Textarea value={data} onChange={(e) => setData(e.target.value)} rows={3} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={generate} disabled={loading}>
                {loading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>{result.docType.toUpperCase()} — Confidence: {result.confidence}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-200">
              {result.assumptions?.length > 0 && (
                <div>Assumptions: {result.assumptions.join("; ")}</div>
              )}
              {result.missing?.length > 0 && (
                <div className="text-amber-300">Missing: {result.missing.join("; ")}</div>
              )}
              {result.sections.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="font-semibold">{s.title}</div>
                  <div className="whitespace-pre-wrap">{s.content}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

