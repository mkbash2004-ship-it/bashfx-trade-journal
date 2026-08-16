import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { AlertCircle, FileText, ImageIcon, Loader2, LockKeyhole, ScanLine, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const supported = ["image/jpeg", "image/png", "application/pdf"];

function fileDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Could not read this file")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }); }

export default function UploadTrades() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [tradingDay, setTradingDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [localError, setLocalError] = useState("");
  const upload = trpc.journal.uploadAndExtract.useMutation({ onSuccess: ({ documentId }) => setLocation(`/trades?review=${documentId}`) });

  const submit = async () => {
    setLocalError("");
    if (!file) return setLocalError("Choose a trade-result image or PDF first.");
    if (!supported.includes(file.type)) return setLocalError("Use a JPG, PNG, or PDF file.");
    if (file.size > 20 * 1024 * 1024) return setLocalError("Choose a file smaller than 20 MB.");
    try { await upload.mutateAsync({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "application/pdf", contentBase64: await fileDataUrl(file), tradingDay: new Date(`${tradingDay}T12:00:00`) }); } catch { /* error is shown below */ }
  };

  return <div className="mx-auto max-w-4xl pb-10"><section className="rise-in"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ddb437]">Daily trade intake</p><h1 className="mt-2 font-display text-5xl tracking-wide text-white">UPLOAD YOUR RESULTS</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa79a]">Send the broker result, trade-history screenshot, or PDF for one trading day. BashFX reads the document, creates an editable set of extracted trades, and keeps the source attached to your account.</p></section>
    <section className="metal-border mt-7 rounded-2xl bg-[#12130e] p-5 md:p-8"><div className="grid gap-6 md:grid-cols-[1fr_.7fr]"><label className="group relative flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#dba71d]/55 bg-[#0d0e0a] p-6 text-center transition hover:border-[#f4ce66] hover:bg-[#18170f]"><input className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={event => setFile(event.target.files?.[0] ?? null)} /><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dba71d]/12 text-[#e9bd47] group-hover:scale-105 transition-transform"><UploadCloud className="h-7 w-7" /></div><h2 className="mt-4 font-bold text-white">{file ? file.name : "Drop a file or browse"}</h2><p className="mt-2 max-w-xs text-xs leading-5 text-[#969388]">JPG, PNG or PDF. For best extraction, use a clear image that shows the pair, direction, and result.</p>{file && <span className="mt-4 rounded-full border border-[#dba71d]/40 bg-[#dba71d]/10 px-3 py-1 text-xs text-[#f2cc66]">{(file.size / 1024 / 1024).toFixed(1)} MB selected</span>}</label><div className="space-y-5"><div><Label className="text-xs font-bold uppercase tracking-[0.14em] text-[#a6a398]">Trading day</Label><Input type="date" value={tradingDay} onChange={event => setTradingDay(event.target.value)} className="mt-2 h-11 border-[#4a421e] bg-[#0d0e0a] text-white [color-scheme:dark]" /></div><div className="rounded-lg border border-[#3f3a22] bg-[#0d0e0a] p-4"><div className="flex items-center gap-2 text-[#e3b83c]"><ScanLine className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.13em]">What gets extracted</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#b2afa4]"><span>Pair & session</span><span>Buy / sell</span><span>Entry & exit</span><span>Result & pips</span><span>Profit / loss</span><span>Confidence</span></div></div><div className="rounded-lg border border-[#2e4d3a] bg-[#102016]/50 p-4"><div className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#69bc55]" /><p className="text-xs leading-5 text-[#a9c9a1]">Your original document is kept in private storage and extraction runs on the server. Review the data before it appears in your weekly total.</p></div></div></div></div>
      {(localError || upload.error) && <div className="mt-5 flex gap-2 rounded-lg border border-[#7e332e] bg-[#32130f]/50 p-3 text-sm text-[#f28a80]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{localError || upload.error?.message}</div>}
      <div className="mt-7 flex flex-col justify-between gap-4 border-t border-[#3d381f] pt-5 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-xs text-[#88857a]">{file?.type === "application/pdf" ? <FileText className="h-4 w-4 text-[#dba71d]" /> : <ImageIcon className="h-4 w-4 text-[#dba71d]" />}<span>Extraction typically finishes within moments.</span></div><Button disabled={upload.isPending || !isAuthenticated} onClick={submit} className="h-11 bg-[#dba71d] px-6 font-bold text-[#170f03] hover:bg-[#f3ce66] disabled:opacity-50">{upload.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading trade results…</> : <><ScanLine className="mr-2 h-4 w-4" />Extract and review trades</>}</Button></div>
      {!isAuthenticated && <p className="mt-3 text-right text-xs text-[#e7bc4a]">Sign in to upload and secure your trade records.</p>}</section></div>;
}
