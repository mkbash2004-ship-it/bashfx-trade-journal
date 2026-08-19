export const GITHUB_ARCHIVE_REPOSITORY_URL = "https://github.com/mkbash2004-ship-it/bashfx-trade-journal-encrypted-archives";
export const GITHUB_ARCHIVE_UPLOAD_URL = `${GITHUB_ARCHIVE_REPOSITORY_URL}/upload/main/archives`;

export const GITHUB_ARCHIVE_UPLOAD_STEPS = [
  "Create and download the encrypted archive with a password you keep private.",
  "Open the private GitHub upload page and sign in to your GitHub account if asked.",
  "Choose the downloaded .bashfx-backup.json file, then commit the upload to the archives folder.",
] as const;

export function createEncryptedArchiveFilename(createdAt: Date) {
  const timestamp = createdAt.toISOString().replace(/[:.]/g, "-");
  return `bashfx-vip-gold-room-encrypted-backup-${timestamp}.bashfx-backup.json`;
}
