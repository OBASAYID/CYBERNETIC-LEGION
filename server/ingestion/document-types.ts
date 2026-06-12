/**
 * Centralized type definitions and validation for Document Intelligence module
 */

// ============================================
// CORE TYPE DEFINITIONS
// ============================================

export type DocumentMode = "standard" | "legal" | "audit" | "compliance";

export type DocumentType =
  | "constitutional_document"
  | "audit_report"
  | "compliance_report"
  | "legal_contract"
  | "legal_brief"
  | "research_report"
  | "policy_document"
  | "general_document"
  | "legal_summons"
  | "police_report"
  | "correspondence"
  | "pitch"
  | "memorandum"
  | "judgment"
  | "notice_letter"
  | "contract";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type RiskLevel = "low" | "medium" | "high";

export interface AnalysisOptions {
  jurisdiction?: string;
  strictLegalReview?: boolean;
  mode?: DocumentMode;
  docHint?: string;
  analysisCommand?: string;
  maxChunks?: number;
}

export interface AnalysisCitation {
  clause: string;
  excerpt: string;
  rationale: string;
}

export interface DecisionAction {
  action: string;
  owner: string;
  deadline: string;
  obligation: string;
}

export interface DocumentEntity {
  type: string;
  value: string;
}

export interface AnalysisResult {
  summary: string;
  findings: string[];
  issues: string[];
  interpretation: string;
  recommendations: string[];
  confidence: ConfidenceLevel;
  documentType?: string;
  documentTypeConfidence?: ConfidenceLevel;
  decisionActions?: DecisionAction[];
  executiveBrief?: string;
  knowledgeApplied?: string[];
  capabilitySummary?: string;
  jurisdictionApplied?: string;
  strictLegalReview?: boolean;
  citationAnchors?: AnalysisCitation[];
  chunksAnalyzed?: number;
  entities?: DocumentEntity[];
  riskLevel?: RiskLevel;
  qualityScores?: Record<string, number>;
  calibration?: {
    algorithmVersion: string;
    calibrated: boolean;
    overallQuality?: number;
    [key: string]: unknown;
  };
}

export interface ExtractionMetadata {
  pageCount?: number;
  textLength?: number;
  wordCount?: number;
  warnings?: string[];
}

export interface ExtractionResult {
  success: boolean;
  text?: string;
  ocrText?: string;
  transcript?: string;
  metadata?: ExtractionMetadata;
  frames?: Array<{
    frameIndex: number;
    ocrText?: string;
    description?: string;
  }>;
}

export interface FileDetectionResult {
  detectedMime?: string;
  declaredMime?: string;
  size: number;
  isImage?: boolean;
  isVideo?: boolean;
  isAudio?: boolean;
  isPdf?: boolean;
  isDocument?: boolean;
  confidence?: ConfidenceLevel;
}

export interface AnalysisReport {
  success: boolean;
  title: string;
  docType: string;
  sourceDescription: string;
  extractedSummary: string;
  transcript?: string;
  ocrText?: string;
  keyFindings: string[];
  issues: string[];
  interpretation: string;
  recommendations: string[];
  confidence: ConfidenceLevel;
  attempted: string[];
  warnings: string[];
}

export interface GeneratedDocument {
  rendered: string;
  htmlRendered?: string;
  title: string;
  docType?: string;
  audience?: string;
  confidence?: ConfidenceLevel;
  wordCount: number;
  estimatedPages: number;
  sections: Array<{ title: string; content: string }>;
  attachments?: Array<{
    id: string;
    kind: "image";
    style: "realistic_3d" | "graphical" | "schematic";
    sectionTitle?: string;
    caption: string;
    prompt: string;
    url?: string;
    dataUrl?: string;
  }>;
}

export interface DocumentGenerationOptions {
  docType: string;
  content: string;
  audience: string;
  targetPages: number;
  purpose?: string;
  includeImages?: boolean;
  imageStyle?: "realistic_3d" | "graphical" | "schematic";
}

// ============================================
// VALIDATION ERROR TYPES
// ============================================

export class DocumentValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "DocumentValidationError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates jurisdiction input
 */
export function validateJurisdiction(jurisdiction: string | undefined): string | undefined {
  if (!jurisdiction) return undefined;
  if (typeof jurisdiction !== "string") {
    throw new DocumentValidationError("Jurisdiction must be a string", "jurisdiction");
  }
  const trimmed = jurisdiction.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 200) {
    throw new DocumentValidationError("Jurisdiction name is too long (max 200 characters)", "jurisdiction");
  }
  return trimmed;
}

/**
 * Validates document mode
 */
export function validateDocumentMode(mode: string | undefined): DocumentMode | undefined {
  if (!mode) return undefined;
  const validModes: DocumentMode[] = ["standard", "legal", "audit", "compliance"];
  if (!validModes.includes(mode as DocumentMode)) {
    throw new DocumentValidationError(
      `Invalid mode. Must be one of: ${validModes.join(", ")}`,
      "mode"
    );
  }
  return mode as DocumentMode;
}

/**
 * Validates document hint
 */
export function validateDocumentHint(hint: string | undefined): string | undefined {
  if (!hint) return undefined;
  if (typeof hint !== "string") {
    throw new DocumentValidationError("Document hint must be a string", "docHint");
  }
  const trimmed = hint.trim();
  if (trimmed.length > 5000) {
    throw new DocumentValidationError("Document hint is too long (max 5000 characters)", "docHint");
  }
  return trimmed || undefined;
}

/**
 * Validates analysis command
 */
export function validateAnalysisCommand(command: string | undefined): string | undefined {
  if (!command) return undefined;
  if (typeof command !== "string") {
    throw new DocumentValidationError("Analysis command must be a string", "analysisCommand");
  }
  const trimmed = command.trim();
  if (trimmed.length > 8000) {
    throw new DocumentValidationError("Analysis command is too long (max 8000 characters)", "analysisCommand");
  }
  return trimmed || undefined;
}

/**
 * Validates max chunks parameter
 */
export function validateMaxChunks(maxChunks: number | string | undefined, systemMax: number): number {
  if (maxChunks === undefined || maxChunks === null) {
    return systemMax;
  }
  const num = typeof maxChunks === "string" ? parseInt(maxChunks, 10) : maxChunks;
  if (isNaN(num) || !isFinite(num)) {
    throw new DocumentValidationError("Max chunks must be a valid number", "maxChunks");
  }
  if (num < 1) {
    throw new DocumentValidationError("Max chunks must be at least 1", "maxChunks");
  }
  if (num > systemMax) {
    throw new DocumentValidationError(
      `Max chunks cannot exceed system limit of ${systemMax}`,
      "maxChunks"
    );
  }
  return Math.floor(num);
}

/**
 * Validates boolean input
 */
export function validateBoolean(value: unknown, fieldName: string, defaultValue: boolean = false): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  throw new DocumentValidationError(`${fieldName} must be a boolean`, fieldName);
}

/**
 * Validates file upload size
 */
export function validateFileSize(sizeBytes: number, maxSizeBytes: number): void {
  if (sizeBytes <= 0) {
    throw new DocumentValidationError("File size must be greater than 0");
  }
  if (sizeBytes > maxSizeBytes) {
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSizeBytes / 1024 / 1024).toFixed(2);
    throw new DocumentValidationError(
      `File size (${sizeMB}MB) exceeds maximum allowed (${maxSizeMB}MB)`,
      "file"
    );
  }
}

/**
 * Validates document type for generation
 */
export function validateDocumentType(docType: string | undefined): string {
  if (!docType) {
    throw new DocumentValidationError("Document type is required", "docType");
  }
  if (typeof docType !== "string") {
    throw new DocumentValidationError("Document type must be a string", "docType");
  }
  const trimmed = docType.trim();
  if (trimmed.length === 0) {
    throw new DocumentValidationError("Document type cannot be empty", "docType");
  }
  return trimmed;
}

/**
 * Validates audience input
 */
export function validateAudience(audience: string | undefined): string {
  if (!audience) {
    throw new DocumentValidationError("Audience is required", "audience");
  }
  if (typeof audience !== "string") {
    throw new DocumentValidationError("Audience must be a string", "audience");
  }
  const trimmed = audience.trim();
  if (trimmed.length === 0) {
    throw new DocumentValidationError("Audience cannot be empty", "audience");
  }
  if (trimmed.length > 500) {
    throw new DocumentValidationError("Audience description is too long (max 500 characters)", "audience");
  }
  return trimmed;
}

/**
 * Validates target pages
 */
export function validateTargetPages(targetPages: number | string | undefined, maxPages: number): number {
  if (targetPages === undefined || targetPages === null) {
    return 10; // Default
  }
  const num = typeof targetPages === "string" ? parseInt(targetPages, 10) : targetPages;
  if (isNaN(num) || !isFinite(num)) {
    throw new DocumentValidationError("Target pages must be a valid number", "targetPages");
  }
  if (num < 1) {
    throw new DocumentValidationError("Target pages must be at least 1", "targetPages");
  }
  if (num > maxPages) {
    throw new DocumentValidationError(
      `Target pages cannot exceed system limit of ${maxPages}`,
      "targetPages"
    );
  }
  return Math.floor(num);
}

/**
 * Validates content for document generation
 */
export function validateContent(content: string | undefined): string {
  if (!content) {
    throw new DocumentValidationError("Content is required", "content");
  }
  if (typeof content !== "string") {
    throw new DocumentValidationError("Content must be a string", "content");
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new DocumentValidationError("Content cannot be empty", "content");
  }
  if (trimmed.length > 2_000_000) {
    throw new DocumentValidationError("Content is too long (max 2M characters)", "content");
  }
  return trimmed;
}

/**
 * Validates image style
 */
export function validateImageStyle(
  style: string | undefined
): "realistic_3d" | "graphical" | "schematic" {
  if (!style) return "schematic";
  const validStyles = ["realistic_3d", "graphical", "schematic"];
  if (!validStyles.includes(style)) {
    throw new DocumentValidationError(
      `Invalid image style. Must be one of: ${validStyles.join(", ")}`,
      "imageStyle"
    );
  }
  return style as "realistic_3d" | "graphical" | "schematic";
}

// ============================================
// TYPE GUARDS
// ============================================

export function isDocumentMode(value: unknown): value is DocumentMode {
  return typeof value === "string" && ["standard", "legal", "audit", "compliance"].includes(value);
}

export function isConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return typeof value === "string" && ["High", "Medium", "Low"].includes(value);
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && ["low", "medium", "high"].includes(value);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sanitizes analysis options
 */
export function sanitizeAnalysisOptions(options: Partial<AnalysisOptions>, systemMaxChunks: number): AnalysisOptions {
  return {
    jurisdiction: validateJurisdiction(options.jurisdiction),
    strictLegalReview: validateBoolean(options.strictLegalReview, "strictLegalReview", false),
    mode: validateDocumentMode(options.mode),
    docHint: validateDocumentHint(options.docHint),
    analysisCommand: validateAnalysisCommand(options.analysisCommand),
    maxChunks: validateMaxChunks(options.maxChunks, systemMaxChunks),
  };
}

/**
 * Extracts unique strings from an array
 */
export function uniqueStrings(values: string[], limit?: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
    if (limit && output.length >= limit) break;
  }
  return output;
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
