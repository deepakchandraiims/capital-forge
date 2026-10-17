"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SharedAppSidebar from "../../../SharedAppSidebar";
import LiveDateTime from "../../../LiveDateTime";
import {
  GYM_SKILLS, TOTAL_GYM_QUESTIONS, TIER_TOTALS,
  DrillQuestion, GymMode, questionForStep, isDrillAnswerCorrect
} from "../../../../lib/mental-math-gym";
import styles from "./gym.module.css";

type SkillProgress = { attempts: number; correct: number; durationMs: number };
type GymProgress = {
  answered: number;
  correct: number;
  durationMs: number;
  streak: number;
  bestStreak: number;
  mistakes: number[];
  skills: Record<string, SkillProgress>;
  lastSessionAt: string;
};
type RoundProgress = { answered: number; correct: number; durationMs: number };
type AnswerFeedback = { correct: boolean; expected: string; explanation: string };

const LOCAL_KEY = "capital-forge-mental-math-gym-v1";
const EMPTY: GymProgress = { answered: 0, correct: 0, durationMs: 0, streak: 0, bestStreak: 0, mistakes: [], skills: {}, lastSessionAt: "" };
const MODES: { id: GymMode; label: string; detail: string }[] = [
  { id: "foundation", label: "Foundation Only", detail: "Only simple mental calculations. Stay here as long as you want." },
  { id: "balanced", label: "65 / 25 / 10 Mix", detail: "65% basic, 25% intermediate, 10% finance arithmetic." },
  { id: "focus", label: "Repeat One Skill", detail: "Choose addition, tables, division or any skill and repeat it." },
  { id: "intermediate", label: "Intermediate", detail: "Two- and three-digit arithmetic and percentages." },
  { id: "finance", label: "Finance Math", detail: "Margins, multiples, returns, basis points and enterprise value." },
  { id: "mistakes", label: "Review Mistakes", detail: "Replay your recent incorrect answers until fluent." }
];
function saneProgress(value: unknown): GymProgress {
  const v = value && typeof value === "object" ? value as Partial<GymProgress> : {};
  const safe = (n: unknown) => Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0;
  const answered = safe(v.answered);
  const correct = Math.min(answered, safe(v.correct));
  return {
    answered, correct,
    durationMs: safe(v.durationMs), streak: safe(v.streak),
    bestStreak: safe(v.bestStreak),
    mistakes: Array.isArray(v.mistakes) ? v.mistakes.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < TOTAL_GYM_QUESTIONS).slice(-100) : [],
    skills: v.skills && typeof v.skills === "object" && !Array.isArray(v.skills) ? v.skills : {},
    lastSessionAt: typeof v.lastSessionAt === "string" ? v.lastSessionAt : ""
  };
}
function formatMs(ms: number) { return (ms / 1000).toFixed(1) + "s"; }
function formatAnswer(q: DrillQuestion) { return String(q.answer) + q.suffix; }

export default function MentalMathGymPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<GymProgress>(EMPTY);
  const progressRef = useRef<GymProgress>(EMPTY);
  const [mode, setMode] = useState<GymMode>("foundation");
  const [skill, setSkill] = useState("easy-add");
  const [roundLength, setRoundLength] = useState(100);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [phase, setPhase] = useState<"setup" | "active" | "complete">("setup");
  const [step, setStep] = useState(0);
  const [baseStep, setBaseStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [round, setRound] = useState<RoundProgress>({ answered: 0, correct: 0, durationMs: 0 });
  const [syncLabel, setSyncLabel] = useState("Saved locally");
  const inputRef = useRef<HTMLInputElement>(null);
  const questionStartRef = useRef(0);
  const roundRef = useRef<RoundProgress>({ answered: 0, correct: 0, durationMs: 0 });
  const pendingRef = useRef<GymProgress | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let live = true;
    let local = EMPTY;
    try { local = saneProgress(JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}")); } catch {}
    progressRef.current = local;
    setProgress(local);
    setHydrated(true);
    void (async () => {
      try {
        const res = await fetch("/api/user-progress", { cache: "no-store" });
        const data = await res.json();
        if (!live || !res.ok || !data.ok) return;
        const remote = saneProgress(data.state?.mentalMathGymV1);
        // Never replace more recent on-device progress with a stale server snapshot.
        if (remote.answered > progressRef.current.answered) {
          progressRef.current = remote;
          setProgress(remote);
          localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
        }
        setSyncLabel("Account sync available");
      } catch { /* Local practice continues without a connection. */ }
    })();
    return () => { live = false; };
  }, []);

  async function flushProgress() {
    if (busyRef.current) return;
    busyRef.current = true;
    while (pendingRef.current) {
      const snapshot = pendingRef.current;
      pendingRef.current = null;
      try {
        const res = await fetch("/api/user-progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "state", patch: { mentalMathGymV1: snapshot } })
        });
        if (!res.ok) throw new Error("Could not sync");
        setSyncLabel("Saved to account");
      } catch {
        setSyncLabel("Saved locally · sync pending");
        // Keep the newest unsynced state and retry on the next checkpoint.
        if (!pendingRef.current || pendingRef.current.answered < snapshot.answered) pendingRef.current = snapshot;
        break;
      }
    }
    busyRef.current = false;
  }

  function queueSync(snapshot: GymProgress) {
    pendingRef.current = snapshot;
    void flushProgress();
  }

  const current = useMemo(() => {
    if (phase !== "active") return null;
    return questionForStep(mode, baseStep + step, skill, progress.mistakes);
    // Mistake list is intentionally taken from the current progress to support immediate corrections.
  }, [phase, mode, baseStep, step, skill, progress.mistakes]);

  useEffect(() => {
    if (phase === "active" && !feedback) inputRef.current?.focus();
  }, [phase, current?.id, feedback]);

  useEffect(() => {
    if (phase !== "active" || !feedback?.correct || !autoAdvance) return;
    const timer = window.setTimeout(() => advance(), 450);
    return () => window.clearTimeout(timer);
    // advance reads the current round state at invocation time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, feedback, autoAdvance]);

  function start() {
    if (!hydrated || (mode === "mistakes" && !progress.mistakes.length)) return;
    setBaseStep(progressRef.current.answered);
    setStep(0);
    setAnswer("");
    setFeedback(null);
    questionStartRef.current = performance.now();
    const zero = { answered: 0, correct: 0, durationMs: 0 };
    roundRef.current = zero;
    setRound(zero);
    setPhase("active");
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (feedback) { advance(); return; }
    if (!current || !answer.trim()) return;
    const correct = isDrillAnswerCorrect(current, answer);
    const duration = Math.max(150, Math.round(performance.now() - questionStartRef.current));
    const prev = progressRef.current;
    const lastSkill = prev.skills[current.skill] || { attempts: 0, correct: 0, durationMs: 0 };
    const misses = correct
      ? prev.mistakes.filter((x) => x !== current.index)
      : [...prev.mistakes.filter((x) => x !== current.index), current.index].slice(-100);
    const streak = correct ? prev.streak + 1 : 0;
    const next: GymProgress = {
      answered: prev.answered + 1,
      correct: prev.correct + Number(correct),
      durationMs: prev.durationMs + duration,
      streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      mistakes: misses,
      lastSessionAt: new Date().toISOString(),
      skills: {
        ...prev.skills,
        [current.skill]: {
          attempts: lastSkill.attempts + 1,
          correct: lastSkill.correct + Number(correct),
          durationMs: lastSkill.durationMs + duration
        }
      }
    };
    progressRef.current = next;
    setProgress(next);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch {}
    setSyncLabel("Saved locally");
    if (next.answered % 10 === 0) queueSync(next);
    const nextRound = {
      answered: roundRef.current.answered + 1,
      correct: roundRef.current.correct + Number(correct),
      durationMs: roundRef.current.durationMs + duration
    };
    roundRef.current = nextRound;
    setRound(nextRound);
    setFeedback({
      correct,
      expected: formatAnswer(current),
      explanation: current.explanation
    });
  }

  function advance() {
    if (phase !== "active") return;
    if (roundLength > 0 && roundRef.current.answered >= roundLength) {
      setPhase("complete");
      queueSync(progressRef.current);
      return;
    }
    questionStartRef.current = performance.now();
    setStep((n) => n + 1);
    setAnswer("");
    setFeedback(null);
  }

  const lifetimeAccuracy = progress.answered ? Math.round(100 * progress.correct / progress.answered) : 0;
  const roundAccuracy = round.answered ? Math.round(100 * round.correct / round.answered) : 0;
  const selectedMode = MODES.find((m) => m.id === mode);
  const goalPercent = Math.min(100, (progress.answered / TOTAL_GYM_QUESTIONS) * 100);

  return <div className={styles.shell}>
    <header className={styles.header}>
      <button onClick={() => router.push("/practice/quick-math")} className={styles.brand}><span>CF</span><b>Capital Forge</b><small> / Mental Math Gym</small></button>
      <div className={styles.headerRight}><LiveDateTime compact /><button onClick={() => router.push("/practice/quick-math")}>Original Math Bank ↗</button></div>
    </header>
    <SharedAppSidebar active="Practice" title="Mental Math Gym" note="Repeat basic arithmetic without forced difficulty changes." />
    <main className={styles.main + " cf-shell-main-with-sidebar"}>
      <section className={styles.hero}>
        <div><p>CAPITAL FORGE · REPETITION LAB</p><h1>Make numbers automatic.</h1><span>100,000 deterministic calculation slots. 65,000 very easy. No difficulty jumps unless you choose them.</span></div>
        <div className={styles.heroNumber}>100,000<small>Practice slots</small></div>
      </section>
      <section className={styles.overview}>
        <div><small>Lifetime calculations</small><b>{progress.answered.toLocaleString("en-IN")}</b></div>
        <div><small>Lifetime accuracy</small><b>{lifetimeAccuracy}%</b></div>
        <div><small>Average response</small><b>{progress.answered ? formatMs(progress.durationMs / progress.answered) : "—"}</b></div>
        <div><small>Best correct streak</small><b>{progress.bestStreak.toLocaleString("en-IN")}</b></div>
      </section>
      <section className={styles.layout}>
        <div className={styles.central}>
          {phase === "setup" && <div className={styles.panel}>
            <p className={styles.eyebrow}>YOUR TRAINING, YOUR PACE</p>
            <h2>Choose a repetition mode</h2>
            <p className={styles.subtle}>Foundation Only is the default. Repeating easy problems for weeks is allowed; nothing auto-unlocks or forces you to move up.</p>
            <div className={styles.modes}>
              {MODES.map((choice) => <button key={choice.id} type="button" disabled={choice.id === "mistakes" && !progress.mistakes.length}
                onClick={() => setMode(choice.id)} className={mode === choice.id ? styles.selected : ""}>
                <b>{choice.label}</b><small>{choice.detail}</small>
              </button>)}
            </div>
            {mode === "focus" && <label className={styles.field}>Repeat skill
              <select value={skill} onChange={(e) => setSkill(e.target.value)}>
                <optgroup label="Foundation — easy">{GYM_SKILLS.filter((x) => x.tier === "foundation").map((x) => <option key={x.key} value={x.key}>{x.title} · {x.count.toLocaleString("en-IN")}</option>)}</optgroup>
                <optgroup label="Intermediate">{GYM_SKILLS.filter((x) => x.tier === "intermediate").map((x) => <option key={x.key} value={x.key}>{x.title}</option>)}</optgroup>
                <optgroup label="Finance">{GYM_SKILLS.filter((x) => x.tier === "finance").map((x) => <option key={x.key} value={x.key}>{x.title}</option>)}</optgroup>
              </select>
            </label>}
            <div className={styles.field}><b>Questions this round</b>
              <div className={styles.lengths}>{[25, 50, 100, 250, 500, 0].map((count) =>
                <button type="button" key={count} className={roundLength === count ? styles.selected : ""} onClick={() => setRoundLength(count)}>{count || "Endless"}</button>
              )}</div>
            </div>
            <label className={styles.toggle}><input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} /> Auto-advance after correct answers (450 ms)</label>
            <button disabled={!hydrated} className={styles.primary} onClick={start}>Start {roundLength ? roundLength + " calculations" : "endless practice"} →</button>
            <small className={styles.saved}>{syncLabel}. Your completed answers count even if the same question appears again.</small>
          </div>}
          {phase === "active" && current && <div className={styles.challenge}>
            <div className={styles.challengeMeta}><span>{current.skillName} · {current.tier}</span><b>{round.answered}{roundLength ? " / " + roundLength : " completed"}</b></div>
            {roundLength > 0 && <div className={styles.bar}><i style={{ width: Math.min(100, 100 * round.answered / roundLength) + "%" }} /></div>}
            <p className={styles.question}>{current.prompt}</p>
            <form onSubmit={submit} className={styles.answerForm}>
              <input ref={inputRef} value={answer} disabled={Boolean(feedback)} onChange={(e) => setAnswer(e.target.value)} inputMode="decimal"
                placeholder="Your answer" autoComplete="off" aria-label="Your mental math answer"/>
              <button type="submit">{feedback ? "Next →" : "Check →"}</button>
            </form>
            {feedback && <div className={feedback.correct ? styles.correct : styles.incorrect}>
              <b>{feedback.correct ? "✓ Correct" : "✕ Answer: " + feedback.expected}</b>
              {!feedback.correct && <small>{feedback.explanation}</small>}
            </div>}
            <div className={styles.live}>
              <div><small>Round accuracy</small><b>{roundAccuracy}%</b></div>
              <div><small>Round average</small><b>{round.answered ? formatMs(round.durationMs / round.answered) : "—"}</b></div>
              <div><small>Current streak</small><b>{progress.streak}</b></div>
            </div>
            <div className={styles.foot}><span>Enter to check · Enter again for next · No calculator</span><button onClick={() => { queueSync(progressRef.current); setPhase("setup"); }}>End session</button></div>
          </div>}
          {phase === "complete" && <div className={styles.panel + " " + styles.completed}>
            <p className={styles.eyebrow}>ROUND COMPLETE</p>
            <h2>{roundAccuracy}% accuracy</h2>
            <p>{round.correct} of {round.answered} correct · {round.answered ? formatMs(round.durationMs / round.answered) : "—"} average response</p>
            <button onClick={start} className={styles.primary}>Repeat same difficulty →</button>
            <button className={styles.secondary} onClick={() => setPhase("setup")}>Change setup</button>
          </div>}
        </div>
        <aside className={styles.rail}>
          <div className={styles.railBlock}><h3>Question distribution</h3>
            <div><span>Foundation</span><b>{TIER_TOTALS.foundation.toLocaleString("en-IN")} · 65%</b></div><div className={styles.miniBar}><i style={{width:"65%",background:"#209cba"}}/></div>
            <div><span>Intermediate</span><b>{TIER_TOTALS.intermediate.toLocaleString("en-IN")} · 25%</b></div><div className={styles.miniBar}><i style={{width:"25%",background:"#5485e8"}}/></div>
            <div><span>Finance</span><b>{TIER_TOTALS.finance.toLocaleString("en-IN")} · 10%</b></div><div className={styles.miniBar}><i style={{width:"10%",background:"#7361d1"}}/></div>
          </div>
          <div className={styles.railBlock}><h3>100,000-repetition goal</h3>
            <p>{Math.min(TOTAL_GYM_QUESTIONS, progress.answered).toLocaleString("en-IN")} / 100,000 responses</p>
            <div className={styles.miniBar}><i style={{ width: goalPercent + "%", background: "#1867df" }}/></div>
            <small>Attempts count every repetition, including revisiting the same calculation. Your progress is saved locally and synced to your account in checkpoints.</small>
          </div>
          <div className={styles.railBlock}><h3>Current training</h3><p>{selectedMode?.label}</p><small>More speed matters only after accuracy. Aim for comfortable, consistent practice rather than rushing.</small></div>
        </aside>
      </section>
    </main>
  </div>;
}
