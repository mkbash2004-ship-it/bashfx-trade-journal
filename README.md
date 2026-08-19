# Bashfx VIP GOLD ROOM

Bashfx VIP GOLD ROOM is a private multi-market M5 trade journal for recording daily trades, reviewing weekly activity, generating branded weekly and monthly summaries, managing reminders, and maintaining an independent personal backup.

## What the source repository contains

The private GitHub repository `mkbash2004-ship-it/bashfx-trade-journal` contains application source code, configuration, tests, and documentation. It does **not** contain production database records, user journal entries, OAuth secrets, generated private reports, original trade files, or downloaded backup archives.

## Personal journal backups

Open **Backup & Export** in the signed-in app. The standard JSON and CSV downloads are readable copies for your private storage. The encrypted archive option creates a password-protected file in your browser. Its password is never sent to the app server and must be stored safely by you; an encrypted file cannot be recovered without that password.

The encrypted archive includes your journal dataset plus report images and original trade files when the browser can download them. It also contains a media-download report that identifies any file that could not be reached during that export. Keep the resulting archive in the separate private GitHub repository `mkbash2004-ship-it/bashfx-trade-journal-encrypted-archives` or another private storage location.

> Make a fresh backup after important journal activity. A backup is a point-in-time copy; it does not include trades entered later.

## Source-code synchronization

The project’s private GitHub repository is the source-code history. Synchronization is **commit-based**: each normal project commit in this managed workspace, including completed publish checkpoints, runs the tracked `.githooks/post-commit` hook and pushes the committed source tree to GitHub. The hook does not push uncommitted work and never adds private database records, generated backups, or external media. If a direct GitHub push ever reports an authentication error, reconnect the GitHub authorization before retrying; do not put access tokens into source files.

## Development

Run the project locally with:

```bash
pnpm install
pnpm dev
```

Run validation with:

```bash
pnpm check
pnpm test
```
