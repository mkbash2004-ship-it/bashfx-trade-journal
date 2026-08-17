import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  getMissingRequiredTradeFields,
  REQUIRED_TRADE_FIELD_LABELS,
  type RequiredTradeField,
} from "@shared/journalValidation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CirclePlus,
  ClipboardPenLine,
  Loader2,
  LockKeyhole,
  Minus,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type TradeDraft = {
  clientId: string;
  tradingDay: string;
  session: "London" | "New York";
  direction: "buy" | "sell";
  tradeType: "scalp" | "intraday" | "news trade" | "swing";
  setup: string;
  entryConfirmation: string;
  higherTimeframeAlignment: "aligned" | "counter-trend" | "range trade" | "not applicable";
  entry: string;
  exit: string;
  pips: string;
  profit: string;
  currency: string;
  riskAmount: string;
  riskUnit: "%" | "currency" | "";
  plannedRr: string;
  stopManagement: "no change" | "break-even" | "trailed" | "widened" | "closed early";
  partialProfit: "no" | "one partial" | "multiple partials";
  result: "win" | "loss" | "breakeven" | "cancelled";
  exitReason: "take profit" | "stop loss" | "manual close" | "break-even" | "news" | "end of session" | "other";
  planAdherence: "yes" | "partly" | "no";
  discipline: "yes" | "mostly" | "no";
  emotion: "calm" | "patient" | "anxious" | "fearful" | "greedy" | "revenge-driven" | "overconfident" | "other";
  wouldTakeAgain: "yes" | "with adjustments" | "no";
  tags: string;
  notes: string;
  improvement: string;
};

const asNumber = (value: string) => (value.trim() === "" ? null : Number(value));
const dateToday = () => new Date().toISOString().slice(0, 10);

const newTrade = (day: string): TradeDraft => ({
  clientId: crypto.randomUUID(),
  tradingDay: day,
  session: "London",
  direction: "buy",
  tradeType: "intraday",
  setup: "",
  entryConfirmation: "",
  higherTimeframeAlignment: "aligned",
  entry: "",
  exit: "",
  pips: "",
  profit: "",
  currency: "USD",
  riskAmount: "",
  riskUnit: "%",
  plannedRr: "",
  stopManagement: "no change",
  partialProfit: "no",
  result: "win",
  exitReason: "take profit",
  planAdherence: "yes",
  discipline: "yes",
  emotion: "calm",
  wouldTakeAgain: "yes",
  tags: "",
  notes: "",
  improvement: "",
});

export default function UploadTrades() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [journalDate, setJournalDate] = useState(dateToday);
  const [trades, setTrades] = useState<TradeDraft[]>([newTrade(dateToday())]);
  const [validationByTrade, setValidationByTrade] = useState<Record<string, RequiredTradeField[]>>({});
  const [form, setForm] = useState({
    plannedSessions: "London",
    marketBias: "neutral / no bias",
    marketContext: "unclear",
    scheduledEvents: "",
    newsTiming: "no high-impact news",
    dailyRiskLimit: "",
    dailyRiskUnit: "%",
    maxTrades: "",
    preMarketMood: "focused",
    riskLimitFollowed: "yes",
    tradeLimitFollowed: "not set",
    newsImpact: "none",
    dailyStrength: "",
    dailyLesson: "",
    dailyGrade: "B",
    tomorrowRule: "",
  });
  const [localError, setLocalError] = useState("");
  const create = trpc.journal.createDailyJournal.useMutation({
    onSuccess: () => setLocation("/trades"),
  });

  const updateForm = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateTrade = (clientId: string, patch: Partial<TradeDraft>) => {
    setTrades((current) =>
      current.map((trade) => (trade.clientId === clientId ? { ...trade, ...patch } : trade)),
    );
    setValidationByTrade((current) => {
      const existing = current[clientId];
      if (!existing) return current;

      const remaining = existing.filter((field) => {
        if (!(field in patch)) return true;
        return !String(patch[field] ?? "").trim();
      });
      if (remaining.length === existing.length) return current;

      const next = { ...current };
      if (remaining.length) next[clientId] = remaining;
      else delete next[clientId];
      return next;
    });
  };

  const addTrade = () => setTrades((current) => [...current, newTrade(journalDate)]);
  const removeTrade = (clientId: string) => {
    setTrades((current) => (current.length === 1 ? current : current.filter((trade) => trade.clientId !== clientId)));
    setValidationByTrade((current) => {
      if (!current[clientId]) return current;
      const next = { ...current };
      delete next[clientId];
      return next;
    });
  };
  const updateJournalDate = (value: string) => {
    setJournalDate(value);
    setTrades((current) =>
      current.map((trade) => (trade.tradingDay === journalDate ? { ...trade, tradingDay: value } : trade)),
    );
  };

  const submit = async () => {
    setLocalError("");
    const nextValidationByTrade: Record<string, RequiredTradeField[]> = {};
    trades.forEach((trade) => {
      const missingFields = getMissingRequiredTradeFields(trade);
      if (missingFields.length) nextValidationByTrade[trade.clientId] = missingFields;
    });

    if (Object.keys(nextValidationByTrade).length) {
      setValidationByTrade(nextValidationByTrade);
      const firstInvalidTrade = trades.find((trade) => nextValidationByTrade[trade.clientId]);
      if (firstInvalidTrade) {
        requestAnimationFrame(() => {
          document.getElementById(`trade-${firstInvalidTrade.clientId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
        const missingLabels = nextValidationByTrade[firstInvalidTrade.clientId]
          .map((field) => REQUIRED_TRADE_FIELD_LABELS[field])
          .join(", ");
        setLocalError(
          `Trade ${String(trades.indexOf(firstInvalidTrade) + 1).padStart(2, "0")} is incomplete: add ${missingLabels}. The missing fields are highlighted on the trade card.`,
        );
      }
      return;
    }

    setValidationByTrade({});
    try {
      await create.mutateAsync({
        journalDate: new Date(`${journalDate}T12:00:00`),
        plannedSessions: form.plannedSessions,
        marketBias: form.marketBias as "bullish" | "bearish" | "range" | "neutral / no bias",
        marketContext: form.marketContext as "trend continuation" | "pullback" | "reversal area" | "range" | "breakout" | "unclear",
        scheduledEvents: form.scheduledEvents,
        newsTiming: form.newsTiming as "before" | "after" | "during" | "did not trade news" | "no high-impact news",
        dailyRiskLimit: asNumber(form.dailyRiskLimit),
        dailyRiskUnit: form.dailyRiskUnit as "%" | "currency" | "",
        maxTrades: asNumber(form.maxTrades),
        preMarketMood: form.preMarketMood as "calm" | "focused" | "neutral" | "tired" | "stressed" | "frustrated" | "overconfident",
        riskLimitFollowed: form.riskLimitFollowed as "yes" | "partly" | "no",
        tradeLimitFollowed: form.tradeLimitFollowed as "yes" | "no" | "not set",
        newsImpact: form.newsImpact as "none" | "positive influence" | "negative influence" | "traded intentionally" | "should have avoided",
        dailyStrength: form.dailyStrength,
        dailyLesson: form.dailyLesson,
        dailyGrade: form.dailyGrade as "A" | "B" | "C" | "D" | "F",
        tomorrowRule: form.tomorrowRule,
        trades: trades.map(({ clientId, ...trade }) => ({
          ...trade,
          tradingDay: new Date(`${trade.tradingDay}T12:00:00`),
          pips: Number(trade.pips),
          profit: asNumber(trade.profit),
          riskAmount: asNumber(trade.riskAmount),
          plannedRr: asNumber(trade.plannedRr),
        })),
      });
    } catch {
      /* The mutation error is rendered below. */
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <section className="rise-in">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ddb437]">Bashfx VIP Gold Room / XAUUSD M5</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-white md:text-6xl">DAILY TRADE JOURNAL</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#aaa79a]">Record your XAUUSD trades as they happened. Build as many trade cards as you need; every card has its own required date and feeds the weekly summary directly.</p>
      </section>

      <section className="metal-border mt-7 rounded-2xl bg-[#12130e] p-5 md:p-7">
        <div className="flex flex-col justify-between gap-4 border-b border-[#4a421e]/70 pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dba71d]/12 text-[#efc54d]"><CalendarDays className="h-5 w-5" /></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#e2b74a]">Journal date</p><h2 className="font-display text-2xl tracking-wide text-white">START WITH THE DATE</h2></div>
          </div>
          <div className="w-full md:w-64"><Label className="sr-only">Daily journal date</Label><Input type="date" value={journalDate} onChange={(event) => updateJournalDate(event.target.value)} className="h-12 border-2 border-[#dba71d] bg-[#080905] px-3 font-bold text-[#ffe39a] [color-scheme:dark]" /></div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          <Panel title="Market context" icon={<Sparkles className="h-4 w-4" />}><SelectField label="Overall bias" value={form.marketBias} onChange={(value) => updateForm("marketBias", value)} options={["bullish", "bearish", "range", "neutral / no bias"]} /><SelectField label="Market context" value={form.marketContext} onChange={(value) => updateForm("marketContext", value)} options={["trend continuation", "pullback", "reversal area", "range", "breakout", "unclear"]} /><SelectField label="Planned session(s)" value={form.plannedSessions} onChange={(value) => updateForm("plannedSessions", value)} options={["London", "New York", "London & New York"]} /></Panel>
          <Panel title="News & risk plan" icon={<LockKeyhole className="h-4 w-4" />}><Field label="High-impact events (CPI, NFP, FOMC…)" value={form.scheduledEvents} onChange={(value) => updateForm("scheduledEvents", value)} placeholder="CPI at 13:30, or None" /><SelectField label="News timing" value={form.newsTiming} onChange={(value) => updateForm("newsTiming", value)} options={["no high-impact news", "before", "after", "during", "did not trade news"]} /><div className="grid grid-cols-2 gap-3"><Field label="Daily risk limit" value={form.dailyRiskLimit} onChange={(value) => updateForm("dailyRiskLimit", value)} type="number" placeholder="1" /><Field label="Maximum trades" value={form.maxTrades} onChange={(value) => updateForm("maxTrades", value)} type="number" placeholder="3" /></div></Panel>
          <Panel title="Trader state" icon={<ClipboardPenLine className="h-4 w-4" />}><SelectField label="Before-trading state" value={form.preMarketMood} onChange={(value) => updateForm("preMarketMood", value)} options={["calm", "focused", "neutral", "tired", "stressed", "frustrated", "overconfident"]} /><p className="rounded-lg border border-[#3c391f] bg-[#0d0e0a] p-3 text-xs leading-5 text-[#aaa69a]">Your instrument is fixed to <strong className="text-[#efc95e]">XAUUSD</strong>, sessions are <strong className="text-[#efc95e]">London / New York</strong>, and every entry uses <strong className="text-[#efc95e]">M5</strong>.</p></Panel>
        </div>

        <div className="mt-8 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ddb437]">Individual trades</p><h2 className="mt-1 font-display text-3xl tracking-wide text-white">EVERY TRADE. EVERY DATE.</h2></div><span className="rounded-full border border-[#5a4c20] bg-[#1d1b0d] px-3 py-1 text-xs font-bold text-[#e9c85d]">{trades.length} trade{trades.length === 1 ? "" : "s"}</span></div>
        <div className="mt-5 space-y-5">{trades.map((trade, index) => <TradeCard key={trade.clientId} trade={trade} index={index + 1} missingFields={validationByTrade[trade.clientId] ?? []} onPatch={(patch) => updateTrade(trade.clientId, patch)} onRemove={() => removeTrade(trade.clientId)} removable={trades.length > 1} />)}</div>
        <Button onClick={addTrade} variant="outline" className="mt-5 w-full border-dashed border-[#dba71d]/55 bg-[#dba71d]/5 text-[#f0cc62] hover:bg-[#dba71d]/12 hover:text-[#fff0b2]"><CirclePlus className="mr-2 h-4 w-4" />Add another XAUUSD trade</Button>

        <div className="mt-8 border-t border-[#4a421e]/70 pt-7">
          <div className="mb-5 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#79c669]" /><h2 className="font-display text-3xl tracking-wide text-white">END-OF-DAY REVIEW</h2></div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="Discipline checks" icon={<CheckCircle2 className="h-4 w-4" />}><SelectField label="Daily risk limit respected?" value={form.riskLimitFollowed} onChange={(value) => updateForm("riskLimitFollowed", value)} options={["yes", "partly", "no"]} /><SelectField label="Maximum-trade limit respected?" value={form.tradeLimitFollowed} onChange={(value) => updateForm("tradeLimitFollowed", value)} options={["yes", "no", "not set"]} /><SelectField label="News impact" value={form.newsImpact} onChange={(value) => updateForm("newsImpact", value)} options={["none", "positive influence", "negative influence", "traded intentionally", "should have avoided"]} /></Panel>
            <Panel title="Reflection" icon={<ClipboardPenLine className="h-4 w-4" />}><TextField label="Biggest strength today" value={form.dailyStrength} onChange={(value) => updateForm("dailyStrength", value)} /><TextField label="Main mistake or lesson" value={form.dailyLesson} onChange={(value) => updateForm("dailyLesson", value)} /></Panel>
            <Panel title="Tomorrow's focus" icon={<Sparkles className="h-4 w-4" />}><SelectField label="Overall daily grade" value={form.dailyGrade} onChange={(value) => updateForm("dailyGrade", value)} options={["A", "B", "C", "D", "F"]} /><TextField label="One rule for tomorrow" value={form.tomorrowRule} onChange={(value) => updateForm("tomorrowRule", value)} /></Panel>
          </div>
        </div>

        {(localError || create.error) && <div className="mt-6 flex gap-2 rounded-lg border border-[#7e332e] bg-[#32130f]/50 p-3 text-sm text-[#f28a80]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{localError || create.error?.message}</div>}
        <div className="mt-7 flex flex-col justify-between gap-4 border-t border-[#4a421e]/70 pt-6 sm:flex-row sm:items-center"><p className="max-w-xl text-xs leading-5 text-[#989589]">The date on every trade card is required. Your weekly summary groups each trade by that exact date—not only by the day this form is submitted.</p><Button disabled={!isAuthenticated || create.isPending} onClick={submit} className="h-12 bg-[#dba71d] px-6 font-bold text-[#170f03] hover:bg-[#f3ce66] disabled:opacity-50">{create.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving journal…</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Save {trades.length} dated trade{trades.length === 1 ? "" : "s"}</>}</Button></div>
      </section>
    </div>
  );
}

function TradeCard({ trade, index, missingFields, onPatch, onRemove, removable }: { trade: TradeDraft; index: number; missingFields: RequiredTradeField[]; onPatch: (patch: Partial<TradeDraft>) => void; onRemove: () => void; removable: boolean }) {
  const isMissing = (field: RequiredTradeField) => missingFields.includes(field);
  const hasMissingFields = missingFields.length > 0;
  const cardId = `trade-${trade.clientId}`;
  return (
    <article id={cardId} className={`scroll-mt-6 overflow-hidden rounded-xl border bg-[#0d0e0a] ${hasMissingFields ? "border-[#b74e46] shadow-[0_0_0_1px_rgba(183,78,70,.18)]" : "border-[#594a1d]"}`}>
      <div className="flex flex-col justify-between gap-4 border-b border-[#463d1e] bg-[#17160e] px-5 py-4 md:flex-row md:items-center">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#e3bc48]">Trade {String(index).padStart(2, "0")}</p><h3 className="mt-1 font-display text-2xl tracking-wide text-white">XAUUSD <span className="text-[#c79b27]">/ M5</span></h3></div>
        <div className="flex items-center gap-3"><div><Label className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isMissing("tradingDay") ? "text-[#ff9a91]" : "text-[#f1cc63]"}`}>Trade date — required</Label><Input type="date" value={trade.tradingDay} onChange={(event) => onPatch({ tradingDay: event.target.value })} aria-invalid={isMissing("tradingDay")} aria-describedby={hasMissingFields ? `${cardId}-requirements` : undefined} className={`mt-1 h-10 border-2 bg-[#0a0b08] font-bold text-[#ffe39a] [color-scheme:dark] ${isMissing("tradingDay") ? "border-[#cb6057] focus:border-[#ff9a91]" : "border-[#dba71d]"}`} /></div>{removable && <Button onClick={onRemove} variant="outline" size="icon" className="mt-5 border-[#6f322d] bg-transparent text-[#ee837a] hover:bg-[#5a201d] hover:text-white"><Minus className="h-4 w-4" /></Button>}</div>
      </div>
      {hasMissingFields && <div id={`${cardId}-requirements`} className="flex gap-2 border-b border-[#7e332e]/70 bg-[#371613]/55 px-5 py-3 text-xs leading-5 text-[#ffaaa2]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Complete this trade:</strong> {missingFields.map((field) => REQUIRED_TRADE_FIELD_LABELS[field]).join(", ")}.</span></div>}
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Session" value={trade.session} onChange={(value) => onPatch({ session: value as TradeDraft["session"] })} options={["London", "New York"]} />
        <SelectField label="Direction" value={trade.direction} onChange={(value) => onPatch({ direction: value as TradeDraft["direction"] })} options={["buy", "sell"]} />
        <SelectField label="Trade type" value={trade.tradeType} onChange={(value) => onPatch({ tradeType: value as TradeDraft["tradeType"] })} options={["scalp", "intraday", "news trade", "swing"]} />
        <Field label="Setup — required" value={trade.setup} onChange={(value) => onPatch({ setup: value })} placeholder="Liquidity sweep + MSS" invalid={isMissing("setup")} />
        <Field label="Entry confirmation — required" value={trade.entryConfirmation} onChange={(value) => onPatch({ entryConfirmation: value })} placeholder="M5 displacement & retest" invalid={isMissing("entryConfirmation")} />
        <SelectField label="Higher-timeframe alignment" value={trade.higherTimeframeAlignment} onChange={(value) => onPatch({ higherTimeframeAlignment: value as TradeDraft["higherTimeframeAlignment"] })} options={["aligned", "counter-trend", "range trade", "not applicable"]} />
        <Field label="Entry price" value={trade.entry} onChange={(value) => onPatch({ entry: value })} placeholder="2330.50" />
        <Field label="Exit price" value={trade.exit} onChange={(value) => onPatch({ exit: value })} placeholder="2338.10" />
        <Field label="Pips — signed & required" value={trade.pips} onChange={(value) => onPatch({ pips: value })} type="number" placeholder="+75" invalid={isMissing("pips")} />
        <Field label="P&L (optional)" value={trade.profit} onChange={(value) => onPatch({ profit: value })} type="number" placeholder="125" />
        <Field label="Risk amount" value={trade.riskAmount} onChange={(value) => onPatch({ riskAmount: value })} type="number" placeholder="1" />
        <Field label="Planned R:R" value={trade.plannedRr} onChange={(value) => onPatch({ plannedRr: value })} type="number" placeholder="2.5" />
        <SelectField label="Stop management" value={trade.stopManagement} onChange={(value) => onPatch({ stopManagement: value as TradeDraft["stopManagement"] })} options={["no change", "break-even", "trailed", "widened", "closed early"]} />
        <SelectField label="Partial profit" value={trade.partialProfit} onChange={(value) => onPatch({ partialProfit: value as TradeDraft["partialProfit"] })} options={["no", "one partial", "multiple partials"]} />
        <SelectField label="Final result" value={trade.result} onChange={(value) => onPatch({ result: value as TradeDraft["result"] })} options={["win", "loss", "breakeven", "cancelled"]} />
        <SelectField label="Exit reason" value={trade.exitReason} onChange={(value) => onPatch({ exitReason: value as TradeDraft["exitReason"] })} options={["take profit", "stop loss", "manual close", "break-even", "news", "end of session", "other"]} />
      </div>
      <details className="mx-5 mb-5 rounded-lg border border-[#403a20] bg-[#12130e]"><summary className="flex cursor-pointer list-none items-center justify-between p-4 text-xs font-bold uppercase tracking-[0.13em] text-[#d6b44d]">Process & reflection <ChevronDown className="h-4 w-4" /></summary><div className="grid gap-4 border-t border-[#403a20] p-4 md:grid-cols-3"><SelectField label="Taken according to plan?" value={trade.planAdherence} onChange={(value) => onPatch({ planAdherence: value as TradeDraft["planAdherence"] })} options={["yes", "partly", "no"]} /><SelectField label="Execution disciplined?" value={trade.discipline} onChange={(value) => onPatch({ discipline: value as TradeDraft["discipline"] })} options={["yes", "mostly", "no"]} /><SelectField label="Emotion during trade" value={trade.emotion} onChange={(value) => onPatch({ emotion: value as TradeDraft["emotion"] })} options={["calm", "patient", "anxious", "fearful", "greedy", "revenge-driven", "overconfident", "other"]} /><SelectField label="Take this setup again?" value={trade.wouldTakeAgain} onChange={(value) => onPatch({ wouldTakeAgain: value as TradeDraft["wouldTakeAgain"] })} options={["yes", "with adjustments", "no"]} /><Field label="Tags" value={trade.tags} onChange={(value) => onPatch({ tags: value })} placeholder="A+ setup, valid loss" /><TextField label="Reason / management note" value={trade.notes} onChange={(value) => onPatch({ notes: value })} /><TextField label="What to improve next time" value={trade.improvement} onChange={(value) => onPatch({ improvement: value })} /></div></details>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#403a20] bg-[#0d0e0a] p-4"><div className="mb-4 flex items-center gap-2 text-[#e2b642]">{icon}<h3 className="text-xs font-bold uppercase tracking-[0.13em]">{title}</h3></div><div className="space-y-3">{children}</div></div>;
}

function Field({ label, value, onChange, placeholder, type = "text", invalid = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; invalid?: boolean }) {
  return <div><Label className={`text-[10px] font-bold uppercase tracking-[0.12em] ${invalid ? "text-[#ff9a91]" : "text-[#9f9b8e]"}`}>{label}</Label><Input aria-invalid={invalid} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`mt-1.5 h-9 bg-[#090a07] text-sm text-white placeholder:text-[#5e5b51] ${invalid ? "border-[#cb6057] focus:border-[#ff9a91]" : "border-[#403a20] focus:border-[#dba71d]"}`} />{invalid && <p className="mt-1 text-[10px] text-[#f99b92]">Required before saving.</p>}</div>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9f9b8e]">{label}</Label><Textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 min-h-20 border-[#403a20] bg-[#090a07] text-sm text-white focus:border-[#dba71d]" /></div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div><Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9f9b8e]">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-1.5 h-9 border-[#403a20] bg-[#090a07] text-sm text-white focus:ring-[#dba71d]"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
}
