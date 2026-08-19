import JSZip from "jszip";

export type BackupResource = {
  name: string;
  url: string;
  category: "weekly-summary" | "monthly-summary" | "source-document";
};

export type EncryptedArchive = {
  version: 1;
  createdAt: string;
  algorithm: "AES-GCM-256";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

export type ArchiveBuildResult = {
  blob: Blob;
  encryptedArchive: EncryptedArchive;
  media: { included: number; failed: Array<{ name: string; reason: string }> };
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PBKDF2_ITERATIONS = 210_000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
}

function safeFileName(value: string) {
  const trimmed = value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return trimmed.slice(0, 180) || "backup-file";
}

function extensionForResource(resource: BackupResource) {
  if (resource.category === "source-document") return "";
  return ".png";
}

export function getBackupResources(backup: { data: Record<string, unknown> }): BackupResource[] {
  const sourceDocuments = Array.isArray(backup.data.sourceDocuments) ? backup.data.sourceDocuments : [];
  const weeklySummaries = Array.isArray(backup.data.weeklySummaries) ? backup.data.weeklySummaries : [];
  const monthlySummaries = Array.isArray(backup.data.monthlySummaries) ? backup.data.monthlySummaries : [];
  const documents = sourceDocuments.flatMap((document, index) => {
    const item = document as { fileName?: unknown; downloadUrl?: unknown };
    return typeof item.downloadUrl === "string" ? [{
      category: "source-document" as const,
      name: `source-documents/${safeFileName(typeof item.fileName === "string" ? item.fileName : `trade-file-${index + 1}`)}`,
      url: item.downloadUrl,
    }] : [];
  });
  const weekly = weeklySummaries.flatMap((summary, index) => {
    const item = summary as { weekStart?: unknown; id?: unknown; downloadUrl?: unknown };
    return typeof item.downloadUrl === "string" ? [{
      category: "weekly-summary" as const,
      name: `weekly-summaries/${safeFileName(typeof item.weekStart === "string" ? item.weekStart : `weekly-summary-${String(item.id ?? index + 1)}`)}`,
      url: item.downloadUrl,
    }] : [];
  });
  const monthly = monthlySummaries.flatMap((summary, index) => {
    const item = summary as { monthKey?: unknown; id?: unknown; downloadUrl?: unknown };
    return typeof item.downloadUrl === "string" ? [{
      category: "monthly-summary" as const,
      name: `monthly-summaries/${safeFileName(typeof item.monthKey === "string" ? item.monthKey : `monthly-summary-${String(item.id ?? index + 1)}`)}`,
      url: item.downloadUrl,
    }] : [];
  });
  return [...documents, ...weekly, ...monthly];
}

async function deriveArchiveKey(password: string, salt: Uint8Array) {
  const passwordKey = await crypto.subtle.importKey("raw", toArrayBuffer(encoder.encode(password)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations: PBKDF2_ITERATIONS },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(payload: Uint8Array, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveArchiveKey(password, salt);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(payload)));
  return {
    version: 1 as const,
    createdAt: new Date().toISOString(),
    algorithm: "AES-GCM-256" as const,
    kdf: "PBKDF2-SHA-256" as const,
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(encrypted),
  };
}

export async function createEncryptedBackupArchive(
  backup: { data: Record<string, unknown>; exportedAt?: Date | string },
  password: string,
  includeMedia = true,
): Promise<ArchiveBuildResult> {
  if (password.trim().length < 12) throw new Error("Use a backup password with at least 12 characters.");
  const zip = new JSZip();
  zip.file("journal-backup.json", JSON.stringify(backup, null, 2));
  zip.file("README.txt", "Bashfx VIP GOLD ROOM encrypted backup. Keep the password used to create this archive private and separate from this file. The encrypted archive contains a ZIP package of your journal data and any media that could be downloaded at export time.");
  const failed: Array<{ name: string; reason: string }> = [];
  let included = 0;
  if (includeMedia) {
    for (const resource of getBackupResources(backup)) {
      try {
        const response = await fetch(resource.url);
        if (!response.ok) throw new Error(`Download returned ${response.status}`);
        zip.file(`${resource.name}${extensionForResource(resource)}`, new Uint8Array(await response.arrayBuffer()));
        included += 1;
      } catch (error) {
        failed.push({ name: resource.name, reason: error instanceof Error ? error.message : "Could not download this file" });
      }
    }
  }
  zip.file("media-download-report.json", JSON.stringify({ included, failed }, null, 2));
  const packageBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const encryptedArchive = await encryptPayload(packageBytes, password);
  return {
    encryptedArchive,
    blob: new Blob([JSON.stringify(encryptedArchive, null, 2)], { type: "application/json" }),
    media: { included, failed },
  };
}

export async function decryptEncryptedBackupArchive(encryptedArchive: EncryptedArchive, password: string) {
  const key = await deriveArchiveKey(password, fromBase64(encryptedArchive.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(fromBase64(encryptedArchive.iv)) },
    key,
    toArrayBuffer(fromBase64(encryptedArchive.ciphertext)),
  );
  return new JSZip().loadAsync(decrypted);
}
