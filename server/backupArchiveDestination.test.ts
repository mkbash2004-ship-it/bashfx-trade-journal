import { describe, expect, it } from "vitest";
import {
  createEncryptedArchiveFilename,
  GITHUB_ARCHIVE_REPOSITORY_URL,
  GITHUB_ARCHIVE_UPLOAD_STEPS,
  GITHUB_ARCHIVE_UPLOAD_URL,
} from "../client/src/lib/backupArchiveDestination";

describe("encrypted archive destination", () => {
  it("uses the dedicated private archive repository and direct archives upload page", () => {
    expect(GITHUB_ARCHIVE_REPOSITORY_URL).toBe("https://github.com/mkbash2004-ship-it/bashfx-trade-journal-encrypted-archives");
    expect(GITHUB_ARCHIVE_UPLOAD_URL).toBe(`${GITHUB_ARCHIVE_REPOSITORY_URL}/upload/main/archives`);
    expect(GITHUB_ARCHIVE_UPLOAD_STEPS).toHaveLength(3);
    expect(GITHUB_ARCHIVE_UPLOAD_STEPS.at(-1)).toContain(".bashfx-backup.json");
  });

  it("creates a timestamped archive filename for a distinct backup upload", () => {
    expect(createEncryptedArchiveFilename(new Date("2026-08-19T01:45:30.125Z"))).toBe("bashfx-vip-gold-room-encrypted-backup-2026-08-19T01-45-30-125Z.bashfx-backup.json");
  });
});
