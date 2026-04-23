/**
 * Single source of truth for chat/completion model IDs (OpenAI API or Azure OpenAI deployment name).
 *
 * Set `OPENAI_MODEL` or `AI_INTEGRATIONS_OPENAI_MODEL` in the environment. Defaults to `gpt-4o`.
 */
export function getCyrusChatModel(): string {
  return (
    process.env.OPENAI_MODEL?.trim() ||
    process.env.AI_INTEGRATIONS_OPENAI_MODEL?.trim() ||
    "gpt-4o"
  );
}
