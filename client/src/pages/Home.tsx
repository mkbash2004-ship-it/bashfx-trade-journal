import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BarChart3, Crosshair, Sparkles, TrendingDown, TrendingUp, UploadCloud } from "lucide-react";
import { Link } from "wouter";

function MetricCard({ label, value, detail, tone = "gold" }: { label: string; value: string; detail: string; tone?: "gold" | "green" | "red" }) {
  const tones = { gold: "text-[#f2ca58]", green: "text-[#63bd55]", red: "text-[#ef5a54]" };
  return <div className="metal-border rise-in rounded-xl bg-[#12130e] p-5"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#89877e]">{label}</p><p className={`mt-3 font-display text-4xl tracking-wide ${tones[tone]}`}>{value}</p><p className="mt-1 text-xs text-[#aaa79c]">{detail}</p></div>;
}

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data } = trpc.journal.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const metrics = data?.metrics ?? { totalTrades: 0, wins: 0, losses: 0, breakeven: 0, winRate: 0, totalPips: 0, totalProfit: 0 };
  const dateLabel = data?.weekStart ? `${new Date(data.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(new Date(data.weekEnd).getTime() - 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Current week";

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <section className="rise-in relative overflow-hidden rounded-2xl border border-[#dba71d]/45 bg-[#14150f] px-6 py-7 md:px-9 md:py-9">
        <div className="absolute inset-0 opacity-80 [background:radial-gradient(circle_at_88%_12%,rgba(219,167,29,.18),transparent_24%),radial-gradient(circle_at_73%_110%,rgba(85,166,63,.16),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 flex items-center gap-2 text-[#e2b540]"><Crosshair className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-[0.17em]">BashFX / Performance Desk</span></div><h1 className="font-display text-5xl tracking-wide text-white md:text-6xl">YOUR WEEK, IN FOCUS.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#b5b2a5]">{isAuthenticated ? `Welcome back${user?.name ? `, ${user.name}` : ""}. Upload your daily result, validate the extracted trades, then generate a polished weekly report.` : "Sign in to keep your upload history, extracted trades, and generated performance summaries private."}</p></div>
          <Link href="/upload"><Button className="h-12 bg-[#dba71d] px-5 font-bold text-[#171005] hover:bg-[#f3ce66]"><UploadCloud className="mr-2 h-4 w-4" />Upload results</Button></Link>
        </div>
      </section>

      <section className="mt-7"><div className="mb-4 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#948e79]">Weekly snapshot</p><h2 className="mt-1 font-display text-3xl tracking-wide text-white">{dateLabel}</h2></div><Link href="/trades" className="hidden items-center gap-1 text-sm font-bold text-[#e2b540] hover:text-[#f6da83] sm:flex">View weekly log <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total trades" value={String(metrics.totalTrades)} detail={`${metrics.wins} wins · ${metrics.losses} losses · ${metrics.breakeven} BE`} /><MetricCard label="Win rate" value={`${metrics.winRate}%`} detail="Calculated from wins and losses" tone="green" /><MetricCard label="Net pips" value={`${metrics.totalPips > 0 ? "+" : ""}${metrics.totalPips}`} detail="Verified weekly pip total" tone={metrics.totalPips < 0 ? "red" : "green"} /><MetricCard label="P&L" value={`${metrics.totalProfit > 0 ? "+" : ""}${metrics.totalProfit}`} detail="Based on saved trade results" tone={metrics.totalProfit < 0 ? "red" : "gold"} /></div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_.8fr]"><div className="metal-border rounded-xl bg-[#12130e] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#948e79]">The BashFX workflow</p><h2 className="mt-2 font-display text-3xl tracking-wide text-white">FROM SCREENSHOT TO SUMMARY</h2></div><BarChart3 className="h-7 w-7 text-[#dba71d]" /></div><div className="mt-7 grid gap-4 md:grid-cols-3"><Workflow number="01" title="Upload" body="Send a JPG, PNG, or PDF from any trading day." icon={<UploadCloud className="h-4 w-4" />} /><Workflow number="02" title="Verify" body="Review each AI-extracted trade and correct it before it counts." icon={<Crosshair className="h-4 w-4" />} /><Workflow number="03" title="Generate" body="Create a branded weekly summary image ready to export." icon={<Sparkles className="h-4 w-4" />} /></div></div><div className="metal-border relative overflow-hidden rounded-xl bg-[linear-gradient(155deg,#1a170c,#0f110d_55%,#152015)] p-6"><div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-[#dba71d]/15 blur-2xl" /><div className="relative"><div className="flex items-center gap-2 text-[#e4b933]"><TrendingUp className="h-5 w-5" /><p className="text-[11px] font-bold uppercase tracking-[0.16em]">Ready when you are</p></div><h2 className="mt-4 font-display text-4xl tracking-wide text-white">MAKE THE WEEK COUNT.</h2><p className="mt-3 text-sm leading-6 text-[#b7b4a8]">Each entry remains scoped to your account. Generate an image only after you have checked the records.</p><Link href="/summary"><Button variant="outline" className="mt-6 border-[#dba71d]/60 bg-transparent text-[#f3d26d] hover:bg-[#dba71d]/10 hover:text-[#ffe9a3]">Open summary studio <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><TrendingDown className="absolute bottom-0 right-0 h-20 w-20 rotate-180 text-[#dba71d]/10" /></div></div></section>
    </div>
  );
}

function Workflow({ number, title, body, icon }: { number: string; title: string; body: string; icon: React.ReactNode }) { return <div className="rounded-lg border border-[#3d381d] bg-[#0d0e0b] p-4"><div className="flex items-center justify-between text-[#dfb537]"><span className="font-display text-2xl">{number}</span>{icon}</div><h3 className="mt-4 text-sm font-bold text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-[#a5a398]">{body}</p></div>; }
