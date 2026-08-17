import { Button } from "@/components/ui/button";
import { BASHFX_TUTORIAL_STEPS, BASHFX_TUTORIAL_VIDEO_URL } from "@shared/tutorial";
import { CirclePlay, ExternalLink, HelpCircle, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function Tutorial() {
  return (
    <div className="mx-auto max-w-7xl pb-12">
      <section className="rise-in overflow-hidden rounded-2xl border border-[#dba71d]/45 bg-[radial-gradient(circle_at_85%_10%,rgba(219,167,29,.2),transparent_28%),linear-gradient(145deg,#16170f,#0e100c_72%)] px-6 py-8 md:px-9 md:py-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[#e2b540]"><HelpCircle className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-[0.17em]">Bashfx VIP Gold Room / Member guide</span></div>
          <h1 className="mt-3 font-display text-5xl tracking-wide text-white md:text-6xl">HOW TO USE YOUR JOURNAL</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#b7b4a8]">Watch the complete touch-guided walkthrough for multi-pair trade capture, Trader Name reports, weekly and automatic monthly summaries, genuine Community feedback, and private WAT reminders.</p>
        </div>
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_.7fr]">
        <div className="metal-border overflow-hidden rounded-2xl bg-[#11120d] p-3 sm:p-5">
          <div className="flex items-center justify-between gap-4 px-1 pb-4">
            <div className="flex items-center gap-2 text-[#e4bc49]"><CirclePlay className="h-5 w-5" /><div><p className="text-[11px] font-bold uppercase tracking-[0.14em]">Full walkthrough</p><p className="mt-0.5 text-xs font-medium text-[#99968a]">AI narration with interactive touch cues</p></div></div>
            <a href={BASHFX_TUTORIAL_VIDEO_URL} target="_blank" rel="noreferrer" className="hidden sm:block"><Button variant="outline" size="sm" className="border-[#dba71d]/55 bg-transparent text-[#edcb68] hover:bg-[#dba71d]/10 hover:text-[#fff0b2]"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open video</Button></a>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#4d431e] bg-black shadow-[0_18px_60px_rgba(0,0,0,.45)]">
            <video className="aspect-video w-full bg-black" controls preload="metadata" playsInline aria-label="Bashfx VIP Gold Room tutorial video">
              <source src={BASHFX_TUTORIAL_VIDEO_URL} type="video/mp4" />
              Your browser does not support this tutorial video.
            </video>
          </div>
          <a href={BASHFX_TUTORIAL_VIDEO_URL} target="_blank" rel="noreferrer" className="mt-4 block sm:hidden"><Button variant="outline" className="w-full border-[#dba71d]/55 bg-transparent text-[#edcb68] hover:bg-[#dba71d]/10 hover:text-[#fff0b2]"><ExternalLink className="mr-2 h-4 w-4" />Open tutorial video</Button></a>
        </div>

        <aside className="metal-border rounded-2xl bg-[#12130e] p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dba71d]/12 text-[#e7be4b]"><Sparkles className="h-5 w-5" /></div>
          <h2 className="mt-5 font-display text-3xl tracking-wide text-white">WHAT YOU WILL LEARN</h2>
          <ol className="mt-5 space-y-4">{BASHFX_TUTORIAL_STEPS.map((step, index) => <li key={step} className="flex gap-3"><span className="font-display text-xl leading-5 text-[#dcad37]">{String(index + 1).padStart(2, "0")}</span><p className="text-sm leading-5 text-[#b4b1a5]">{step}</p></li>)}</ol>
          <div className="mt-7 border-t border-[#4a421e]/70 pt-5"><p className="text-xs leading-5 text-[#979489]">Ready to apply the walkthrough?</p><Link href="/upload"><Button className="mt-3 w-full bg-[#dba71d] font-bold text-[#170f03] hover:bg-[#f3ce66]">Open daily journal</Button></Link></div>
        </aside>
      </section>
    </div>
  );
}
