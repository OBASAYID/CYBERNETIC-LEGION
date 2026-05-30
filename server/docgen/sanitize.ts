/** Clean docgen source text and derive publication-ready titles. */

const META_COMMAND =
  /^(?:please\s+)?(?:generate|create|write|draft|make|produce|build|export)\s+(?:a|an|the|my)?\s*(?:pitch|report|summary|document|memo|brief|executive\s+summary|pdf|docx)?\s*$/i;

const META_COMMAND_PREFIX =
  /^(?:please\s+)?(?:generate|create|write|draft|make|produce|build)\s+(?:a|an|the|my)\s+/i;

export function sanitizeDocgenSource(raw: string | undefined): string {
  if (!raw) return "";
  let text = raw.replace(/\r\n/g, "\n").trim();

  const cyrusBlocks = [...text.matchAll(/CYRUS:\s*([\s\S]*?)(?=\n(?:Operator|User|Human|Assistant):|$)/gi)];
  if (cyrusBlocks.length > 0) {
    text = cyrusBlocks.map((m) => m[1].trim()).join("\n\n");
  }

  text = text
    .replace(/^(?:Operator|User|Human|Assistant):\s*/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function plainTextFromMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMetaCommand(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed.length < 4) return true;
  if (META_COMMAND.test(trimmed)) return true;
  if (trimmed.length < 24 && META_COMMAND_PREFIX.test(trimmed)) return true;
  return false;
}

export function extractDocumentTitle(
  payload: { topic?: string; purpose?: string; rawText?: string },
  docTypeLabel: string,
): string {
  for (const candidate of [payload.topic, payload.purpose]) {
    if (candidate && !isMetaCommand(candidate)) {
      return candidate.trim().slice(0, 120);
    }
  }

  const source = sanitizeDocgenSource(payload.rawText);
  const sentences = source.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30);
  for (const sentence of sentences) {
    const plain = plainTextFromMarkdown(sentence);
    const purposeMatch = plain.match(
      /(?:purpose of this (?:document|report) is to(?: present| provide| outline)?)\s+(.+)/i,
    );
    if (purposeMatch?.[1]) {
      return purposeMatch[1].replace(/\.$/, "").slice(0, 120);
    }
    if (plain.length > 35 && !/^here'?s how/i.test(plain)) {
      return plain.replace(/\.$/, "").slice(0, 120);
    }
  }

  return docTypeLabel.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function outlinePurpose(sectionTitle: string, content: string): string {
  const plain = plainTextFromMarkdown(content.split(/\n{2,}/)[0] || content);
  if (plain.length > 40) return plain.slice(0, 160);
  return `Covers ${sectionTitle.toLowerCase()} with source-specific detail.`;
}
