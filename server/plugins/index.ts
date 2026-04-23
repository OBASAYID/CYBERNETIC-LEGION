export type CyrusPlugin = {
  name: string;
  requiredPermissions?: string[];
  execute: (payload: unknown, context: { grantedPermissions: string[] }) => Promise<unknown> | unknown;
};

export const plugins: CyrusPlugin[] = [];

export function registerPlugin(plugin: CyrusPlugin) {
  if (!plugin?.name || typeof plugin.execute !== "function") {
    throw new Error("Invalid plugin: expected name and execute(payload)");
  }

  if (plugin.requiredPermissions && !Array.isArray(plugin.requiredPermissions)) {
    throw new Error("Invalid plugin: requiredPermissions must be an array");
  }

  const exists = plugins.some((item) => item.name === plugin.name);
  if (!exists) {
    plugins.push(plugin);
  }
}

export async function executePlugin(pluginName: string, payload: unknown, grantedPermissions: string[] = []) {
  const plugin = plugins.find((item) => item.name === pluginName);
  if (!plugin) {
    throw new Error(`Plugin not found: ${pluginName}`);
  }

  const requiredPermissions = plugin.requiredPermissions ?? [];
  const missing = requiredPermissions.filter((permission) => !grantedPermissions.includes(permission));
  if (missing.length > 0) {
    throw new Error(`Missing plugin permissions: ${missing.join(", ")}`);
  }

  return plugin.execute(payload, { grantedPermissions });
}

registerPlugin({
  name: "audit-log",
  requiredPermissions: ["log:write"],
  execute: (payload) => {
    console.log("[Plugin:audit-log]", payload);
    return { status: "logged" };
  },
});
