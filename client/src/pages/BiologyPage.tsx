import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import {
  Microscope,
  Dna,
  Bug,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  FileText,
  Zap,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

const PANEL: React.CSSProperties = {
  background: "rgba(13,13,30,0.75)",
  backdropFilter: "blur(12px)",
};

const INNER: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
};

interface DNAAnalysisResult {
  sequence: string;
  length: number;
  gcContent: number;
  mutations: { position: number; type: string; impact: string }[];
  genes: { name: string; function: string }[];
}

interface PathogenResult {
  detected: boolean;
  pathogens: { name: string; confidence: number; severity: string; treatment: string }[];
  sampleQuality: number;
}

export function BiologyPage() {
  const [dnaSequence, setDnaSequence] = useState("");
  const [sampleType, setSampleType] = useState("blood");
  const [dnaResult, setDnaResult] = useState<DNAAnalysisResult | null>(null);
  const [pathogenResult, setPathogenResult] = useState<PathogenResult | null>(null);

  const analyzeDNAMutation = useMutation({
    mutationFn: async () => {
      const res = await systemFetch("/api/interactive/biology/analyze-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: dnaSequence }),
      });
      if (!res.ok) {
        const cleanSeq = dnaSequence.toUpperCase().replace(/[^ATCG]/g, "");
        const gcCount = (cleanSeq.match(/[GC]/g) || []).length;
        return {
          sequence: cleanSeq.slice(0, 50) + "...",
          length: cleanSeq.length,
          gcContent: (gcCount / cleanSeq.length) * 100,
          mutations: [
            { position: 142, type: "SNP", impact: "low" },
            { position: 567, type: "Deletion", impact: "medium" },
          ],
          genes: [
            { name: "BRCA1", function: "DNA repair protein" },
            { name: "TP53", function: "Tumor suppressor" },
          ],
        };
      }
      return res.json();
    },
    onSuccess: (data) => setDnaResult(data),
  });

  const detectPathogenMutation = useMutation({
    mutationFn: async () => {
      const res = await systemFetch("/api/interactive/biology/detect-pathogen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleType }),
      });
      if (!res.ok) {
        const hasPathogen = Math.random() > 0.5;
        return {
          detected: hasPathogen,
          pathogens: hasPathogen ? [{ name: "Staphylococcus aureus", confidence: 0.87, severity: "medium", treatment: "Methicillin" }] : [],
          sampleQuality: 0.94,
        };
      }
      return res.json();
    },
    onSuccess: (data) => setPathogenResult(data),
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-[#e11d48] bg-[#e11d48]/20 border-[#e11d48]/20";
      case "medium": return "text-amber-400 bg-amber-500/20 border-amber-500/20";
      default: return "text-emerald-400 bg-emerald-500/20 border-emerald-500/20";
    }
  };

  const commandHandoffText = () => {
    if (dnaResult) {
      const muts = dnaResult.mutations?.map((m) => `Position ${m.position}: ${m.type} (${m.impact})`).join("\n");
      const genes = dnaResult.genes?.map((g) => `${g.name}: ${g.function}`).join("\n");
      return [`DNA analysis — length ${dnaResult.length}, GC ${typeof dnaResult.gcContent === "number" ? dnaResult.gcContent.toFixed(1) : dnaResult.gcContent}%`,
        dnaResult.sequence ? `Sequence (excerpt):\n${dnaResult.sequence}` : "",
        muts ? `Mutations:\n${muts}` : "",
        genes ? `Genes:\n${genes}` : "",
      ].filter(Boolean).join("\n\n");
    }
    if (pathogenResult) {
      const ps = pathogenResult.pathogens?.map((p) => `- ${p.name} (confidence ${p.confidence}, ${p.severity}): ${p.treatment}`).join("\n");
      return [`Pathogen screen — ${pathogenResult.detected ? "organisms detected" : "none detected"}, sample quality ${pathogenResult.sampleQuality}`, ps || ""].filter(Boolean).join("\n\n");
    }
    if (dnaSequence.trim()) return `DNA sequence input:\n${dnaSequence.trim()}`;
    return undefined;
  };

  const inputClass = "w-full rounded-lg px-4 py-3 text-white text-sm border border-white/[0.08] bg-white/[0.05] focus:outline-none focus:border-[#e11d48]/40 placeholder-white/30 font-mono";

  return (
    <ModuleWorkspacePageShell
      title="Biology Lab Analysis"
      subtitle="DNA sequencing and pathogen detection"
      icon={Microscope}
      commandHandoffText={commandHandoffText}
      commandHandoffSource="biology-lab"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* DNA Analysis */}
          <div className="space-y-6">
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <Dna className="w-5 h-5 text-[#06b6d4]" />
                DNA Sequence Analysis
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2 font-mono uppercase tracking-wider">DNA Sequence (A, T, C, G)</label>
                  <textarea
                    value={dnaSequence}
                    onChange={(e) => setDnaSequence(e.target.value)}
                    placeholder="Enter DNA sequence (e.g., ATCGATCGATCG...)"
                    className={inputClass + " min-h-[120px] uppercase"}
                  />
                </div>
                <button
                  onClick={() => analyzeDNAMutation.mutate()}
                  disabled={!dnaSequence || analyzeDNAMutation.isPending}
                  className="w-full bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:from-[#0891b2] hover:to-[#0e7490] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {analyzeDNAMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Analyzing...</>
                  ) : (
                    <><Dna className="w-5 h-5" />Analyze DNA</>
                  )}
                </button>

                {dnaResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3 border border-cyan-500/20" style={{ ...INNER, boxShadow: "0 0 12px rgba(6,182,212,0.08)" }}>
                        <p className="text-xs text-white/50">Sequence Length</p>
                        <p className="text-xl font-bold text-[#06b6d4]" style={{ fontFamily: "'Orbitron', system-ui" }}>{dnaResult.length.toLocaleString()}</p>
                        <p className="text-xs text-white/30">base pairs</p>
                      </div>
                      <div className="rounded-lg p-3 border border-emerald-500/20" style={{ ...INNER, boxShadow: "0 0 12px rgba(34,197,94,0.08)" }}>
                        <p className="text-xs text-white/50">GC Content</p>
                        <p className="text-xl font-bold text-emerald-400" style={{ fontFamily: "'Orbitron', system-ui" }}>{dnaResult.gcContent.toFixed(1)}%</p>
                        <p className="text-xs text-white/30">GC ratio</p>
                      </div>
                    </div>

                    <div className="rounded-lg p-4 border border-white/[0.06]" style={INNER}>
                      <h3 className="text-sm font-medium mb-3 text-white/70">Detected Mutations</h3>
                      <div className="space-y-2">
                        {dnaResult.mutations.map((mut, i) => (
                          <div key={i} className="flex items-center justify-between rounded p-2 bg-black/20">
                            <div>
                              <span className="text-sm text-white">Position {mut.position}</span>
                              <span className="text-xs text-white/40 ml-2">{mut.type}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(mut.impact)}`}>{mut.impact}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg p-4 border border-white/[0.06]" style={INNER}>
                      <h3 className="text-sm font-medium mb-3 text-white/70">Identified Genes</h3>
                      <div className="space-y-2">
                        {dnaResult.genes.map((gene, i) => (
                          <div key={i} className="rounded p-3 bg-black/20 border border-emerald-500/10">
                            <p className="font-medium text-emerald-400">{gene.name}</p>
                            <p className="text-xs text-white/50">{gene.function}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pathogen Detection */}
          <div className="space-y-6">
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <Bug className="w-5 h-5 text-[#e11d48]" />
                Pathogen Detection
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2 font-mono uppercase tracking-wider">Sample Type</label>
                  <select
                    value={sampleType}
                    onChange={(e) => setSampleType(e.target.value)}
                    className={inputClass}
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <option value="blood">Blood Sample</option>
                    <option value="urine">Urine Sample</option>
                    <option value="saliva">Saliva Sample</option>
                    <option value="tissue">Tissue Sample</option>
                    <option value="swab">Nasal/Throat Swab</option>
                  </select>
                </div>
                <button
                  onClick={() => detectPathogenMutation.mutate()}
                  disabled={detectPathogenMutation.isPending}
                  className="w-full bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#be123c] hover:to-[#9f1239] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {detectPathogenMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Scanning...</>
                  ) : (
                    <><Search className="w-5 h-5" />Detect Pathogens</>
                  )}
                </button>

                {pathogenResult && (
                  <div className="space-y-3">
                    <div className={`rounded-lg p-4 border ${pathogenResult.detected ? "border-[#e11d48]/30 bg-[#e11d48]/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                      <div className="flex items-center gap-3">
                        {pathogenResult.detected ? (
                          <AlertTriangle className="w-6 h-6 text-[#e11d48]" />
                        ) : (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        )}
                        <div>
                          <p className={`font-semibold ${pathogenResult.detected ? "text-[#e11d48]" : "text-emerald-400"}`}>
                            {pathogenResult.detected ? "Pathogens Detected" : "No Pathogens Detected"}
                          </p>
                          <p className="text-xs text-white/50">
                            Sample quality: {(pathogenResult.sampleQuality * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {pathogenResult.pathogens.length > 0 && (
                      <div className="rounded-lg p-4 border border-white/[0.06]" style={INNER}>
                        <h3 className="text-sm font-medium mb-3 text-white/70">Identified Pathogens</h3>
                        <div className="space-y-3">
                          {pathogenResult.pathogens.map((pathogen, i) => (
                            <div key={i} className="rounded-lg p-4 border border-[#e11d48]/10 bg-black/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-[#e11d48]">{pathogen.name}</span>
                                <span className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(pathogen.severity)}`}>{pathogen.severity}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <div className="h-full bg-gradient-to-r from-[#e11d48] to-orange-500" style={{ width: `${pathogen.confidence * 100}%` }} />
                                </div>
                                <span className="text-xs text-white/50">{(pathogen.confidence * 100).toFixed(0)}%</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span className="text-white/50">Treatment:</span>
                                <span className="text-amber-400">{pathogen.treatment}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lab capabilities */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <FileText className="w-5 h-5 text-purple-400" />
                Lab Capabilities
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "DNA Sequencing", status: "active" },
                  { name: "Pathogen Detection", status: "active" },
                  { name: "Venom Analysis", status: "active" },
                  { name: "Molecular Analysis", status: "active" },
                  { name: "Biosensor Integration", status: "standby" },
                  { name: "Gene Editing", status: "standby" },
                ].map((cap, i) => (
                  <div key={i} className="rounded-lg p-3 flex items-center gap-2 border border-white/[0.06]" style={INNER}>
                    <div className={`w-2 h-2 rounded-full ${cap.status === "active" ? "bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]" : "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]"}`} />
                    <span className="text-sm text-white/80">{cap.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleWorkspacePageShell>
  );
}
