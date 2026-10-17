/**
 * Mental Math Gym: 100,000 deterministic practice slots.
 * Calculations are derived on demand rather than storing 100,000 database rows.
 * Duplicate numerical expressions are intentional: repetition is the training goal.
 */
export type Tier = "foundation" | "intermediate" | "finance";
export type GymMode = "foundation" | "balanced" | "intermediate" | "finance" | "focus" | "mistakes";

export type Skill = {
  key: string;
  title: string;
  tier: Tier;
  start: number;
  count: number;
};
export type DrillQuestion = {
  id: string;
  index: number;
  skill: string;
  skillName: string;
  tier: Tier;
  prompt: string;
  answer: number;
  suffix: string;
  explanation: string;
};

const DEFINITIONS: Array<Omit<Skill, "start">> = [
  { key: "easy-add", title: "Easy addition", tier: "foundation", count: 16000 },
  { key: "easy-sub", title: "Easy subtraction", tier: "foundation", count: 14000 },
  { key: "tables", title: "Times tables", tier: "foundation", count: 10000 },
  { key: "easy-div", title: "Exact division", tier: "foundation", count: 9000 },
  { key: "tens", title: "Tens and hundreds", tier: "foundation", count: 6000 },
  { key: "double", title: "Double and half", tier: "foundation", count: 4000 },
  { key: "easy-percent", title: "Simple percentages", tier: "foundation", count: 4000 },
  { key: "decimals", title: "Small decimals", tier: "foundation", count: 2000 },
  { key: "mid-add", title: "2–3 digit addition", tier: "intermediate", count: 5000 },
  { key: "mid-sub", title: "2–3 digit subtraction", tier: "intermediate", count: 5000 },
  { key: "mid-mul", title: "Larger multiplication", tier: "intermediate", count: 4000 },
  { key: "mid-div", title: "Larger exact division", tier: "intermediate", count: 3000 },
  { key: "mid-percent", title: "Percentages", tier: "intermediate", count: 4000 },
  { key: "fractions", title: "Fractions of a number", tier: "intermediate", count: 2000 },
  { key: "roots", title: "Squares and square roots", tier: "intermediate", count: 2000 },
  { key: "bps", title: "Basis points", tier: "finance", count: 1500 },
  { key: "margin", title: "EBITDA margins", tier: "finance", count: 1500 },
  { key: "growth", title: "Revenue growth", tier: "finance", count: 1500 },
  { key: "ev", title: "Enterprise value", tier: "finance", count: 1500 },
  { key: "multiple", title: "EV / EBITDA", tier: "finance", count: 1000 },
  { key: "interest", title: "Simple interest", tier: "finance", count: 1000 },
  { key: "returns", title: "Investment returns", tier: "finance", count: 1000 },
  { key: "working-capital", title: "Working capital", tier: "finance", count: 1000 }
];

let boundary = 0;
export const GYM_SKILLS: Skill[] = DEFINITIONS.map((skill) => {
  const result = { ...skill, start: boundary };
  boundary += skill.count;
  return result;
});

export const TOTAL_GYM_QUESTIONS = 100000;
export const TIER_TOTALS: Record<Tier, number> = { foundation: 65000, intermediate: 25000, finance: 10000 };
if (boundary !== TOTAL_GYM_QUESTIONS) throw new Error("Mental Math Gym catalog must have exactly 100,000 slots");

function hash32(value: number): number {
  let x = (value + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}

function rng(seed: number) {
  let x = hash32(seed);
  return (min: number, max: number): number => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return min + ((x >>> 0) % (max - min + 1));
  };
}

function round(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function q(id: number, skill: Skill, prompt: string, answer: number, suffix = "", explanation = ""): DrillQuestion {
  return { id: "MMG-" + String(id + 1).padStart(6, "0"), index: id, skill: skill.key, skillName: skill.title, tier: skill.tier, prompt, answer: round(answer), suffix, explanation: explanation || (prompt + " = " + round(answer) + suffix) };
}

export function generateDrillQuestion(index: number): DrillQuestion {
  if (!Number.isInteger(index) || index < 0 || index >= TOTAL_GYM_QUESTIONS) throw new RangeError("Invalid mental math question index");
  const skill = GYM_SKILLS.find((entry) => index >= entry.start && index < entry.start + entry.count);
  if (!skill) throw new Error("Question has no skill");
  const draw = rng(index + 1);
  const n = (a: number, b: number) => draw(a, b);
  let a: number, b: number, c: number, percent: number;
  switch (skill.key) {
    case "easy-add":
      a = n(0, 99); b = n(0, 99);
      return q(index, skill, a + " + " + b, a + b);
    case "easy-sub":
      a = n(20, 150); b = n(0, a);
      return q(index, skill, a + " − " + b, a - b);
    case "tables":
      a = n(2, 12); b = n(2, 12);
      return q(index, skill, a + " × " + b, a * b);
    case "easy-div":
      a = n(2, 12); b = n(2, 12);
      return q(index, skill, (a * b) + " ÷ " + b, a);
    case "tens":
      a = n(1, 20) * (index % 2 ? 10 : 100);
      b = n(1, 10) * (index % 2 ? 10 : 100);
      return q(index, skill, a + " + " + b, a + b);
    case "double":
      a = n(2, 150);
      return index % 2
        ? q(index, skill, "Half of " + (2 * a), a)
        : q(index, skill, "Double " + a, 2 * a);
    case "easy-percent":
      percent = [5, 10, 20, 25, 50][n(0, 4)];
      a = n(1, 50) * 20;
      return q(index, skill, percent + "% of " + a, a * percent / 100);
    case "decimals":
      a = n(1, 99) / 10; b = n(1, 99) / 10;
      return q(index, skill, a.toFixed(1) + " + " + b.toFixed(1), a + b);
    case "mid-add":
      a = n(100, 999); b = n(50, 899);
      return q(index, skill, a + " + " + b, a + b);
    case "mid-sub":
      a = n(150, 999); b = n(50, a);
      return q(index, skill, a + " − " + b, a - b);
    case "mid-mul":
      a = n(13, 99); b = n(3, 19);
      return q(index, skill, a + " × " + b, a * b);
    case "mid-div":
      a = n(5, 75); b = n(3, 25);
      return q(index, skill, (a * b) + " ÷ " + b, a);
    case "mid-percent":
      percent = [12.5, 15, 17.5, 20, 30, 40][n(0, 5)];
      a = n(2, 100) * 20;
      return q(index, skill, percent + "% of " + a, a * percent / 100);
    case "fractions":
      b = [2, 4, 5, 8][n(0, 3)];
      a = n(1, b - 1); c = n(3, 60) * b;
      return q(index, skill, a + "/" + b + " of " + c, a * c / b);
    case "roots":
      a = n(11, 75);
      return index % 2
        ? q(index, skill, "√" + (a * a), a)
        : q(index, skill, a + "²", a * a);
    case "bps":
      a = n(1, 20) / 2; b = n(1, 16) * 25;
      return q(index, skill, a + "% + " + b + " bps = ?%", a + b / 100, "%");
    case "margin":
      a = n(5, 50) * 10; percent = [10, 15, 20, 25, 30, 40][n(0, 5)];
      b = a * percent / 100;
      return q(index, skill, "Revenue ₹" + a + " cr; EBITDA ₹" + b + " cr. Margin %?", percent, "%");
    case "growth":
      a = n(5, 50) * 10; percent = [5, 10, 15, 20, 25, 30, 40][n(0, 6)];
      b = a * (100 + percent) / 100;
      return q(index, skill, "Revenue ₹" + a + " cr → ₹" + b + " cr. Growth %?", percent, "%");
    case "ev":
      a = n(10, 250) * 10; b = n(1, 35) * 10; c = n(0, 20) * 10;
      return q(index, skill, "Equity ₹" + a + " cr + debt ₹" + b + " cr − cash ₹" + c + " cr. EV (₹ cr)?", a + b - c, " cr");
    case "multiple":
      a = n(5, 80) * 10; b = n(3, 16);
      return q(index, skill, "EV ₹" + (a * b) + " cr; EBITDA ₹" + a + " cr. Multiple (×)?", b, "×");
    case "interest":
      a = n(2, 120) * 10; percent = [5, 6, 8, 10, 12, 15][n(0, 5)];
      return q(index, skill, "₹" + a + " cr debt at " + percent + "% simple interest for one year. Interest (₹ cr)?", a * percent / 100, " cr");
    case "returns":
      a = n(2, 100) * 10; percent = [10, 20, 25, 50, 75, 100][n(0, 5)]; b = a * (100 + percent) / 100;
      return q(index, skill, "Invest ₹" + a + " cr; exit at ₹" + b + " cr. Simple return %?", percent, "%");
    case "working-capital":
      a = n(20, 150) * 10; b = n(1, a / 10) * 10;
      return q(index, skill, "Current assets ₹" + a + " cr − current liabilities ₹" + b + " cr. Working capital (₹ cr)?", a - b, " cr");
    default: throw new Error("Unrecognised math skill");
  }
}

const BALANCED: Tier[] = [
  "foundation", "foundation", "intermediate", "foundation", "foundation",
  "finance", "foundation", "intermediate", "foundation", "foundation",
  "intermediate", "foundation", "foundation", "finance", "foundation",
  "intermediate", "foundation", "foundation", "intermediate", "foundation"
];

// 7,919 is coprime to every skill count and tier size; each full cycle
// visits every position once before wrapping, even when question forms repeat.
function permute(step: number, size: number, salt: number): number {
  return ((step * 7919) + (hash32(salt) % size)) % size;
}
export function questionForStep(mode: GymMode, step: number, focusSkill?: string, mistakes: number[] = []): DrillQuestion {
  const at = Math.max(0, Math.floor(step));
  if (mode === "mistakes" && mistakes.length) return generateDrillQuestion(mistakes[at % mistakes.length]);
  if (mode === "focus" && focusSkill) {
    const skill = GYM_SKILLS.find((x) => x.key === focusSkill) || GYM_SKILLS[0];
    return generateDrillQuestion(skill.start + permute(at, skill.count, skill.start + 1));
  }
  let tier: Tier;
  let within: number;
  if (mode === "balanced") {
    const cycle = at % BALANCED.length;
    tier = BALANCED[cycle];
    const earlier = BALANCED.slice(0, cycle).filter((t) => t === tier).length;
    const inCycle = BALANCED.filter((t) => t === tier).length;
    within = Math.floor(at / BALANCED.length) * inCycle + earlier;
  } else {
    tier = mode === "intermediate" || mode === "finance" ? mode : "foundation";
    within = at;
  }
  const base = tier === "foundation" ? 0 : tier === "intermediate" ? 65000 : 90000;
  const size = TIER_TOTALS[tier];
  return generateDrillQuestion(base + permute(within, size, base + 937));
}

export function isDrillAnswerCorrect(question: DrillQuestion, text: string): boolean {
  const raw = text.trim().replace(/,/g, "").replace(/[₹%×]/g, "").replace(/\b(cr|crore|bps)\b/gi, "").trim();
  if (!raw || raw === "-" || !/^-?\d+(\.\d+)?$/.test(raw)) return false;
  return Math.abs(Number(raw) - question.answer) < 0.005;
}
