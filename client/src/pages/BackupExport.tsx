import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { createEncryptedArchiveFilename, GITHUB_ARCHIVE_UPLOAD_STEPS, GITHUB_ARCHIVE_UPLOAD_URL } from "@/lib/backupArchiveDestination";
import { createEncryptedBackupArchive } from "@/lib/encryptedBackup";
import { trpc } from "@/lib/trpc";
import { Archive, CheckCircle2, Database, Download, ExternalLink, FileJson, FileKey, FileSpreadsheet, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

type ExportRow = Record<string, unknown>;

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function downloadFile(contents: string, mimeType: string, filename: string) {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildFullJournalCsv(data: { data: Record<string, unknown> }) {
  const collections: [string, unknown][] = [
    ["daily_journal_entry", data.data.dailyJournalEntries],
    ["trade", data.data.trades],
    ["weekly_summary", data.data.weeklySummaries],
    ["monthly_summary", data.data.monthlySummaries],
    ["source_document", data.data.sourceDocuments],
  ];
  const rows: ExportRow[] = collections.flatMap(([recordType, collection]) => Array.isArray(collection)
    ? collection.map(record => ({ recordType, ...(record as ExportRow) }))
    : []);
  if (data.data.reminderPreferences && typeof data.data.reminderPreferences === "object") {
    rows.push({ recordType: "reminder_preference", ...(data.data.reminderPreferences as ExportRow) });
  }
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = (value: unknown) => `"${formatValue(value).replaceAll('"', '""')}"`;
  return [columns.map(escape).join(","), ...rows.map(row => columns.map(column => escape(row[column])).join(","))].join("\n");
}

function dayStamp(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

export default function BackupExport() {
  const { isAuthenticated } = useAuth();
  const backup = trpc.journal.backupExport.useQuery(undefined, { enabled: isAuthenticated, staleTime: 0 });
  const [backupPassword, setBackupPassword] = useState("");
  const [encryptionMessage, setEncryptionMessage] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const exportedAt = backup.data?.exportedAt ? new Date(backup.data.exportedAt) : new Date();
  const fileDate = dayStamp(exportedAt);

  const downloadJson = () => {
    if (!backup.data) return;
    downloadFile(JSON.stringify(backup.data, null, 2), "application/json", `bashfx-vip-gold-room-full-backup-${fileDate}.json`);
  };

  const downloadCsv = () => {
    if (!backup.data) return;
    downloadFile(buildFullJournalCsv(backup.data), "text/csv", `bashfx-vip-gold-room-full-journal-${fileDate}.csv`);
  };

  const downloadEncryptedArchive = async () => {
    if (!backup.data) return;
    setEncryptionMessage(null);
    setIsEncrypting(true);
    try {
      const archive = await createEncryptedBackupArchive(backup.data, backupPassword);
      const filename = createEncryptedArchiveFilename(new Date());
      const url = URL.createObjectURL(archive.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setBackupPassword("");
      setEncryptionMessage(archive.media.failed.length ? `Encrypted archive downloaded with ${archive.media.included} media file(s). ${archive.media.failed.length} file(s) were recorded in the media report because they could not be downloaded.` : `Encrypted archive downloaded with ${archive.media.included} media file(s). Use the private GitHub upload button below to store this one file.`);
    } catch (error) {
      setEncryptionMessage(error instanceof Error ? error.message : "The encrypted archive could not be created. Please try again.");
    } finally {
      setIsEncrypting(false);
    }
  };

  const counts = backup.data?.counts;
  const resourceCount = (counts?.weeklySummaries ?? 0) + (counts?.monthlySummaries ?? 0) + (counts?.sourceDocuments ?? 0);

  return <div className="mx-auto max-w-7xl pb-12">
    <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#ddb437]">Bashfx VIP Gold Room / Your records</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-white md:text-6xl">BACKUP &amp; EXPORT</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa79a]">Keep a private copy of every dated journal entry and trade. Download an Excel-ready full-journal ledger or a complete JSON archive whenever you choose.</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-[#554920] bg-[#15150e] px-4 py-3 text-xs text-[#c4c0b3]"><ShieldCheck className="h-4 w-4 text-[#eac45a]" /><span><strong className="text-[#f0c95e]">Private export:</strong> only your signed-in journal is included.</span></div>
    </section>

    <section className="mt-7 grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
      <div className="metal-border rounded-2xl bg-[#12130e] p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dba71d]/12 text-[#e2b43e]"><Archive className="h-5 w-5" /></div>
        <h2 className="mt-5 font-display text-3xl tracking-wide text-white">OWN YOUR RECORDS</h2>
        <p className="mt-3 text-sm leading-6 text-[#aaa79a]">These downloads are created in your browser from the current signed-in journal. Store them in a private location such as encrypted cloud storage or an external drive.</p>
        {backup.error && <p className="mt-5 rounded-lg border border-[#7f3932] bg-[#351612] p-3 text-xs leading-5 text-[#f38b80]">{backup.error.message}</p>}
        <Button disabled={!backup.data || backup.isFetching} onClick={downloadJson} className="mt-7 h-12 w-full bg-[#dba71d] font-bold text-[#170f03] hover:bg-[#f3ce66] disabled:opacity-50"><FileJson className="mr-2 h-4 w-4" />Download full JSON backup</Button>
        <Button disabled={!backup.data || backup.isFetching} variant="outline" onClick={downloadCsv} className="mt-3 h-11 w-full border-[#705d25] bg-transparent font-bold text-[#eaca61] hover:bg-[#dba71d]/10 hover:text-[#ffe9a6] disabled:opacity-50"><FileSpreadsheet className="mr-2 h-4 w-4" />Download full journal CSV</Button>
        <div className="mt-5 rounded-xl border border-[#705d25] bg-[#0b0c09] p-4">
          <div className="flex items-start gap-3"><FileKey className="mt-0.5 h-4 w-4 shrink-0 text-[#e6bf50]" /><div><p className="text-sm font-semibold text-[#eee8d3]">Encrypted archive for private GitHub storage</p><p className="mt-1 text-xs leading-5 text-[#aaa79a]">Your password stays in this browser. It is never saved or sent to the server. The archive contains your journal data and attempts to include linked report images and original trade files.</p></div></div>
          <input value={backupPassword} onChange={event => setBackupPassword(event.target.value)} type="password" minLength={12} autoComplete="new-password" placeholder="Create a private backup password (12+ characters)" className="mt-4 h-11 w-full rounded-lg border border-[#54481e] bg-[#13140e] px-3 text-sm text-[#f2ecda] outline-none placeholder:text-[#777260] focus:border-[#e2b43e]" />
          <Button disabled={!backup.data || isEncrypting || backupPassword.trim().length < 12} onClick={downloadEncryptedArchive} className="mt-3 h-11 w-full bg-[#dba71d] font-bold text-[#170f03] hover:bg-[#f3ce66] disabled:opacity-50">{isEncrypting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileKey className="mr-2 h-4 w-4" />}Create encrypted archive</Button>
          {encryptionMessage && <p className="mt-3 text-xs leading-5 text-[#c6c0ac]" role="status">{encryptionMessage}</p>}
          <div className="mt-4 rounded-lg border border-[#4a421e] bg-[#12130e] p-3">
            <p className="text-xs font-semibold text-[#f0c95e]">Upload it yourself to your private GitHub archive</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-[#aaa79a]">
              {GITHUB_ARCHIVE_UPLOAD_STEPS.map(step => <li key={step}>{step}</li>)}
            </ol>
            <Button asChild variant="outline" className="mt-3 h-10 w-full border-[#705d25] bg-transparent text-xs font-semibold text-[#eaca61] hover:bg-[#dba71d]/10 hover:text-[#ffe9a6]"><a href={GITHUB_ARCHIVE_UPLOAD_URL} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open private GitHub upload</a></Button>
          </div>
        </div>
        <Button disabled={backup.isFetching} variant="ghost" onClick={() => backup.refetch()} className="mt-3 h-10 w-full text-xs text-[#aaa79a] hover:bg-[#dba71d]/10 hover:text-[#f3ce66]">{backup.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh export data</Button>
      </div>

      <div className="metal-border rounded-2xl bg-[#10110c] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[#3e391f] pb-4"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-[#e2b43e]" /><span className="text-xs font-bold uppercase tracking-[.14em] text-[#b3ae9d]">Current export scope</span></div>{backup.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#dba71d]" /> : backup.data ? <span className="text-xs text-[#948e79]">Prepared {exportedAt.toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })} WAT</span> : null}</div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Dated trades", counts?.trades ?? 0],
            ["Journal entries", counts?.dailyJournalEntries ?? 0],
            ["Saved report images", (counts?.weeklySummaries ?? 0) + (counts?.monthlySummaries ?? 0)],
            ["Original trade files", counts?.sourceDocuments ?? 0],
            ["Total linked resources", resourceCount],
            ["Backup format", "JSON + CSV"],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#3e391f] bg-[#0b0c09] p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#847f70]">{label}</p><p className="mt-2 font-display text-2xl tracking-wide text-[#f1cc63]">{value}</p></div>)}
        </div>
        <div className="mt-6 rounded-xl border border-[#4a421e] bg-[#15150e] p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e6bf50]" /><div><p className="text-sm font-semibold text-[#eee8d3]">What your complete backup includes</p><p className="mt-1 text-xs leading-5 text-[#aaa79a]">The JSON archive includes every trade field, daily review, Trader Name, reminder preferences, and download links for generated weekly/monthly reports and original trade files. The encrypted archive packages this journal data with available media files before encrypting it in your browser. The CSV is an Excel-ready flat ledger of every recorded trade.</p></div></div></div>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-[#3e391f] bg-[#0b0c09] p-4"><Download className="mt-0.5 h-4 w-4 shrink-0 text-[#dba71d]" /><p className="text-xs leading-5 text-[#9e9a8f]">Use a unique password and keep it outside GitHub. Save the encrypted archive in your separate private archive repository. The archive includes a report if any linked media file cannot be reached while it is being created.</p></div>
      </div>
    </section>
  </div>;
}
