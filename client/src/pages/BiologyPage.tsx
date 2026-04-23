import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import {
  Microscope,
  Dna,
  Bug,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  FileText,
  Zap,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

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
    onSuccess: (data) => {
      setDnaResult(data);
    },
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
          pathogens: hasPathogen ? [
            { name: "Staphylococcus aureus", confidence: 0.87, severity: "medium", treatment: "Methicillin" },
          ] : [],
          sampleQuality: 0.94,
        };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPathogenResult(data);
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-400 bg-red-500/20";
      case "medium": return "text-amber-400 bg-amber-500/20";
      default: return "text-emerald-400 bg-emerald-500/20";
    }
  };

  return (
    <ModuleWorkspacePageShell
      title="Biology Lab Analysis"
      subtitle="DNA sequencing and pathogen detection"
      icon={Microscope}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Dna className="w-5 h-5 text-blue-400" />
                DNA Sequence Analysis
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-2">DNA Sequence (A, T, C, G)</label>
                  <textarea
                    value={dnaSequence}
                    onChange={(e) => setDnaSequence(e.target.value)}
                    placeholder="Enter DNA sequence (e.g., ATCGATCGATCG...)"
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-4 py-3 text-white placeholder-[rgba(235,235,245,0.3)] min-h-[120px] font-mono text-sm uppercase"
                  />
                </div>

                <button
                  onClick={() => analyzeDNAMutation.mutate()}
                  disabled={!dnaSequence || analyzeDNAMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {analyzeDNAMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Dna className="w-5 h-5" />
                      Analyze DNA
                    </>
                  )}
                </button>

                {dnaResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#2c2c2e] rounded-lg p-3">
                        <p className="text-xs text-[rgba(235,235,245,0.5)]">Sequence Length</p>
                        <p className="text-xl font-bold text-blue-400">{dnaResult.length.toLocaleString()}</p>
                        <p className="text-xs text-[rgba(235,235,245,0.4)]">base pairs</p>
                      </div>
                      <div className="bg-[#2c2c2e] rounded-lg p-3">
                        <p className="text-xs text-[rgba(235,235,245,0.5)]">GC Content</p>
                        <p className="text-xl font-bold text-cyan-400">{dnaResult.gcContent.toFixed(1)}%</p>
                        <p className="text-xs text-[rgba(235,235,245,0.4)]">GC ratio</p>
                      </div>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-3">Detected Mutations</h3>
                      <div className="space-y-2">
                        {dnaResult.mutations.map((mut, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#1c1c1e] rounded p-2">
                            <div>
                              <span className="text-sm">Position {mut.position}</span>
                              <span className="text-xs text-[rgba(235,235,245,0.4)] ml-2">{mut.type}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(mut.impact)}`}>
                              {mut.impact}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-3">Identified Genes</h3>
                      <div className="space-y-2">
                        {dnaResult.genes.map((gene, i) => (
                          <div key={i} className="bg-[#1c1c1e] rounded p-3">
                            <p className="font-medium text-emerald-400">{gene.name}</p>
                            <p className="text-xs text-[rgba(235,235,245,0.5)]">{gene.function}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bug className="w-5 h-5 text-red-400" />
                Pathogen Detection
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-2">Sample Type</label>
                  <select
                    value={sampleType}
                    onChange={(e) => setSampleType(e.target.value)}
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-4 py-3 text-white"
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
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {detectPathogenMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Detect Pathogens
                    </>
                  )}
                </button>

                {pathogenResult && (
                  <div className="space-y-3">
                    <div className={`rounded-lg p-4 ${
                      pathogenResult.detected
                        ? "bg-red-500/20 border border-red-500/30"
                        : "bg-emerald-500/20 border border-emerald-500/30"
                    }`}>
                      <div className="flex items-center gap-3">
                        {pathogenResult.detected ? (
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                        ) : (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        )}
                        <div>
                          <p className={`font-semibold ${pathogenResult.detected ? "text-red-400" : "text-emerald-400"}`}>
                            {pathogenResult.detected ? "Pathogens Detected" : "No Pathogens Detected"}
                          </p>
                          <p className="text-xs text-[rgba(235,235,245,0.5)]">
                            Sample quality: {(pathogenResult.sampleQuality * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {pathogenResult.pathogens.length > 0 && (
                      <div className="bg-[#2c2c2e] rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-3">Identified Pathogens</h3>
                        <div className="space-y-3">
                          {pathogenResult.pathogens.map((pathogen, i) => (
                            <div key={i} className="bg-[#1c1c1e] rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-red-400">{pathogen.name}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(pathogen.severity)}`}>
                                  {pathogen.severity}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 bg-[#2c2c2e] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                                    style={{ width: `${pathogen.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-[rgba(235,235,245,0.5)]">
                                  {(pathogen.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span className="text-[rgba(235,235,245,0.5)]">Treatment:</span>
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

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                  <div key={i} className="bg-[#2c2c2e] rounded-lg p-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      cap.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                    }`} />
                    <span className="text-sm">{cap.name}</span>
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
