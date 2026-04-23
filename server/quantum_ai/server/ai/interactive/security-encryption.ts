import { createCipheriv, createDecipheriv, randomBytes, createHash, pbkdf2Sync, timingSafeEqual, CipherGCM, DecipherGCM } from "crypto";

interface EncryptedData {
  iv: string;
  encrypted: string;
  authTag?: string;
  algorithm: string;
  keyId: string;
}

interface SecureKey {
  id: string;
  key: Buffer;
  algorithm: string;
  createdAt: number;
  expiresAt?: number;
  usageCount: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  userId?: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  success: boolean;
  details?: Record<string, any>;
}

interface AccessControl {
  userId: string;
  role: "admin" | "operator" | "viewer" | "patient" | "researcher";
  permissions: string[];
  restrictions: string[];
  mfaEnabled: boolean;
  lastAccess: number;
}

interface DataClassification {
  level: "public" | "internal" | "confidential" | "restricted" | "top_secret";
  category: "medical" | "personal" | "financial" | "research" | "operational";
  retentionDays: number;
  encryptionRequired: boolean;
  auditRequired: boolean;
}

interface IntegrityCheck {
  hash: string;
  algorithm: string;
  timestamp: number;
  verified: boolean;
}

class SecurityEncryptionModule {
  private keys: Map<string, SecureKey> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private accessControls: Map<string, AccessControl> = new Map();
  private dataClassifications: Map<string, DataClassification> = new Map();
  private masterKey: Buffer;
  private defaultAlgorithm = "aes-256-gcm";

  constructor() {
    console.log("[Security Module] Initializing encryption and security system");
    this.masterKey = this.deriveMasterKey();
    this.initializeDefaultClassifications();
    console.log("[Security Module] AES-256-GCM encryption ready");
  }

  private deriveMasterKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET;
    const salt = process.env.ENCRYPTION_SALT;

    if (secret && salt) {
      return pbkdf2Sync(secret, salt, 100000, 32, "sha512");
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_SECRET and ENCRYPTION_SALT must be set in production. Refusing insecure default encryption key."
      );
    }

    console.warn(
      "[Security Module] ENCRYPTION_SECRET/ENCRYPTION_SALT not set. Using ephemeral key for non-production mode."
    );
    return randomBytes(32);
  }

  private initializeDefaultClassifications(): void {
    const classifications: Array<[string, DataClassification]> = [
      ["medical_records", { level: "restricted", category: "medical", retentionDays: 365 * 7, encryptionRequired: true, auditRequired: true }],
      ["patient_data", { level: "confidential", category: "personal", retentionDays: 365 * 5, encryptionRequired: true, auditRequired: true }],
      ["research_data", { level: "confidential", category: "research", retentionDays: 365 * 10, encryptionRequired: true, auditRequired: true }],
      ["operational_logs", { level: "internal", category: "operational", retentionDays: 365, encryptionRequired: false, auditRequired: true }],
      ["public_info", { level: "public", category: "operational", retentionDays: 365 * 3, encryptionRequired: false, auditRequired: false }]
    ];

    classifications.forEach(([id, classification]) => {
      this.dataClassifications.set(id, classification);
    });
  }

  generateKey(algorithm: string = this.defaultAlgorithm): SecureKey {
    const keyLength = algorithm.includes("256") ? 32 : 16;
    const key: SecureKey = {
      id: `key_${Date.now()}_${randomBytes(4).toString("hex")}`,
      key: randomBytes(keyLength),
      algorithm,
      createdAt: Date.now(),
      usageCount: 0
    };
    this.keys.set(key.id, key);
    return key;
  }

  encrypt(data: string | Buffer, keyId?: string): EncryptedData {
    let key: SecureKey;
    
    if (keyId && this.keys.has(keyId)) {
      key = this.keys.get(keyId)!;
    } else {
      key = this.generateKey();
    }

    const iv = randomBytes(16);
    const cipher = createCipheriv(key.algorithm, key.key, iv) as CipherGCM;
    
    const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    key.usageCount++;
    this.keys.set(key.id, key);

    return {
      iv: iv.toString("hex"),
      encrypted: encrypted.toString("hex"),
      authTag: authTag.toString("hex"),
      algorithm: key.algorithm,
      keyId: key.id
    };
  }

  decrypt(encryptedData: EncryptedData): Buffer {
    const key = this.keys.get(encryptedData.keyId);
    if (!key) {
      throw new Error("Decryption key not found");
    }

    const iv = Buffer.from(encryptedData.iv, "hex");
    const encrypted = Buffer.from(encryptedData.encrypted, "hex");
    const decipher = createDecipheriv(key.algorithm, key.key, iv) as DecipherGCM;

    if (encryptedData.authTag) {
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));
    }

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  decryptToString(encryptedData: EncryptedData): string {
    return this.decrypt(encryptedData).toString("utf8");
  }

  hash(data: string | Buffer, algorithm: string = "sha256"): string {
    const hash = createHash(algorithm);
    hash.update(data);
    return hash.digest("hex");
  }

  verifyHash(data: string | Buffer, expectedHash: string, algorithm: string = "sha256"): boolean {
    const actualHash = this.hash(data, algorithm);
    try {
      return timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
    } catch {
      return false;
    }
  }

  computeIntegrity(data: string | Buffer): IntegrityCheck {
    const algorithm = "sha256";
    return {
      hash: this.hash(data, algorithm),
      algorithm,
      timestamp: Date.now(),
      verified: true
    };
  }

  verifyIntegrity(data: string | Buffer, check: IntegrityCheck): boolean {
    return this.verifyHash(data, check.hash, check.algorithm);
  }

  registerUser(userId: string, role: AccessControl["role"]): AccessControl {
    const permissions = this.getDefaultPermissions(role);
    const control: AccessControl = {
      userId,
      role,
      permissions,
      restrictions: [],
      mfaEnabled: role === "admin",
      lastAccess: Date.now()
    };
    this.accessControls.set(userId, control);
    return control;
  }

  private getDefaultPermissions(role: AccessControl["role"]): string[] {
    const permissionMap: Record<string, string[]> = {
      admin: ["read", "write", "delete", "admin", "audit", "encrypt", "decrypt"],
      operator: ["read", "write", "encrypt", "decrypt", "execute"],
      viewer: ["read"],
      patient: ["read:own", "write:own"],
      researcher: ["read", "write", "analyze", "export"]
    };
    return permissionMap[role] || ["read"];
  }

  checkPermission(userId: string, permission: string, resourceType?: string): boolean {
    const control = this.accessControls.get(userId);
    if (!control) return false;

    if (control.restrictions.includes(permission)) return false;

    if (control.permissions.includes(permission)) return true;
    if (permission.includes(":own") && control.permissions.includes(permission.split(":")[0] + ":own")) return true;

    return false;
  }

  updateLastAccess(userId: string): void {
    const control = this.accessControls.get(userId);
    if (control) {
      control.lastAccess = Date.now();
      this.accessControls.set(userId, control);
    }
  }

  logAudit(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${randomBytes(4).toString("hex")}`,
      timestamp: Date.now()
    };
    this.auditLog.push(auditEntry);

    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  getAuditLog(filters?: {
    userId?: string;
    resourceType?: string;
    startTime?: number;
    endTime?: number;
    success?: boolean;
  }): AuditLogEntry[] {
    let logs = [...this.auditLog];

    if (filters) {
      if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
      if (filters.resourceType) logs = logs.filter(l => l.resourceType === filters.resourceType);
      if (filters.startTime) logs = logs.filter(l => l.timestamp >= filters.startTime!);
      if (filters.endTime) logs = logs.filter(l => l.timestamp <= filters.endTime!);
      if (filters.success !== undefined) logs = logs.filter(l => l.success === filters.success);
    }

    return logs;
  }

  classifyData(resourceId: string, classification: DataClassification): void {
    this.dataClassifications.set(resourceId, classification);
  }

  getClassification(resourceId: string): DataClassification | undefined {
    return this.dataClassifications.get(resourceId);
  }

  secureDelete(data: Buffer | string): void {
    if (Buffer.isBuffer(data)) {
      data.fill(0);
    }
  }

  rotateKey(oldKeyId: string): SecureKey | null {
    const oldKey = this.keys.get(oldKeyId);
    if (!oldKey) return null;

    const newKey = this.generateKey(oldKey.algorithm);

    this.logAudit({
      action: "key_rotation",
      resourceType: "encryption_key",
      resourceId: oldKeyId,
      success: true,
      details: { newKeyId: newKey.id }
    });

    return newKey;
  }

  exportKey(keyId: string, wrapperKeyId: string): EncryptedData | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    return this.encrypt(key.key, wrapperKeyId);
  }

  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString("hex");
  }

  validateToken(token: string, expectedToken: string): boolean {
    try {
      return timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
    } catch {
      return false;
    }
  }

  getStatus(): {
    operational: boolean;
    keys: number;
    auditEntries: number;
    users: number;
    encryptionAlgorithm: string;
  } {
    return {
      operational: true,
      keys: this.keys.size,
      auditEntries: this.auditLog.length,
      users: this.accessControls.size,
      encryptionAlgorithm: this.defaultAlgorithm
    };
  }
}

export const securityEncryption = new SecurityEncryptionModule();
