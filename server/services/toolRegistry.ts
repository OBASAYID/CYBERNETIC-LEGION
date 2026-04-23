import { queryMemory, storeMemory } from "./memoryService.js";

export const tools = {
  memory_search: queryMemory,
  memory_store: storeMemory,
};

export type ToolName = keyof typeof tools;

export async function executeTool(toolName: ToolName, ...args: unknown[]) {
  const tool = tools[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return (tool as (...params: unknown[]) => unknown)(...args);
}
