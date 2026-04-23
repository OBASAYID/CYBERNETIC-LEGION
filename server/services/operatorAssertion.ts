import crypto from "crypto";

type OperatorAssertionInput = {
  operatorId: string;
  role: string;
  source?: string;
  ttlSeconds?: number;
  method?: string;
  path?: string;
  audience?: string;
};

function getSecret(): string {
  return (process.env.CYRUS_CONTROL_TOKEN_SECRET || "").trim();
}

function b64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function normalizePath(path: string): string {
  const normalized = (path || "").trim();
  if (!normalized) {
    throw new Error("Assertion path is required");
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function buildAudience(method: string, path: string): string {
  const normalizedMethod = (method || "").trim().toUpperCase();
  if (!normalizedMethod) {
    throw new Error("Assertion method is required");
  }
  return `${normalizedMethod}:${normalizePath(path)}`;
}

export function createOperatorAssertion(input: OperatorAssertionInput): string | null {
  const secret = getSecret();
  if (!secret) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: input.operatorId,
    role: input.role.toLowerCase(),
    source: input.source || "node-gateway",
    iat: now,
    exp: now + Math.max(input.ttlSeconds ?? 120, 1),
    aud: input.audience || (input.method && input.path ? buildAudience(input.method, input.path) : undefined),
  };

  const encodedPayload = b64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("hex");
  return `${encodedPayload}.${signature}`;
}