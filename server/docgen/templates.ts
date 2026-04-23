export type Audience = "military" | "official" | "technical" | "executive";

export type DocType =
  | "sitrep"
  | "intelsum"
  | "military_report"
  | "ops_plan"
  | "technical_report"
  | "legal_admin"
  | "policy_paper"
  | "research_report"
  | "application_evaluation"
  | "executive_summary"
  | "correspondence"
  | "audit_report"
  | "legal_brief"
  | "compliance_report";

export interface TemplateSection {
  id: string;
  title: string;
  required: boolean;
}

export const templates: Record<DocType, TemplateSection[]> = {
  sitrep: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "situation", title: "Situation / Background", required: true },
    { id: "friendly", title: "Friendly Forces", required: true },
    { id: "enemy", title: "Enemy / Threat", required: true },
    { id: "civil", title: "Civil / Neutral", required: false },
    { id: "significant", title: "Significant Activities", required: true },
    { id: "analysis", title: "Analysis", required: true },
    { id: "assessment", title: "Assessment", required: true },
    { id: "recommendations", title: "Recommendations", required: true },
    { id: "risk", title: "Risks / Mitigations", required: true },
    { id: "annexes", title: "Annexes", required: false },
  ],
  intelsum: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "summary", title: "Intelligence Summary", required: true },
    { id: "indicators", title: "Indicators / Warnings", required: true },
    { id: "assessments", title: "Assessments", required: true },
    { id: "confidence", title: "Confidence & Sources", required: true },
    { id: "recommendations", title: "Recommendations", required: true },
  ],
  military_report: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "background", title: "Background", required: true },
    { id: "situation", title: "Situation", required: true },
    { id: "analysis", title: "Analysis", required: true },
    { id: "findings", title: "Findings", required: true },
    { id: "conclusions", title: "Conclusions", required: true },
    { id: "recommendations", title: "Recommendations", required: true },
    { id: "annexes", title: "Annexes", required: false },
  ],
  ops_plan: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "mission", title: "Mission", required: true },
    { id: "concept", title: "Concept of Operations", required: true },
    { id: "tasks", title: "Tasks", required: true },
    { id: "coordination", title: "Coordinating Instructions", required: true },
    { id: "sustainment", title: "Sustainment", required: true },
    { id: "c2", title: "Command & Control", required: true },
    { id: "risk", title: "Risks / Mitigations", required: true },
    { id: "appendices", title: "Appendices", required: false },
  ],
  technical_report: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "scope", title: "Scope", required: true },
    { id: "background", title: "Background", required: true },
    { id: "methodology", title: "Methodology", required: true },
    { id: "results", title: "Data / Results", required: true },
    { id: "analysis", title: "Analysis", required: true },
    { id: "findings", title: "Findings", required: true },
    { id: "limitations", title: "Limitations", required: true },
    { id: "recommendations", title: "Recommendations", required: true },
    { id: "appendices", title: "Appendices", required: false },
  ],
  legal_admin: [
    { id: "title", title: "Title / Heading", required: true },
    { id: "purpose", title: "Purpose", required: true },
    { id: "authority", title: "Authority / References", required: true },
    { id: "scope", title: "Scope / Applicability", required: true },
    { id: "provisions", title: "Policy / Provisions", required: true },
    { id: "responsibilities", title: "Responsibilities", required: true },
    { id: "compliance", title: "Compliance", required: true },
    { id: "effective", title: "Effective Date", required: true },
    { id: "appendices", title: "Appendices", required: false },
  ],
  policy_paper: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "background", title: "Background", required: true },
    { id: "analysis", title: "Analysis", required: true },
    { id: "options", title: "Options", required: true },
    { id: "recommendation", title: "Recommendation", required: true },
    { id: "impacts", title: "Impacts / Risks", required: true },
    { id: "implementation", title: "Implementation", required: true },
  ],
  research_report: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "abstract", title: "Abstract", required: true },
    { id: "background", title: "Background / Literature", required: true },
    { id: "methods", title: "Methods", required: true },
    { id: "results", title: "Results", required: true },
    { id: "discussion", title: "Discussion", required: true },
    { id: "conclusions", title: "Conclusions", required: true },
    { id: "recommendations", title: "Recommendations", required: true },
    { id: "appendices", title: "Appendices", required: false },
  ],
  application_evaluation: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "subject", title: "Subject / Applicant", required: true },
    { id: "criteria", title: "Criteria", required: true },
    { id: "evidence", title: "Evidence", required: true },
    { id: "evaluation", title: "Evaluation", required: true },
    { id: "findings", title: "Findings", required: true },
    { id: "decision", title: "Decision / Recommendation", required: true },
    { id: "followup", title: "Follow-up Actions", required: true },
  ],
  executive_summary: [
    { id: "purpose", title: "Purpose", required: true },
    { id: "key_points", title: "Key Points", required: true },
    { id: "findings", title: "Findings", required: true },
    { id: "impacts", title: "Impacts", required: true },
    { id: "recommendation", title: "Recommendation", required: true },
    { id: "next_steps", title: "Next Steps", required: true },
  ],
  correspondence: [
    { id: "heading", title: "Heading / Reference", required: true },
    { id: "purpose", title: "Purpose", required: true },
    { id: "body", title: "Body", required: true },
    { id: "action", title: "Requested Action", required: true },
    { id: "closing", title: "Closing / Signature", required: true },
  ],
  audit_report: [
    { id: "executive_summary", title: "Executive Summary", required: true },
    { id: "scope", title: "Audit Scope & Objectives", required: true },
    { id: "methodology", title: "Audit Methodology", required: true },
    { id: "findings", title: "Audit Findings", required: true },
    { id: "controls", title: "Internal Controls", required: true },
    { id: "risk", title: "Risk Assessment", required: true },
    { id: "recommendations", title: "Recommendations", required: true },
    { id: "management_response", title: "Management Response", required: false },
    { id: "action_plan", title: "Action Plan", required: true },
    { id: "annexes", title: "Annexes", required: false },
  ],
  legal_brief: [
    { id: "cover", title: "Caption / Citation", required: true },
    { id: "facts", title: "Statement of Facts", required: true },
    { id: "issues", title: "Issues Presented", required: true },
    { id: "standard", title: "Standard of Review", required: true },
    { id: "argument", title: "Argument", required: true },
    { id: "authorities", title: "Authorities & Precedents", required: true },
    { id: "counterarguments", title: "Counterarguments", required: false },
    { id: "conclusion", title: "Conclusion & Relief Sought", required: true },
    { id: "appendices", title: "Appendices / Exhibits", required: false },
  ],
  compliance_report: [
    { id: "executive_summary", title: "Executive Summary", required: true },
    { id: "framework", title: "Compliance Framework", required: true },
    { id: "obligations", title: "Regulatory Obligations", required: true },
    { id: "methodology", title: "Assessment Methodology", required: true },
    { id: "status", title: "Compliance Status", required: true },
    { id: "gaps", title: "Gaps & Non-Conformities", required: true },
    { id: "risk", title: "Risk Rating", required: true },
    { id: "recommendations", title: "Corrective Actions", required: true },
    { id: "monitoring", title: "Monitoring & Review", required: true },
    { id: "annexes", title: "Annexes", required: false },
  ],
};

export const defaultDocType: DocType = "executive_summary";

export const toneByAudience: Record<Audience, string> = {
  military: "concise, directive, neutral, mission-focused",
  official: "formal, precise, policy-aligned",
  technical: "exact, analytical, evidence-based",
  executive: "high-level, decisive, outcome-focused",
};

