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

const PANEL: React.CSSProperties = {
  background: "rgba(13,13,30,0.75)",
  backdropFilter: "blur(12px)",
};

const INNER: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
};

async function aesEncrypt(plaintext: string, key: string): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, "0").slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoder.encode(plaintext));
  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);
  return { encrypted: btoa(String.fromCharCode(...combined)), iv: btoa(String.fromCharCode(...iv)) };
}

async function aesDecrypt(ciphertext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyData = encoder.encode(key.padEnd(32, "0").slice(0, 32));
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encryptedData);
  return decoder.decode(decrypted);
}

const generateKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array(32).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export function SecurityPage() {
  const [plaintext, setPlaintext] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hashInput, setHashInput] = useState("");
  const [hashOutput, setHashOutput] = useState("");
  const [auditLogs, setAuditLogs] = useState<{ action: string; timestamp: string; status: string }[]>([]);

  const addAuditLog = (action: string, status: string) => {
    setAuditLogs(prev => [{ action, timestamp: new Date().toISOString(), status }, ...prev.slice(0, 9)]);
  };

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
    onError: () => addAuditLog("DECRYPT", "failed"),
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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const commandHandoffText = () => {
    const blocks: string[] = [];
    if (plaintext.trim()) blocks.push(`Plaintext:\n${plaintext.trim()}`);
    if (encryptedText.trim()) blocks.push(`Ciphertext:\n${encryptedText.trim()}`);
    if (decryptedText.trim()) blocks.push(`Decrypted:\n${decryptedText.trim()}`);
    if (hashOutput.trim()) blocks.push(`Hash output:\n${hashOutput.trim()}`);
    if (!blocks.length && hashInput.trim()) blocks.push(`Hash input:\n${hashInput.trim()}`);
    if (!blocks.length) return undefined;
    return `Security & encryption workspace\n\n${blocks.join("\n\n")}`;
  };

  const inputClass = "w-full rounded-lg px-4 py-2.5 text-white text-sm border border-white/[0.08] bg-white/[0.05] focus:outline-none focus:border-[#e11d48]/40 placeholder-white/30 font-mono";
  const textareaClass = `${inputClass} min-h-[90px]`;

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
          {/* Left column */}
          <div className="space-y-6">
            {/* Encryption */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <Lock className="w-5 h-5 text-emerald-400" />
                Encryption Module
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2 font-mono uppercase tracking-wider">Encryption Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? "text" : "password"}
                        value={encryptionKey}
                        onChange={(e) => setEncryptionKey(e.target.value)}
                        placeholder="Auto-generated if empty"
                        className={inputClass + " pr-10"}
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => setEncryptionKey(generateKey())}
                      className="px-3 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2 font-mono uppercase tracking-wider">Plaintext</label>
                  <textarea
                    value={plaintext}
                    onChange={(e) => setPlaintext(e.target.value)}
                    placeholder="Enter text to encrypt..."
                    className={textareaClass}
                  />
                </div>
                <button
                  onClick={() => encryptMutation.mutate()}
                  disabled={!plaintext || encryptMutation.isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {encryptMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                  Encrypt
                </button>
                {encryptedText && (
                  <div className="rounded-lg p-4 border border-emerald-500/20" style={INNER}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Encrypted Output</span>
                      <button onClick={() => copyToClipboard(encryptedText)} className="text-white/40 hover:text-white transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-mono text-sm text-emerald-400 break-all">{encryptedText}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Decryption */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <Unlock className="w-5 h-5 text-amber-400" />
                Decryption Module
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2 font-mono uppercase tracking-wider">Ciphertext</label>
                  <textarea
                    value={encryptedText}
                    onChange={(e) => setEncryptedText(e.target.value)}
                    placeholder="Paste encrypted text..."
                    className={textareaClass}
                    style={{ minHeight: "80px" }}
                  />
                </div>
                <button
                  onClick={() => decryptMutation.mutate()}
                  disabled={!encryptedText || !encryptionKey || decryptMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {decryptMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
                  Decrypt
                </button>
                {decryptedText && (
                  <div className="rounded-lg p-4 border border-amber-500/20" style={INNER}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Decrypted Output</span>
                      <button onClick={() => copyToClipboard(decryptedText)} className="text-white/40 hover:text-white transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-mono text-sm text-amber-400">{decryptedText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Hashing */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <Hash className="w-5 h-5 text-purple-400" />
                SHA-256 Hashing
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2 font-mono uppercase tracking-wider">Input Data</label>
                  <textarea
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder="Enter data to hash..."
                    className={textareaClass}
                    style={{ minHeight: "80px" }}
                  />
                </div>
                <button
                  onClick={() => hashMutation.mutate()}
                  disabled={!hashInput || hashMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-[#e11d48] hover:from-purple-600 hover:to-[#be123c] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {hashMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Hash className="w-5 h-5" />}
                  Generate Hash
                </button>
                {hashOutput && (
                  <div className="rounded-lg p-4 border border-purple-500/20" style={INNER}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">SHA-256 Hash</span>
                      <button onClick={() => copyToClipboard(hashOutput)} className="text-white/40 hover:text-white transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-mono text-xs text-purple-400 break-all">{hashOutput}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit log */}
            <div className="rounded-xl border border-white/[0.08] p-5" style={PANEL}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
                <FileText className="w-5 h-5 text-[#06b6d4]" />
                Audit Log
              </h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg p-3 border border-white/[0.06]" style={INNER}>
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#e11d48] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white font-mono">{log.action}</p>
                        <p className="text-xs text-white/40">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        log.status === "success"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                          : "bg-[#e11d48]/20 text-[#e11d48] border-[#e11d48]/20"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/30">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
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
