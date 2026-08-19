import { describe, expect, it } from "vitest";
import { createEncryptedBackupArchive, decryptEncryptedBackupArchive } from "../client/src/lib/encryptedBackup";

describe("encrypted journal backup archives", () => {
  it("encrypts journal content and opens only with the matching password", async () => {
    const result = await createEncryptedBackupArchive({
      exportedAt: new Date("2026-08-19T00:00:00.000Z"),
      data: { trades: [{ pair: "XAUUSD", notes: "private trading note" }], weeklySummaries: [], monthlySummaries: [], sourceDocuments: [] },
    }, "A private backup password", false);

    const serialized = JSON.stringify(result.encryptedArchive);
    expect(serialized).not.toContain("private trading note");
    expect(serialized).not.toContain("XAUUSD");

    const zip = await decryptEncryptedBackupArchive(result.encryptedArchive, "A private backup password");
    const content = await zip.file("journal-backup.json")?.async("string");
    expect(content).toContain("private trading note");
    await expect(decryptEncryptedBackupArchive(result.encryptedArchive, "Wrong password value")).rejects.toThrow();
  });
});
