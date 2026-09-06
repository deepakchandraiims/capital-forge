"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LiveDateTime from "../../LiveDateTime";
import styles from "./quick-math.module.css";

type MathQuestion = {
  id: string;
  category: string;
  prompt: string;
  answer: number;
  tolerance: number;
  explanation: string;
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

type Category = { id: string; name: string; icon: string; description: string };

const ATTEMPT_STORE = "capital-forge-canonical-practice-v1";
const QUESTIONS_PER_CATEGORY = 500;
const TOTAL_DRILLS = 10000;

const CATEGORIES: Category[] = [
  { id: "addition", name: "Addition", icon: "+", description: "Fast multi-digit addition" },
  { id: "subtraction", name: "Subtraction", icon: "−", description: "Difference, negatives & speed" },
  { id: "multiplication", name: "Multiplication", icon: "×", description: "Tables to large products" },
  { id: "division", name: "Division", icon: "÷", description: "Exact quotients at speed" },
  { id: "decimals", name: "Decimals", icon: ".", description: "Decimal arithmetic & precision" },
  { id: "fractions", name: "Fractions", icon: "½", description: "Fraction of a number" },
  { id: "percentages", name: "Percentages", icon: "%", description: "Percent-of, change & reverse" },
  { id: "ratios", name: "Ratios", icon: ":", description: "Proportion and allocation" },
  { id: "averages", name: "Averages", icon: "μ", description: "Mean and missing values" },
  { id: "squares", name: "Squares", icon: "x²", description: "Squares from memory" },
  { id: "cubes", name: "Cubes", icon: "x³", description: "Cubes from memory" },
  { id: "square-roots", name: "Square Roots", icon: "√", description: "Perfect roots instantly" },
  { id: "cube-roots", name: "Cube Roots", icon: "∛", description: "Perfect cube roots" },
  { id: "powers", name: "Powers", icon: "aⁿ", description: "Exponents and powers" },
  { id: "bodmas", name: "BODMAS", icon: "()", description: "Order of operations" },
  { id: "algebra", name: "Algebra Speed", icon: "x", description: "Solve one-step equations" },
  { id: "number-properties", name: "Number Properties", icon: "#", description: "Remainders, factors & multiples" },
  { id: "estimation", name: "Estimation", icon: "≈", description: "Rounding and approximation" },
  { id: "finance-math", name: "Finance Mental Math", icon: "₹", description: "Margins, bps, multiples & growth" },
  { id: "advanced-mix", name: "Advanced Mixed", icon: "⚡", description: "Multi-step mental combinations" }
];

function rng(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function int(r: () => number, min: number, max: number) { return Math.floor(r() * (max - min + 1)) + min; }
function round(n: number, places = 2) { const p = 10 ** places; return Math.round(n * p) / p; }
function fmt(n: number) { return Number.isInteger(n) ? n.toLocaleString("en-IN") : round(n, 2).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function cleanNumber(value: string) { return Number(value.replace(/,/g, "").replace(/%/g, "").trim()); }
function rangeForDifficulty(d: number) {
  if (d <= 2) return 50;
  if (d <= 4) return 250;
  if (d <= 6) return 1000;
  if (d <= 8) return 5000;
  return 25000;
}

function buildQuestion(categoryId: string, index: number, difficulty: number): MathQuestion {
  const catIndex = Math.max(0, CATEGORIES.findIndex((c) => c.id === categoryId));
  const r = rng((catIndex + 1) * 1000003 + index * 9176 + difficulty * 7919);
  const max = rangeForDifficulty(difficulty);
  const id = `QM-${String(catIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(4, "0")}`;
  let prompt = ""; let answer = 0; let tolerance = 0.001; let explanation = "";

  switch (categoryId) {
    case "addition": {
      const terms = difficulty >= 7 ? 4 : difficulty >= 4 ? 3 : 2;
      const nums = Array.from({ length: terms }, () => int(r, Math.max(2, Math.floor(max / 20)), max));
      answer = nums.reduce((a, b) => a + b, 0); prompt = nums.map(fmt).join(" + "); explanation = `Add the ${terms} terms efficiently by pairing round numbers.`; break;
    }
    case "subtraction": {
      const a = int(r, Math.max(20, Math.floor(max / 2)), max * 2); const b = int(r, 1, difficulty >= 7 ? max * 2 : a);
      answer = a - b; prompt = `${fmt(a)} − ${fmt(b)}`; explanation = "Subtract using compensation: move to a nearby round number, then adjust."; break;
    }
    case "multiplication": {
      const aMax = difficulty <= 3 ? 20 : difficulty <= 6 ? 99 : difficulty <= 8 ? 250 : 999;
      const bMax = difficulty <= 3 ? 12 : difficulty <= 6 ? 40 : difficulty <= 8 ? 99 : 125;
      const a = int(r, 2, aMax); const b = int(r, 2, bMax); answer = a * b; prompt = `${fmt(a)} × ${fmt(b)}`; explanation = "Break one factor into friendly chunks and distribute."; break;
    }
    case "division": {
      const divisor = int(r, 2, difficulty <= 4 ? 12 : difficulty <= 7 ? 25 : 60); const quotient = int(r, 2, difficulty <= 4 ? 30 : difficulty <= 7 ? 120 : 500);
      const dividend = divisor * quotient; answer = quotient; prompt = `${fmt(dividend)} ÷ ${fmt(divisor)}`; explanation = "Recognize the factor pair instead of long division."; break;
    }
    case "decimals": {
      const scale = difficulty <= 4 ? 10 : 100; const a = int(r, 10, max) / scale; const b = int(r, 10, max) / scale; const plus = r() > .45;
      answer = plus ? a + b : a - b; prompt = `${fmt(a)} ${plus ? "+" : "−"} ${fmt(b)}`; tolerance = .005; explanation = "Align decimal places, operate on integers, then restore the scale."; break;
    }
    case "fractions": {
      const denoms = [2,3,4,5,6,8,10,12,16,20]; const den = denoms[int(r, 0, Math.min(denoms.length - 1, 3 + difficulty))]; const num = int(r, 1, den - 1); const unit = int(r, 2, difficulty <= 5 ? 40 : 150); const base = den * unit;
      answer = num * unit; prompt = `${num}/${den} of ${fmt(base)}`; explanation = `Find 1/${den} first, then multiply by ${num}.`; break;
    }
    case "percentages": {
      const ps = difficulty <= 3 ? [10,20,25,50] : difficulty <= 6 ? [5,12.5,15,20,25,30,40,60,75] : [2.5,7.5,12.5,17.5,22.5,35,62.5,87.5]; const p = ps[int(r,0,ps.length-1)]; const base = int(r, 4, difficulty <= 5 ? 200 : 1200) * 4;
      answer = round(base * p / 100, 2); prompt = `${p}% of ${fmt(base)}`; tolerance = .01; explanation = "Decompose the percentage into 10%, 5%, 2.5%, 25% or 50% building blocks."; break;
    }
    case "ratios": {
      const a = int(r,1,difficulty <= 5 ? 8 : 15); const b = int(r,1,difficulty <= 5 ? 8 : 15); const k = int(r,3,difficulty <= 5 ? 40 : 120); const total = (a+b)*k;
      answer = a*k; prompt = `Split ${fmt(total)} in the ratio ${a}:${b}. What is the first share?`; explanation = `Each ratio unit is ${fmt(total)} ÷ ${a+b} = ${k}.`; break;
    }
    case "averages": {
      const count = difficulty <= 4 ? 3 : difficulty <= 7 ? 4 : 5; const avg = int(r,5,difficulty <= 5 ? 60 : 250); const offsets = Array.from({length:count-1},()=>int(r,-Math.min(avg-1,20),20)); const lastOffset = -offsets.reduce((a,b)=>a+b,0); const nums = [...offsets,lastOffset].map((x)=>avg+x);
      answer = avg; prompt = `Average of ${nums.map(fmt).join(", ")}`; explanation = "Use deviations from a convenient center rather than summing mechanically."; break;
    }
    case "squares": {
      const n = int(r,2,difficulty <= 3 ? 20 : difficulty <= 6 ? 50 : difficulty <= 8 ? 100 : 250); answer = n*n; prompt = `${n}²`; explanation = "Use (a±b)² around a nearby round base when direct recall is slower."; break;
    }
    case "cubes": {
      const n = int(r,2,difficulty <= 4 ? 12 : difficulty <= 7 ? 20 : 35); answer = n*n*n; prompt = `${n}³`; explanation = "Recall common cubes; for larger values use n² × n."; break;
    }
    case "square-roots": {
      const n = int(r,2,difficulty <= 4 ? 20 : difficulty <= 7 ? 60 : 150); const sq = n*n; answer = n; prompt = `√${fmt(sq)}`; explanation = `Recognize ${fmt(sq)} as ${n}².`; break;
    }
    case "cube-roots": {
      const n = int(r,2,difficulty <= 5 ? 12 : 25); const cube = n*n*n; answer = n; prompt = `∛${fmt(cube)}`; explanation = `Recognize ${fmt(cube)} as ${n}³.`; break;
    }
    case "powers": {
      const exp = int(r,2,difficulty <= 4 ? 3 : 5); const base = int(r,2,difficulty <= 4 ? 9 : difficulty <= 7 ? 12 : 18); answer = base ** exp; prompt = `${base}^${exp}`; explanation = "Build powers sequentially and reuse known squares/cubes."; break;
    }
    case "bodmas": {
      const a=int(r,2,30+difficulty*3), b=int(r,2,20+difficulty*2), c=int(r,2,12+difficulty), d=int(r,1,30+difficulty*3); answer=(a+b)*c-d; prompt=`(${a} + ${b}) × ${c} − ${d}`; explanation="Resolve brackets first, then multiplication, then subtraction."; break;
    }
    case "algebra": {
      const x=int(r,2,difficulty <= 5 ? 50 : 250), scale=int(r,2,difficulty <= 5 ? 8 : 20), add=int(r,1,difficulty <= 5 ? 20 : 70); const rhs=x+add; answer=x*scale; prompt=`x ÷ ${scale} + ${add} = ${rhs}. Find x.`; explanation=`Subtract ${add}, then multiply by ${scale}.`; break;
    }
    case "number-properties": {
      if (r()>.5) { const d=int(r,3,20+difficulty*2), q=int(r,4,80+difficulty*10), rem=int(r,0,d-1), n=d*q+rem; answer=rem; prompt=`Remainder when ${fmt(n)} is divided by ${d}`; explanation="Use the nearest lower multiple of the divisor."; }
      else { const a=int(r,2,10+difficulty), b=int(r,2,10+difficulty); answer=a*b; prompt=`LCM of ${a} and ${a*b}`; explanation="When one number is a multiple of the other, the larger number is the LCM."; } break;
    }
    case "estimation": {
      const places = difficulty <= 4 ? 10 : difficulty <= 7 ? 100 : 1000; const n=int(r,places,places*100); answer=Math.round(n/places)*places; prompt=`Round ${fmt(n)} to the nearest ${fmt(places)}`; explanation="Check the digit immediately to the right of the rounding place."; break;
    }
    case "finance-math": {
      const mode=int(r,0,2);
      if(mode===0){const revenue=int(r,20,500)*10; const margin=[5,10,12.5,15,20,25,30,35][int(r,0,7)]; const ebitda=revenue*margin/100; answer=margin; prompt=`Revenue ${fmt(revenue)}, EBITDA ${fmt(ebitda)}. EBITDA margin %?`; explanation="Margin = EBITDA ÷ Revenue × 100.";}
      else if(mode===1){const notional=int(r,10,500)*10; const bps=[25,50,75,100,125,150,200][int(r,0,6)]; answer=round(notional*bps/10000,2); prompt=`${bps} bps of ${fmt(notional)}`; explanation="100 bps = 1%; divide bps by 10,000 and multiply by the base.";}
      else{const ebitda=int(r,10,200); const mult=[6,7,8,9,10,12,15,18][int(r,0,7)]; answer=ebitda*mult; prompt=`EBITDA ${fmt(ebitda)} at ${mult}× EV/EBITDA = Enterprise Value?`; explanation="Enterprise value = EBITDA × valuation multiple.";} break;
    }
    default: {
      const base = int(r,40,difficulty <= 5 ? 400 : 1200); const p=[10,12.5,15,20,25,30][int(r,0,5)]; const d=int(r,2,12); const extra=int(r,5,70); answer=round(base*p/100 + extra/d,2); prompt=`${p}% of ${fmt(base)} + ${extra} ÷ ${d}`; tolerance=.01; explanation="Do the percentage and division separately, then combine the results.";
    }
  }
  return { id, category: CATEGORIES[catIndex]?.name || "Advanced Mixed", prompt, answer: round(answer, 4), tolerance, explanation };
}

export default function QuickMathPage() {
  const [categoryId, setCategoryId] = useState("advanced-mix");
  const [difficulty, setDifficulty] = useState(5);
  const [roundSize, setRoundSize] = useState(25);
  const [queue, setQueue] = useState<MathQuestion[]>([]);
  const [position, setPosition] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [questionAt, setQuestionAt] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [history, setHistory] = useState<PracticeAttempt[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = queue.length > 0 && position < queue.length;
  const complete = queue.length > 0 && position >= queue.length;
  const current = active ? queue[position] : null;
  const attempted = position + (checked && active ? 1 : 0);
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ATTEMPT_STORE);
      const rows = raw ? JSON.parse(raw) : [];
      if (Array.isArray(rows)) setHistory(rows.filter((x: PracticeAttempt) => x.questionType === "Quick Mathematics"));
    } catch {}
  }, []);
  useEffect(() => { if (active && !checked) window.setTimeout(() => inputRef.current?.focus(), 20); }, [active, checked, position]);

  const lifetime = useMemo(() => {
    const graded = history.filter((x) => typeof x.correct === "boolean");
    const right = graded.filter((x) => x.correct).length;
    const avg = graded.length ? history.reduce((n,x)=>n+Number(x.durationSeconds||0),0)/graded.length : 0;
    return { attempts: history.length, accuracy: graded.length ? Math.round(right/graded.length*100) : 0, avg: round(avg,1) };
  }, [history]);

  function startRound() {
    const selected = categoryId === "mixed" ? CATEGORIES : CATEGORIES.filter((c) => c.id === categoryId);
    const next = Array.from({ length: roundSize }, (_, i) => {
      const cat = selected[i % selected.length];
      const index = Math.floor(Math.random() * QUESTIONS_PER_CATEGORY);
      return buildQuestion(cat.id, index, difficulty);
    }).sort(() => Math.random() - .5);
    setQueue(next); setPosition(0); setInput(""); setChecked(false); setCorrect(0); setStreak(0); setBestStreak(0); setStartedAt(Date.now()); setQuestionAt(Date.now());
  }

  function persist(q: MathQuestion, isCorrect: boolean, response: string, durationSeconds: number) {
    const event: PracticeAttempt = { id: `${q.id}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, correct: isCorrect, at: new Date().toISOString(), response, savedResponse: true, durationSeconds, title: `${q.prompt} = ${fmt(q.answer)}`, category: `Quick Math · ${q.category}`, questionType: "Quick Mathematics" };
    let all: PracticeAttempt[] = [];
    try { const raw=localStorage.getItem(ATTEMPT_STORE); const parsed=raw?JSON.parse(raw):[]; if(Array.isArray(parsed)) all=parsed; } catch {}
    all.push(event);
    try { localStorage.setItem(ATTEMPT_STORE, JSON.stringify(all)); } catch {}
    setHistory((prev)=>[...prev,event]);
  }

  function checkAnswer() {
    if (!current || checked) return;
    const value = cleanNumber(input);
    if (!Number.isFinite(value)) return;
    const ok = Math.abs(value - current.answer) <= current.tolerance;
    const duration = Math.max(.1, (Date.now() - questionAt) / 1000);
    setLastCorrect(ok); setChecked(true);
    if (ok) { setCorrect((x)=>x+1); setStreak((x)=>{const n=x+1; setBestStreak((b)=>Math.max(b,n)); return n;}); } else setStreak(0);
    persist(current, ok, input, duration);
  }

  function nextQuestion() {
    if (!checked) return checkAnswer();
    const next = position + 1;
    setPosition(next); setInput(""); setChecked(false); setQuestionAt(Date.now());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === "Enter") { e.preventDefault(); checked ? nextQuestion() : checkAnswer(); } }

  return <div className={styles.shell}>
    <header className={styles.header}>
      <button className={styles.brand} onClick={()=>window.location.assign("/practice")}><span>CF</span><div><b>Capital Forge</b><small>Quick Mathematics</small></div></button>
      <div className={styles.headerTitle}><b>MENTAL MATH WORKSTATION</b><span>10,000 deterministic drills · instant feedback · speed tracking</span></div>
      <div className={styles.headerActions}><LiveDateTime compact/><button onClick={()=>window.location.assign("/practice")}>← Practice</button><button onClick={()=>window.location.assign("/dashboard")}>Dashboard →</button></div>
    </header>

    <main className={styles.main}>
      <section className={styles.hero}>
        <div><p>QUICK MATHEMATICS</p><h1>Make arithmetic automatic.</h1><span>Add, subtract, divide, percentages, roots, powers, BODMAS, finance mental math and advanced mixed drills — built for speed, accuracy and mental endurance.</span></div>
        <div className={styles.heroStats}><div><b>{TOTAL_DRILLS.toLocaleString("en-IN")}+</b><small>Drill Universe</small></div><div><b>20</b><small>Skill Families</small></div><div><b>10</b><small>Difficulty Levels</small></div></div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.categories}>
          <div className={styles.sectionHead}><b>Skill Families</b><small>500 seeded drills each</small></div>
          <button className={categoryId === "mixed" ? styles.active : ""} onClick={()=>setCategoryId("mixed")}><i>∞</i><span><b>All Skills Mix</b><small>Full brain workout</small></span></button>
          {CATEGORIES.map((c)=><button key={c.id} className={categoryId===c.id?styles.active:""} onClick={()=>setCategoryId(c.id)}><i>{c.icon}</i><span><b>{c.name}</b><small>{c.description}</small></span></button>)}
        </aside>

        <section className={styles.workstation}>
          {!active && !complete && <div className={styles.setup}>
            <div className={styles.setupTitle}><p>SET UP A ROUND</p><h2>Choose your intensity</h2><span>Start comfortable, then push difficulty until accuracy begins to break.</span></div>
            <label>Difficulty <b>{difficulty}/10</b><input type="range" min="1" max="10" value={difficulty} onChange={(e)=>setDifficulty(Number(e.target.value))}/><small>{difficulty<=2?"Warm-up":difficulty<=4?"Foundation speed":difficulty<=6?"Intermediate":difficulty<=8?"Hard mental math":"Extreme / pressure mode"}</small></label>
            <div className={styles.roundPick}><span>Round length</span><div>{[10,25,50,100].map((n)=><button key={n} className={roundSize===n?styles.active:""} onClick={()=>setRoundSize(n)}>{n}</button>)}</div></div>
            <button className={styles.start} onClick={startRound}>Start {roundSize}-Drill Sprint →</button>
          </div>}

          {active && current && <div className={styles.challenge}>
            <div className={styles.challengeTop}><div><span>{current.category}</span><b>Difficulty {difficulty}/10</b></div><strong>{position+1} / {queue.length}</strong></div>
            <div className={styles.progress}><i style={{width:`${(position/queue.length)*100}%`}}/></div>
            <div className={styles.problem}>{current.prompt}</div>
            <div className={styles.answerRow}><input ref={inputRef} inputMode="decimal" autoComplete="off" value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={onKeyDown} disabled={checked} placeholder="Type answer"/><button onClick={checked?nextQuestion:checkAnswer}>{checked ? (position+1===queue.length?"Finish →":"Next →") : "Check ↵"}</button></div>
            {checked && <div className={`${styles.feedback} ${lastCorrect?styles.good:styles.bad}`}><b>{lastCorrect?"Correct":"Not quite"} · {fmt(current.answer)}</b><span>{current.explanation}</span></div>}
            <div className={styles.liveStats}><div><small>Accuracy</small><b>{accuracy}%</b></div><div><small>Correct</small><b>{correct}</b></div><div><small>Current Streak</small><b>{streak}</b></div><div><small>Best Streak</small><b>{bestStreak}</b></div></div>
            <small className={styles.keyboardHint}>Keyboard: type your answer → Enter to check → Enter again for next.</small>
          </div>}

          {complete && <div className={styles.complete}>
            <p>ROUND COMPLETE</p><h2>{correct} / {queue.length}</h2><strong>{Math.round(correct/Math.max(1,queue.length)*100)}% accuracy</strong>
            <div><span>Best streak <b>{bestStreak}</b></span><span>Elapsed <b>{Math.max(1,Math.round((Date.now()-startedAt)/1000))}s</b></span><span>Difficulty <b>{difficulty}/10</b></span></div>
            <button onClick={startRound}>Run Another Sprint</button><button className={styles.secondary} onClick={()=>{setQueue([]);setPosition(0);}}>Change Setup</button>
          </div>}
        </section>

        <aside className={styles.rail}>
          <section><p>LIFETIME QUICK MATH</p><div className={styles.bigMetric}><b>{lifetime.attempts}</b><span>attempts recorded</span></div><div className={styles.metricRow}><span>Accuracy</span><b>{lifetime.accuracy}%</b></div><div className={styles.metricRow}><span>Avg response</span><b>{lifetime.avg}s</b></div><small>Every answer is written into your existing Practice history, so Dashboard and Reset All History stay connected.</small></section>
          <section><p>WHY THIS EXISTS</p><h3>Speed creates spare mental capacity.</h3><span>When basic arithmetic becomes automatic, you can spend more attention on valuation logic, deal structure, underwriting and judgment instead of calculation friction.</span></section>
          <section><p>FINANCE TRANSFER</p><ul><li>Margins & growth rates</li><li>Multiples & EV bridges</li><li>Basis points & yields</li><li>Ownership & dilution</li><li>Quick sensitivity checks</li></ul></section>
        </aside>
      </div>
    </main>
  </div>;
}
