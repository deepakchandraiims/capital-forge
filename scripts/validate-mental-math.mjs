import assert from "node:assert/strict";
import {
  GYM_SKILLS, TOTAL_GYM_QUESTIONS, TIER_TOTALS,
  generateDrillQuestion, questionForStep, isDrillAnswerCorrect
} from "../lib/mental-math-gym.ts";

assert.equal(TOTAL_GYM_QUESTIONS, 100000);
assert.equal(GYM_SKILLS.reduce((n, x) => n + x.count, 0), TOTAL_GYM_QUESTIONS);
assert.equal(TIER_TOTALS.foundation, 65000);
assert.equal(TIER_TOTALS.intermediate, 25000);
assert.equal(TIER_TOTALS.finance, 10000);

const counted = { foundation: 0, intermediate: 0, finance: 0 };
for (let i = 0; i < TOTAL_GYM_QUESTIONS; i++) {
  const item = generateDrillQuestion(i);
  assert.equal(item.index, i);
  assert.equal(item.id, "MMG-" + String(i + 1).padStart(6, "0"));
  assert.ok(item.prompt.length > 2, "Missing prompt at " + i);
  assert.ok(Number.isFinite(item.answer), "Invalid answer at " + i);
  assert.ok(isDrillAnswerCorrect(item, String(item.answer)), "Answer rejected at " + i);
  assert.ok(!isDrillAnswerCorrect(item, String(item.answer + 1)), "Wrong answer accepted at " + i);
  counted[item.tier]++;
}
assert.deepEqual(counted, TIER_TOTALS);
const balanced = { foundation: 0, intermediate: 0, finance: 0 };
for (let i = 0; i < 200; i++) balanced[questionForStep("balanced", i).tier]++;
assert.deepEqual(balanced, { foundation: 130, intermediate: 50, finance: 20 });
for (let i = 0; i < 1000; i++) {
  assert.equal(questionForStep("foundation", i).tier, "foundation");
  assert.equal(questionForStep("finance", i).tier, "finance");
}
for (const skill of GYM_SKILLS) {
  for (let i = 0; i < 50; i++) assert.equal(questionForStep("focus", i, skill.key).skill, skill.key);
}
assert.equal(questionForStep("mistakes", 0, undefined, [10, 20]).index, 10);
assert.equal(questionForStep("mistakes", 1, undefined, [10, 20]).index, 20);
console.log("PASS: 100,000 deterministic questions, 65/25/10 mix, valid answers, locked drills and mistake review.");
