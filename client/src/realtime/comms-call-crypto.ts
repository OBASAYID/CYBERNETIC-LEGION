/**
 * Per-call E2E signaling crypto (ECDH P-256 + AES-GCM).
 * Server relays sealed blobs only — cannot read SDP/ICE inside.
 */

import {
  CYRUS_COMMS_PROTOCOL_VERSION,
  type CyrusCryptoHandshake,
  type CyrusSealedPayload,
  type CyrusWebRtcSignalBody,
} from "@shared/comms/cyrus-comms-envelope";

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };

function b64Encode(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s);
}

function b64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class CommsCallCryptoSession {
  private privateKey: CryptoKey | null = null;
  private sharedKey: CryptoKey | null = null;
  private readonly publicJwk: JsonWebKey;

  private constructor(publicJwk: JsonWebKey) {
    this.publicJwk = publicJwk;
  }

  static async create(): Promise<CommsCallCryptoSession> {
    const pair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey"]);
    const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    const session = new CommsCallCryptoSession(publicJwk);
    session.privateKey = pair.privateKey;
    return session;
  }

  get isReady(): boolean {
    return this.sharedKey !== null;
  }

  handshakePayload(): CyrusCryptoHandshake {
    return { v: CYRUS_COMMS_PROTOCOL_VERSION, publicKey: this.publicJwk };
  }

  async acceptPeerHandshake(peer: CyrusCryptoHandshake): Promise<void> {
    if (peer.v !== CYRUS_COMMS_PROTOCOL_VERSION || !this.privateKey) {
      throw new Error("Invalid crypto handshake");
    }
    const remotePublic = await crypto.subtle.importKey(
      "jwk",
      peer.publicKey,
      ECDH_PARAMS,
      true,
      [],
    );
    this.sharedKey = await crypto.subtle.deriveKey(
      { name: "ECDH", public: remotePublic },
      this.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async seal(body: CyrusWebRtcSignalBody): Promise<CyrusSealedPayload> {
    if (!this.sharedKey) throw new Error("Call crypto session not ready");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(body));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.sharedKey, plain);
    return {
      v: CYRUS_COMMS_PROTOCOL_VERSION,
      iv: b64Encode(iv.buffer as ArrayBuffer),
      ciphertext: b64Encode(encrypted),
    };
  }

  async open(sealed: CyrusSealedPayload): Promise<CyrusWebRtcSignalBody> {
    if (!this.sharedKey) throw new Error("Call crypto session not ready");
    if (sealed.v !== CYRUS_COMMS_PROTOCOL_VERSION) throw new Error("Unsupported sealed version");
    const iv = b64Decode(sealed.iv);
    const ciphertext = b64Decode(sealed.ciphertext);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      this.sharedKey,
      ciphertext.buffer as ArrayBuffer,
    );
    return JSON.parse(new TextDecoder().decode(plain)) as CyrusWebRtcSignalBody;
  }
}
