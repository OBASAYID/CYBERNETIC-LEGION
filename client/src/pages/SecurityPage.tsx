import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import {
  Shield,
  Lock,
  Unlock,
  Key,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Hash,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

async function aesEncrypt(plaintext: string, key: string): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, "0").slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoder.encode(plaintext)
  );
  
  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);
  
  return { 
    encrypted: btoa(String.fromCharCode(...combined)),
    iv: btoa(String.fromCharCode(...iv))
  };
}

async function aesDecrypt(ciphertext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyData = encoder.encode(key.padEnd(32, "0").slice(0, 32));
  
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encryptedData
  );
  
  return decoder.decode(decrypted);
}

export function SecurityPage() {
  const [plaintext, setPlaintext] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hashInput, setHashInput] = useState("");
  const [hashOutput, setHashOutput] = useState("");
  const [auditLogs, setAuditLogs] = useState<{ action: string; timestamp: string; status: string }[]>([]);

  const encryptMutation = useMutation({
    mutationFn: async () => {
      const res = await systemFetch("/api/interactive/security/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaintext, key: encryptionKey || undefined }),
      });
      if (!res.ok) {
        const key = encryptionKey || generateKey();
        if (!encryptionKey) setEncryptionKey(key);
        const result = await aesEncrypt(plaintext, key);
        return { encrypted: result.encrypted, key };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setEncryptedText(data.encrypted);
      if (data.key) setEncryptionKey(data.key);
      addAuditLog("ENCRYPT", "success");
    },
  });

  const decryptMutation = useMutation({
    mutationFn: async () => {
      const res = await systemFetch("/api/interactive/security/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext: encryptedText, key: encryptionKey }),
      });
      if (!res.ok) {
        try {
          const decrypted = await aesDecrypt(encryptedText, encryptionKey);
          return { decrypted };
        } catch {
          throw new Error("Decryption failed");
        }
      }
      return res.json();
    },
    onSuccess: (data) => {
      setDecryptedText(data.decrypted);
      addAuditLog("DECRYPT", "success");
    },
    onError: () => {
      addAuditLog("DECRYPT", "failed");
    },
  });

  const hashMutation = useMutation({
    mutationFn: async () => {
      const res = await systemFetch("/api/interactive/security/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: hashInput }),
      });
      if (!res.ok) {
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
        return { hash: Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("") };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setHashOutput(data.hash);
      addAuditLog("HASH", "success");
    },
  });

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array(32).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const addAuditLog = (action: string, status: string) => {
    setAuditLogs(prev => [
      { action, timestamp: new Date().toISOString(), status },
      ...prev.slice(0, 9),
    ]);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const commandHandoffText = () => {
    const blocks: string[] = [];
    const pt = plaintext.trim();
    const et = encryptedText.trim();
    const dt = decryptedText.trim();
    const hi = hashInput.trim();
    const ho = hashOutput.trim();
    if (pt) blocks.push(`Plaintext:\n${pt}`);
    if (et) blocks.push(`Ciphertext:\n${et}`);
    if (dt) blocks.push(`Decrypted:\n${dt}`);
    if (ho) blocks.push(`Hash output:\n${ho}`);
    if (!blocks.length && hi) blocks.push(`Hash input:\n${hi}`);
    if (!blocks.length) return undefined;
    return `Security & encryption workspace\n\n${blocks.join("\n\n")}`;
  };

  return (
    <ModuleWorkspacePageShell
      title="Security & Encryption"
      subtitle="AES-256-GCM encryption system"
      icon={Shield}
      commandHandoffText={commandHandoffText}
      commandHandoffSource="security-encryption"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                Encryption Module
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-2">Encryption Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? "text" : "password"}
                        value={encryptionKey}
                        onChange={(e) => setEncryptionKey(e.target.value)}
                        placeholder="Auto-generated if empty"
                        className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-4 py-2.5 text-white pr-10 font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(235,235,245,0.5)] hover:text-white"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => setEncryptionKey(generateKey())}
                      className="px-3 bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg hover:bg-[#3c3c3e] transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-2">Plaintext</label>
                  <textarea
                    value={plaintext}
                    onChange={(e) => setPlaintext(e.target.value)}
                    placeholder="Enter text to encrypt..."
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-4 py-3 text-white placeholder-[rgba(235,235,245,0.3)] min-h-[100px] font-mono text-sm"
                  />
                </div>

                <button
                  onClick={() => encryptMutation.mutate()}
                  disabled={!plaintext || encryptMutation.isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {encryptMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  Encrypt
                </button>

                {encryptedText && (
                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[rgba(235,235,245,0.5)]">Encrypted Output</span>
                      <button
                        onClick={() => copyToClipboard(encryptedText)}
                        className="text-[rgba(235,235,245,0.5)] hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-mono text-sm text-emerald-400 break-all">{encryptedText}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Unlock className="w-5 h-5 text-amber-400" />
                Decryption Module
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-2">Ciphertext</label>
                  <textarea
                    value={encryptedText}
                    onChange={(e) => setEncryptedText(e.target.value)}
                    placeholder="Paste encrypted text..."
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-4 py-3 text-white placeholder-[rgba(235,235,245,0.3)] min-h-[80px] font-mono text-sm"
                  />
                </div>

                <button
                  onClick={() => decryptMutation.mutate()}
                  disabled={!encryptedText || !encryptionKey || decryptMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {decryptMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Unlock className="w-5 h-5" />
                  )}
                  Decrypt
                </button>

                {decryptedText && (
                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[rgba(235,235,245,0.5)]">Decrypted Output</span>
                      <button
                        onClick={() => copyToClipboard(decryptedText)}
                        className="text-[rgba(235,235,245,0.5)] hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-mono text-sm text-amber-400">{decryptedText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-purple-400" />
                SHA-256 Hashing
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-2">Input Data</label>
                  <textarea
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder="Enter data to hash..."
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-4 py-3 text-white placeholder-[rgba(235,235,245,0.3)] min-h-[80px] font-mono text-sm"
                  />
                </div>

                <button
                  onClick={() => hashMutation.mutate()}
                  disabled={!hashInput || hashMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {hashMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Hash className="w-5 h-5" />
                  )}
                  Generate Hash
                </button>

                {hashOutput && (
                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[rgba(235,235,245,0.5)]">SHA-256 Hash</span>
                      <button
                        onClick={() => copyToClipboard(hashOutput)}
                        className="text-[rgba(235,235,245,0.5)] hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-mono text-xs text-purple-400 break-all">{hashOutput}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Audit Log
              </h2>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#2c2c2e] rounded-lg p-3">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-[rgba(235,235,245,0.4)]">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        log.status === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[rgba(235,235,245,0.4)]">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No security operations yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleWorkspacePageShell>
  );
}
