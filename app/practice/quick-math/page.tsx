"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LiveDateTime from "../../LiveDateTime";
import styles from "./quick-math.module.css";

type MathQuestion = {
  id: string;
  level: number;
  level_name: string;
  category: string;
  subcategory: string;
  difficulty: number;
  difficulty_label?: string | null;
  question_type?: string | null;
  question: string;
  answer: number | string;
  acceptable_answers: string[];
  tolerance: number;
  unit: string;
  time_target_seconds: number;
  xp: number;
  concept: string;
  technique: string;
  solution: string;
  validation_status: string;
};

type LevelMeta = {
  level: number;
  name: string;
  count: number;
  minDifficulty: number;
  maxDifficulty: number;
  categoryCount: number;
};

type DatasetMeta = {
  total: number;
  validated: number;
  levelCount: number;
  categoryCount: number;
  subcategoryCount: number;
  levels: LevelMeta[];
};

type PracticeAttempt = {
  id: string;
  correct: boolean | null;
  at: string;
  response?: string;
  savedResponse?: boolean;
  durationSeconds?: number;
  title?: string;
  category?: string;
  questionType?: string;
};

type RoundResult = { id: string; correct: boolean; seconds: number };

const ATTEMPT_STORE = "capital-forge-canonical-practice-v1";
const EMPTY_META: DatasetMeta = { total: 10000, validated: 10000, levelCount: 44, categoryCount: 44, subcategoryCount: 96, levels: [] };

function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("percentage") || n.includes("margin")) return "%";
  if (n.includes("multiplication")) return "×";
  if (n.includes("division")) return "÷";
  if (n.includes("square root")) return "√";
  if (n.includes("square")) return "x²";
  if (n.includes("cube")) return "x³";
  if (n.includes("fraction")) return "½";
  if (n.includes("ratio")) return ":";
  if (n.includes("average")) return "μ";
  if (n.includes("basis")) return "bp";
  if (n.includes("valuation") || n.includes("enterprise")) return "EV";
  if (n.includes("private equity") || n.includes("moic") || n.includes("irr")) return "PE";
  if (n.includes("debt") || n.includes("leverage") || n.includes("interest")) return "D";
  if (n.includes("banking")) return "IB";
  if (n.includes("trading") || n.includes("markets")) return "↗";
  if (n.includes("extreme") || n.includes("advanced")) return "⚡";
  return "#";
}

function cleanNumeric(value: string) {
  const cleaned = value
    .replace(/,/g, "")
    .replace(/₹|\$|€|£/g, "")
    .replace(/\b(rs|inr|usd|eur|gbp|crore|cr|lakh|million|days?|months?|bps)\b/gi, "")
    .replace(/%/g, "")
    .replace(/[x×]$/i, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizedText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ");
}

function isCorrectAnswer(question: MathQuestion, input: string) {
  const normalized = normalizedText(input);
  const accepted = [question.answer, ...(Array.isArray(question.acceptable_answers) ? question.acceptable_answers : [])]
    .map(normalizedText)
    .filter(Boolean);
  if (accepted.includes(normalized)) return true;

  if (typeof question.answer === "number") {
    const numeric = cleanNumeric(input);
    if (numeric == null) return false;
    return Math.abs(numeric - question.answer) <= Math.max(Number(question.tolerance || 0), 1e-9);
  }

  const answerNumeric = cleanNumeric(String(question.answer));
  const inputNumeric = cleanNumeric(input);
  if (answerNumeric != null && inputNumeric != null) {
    return Math.abs(inputNumeric - answerNumeric) <= Math.max(Number(question.tolerance || 0), 1e-9);
  }
  return false;
}

function displayAnswer(question: MathQuestion) {
  const base = typeof question.answer === "number" ? question.answer.toLocaleString("en-IN", { maximumFractionDigits: 6 }) : String(question.answer);
  return question.unit ? `${base} ${question.unit}` : base;
}

export default function QuickMathPage() {
  const [meta, setMeta] = useState<DatasetMeta>(EMPTY_META);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [difficulty, setDifficulty] = useState(5);
  const [roundSize, setRoundSize] = useState(25);
  const [queue, setQueue] = useState<MathQuestion[]>([]);
  const [position, setPosition] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string; technique: string; solution: string } | null>(null);
  const [phase, setPhase] = useState<"setup" | "active" | "complete">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [roundStartedAt, setRoundStartedAt] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ATTEMPT_STORE);
      if (raw) setAttempts(JSON.parse(raw));
    } catch {}
    void loadMeta();
  }, []);

  useEffect(() => {
    if (phase === "active" && !feedback) requestAnimationFrame(() => inputRef.current?.focus());
  }, [phase, position, feedback]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== "active" || event.key !== "Enter") return;
      event.preventDefault();
      if (feedback) nextQuestion();
      else submitAnswer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function loadMeta() {
    try {
      const res = await fetch("/api/quick-math?action=meta");
      const data = await res.json();
      if (res.ok && data.ok && data.dataset) setMeta(data.dataset);
    } catch {}
  }

  const selectedMeta = useMemo(() => meta.levels.find((x) => x.level === selectedLevel) || null, [meta.levels, selectedLevel]);

  function chooseLevel(level: LevelMeta | null) {
    setSelectedLevel(level?.level || 0);
    if (level) setDifficulty(level.minDifficulty || 1);
  }

  async function startRound() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ action: "round", count: String(roundSize) });
      if (selectedLevel) params.set("level", String(selectedLevel));
      else params.set("difficulty", String(difficulty));
      const res = await fetch(`/api/quick-math?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not load the Quick Math round.");
      const rows = Array.isArray(data.questions) ? data.questions : [];
      if (!rows.length) throw new Error("No canonical questions match this selection.");
      setQueue(rows);
      setPosition(0);
      setInput("");
      setFeedback(null);
      setResults([]);
      setRoundStartedAt(Date.now());
      setQuestionStartedAt(Date.now());
      setPhase("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the Quick Math round.");
    } finally {
      setLoading(false);
    }
  }

  const current = queue[position];

  function persistAttempt(question: MathQuestion, correct: boolean, response: string, seconds: number) {
    const row: PracticeAttempt = {
      id: question.id,
      correct,
      at: new Date().toISOString(),
      response,
      savedResponse: true,
      durationSeconds: seconds,
      title: question.question,
      category: `Quick Math · ${question.level_name}`,
      questionType: "quick_math"
    };
    const next = [...attempts.filter((a) => a.id !== question.id), row];
    setAttempts(next);
    try { localStorage.setItem(ATTEMPT_STORE, JSON.stringify(next)); } catch {}
  }

  function submitAnswer() {
    if (!current || feedback || !input.trim()) return;
    const correct = isCorrectAnswer(current, input);
    const seconds = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
    const result = { id: current.id, correct, seconds };
    setResults((prev) => [...prev, result]);
    persistAttempt(current, correct, input.trim(), seconds);
    setFeedback({ correct, answer: displayAnswer(current), technique: current.technique, solution: current.solution });
  }

  function nextQuestion() {
    if (!current || !feedback) return;
    if (position >= queue.length - 1) {
      setPhase("complete");
      setFeedback(null);
      return;
    }
    setPosition((p) => p + 1);
    setInput("");
    setFeedback(null);
    setQuestionStartedAt(Date.now());
  }

  const quickAttempts = useMemo(() => attempts.filter((a) => a.questionType === "quick_math" || a.category?.startsWith("Quick Math")), [attempts]);
  const lifetimeGraded = quickAttempts.filter((a) => typeof a.correct === "boolean");
  const lifetimeCorrect = lifetimeGraded.filter((a) => a.correct === true).length;
  const lifetimeAccuracy = lifetimeGraded.length ? Math.round((lifetimeCorrect / lifetimeGraded.length) * 100) : 0;
  const lifetimeAvgSeconds = quickAttempts.length ? Math.round(quickAttempts.reduce((n, a) => n + Number(a.durationSeconds || 0), 0) / quickAttempts.length) : 0;

  const roundCorrect = results.filter((x) => x.correct).length;
  const roundAccuracy = results.length ? Math.round((roundCorrect / results.length) * 100) : 0;
  const roundAvgSeconds = results.length ? Math.round(results.reduce((n, x) => n + x.seconds, 0) / results.length) : 0;
  const elapsed = roundStartedAt ? Math.max(0, Math.round((Date.now() - roundStartedAt) / 1000)) : 0;

  return <div className={styles.shell}>
    <header className={styles.header}>
      <button className={styles.brand} onClick={() => window.location.assign("/practice")}><span>CF</span><div><b>Capital Forge</b><small>Quick Mathematics</small></div></button>
      <div className={styles.headerTitle}><b>CANONICAL MENTAL MATH WORKSTATION</b><span>10,000 validated questions · 44 progressive levels · zero calculator dependence</span></div>
      <div className={styles.headerActions}><LiveDateTime compact/><button onClick={() => window.location.assign("/practice")}>← Practice</button><button onClick={() => window.location.assign("/dashboard")}>Dashboard →</button></div>
    </header>

    <main className={styles.main}>
      <section className={styles.hero}>
        <div><p>QUICK MATHEMATICS · CANONICAL DATABASE</p><h1>Make numbers automatic.</h1><span>Your uploaded 10,000-question bank is now the source of truth: raw arithmetic, percentages, roots, valuation, PE/IB math, leverage, IRR intuition, markets, modeling speed and extreme mental calculation.</span></div>
        <div className={styles.heroStats}><div><b>{meta.total.toLocaleString("en-IN")}</b><small>Validated Questions</small></div><div><b>{meta.levelCount}</b><small>Progressive Levels</small></div><div><b>10</b><small>Difficulty Bands</small></div></div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.categories}>
          <div className={styles.sectionHead}><b>Canonical Levels</b><small>{meta.levelCount} levels · {meta.categoryCount} categories</small></div>
          <button className={selectedLevel === 0 ? styles.active : ""} onClick={() => chooseLevel(null)}><i>∞</i><span><b>All Skills Mix</b><small>Random across the full bank at selected difficulty</small></span></button>
          {meta.levels.map((level) => <button key={level.level} className={selectedLevel === level.level ? styles.active : ""} onClick={() => chooseLevel(level)}><i>{iconFor(level.name)}</i><span><b>{level.level}. {level.name}</b><small>{level.count} questions · difficulty {level.minDifficulty}{level.maxDifficulty !== level.minDifficulty ? `–${level.maxDifficulty}` : ""}/10</small></span></button>)}
        </aside>

        <section className={styles.workstation}>
          {phase === "setup" && <div className={styles.setup}>
            <div className={styles.setupTitle}><p>SET UP A CANONICAL ROUND</p><h2>{selectedMeta ? selectedMeta.name : "Choose your intensity"}</h2><span>{selectedMeta ? `${selectedMeta.count} validated questions available in this level.` : "Pick difficulty, then let Capital Forge draw a fresh random round from the full 10,000-question bank."}</span></div>
            {selectedMeta ? <label>Canonical Difficulty <b>{selectedMeta.minDifficulty}{selectedMeta.maxDifficulty !== selectedMeta.minDifficulty ? `–${selectedMeta.maxDifficulty}` : ""}/10</b><small>This level carries its own calibrated difficulty, so no extra filter is applied.</small></label> : <label>Difficulty <b>{difficulty}/10</b><input type="range" min="1" max="10" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}/><small>{difficulty <= 2 ? "Instant / Basic" : difficulty <= 4 ? "Intermediate" : difficulty <= 6 ? "Finance-speed" : difficulty <= 8 ? "Advanced" : "Expert / Extreme"}</small></label>}
            <div className={styles.roundPick}><span>Round length</span><div>{[10,25,50,100].map((n) => <button key={n} className={roundSize === n ? styles.active : ""} onClick={() => setRoundSize(n)}>{n}</button>)}</div></div>
            {error && <div className={`${styles.feedback} ${styles.bad}`}><b>Could not start round</b><span>{error}</span></div>}
            <button className={styles.start} onClick={startRound} disabled={loading}>{loading ? "Loading canonical questions…" : `Start ${roundSize}-Question Sprint →`}</button>
          </div>}

          {phase === "active" && current && <div className={styles.challenge}>
            <div className={styles.challengeTop}><div><span>Level {current.level}: {current.level_name}</span><b>{current.difficulty_label || `Difficulty ${current.difficulty}`}</b></div><strong>{position + 1} / {queue.length}</strong></div>
            <div className={styles.progress}><i style={{ width: `${((position + (feedback ? 1 : 0)) / queue.length) * 100}%` }}/></div>
            <div className={styles.problem}>{current.question}</div>
            <div className={styles.answerRow}><input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} disabled={Boolean(feedback)} placeholder={current.unit ? `Answer in ${current.unit}` : "Type answer"} autoComplete="off" inputMode="decimal"/><button onClick={feedback ? nextQuestion : submitAnswer}>{feedback ? (position === queue.length - 1 ? "Finish" : "Next →") : "Submit"}</button></div>
            {feedback && <div className={`${styles.feedback} ${feedback.correct ? styles.good : styles.bad}`}><b>{feedback.correct ? "✓ Correct" : `✕ Answer: ${feedback.answer}`}</b><span>{feedback.technique}<br/>{feedback.solution}</span></div>}
            <div className={styles.liveStats}><div><small>Accuracy</small><b>{roundAccuracy}%</b></div><div><small>Correct</small><b>{roundCorrect}/{results.length}</b></div><div><small>Avg Response</small><b>{roundAvgSeconds || 0}s</b></div><div><small>Target</small><b>{current.time_target_seconds}s</b></div></div>
            <small className={styles.keyboardHint}>Press Enter to submit · Enter again for next question · every attempt saves automatically to Practice history.</small>
          </div>}

          {phase === "complete" && <div className={styles.complete}><p>ROUND COMPLETE</p><h2>{roundAccuracy}%</h2><strong>{roundCorrect} of {results.length} correct</strong><div><span>Average response<b>{roundAvgSeconds}s</b></span><span>Questions<b>{results.length}</b></span><span>Elapsed<b>{Math.max(1, Math.round(elapsed / 60))}m</b></span></div><button onClick={startRound}>Run Another Round</button><button className={styles.secondary} onClick={() => { setPhase("setup"); setQueue([]); setResults([]); setInput(""); }}>Change Setup</button></div>}
        </section>

        <aside className={styles.rail}>
          <section><p>LIFETIME QUICK MATH</p><div className={styles.bigMetric}><b>{quickAttempts.length.toLocaleString("en-IN")}</b><span>attempts recorded</span></div><div className={styles.metricRow}><span>Accuracy</span><b>{lifetimeAccuracy}%</b></div><div className={styles.metricRow}><span>Avg response</span><b>{lifetimeAvgSeconds}s</b></div><small>Every submitted answer is saved into the same Practice history used by your Dashboard and Reset All History.</small></section>
          <section><p>CANONICAL BANK</p><h3>{meta.validated.toLocaleString("en-IN")} / {meta.total.toLocaleString("en-IN")} validated</h3><span>44 levels progress from number fluency to valuation, PE/IB math, working capital, probability, modeling speed and Extreme / Expert Mode.</span></section>
          <section><p>WHY THIS EXISTS</p><h3>Speed creates spare mental capacity.</h3><span>When numerical operations become automatic, more attention stays available for valuation logic, deal structure, underwriting and judgment.</span></section>
        </aside>
      </div>
    </main>
  </div>;
}
