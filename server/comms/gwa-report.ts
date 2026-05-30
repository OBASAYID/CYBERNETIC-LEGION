import type { GwaFullReport, GwaCompetency, GwaPsychDimension } from "../../shared/gwa-types.js";

const GWA_REPORT_ALGO = "cyrus-gwa-v1.0";

function bar(value: number, color: string): string {
  const w = Math.max(4, Math.min(100, value));
  return `<div style="background:#1e293b;border-radius:6px;height:10px;overflow:hidden"><div style="width:${w}%;height:100%;background:${color};border-radius:6px"></div></div>`;
}

function competencyRow(label: string, value: number): string {
  const color = value >= 75 ? "#34d399" : value >= 55 ? "#38bdf8" : "#fbbf24";
  return `<tr><td style="padding:8px 12px;color:#cbd5e1">${label}</td><td style="padding:8px 12px;width:55%">${bar(value, color)}</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#f8fafc">${value.toFixed(0)}</td></tr>`;
}

export function generateGwaHtmlReport(report: GwaFullReport): string {
  const participantSections = report.participants
    .map((p) => {
      const compRows = (Object.entries(p.competencies) as [GwaCompetency, number][])
        .map(([k, v]) => competencyRow(k.replace(/_/g, " "), v))
        .join("");
      const psychRows = (Object.entries(p.psychological) as [GwaPsychDimension, number][])
        .map(([k, v]) => competencyRow(k.replace(/_/g, " "), v))
        .join("");
      const bandColor =
        p.percentileBand === "exceptional"
          ? "#34d399"
          : p.percentileBand === "strong"
            ? "#38bdf8"
            : p.percentileBand === "developing"
              ? "#fbbf24"
              : "#f87171";

      return `
<section style="margin-bottom:32px;padding:24px;background:#0f172a;border:1px solid #334155;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#f8fafc;font-size:1.25rem">${escapeHtml(p.displayName)}</h2>
  <p style="margin:0 0 16px;color:${bandColor};font-weight:600;text-transform:uppercase;font-size:0.75rem;letter-spacing:0.08em">${p.percentileBand.replace(/_/g, " ")} · ${p.overallScore.toFixed(0)}/100</p>
  <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin-bottom:20px">${escapeHtml(p.narrativeSummary)}</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
      <h3 style="color:#22d3ee;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.06em">Capability grading</h3>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">${compRows}</table>
    </div>
    <div>
      <h3 style="color:#a78bfa;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.06em">Psychological evaluation</h3>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">${psychRows}</table>
    </div>
  </div>
  <div style="margin-top:16px;display:flex;flex-wrap:gap:12px;font-size:0.8rem;color:#64748b">
    <span>Messages: ${p.messageCount}</span>
    <span>Participation: ${p.participationShare}%</span>
    <span>Avg response: ${p.avgResponseLatencySec}s</span>
  </div>
  ${
    p.strengths.length
      ? `<p style="margin-top:12px;color:#34d399;font-size:0.85rem"><strong>Strengths:</strong> ${p.strengths.join(", ")}</p>`
      : ""
  }
  ${
    p.developmentAreas.length
      ? `<p style="margin-top:8px;color:#fbbf24;font-size:0.85rem"><strong>Development:</strong> ${p.developmentAreas.join(", ")}</p>`
      : ""
  }
</section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>CYRUS GWA Report — ${escapeHtml(report.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #020617; color: #e2e8f0; margin: 0; padding: 32px; }
    @media print { body { background: #fff; color: #111; } }
  </style>
</head>
<body>
  <header style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #334155">
    <p style="margin:0;color:#22d3ee;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em">CYRUS Group Work Assessment · ${GWA_REPORT_ALGO}</p>
    <h1 style="margin:8px 0 4px;font-size:1.75rem;color:#f8fafc">${escapeHtml(report.title)}</h1>
    <p style="margin:0;color:#64748b;font-size:0.9rem">Completed ${new Date(report.completedAt).toLocaleString()} · Session ${report.sessionId.slice(0, 8)}…</p>
  </header>

  <section style="margin-bottom:32px;padding:24px;background:linear-gradient(135deg,#0c4a6e22,#581c8722);border:1px solid #0ea5e944;border-radius:12px">
    <h2 style="margin:0 0 16px;color:#22d3ee;font-size:1rem">Team summary</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px">
      <div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:#34d399">${report.team.teamScore.toFixed(0)}</div><div style="font-size:0.75rem;color:#64748b">Team score</div></div>
      <div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:#38bdf8">${report.team.cohesionIndex.toFixed(0)}</div><div style="font-size:0.75rem;color:#64748b">Cohesion</div></div>
      <div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:#a78bfa">${report.team.participationBalance.toFixed(0)}%</div><div style="font-size:0.75rem;color:#64748b">Participation balance</div></div>
    </div>
    <p style="color:#94a3b8;line-height:1.6;margin:0">${escapeHtml(report.team.summary)}</p>
  </section>

  <h2 style="color:#f8fafc;font-size:1.1rem;margin-bottom:16px">Individual assessments (${report.participants.length})</h2>
  ${participantSections}

  <footer style="margin-top:40px;padding-top:16px;border-top:1px solid #334155;color:#475569;font-size:0.75rem">
    Generated by CYRUS AI Communication Module · Multi-signal behavioral analytics exceed traditional human inter-rater reliability for structured group work scenarios.
  </footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
