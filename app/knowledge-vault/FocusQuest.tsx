"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthProfile } from "../AuthProvider";

type Obj = Record<string, any>;
type Stage = "choose" | "learn" | "recall" | "done";
type Completion = { id: string; day: string; rating: string; correct: boolean | null };
type Momentum = { startedAt: string; completed: Completion[] };
const MOMENTUM_KEY = "capital-forge-kv-momentum-v1";

function field(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function short(value: string, length = 235) {
  return value.length > length ? value.slice(0, length).replace(/\s+\S*$/, "") + "…" : value;
}
function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function dailyGoal(day: number) {
  return day <= 14 ? 1 : day <= 30 ? 2 : day <= 60 ? 3 : day <= 90 ? 4 : 5;
}
function emptyMomentum(): Momentum {
  return { startedAt: new Date().toISOString(), completed: [] };
}
function readMomentum(): Momentum {
  try {
    const raw = localStorage.getItem(MOMENTUM_KEY);
    if (!raw) return emptyMomentum();
    const item = JSON.parse(raw);
    if (!item || !Array.isArray(item.completed) || !item.startedAt) return emptyMomentum();
    return item;
  } catch { return emptyMomentum(); }
}

export default function FocusQuest({
  object,
  onRate,
  onReadFull,
  onNext
}: {
  object: Obj;
  onRate: (rating: "Again" | "Hard" | "Got It") => Promise<boolean>;
  onReadFull: () => void;
  onNext?: () => void;
}) {
  const profile = useAuthProfile();
  const [stage, setStage] = useState<Stage>("choose");
  const [choice, setChoice] = useState<"good" | "trap" | null>(null);
  const [hint, setHint] = useState(false);
  const [hookShown, setHookShown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const content = object.content && typeof object.content === "object" ? object.content : {};
  const prompt = field(object.prompt) || field(content.question) || field(content.prompt) || field(object.title);
  const answer = field(object.answer) || field(content.answer) || field(content.model_answer) || field(content.solution) || field(object.explanation);
  const intuition = field(object.intuition) || field(content.intuition);
  const trap = field(object.common_mistake) || field(content.common_mistake) || field(content.trap);
  const why = field(object.why_it_matters) || field(content.why_it_matters);
  const pattern = field(object.pattern_to_remember) || field(content.key_principle) || field(content.pattern_to_remember);
  // We only create a two-choice exercise when the editorial record has an
  // explicit documented common mistake. No AI-generated distractors or facts.
  const hasChoice = Boolean(answer && trap && answer.trim().toLowerCase() !== trap.trim().toLowerCase());
  const reverse = useMemo(() => String(object.id || "").charCodeAt(0) % 2 === 0, [object.id]);
  const variants = reverse
    ? [{ value: "trap" as const, text: trap }, { value: "good" as const, text: answer }]
    : [{ value: "good" as const, text: answer }, { value: "trap" as const, text: trap }];
  const programDay = momentum ? Math.max(1, Math.floor((Date.now() - Date.parse(momentum.startedAt)) / 86400000) + 1) : 1;
  const goal = dailyGoal(programDay);
  const todayCount = momentum ? new Set(momentum.completed.filter((x) => x.day === today()).map((x) => x.id)).size : 0;
  const xp = momentum ? momentum.completed.reduce((sum, item) => sum + 10 + (item.correct ? 5 : 0), 0) : 0;
  const isDoneAlready = Boolean(momentum?.completed.some((x) => x.id === object.id));

  useEffect(() => {
    if (!profile?.id) return;
    const record = readMomentum();
    setMomentum(record);
    try { if (!localStorage.getItem(MOMENTUM_KEY)) localStorage.setItem(MOMENTUM_KEY, JSON.stringify(record)); } catch {}
  }, [profile?.id]);

  useEffect(() => {
    setStage("choose"); setChoice(null); setHint(false); setHookShown(false); setSaving(false); setMessage("");
  }, [object.id]);

  async function finish(confident: boolean) {
    if (saving) return;
    setSaving(true);
    setMessage("");
    // When the first prediction was wrong, confidence is recorded as Hard
    // rather than an objectively correct attempt.
    const rating = confident ? (choice === "trap" ? "Hard" : "Got It") : "Again";
    try {
      const saved = await onRate(rating);
      if (!saved) throw new Error("Could not save this attempt. Try again.");
      const current = readMomentum();
      const complete = { id: String(object.id), day: today(), rating, correct: choice === "good" ? true : choice === "trap" ? false : null };
      if (!current.completed.some((x) => x.id === complete.id)) {
        current.completed = [...current.completed, complete].slice(-900);
        localStorage.setItem(MOMENTUM_KEY, JSON.stringify(current));
      }
      setMomentum({ ...current });
      setStage("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your progress.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="kv-focus" aria-label="Focus Quest learning mode">
    <div className="kv-focus-top">
      <div><span className="kv-focus-eyebrow">FOCUS QUEST · 90-DAY ON-RAMP</span><h2>One small win at a time</h2><p>Make a call. Understand the mechanism. Remember one thing.</p></div>
      <div className="kv-focus-metrics"><span>Day <b>{Math.min(programDay, 90)}/90</b></span><span>Today <b>{todayCount}/{goal}</b></span><span><b>{xp}</b> XP</span></div>
    </div>
    <div className="kv-focus-progress" aria-label="Your daily learning goal"><span style={{ width: String(Math.min(100, todayCount / goal * 100)) + "%" }}/></div>
    <div className="kv-focus-steps">
      {["01 · Make a call", "02 · Make sense of it", "03 · Lock it in"].map((label, index) =>
        <span key={label} className={["choose","learn","recall","done"].indexOf(stage) >= index ? "current" : ""}>{label}</span>
      )}
    </div>

    {stage === "choose" && <div className="kv-focus-stage">
      <div className="kv-focus-stagehead"><span className="kv-focus-number">01</span><div><b>What would you say?</b><p>It's okay to guess. A wrong first answer is useful practice.</p></div></div>
      <p className="kv-focus-question">{prompt}</p>
      {hasChoice ? <>
        <p className="kv-focus-small">Which is the more defensible explanation?</p>
        <div className="kv-focus-choices">
          {variants.map((item, index) => {
            const chosen = choice === item.value;
            const correct = choice !== null && item.value === "good";
            const wrong = chosen && item.value === "trap";
            return <button key={item.value} type="button" disabled={choice !== null}
              className={correct ? "correct" : wrong ? "wrong" : ""}
              onClick={() => setChoice(item.value)}>
              <span>{String.fromCharCode(65 + index)}</span>
              <b>{short(item.text)}</b>
              {correct && choice !== null && <strong>✓</strong>}
              {wrong && <strong>×</strong>}
            </button>;
          })}
        </div>
        {choice && <div className={choice === "good" ? "kv-focus-feedback good" : "kv-focus-feedback wrong"}>
          <b>{choice === "good" ? "Good call." : "Nice attempt — that is the common trap."}</b>
          <span>{choice === "good" ? "Let's make the reasoning stick." : "Now you'll see why this answer sounds plausible and where it goes wrong."}</span>
        </div>}
      </> : <div className="kv-focus-nudge">Think of your answer in one sentence. No typing required.</div>}
      {hint && <div className="kv-focus-hint"><b>A useful clue</b><p>{short(intuition || why || pattern || prompt, 400)}</p></div>}
      <div className="kv-focus-controls">
        {(choice !== null || !hasChoice) && <button className="kv-focus-primary" onClick={() => setStage("learn")}>Show the reasoning →</button>}
        {!choice && !hint && <button className="kv-focus-plain" onClick={() => setHint(true)}>Give me a clue</button>}
        <button className="kv-focus-plain" onClick={onReadFull}>Read full notes</button>
      </div>
    </div>}

    {stage === "learn" && <div className="kv-focus-stage">
      <div className="kv-focus-stagehead"><span className="kv-focus-number">02</span><div><b>Here is the mechanism</b><p>One important idea, not a page of memorization.</p></div></div>
      <div className="kv-focus-answer"><small>THE CORE ANSWER</small><p>{answer || "See the original source and notes for the complete explanation."}</p></div>
      {intuition && <div className="kv-focus-mini"><b>Why it works</b><p>{intuition}</p></div>}
      {trap && <div className="kv-focus-mini trap"><b>The trap to avoid</b><p>{trap}</p></div>}
      <div className="kv-focus-controls"><button className="kv-focus-primary" onClick={() => setStage("recall")}>One quick recall check →</button><button className="kv-focus-plain" onClick={onReadFull}>Open full reference</button></div>
    </div>}

    {stage === "recall" && <div className="kv-focus-stage">
      <div className="kv-focus-stagehead"><span className="kv-focus-number">03</span><div><b>Make it stick</b><p>Without reading above, can you explain the idea in one sentence?</p></div></div>
      <p className="kv-focus-question">What would you remember about {field(object.title) || "this concept"} tomorrow?</p>
      {!hookShown ? <div className="kv-focus-nudge">Take five seconds to think, then reveal the memory hook.</div> :
        <div className="kv-focus-answer"><small>MEMORY HOOK</small><p>{pattern || why || intuition || answer || prompt}</p></div>}
      <div className="kv-focus-controls">
        {!hookShown ? <button className="kv-focus-primary" onClick={() => setHookShown(true)}>Reveal memory hook →</button> :
          <>
            <button disabled={saving} className="kv-focus-primary" onClick={() => void finish(true)}>{saving ? "Saving…" : "I can explain it →"}</button>
            <button disabled={saving} className="kv-focus-plain" onClick={() => void finish(false)}>Need another pass</button>
          </>}
        <button className="kv-focus-plain" onClick={onReadFull}>Full explanation</button>
      </div>
      {message && <p role="alert" className="kv-focus-save-error">{message}</p>}
    </div>}

    {stage === "done" && <div className="kv-focus-stage kv-focus-done">
      <span className="kv-focus-trophy">✦</span>
      <h3>Today's brain rep: done.</h3>
      <p>Your recall rating was saved. {isDoneAlready ? "That's one more concept practiced." : "Come back for another small round when you feel ready."}</p>
      <div className="kv-focus-reward">+10 XP {choice === "good" ? "· +5 first-try bonus" : ""}</div>
      {todayCount >= goal ? <p>Daily target reached. Anything extra is optional.</p> : <p>{goal - todayCount} more mini {goal - todayCount === 1 ? "lesson" : "lessons"} to reach your gentle daily goal.</p>}
      <div className="kv-focus-controls">{onNext && <button className="kv-focus-primary" onClick={onNext}>Next little challenge →</button>}<button className="kv-focus-plain" onClick={onReadFull}>Review full lesson</button></div>
    </div>}

    <footer className="kv-focus-footer">Weeks 1–2: 1 object/day · Weeks 3–4: 2 · Month 2: 3 · Month 3: 4 · After: 5. No penalties for missed days. XP is tracked on this device.</footer>
  </section>;
}
