"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthProfile } from "../AuthProvider";

type Lesson = Record<string, any>;
type Stage = "scene" | "flow" | "perspectives" | "remember" | "done";
type Completion = { id: string; day: string };
type Momentum = { startedAt: string; completed: Completion[] };
type Beat = { label: string; text: string; detail?: string };

const STORE = "capital-forge-kv-story-momentum-v1";

function value(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}
function trimThought(input: string, max = 240) {
  if (input.length <= max) return input;
  const leading = input.slice(0, max);
  const stop = Math.max(leading.lastIndexOf(". "), leading.lastIndexOf("; "), leading.lastIndexOf("! "));
  if (stop > max * 0.55) return leading.slice(0, stop + 1);
  return leading.slice(0, leading.lastIndexOf(" ") || max) + "…";
}
function dateKey() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function readProgress(): Momentum {
  try {
    const stored = localStorage.getItem(STORE);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.completed) && parsed.startedAt) return parsed as Momentum;
    }
  } catch {}
  return { startedAt: new Date().toISOString(), completed: [] };
}
function goalForDay(day: number) { return day <= 14 ? 1 : day <= 30 ? 2 : day <= 60 ? 3 : 4; }

function makeStory(object: Lesson) {
  const content = object.content && typeof object.content === "object" ? object.content : {};
  const title = value(object.title) || "this financial idea";
  const subject = value(object.topic) || value(object.category) || "finance";
  const universe = value(object.universe);
  const haystack = (title + " " + subject + " " + value(object.subtopic)).toLowerCase();
  const answer = value(object.answer) || value(content.answer) || value(content.model_answer) || value(content.solution) || value(object.explanation);
  const intuition = value(object.intuition) || value(content.intuition);
  const why = value(object.why_it_matters) || value(content.why_it_matters);
  const trap = value(object.common_mistake) || value(content.common_mistake) || value(content.trap);
  const hook = value(object.pattern_to_remember) || value(content.key_principle) || value(content.pattern_to_remember);
  const genericEnd = why || intuition || hook || answer || "The important part is understanding what changed and why.";
  let location = "Inside the finance team";
  let icon = "🏢";
  let intro = "Imagine you're sitting beside an analyst who's working through " + subject + ". They are not asking you to memorize a definition. You get to watch what the idea changes.";
  let beats: Beat[] = [
    { label: "The situation", text: "The conversation turns to " + title + ".", detail: "This is the starting point. Nothing to answer or calculate yet." },
    { label: "The moving part", text: trimThought(intuition || answer || hook || title, 280), detail: "This is the central mechanism from the lesson." },
    { label: "The effect", text: trimThought(genericEnd, 280), detail: "This is why the idea matters beyond the textbook." }
  ];

  if (/lease account|lease liabilit|lease debt|rent expense|ifrs 16|asc 842/.test(haystack)) {
    location = "A company's finance office"; icon = "🏬";
    intro = "Imagine a company rents a warehouse. Your team is comparing its value with another business. You notice that the rent payments and the lease obligation are being treated differently.";
    beats = [
      {label:"A real obligation",text:"The company uses the warehouse now and owes lease payments over time.",detail:"Leasing can create a liability even though the company does not own the building."},
      {label:"What the analyst adds",text:"Some valuation comparisons include that lease liability alongside other obligations.",detail:"It affects the enterprise-value side of a valuation multiple."},
      {label:"Keep the comparison fair",text:"Check how the earnings measure handles rent and lease expense too.",detail:"Changing the debt side without matching the earnings treatment can mislead the comparison."}
    ];
  } else if (/stock.based compensation|share.based compensation|\bsbc\b/.test(haystack)) {
    location = "A growing company's office"; icon = "🧑‍💻";
    intro = "Imagine a company rewards an engineer with shares instead of paying all of their compensation in cash. The bank balance barely moves today—but existing shareholders may own a smaller slice.";
    beats = [
      {label:"Pay with shares",text:"An employee receives compensation in company equity.",detail:"This can be an expense even when it does not require current cash payment."},
      {label:"Follow the cash",text:"Non-cash stock compensation is often added back in operating cash flow.",detail:"An accounting cash-flow add-back is not the same as a free economic benefit."},
      {label:"Follow the ownership",text:"Issuing shares can dilute existing owners.",detail:"Track dilution and share count; do not ignore the shareholder cost."}
    ];
  } else if (/working capital|receivable|inventory|payable/.test(haystack)) {
    location = "A shop's back office"; icon = "📦";
    intro = "Imagine a business is selling lots of products. Sales look promising, but customers have not paid yet, stock is sitting on shelves and suppliers want their money.";
    beats = [
      {label:"The sale",text:"Revenue can be recognized before cash comes in.",detail:"Profit and money in the bank are not always the same."},
      {label:"The waiting period",text:"Cash can be tied up in receivables and inventory.",detail:"Meanwhile, payment terms with suppliers affect when cash goes out."},
      {label:"The consequence",text:"Working capital changes how much cash is available to run the business.",detail:"Follow changes in receivables, inventory and payables together."}
    ];
  } else if (/depreciat|capital expend|\bcapex\b/.test(haystack)) {
    location = "A factory finance office"; icon = "🏭";
    intro = "Imagine a manufacturer buys an expensive machine. The cash leaves when the machine is purchased, but the machine helps make products for several years.";
    beats = [
      {label:"Buy the machine",text:"The initial purchase is a cash investment.",detail:"Capital expenditure is generally shown in investing cash flows."},
      {label:"Use it over time",text:"Depreciation spreads the asset's accounting cost across its useful life.",detail:"It is generally a non-cash expense in each reporting period."},
      {label:"Read both statements",text:"Earnings and cash flow tell related but different parts of the story.",detail:"Do not confuse a current cash purchase with depreciation expense."}
    ];
  } else if (/discounted cash flow|\bdcf\b|intrinsic valu/.test(haystack)) {
    location = "An investment team's desk"; icon = "📈";
    intro = "Imagine a business could generate cash for years. Your team wants to know what those uncertain future cash flows are worth today—not just how impressive sales look.";
    beats = [
      {label:"Look ahead",text:"Estimate cash that the business may generate over time.",detail:"Revenue and accounting profit are not interchangeable with free cash flow."},
      {label:"Bring cash back to today",text:"Discount future cash flows to reflect time and risk.",detail:"Cash received years from now is not valued the same as cash today."},
      {label:"See the value",text:"The present value of forecast cash flows informs an estimate of business value.",detail:"Assumptions about growth, margins and discount rates matter."}
    ];
  } else if (/leveraged buyout|\blbo\b/.test(haystack)) {
    location = "A private equity deal room"; icon = "🤝";
    intro = "Imagine an investment firm is buying a business using investor equity and borrowed money. You follow what happens to the business's cash—and who gets paid first.";
    beats = [
      {label:"Buy the business",text:"The purchase is funded with a mix of equity and debt.",detail:"The exact mix determines initial leverage and equity at risk."},
      {label:"Operate and repay",text:"Operating cash flow may help cover interest and reduce debt.",detail:"Debt service and financial flexibility are central risks."},
      {label:"What equity keeps",text:"Returns depend on the eventual value, debt remaining and equity invested.",detail:"Leverage can amplify gains and losses."}
    ];
  } else if (/merger|acquisition|\bm&a\b/.test(haystack) || universe === "Legendary Trades & Deals") {
    location = "A deal-team meeting"; icon = "🤝";
    intro = "Imagine you're observing a deal team. There's a proposed transaction on the table. Before looking at a complicated model, you follow who wants what and why it could matter.";
    beats = [
      {label:"The starting point",text:"A buyer and a seller are considering a transaction.",detail:"Look at the companies' motivations and the starting financial position."},
      {label:"The moving pieces",text:trimThought(intuition || answer || "Price, financing and integration shape a deal's economics.",230),detail:"Deal terms, execution and assumptions can all change the outcome."},
      {label:"The consequence",text:trimThought(why || hook || genericEnd,230),detail:"The economic value of a deal depends on what happens after signing, too."}
    ];
  } else if (universe === "Market History" || universe === "Crises & Events") {
    location = "At the markets desk"; icon = "🌍";
    intro = "Imagine you are at a markets desk when the headline flashes: " + title + ". Rather than memorize a date, follow the sequence that explains the reaction.";
    beats = [
      {label:"What happened",text:trimThought(answer || title,235),detail:"This is the documented event or mechanism in the Vault."},
      {label:"Why it unfolded",text:trimThought(intuition || value(content.context) || genericEnd,235),detail:"Look for cause and effect, not a list of dates."},
      {label:"Why we still care",text:trimThought(why || hook || genericEnd,235),detail:"The pattern may help explain other market situations."}
    ];
  } else if (universe === "Finance Facts") {
    location = "The finance history room"; icon = "🏛️";
    intro = "Imagine someone shows you one small piece of financial history: " + title + ". Let's uncover the interesting part, without studying it like an exam.";
    beats = [
      {label:"The discovery",text:trimThought(answer || title,235)},
      {label:"The interesting detail",text:trimThought(intuition || value(content.context) || answer || title,235)},
      {label:"Why it stuck",text:trimThought(why || hook || genericEnd,235)}
    ];
  }

  const lenses = [
    { label: "The big idea", icon: "💡", text: trimThought(intuition || answer || beats[1].text,380) },
    { label: "The easy-to-miss part", icon: "🔍", text: trimThought(trap || beats[2].text,380) },
    { label: "In real life", icon: "🌱", text: trimThought(why || hook || genericEnd,380) }
  ];
  const takeaway = trimThought(hook || intuition || answer || beats[2].text,350);
  return {location,icon,intro,beats,lenses,takeaway,title,category:subject};
}

export default function FocusQuest({
  object,onComplete,onReadFull,onNext
}: {
  object: Lesson;
  onComplete: () => Promise<boolean>;
  onReadFull: () => void;
  onNext?: () => void;
}) {
  const profile=useAuthProfile();
  const story=useMemo(()=>makeStory(object),[object]);
  const [stage,setStage]=useState<Stage>("scene");
  const [opened,setOpened]=useState<number[]>([0]);
  const [lens,setLens]=useState(0);
  const [momentum,setMomentum]=useState<Momentum|null>(null);
  const [saving,setSaving]=useState(false);
  const [awarded,setAwarded]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    if (!profile?.id) return;
    const record=readProgress();
    setMomentum(record);
  },[profile?.id]);
  useEffect(()=>{
    setStage("scene");setOpened([0]);setLens(0);setSaving(false);setAwarded(false);setError("");
  },[object.id]);

  const completedDays=new Set((momentum?.completed||[]).map(x=>x.day));
  const programDay=Math.min(90,Math.max(1,completedDays.size+(completedDays.has(dateKey())?0:1)));
  const goal=goalForDay(programDay);
  const todayCount=momentum ? new Set(momentum.completed.filter(x=>x.day===dateKey()).map(x=>x.id)).size : 0;
  const xp=(momentum?.completed||[]).length*10;
  const steps:Stage[]=["scene","flow","perspectives","remember"];
  const at=steps.indexOf(stage);
  function nextStep(){if(at>=0 && at<steps.length-1)setStage(steps[at+1]);}
  async function finish(){
    if(saving)return;
    setSaving(true);setError("");
    try{
      const ok=await onComplete();
      if(!ok)throw new Error("We couldn't save the lesson yet. Please try once more.");
      const progress=readProgress();
      const newCompletion=!progress.completed.some(x=>x.id===object.id);
      if(newCompletion){
        progress.completed=[...progress.completed,{id:String(object.id),day:dateKey()}].slice(-1500);
        localStorage.setItem(STORE,JSON.stringify(progress));
      }
      setMomentum({...progress});setAwarded(newCompletion);setStage("done");
    }catch(e){
      setError(e instanceof Error?e.message:"Couldn't save the lesson.");
    }finally{setSaving(false);}
  }
  const currentLens=story.lenses[lens];
  return <section className="kv-story" aria-label="Interactive guided story, not a quiz">
    <header className="kv-story-header">
      <div className="kv-story-heading"><span className="kv-story-eyebrow">STORY MODE · ZERO TESTS</span>
        <h2>{story.title}</h2><p>Let's understand it by watching a situation unfold.</p></div>
      <div className="kv-story-stats"><span>Day <b>{programDay}/90</b></span><span>Today <b>{todayCount}/{goal}</b></span><span><b>{xp}</b> XP</span></div>
    </header>
    <div className="kv-story-progress" aria-label="Today's gentle activity goal"><span style={{width:String(Math.min(100,(todayCount/goal)*100))+"%"}}/></div>
    <nav className="kv-story-track" aria-label="Story chapters">
      {["The scene","What happens","Explore it","The takeaway"].map((name,i)=>
        <span key={name} className={at>=i || stage==="done"?"active":""}><small>{i+1}</small>{name}</span>)}
    </nav>

    {stage==="scene" && <div className="kv-story-body">
      <div className="kv-story-scene">
        <div className="kv-story-scene-visual" aria-hidden="true"><div className="kv-story-office">● ● ●<span>{story.icon}</span><small>CAPITAL FORGE · FIELD NOTES</small></div></div>
        <div className="kv-story-scene-copy"><span className="kv-story-scene-label">SCENE 1 · {story.location.toUpperCase()}</span>
          <h3>You're right there.</h3><p>{story.intro}</p>
          <div className="kv-story-nopressure"><span>✦</span><span>Just watch the story. No questions, no wrong answers, no timer.</span></div>
        </div>
      </div>
      <div className="kv-story-actions"><button className="kv-story-primary" onClick={nextStep}>Show me what happens →</button><button className="kv-story-quiet" onClick={onReadFull}>Read the original notes</button></div>
    </div>}

    {stage==="flow" && <div className="kv-story-body">
      <div className="kv-story-sectionhead"><span className="kv-story-chapter">SCENE 2 · FOLLOW THE CHAIN</span><h3>Watch the idea move.</h3><p>Tap any part of the story to see what is happening. You can explore in any order.</p></div>
      <div className="kv-story-flow" role="group" aria-label="Explore three parts of the financial mechanism">
        {story.beats.map((beat,i)=><button type="button" key={beat.label}
          className={opened.includes(i)?"open":""}
          onClick={()=>setOpened(cur=>cur.includes(i)?cur:[...cur,i])}
          aria-expanded={opened.includes(i)}>
          <span className="kv-story-flow-index">{i+1}</span><b>{beat.label}</b><span className="kv-story-flow-arrow">{i<2?"→":"✦"}</span>
        </button>)}
      </div>
      <div className="kv-story-beats">{story.beats.map((beat,i)=>opened.includes(i) &&
        <div className="kv-story-beat" key={beat.label}><span>{String(i+1).padStart(2,"0")}</span><div><b>{beat.label}</b><p>{beat.text}</p>{beat.detail && <small>{beat.detail}</small>}</div></div>)}</div>
      <div className="kv-story-actions"><button className="kv-story-primary" onClick={nextStep}>Let's look closer →</button><button className="kv-story-quiet" onClick={()=>setOpened([0,1,2])}>Open the full chain</button></div>
    </div>}

    {stage==="perspectives" && <div className="kv-story-body">
      <div className="kv-story-sectionhead"><span className="kv-story-chapter">SCENE 3 · CHANGE THE CAMERA ANGLE</span><h3>Same idea, different views.</h3><p>Pick anything you're curious about. These are viewpoints, not answers.</p></div>
      <div className="kv-story-lenses" role="group" aria-label="Choose an explanation lens">
        {story.lenses.map((item,i)=><button key={item.label} type="button" className={lens===i?"active":""}
          onClick={()=>setLens(i)} aria-pressed={lens===i}><span>{item.icon}</span>{item.label}</button>)}
      </div>
      <div className="kv-story-lensview" key={lens}><div className="kv-story-lens-icon" aria-hidden="true">{currentLens.icon}</div><div><small>NOW EXPLORING</small><h4>{currentLens.label}</h4><p>{currentLens.text}</p></div></div>
      <p className="kv-story-whisper">You can change views as often as you like. Nothing here is scored.</p>
      <div className="kv-story-actions"><button className="kv-story-primary" onClick={nextStep}>Give me the one takeaway →</button><button className="kv-story-quiet" onClick={onReadFull}>See detailed explanation</button></div>
    </div>}

    {stage==="remember" && <div className="kv-story-body">
      <div className="kv-story-sectionhead"><span className="kv-story-chapter">FINAL SCENE · THE IDEA TO TAKE AWAY</span><h3>That's the whole story.</h3><p>You don't need to remember every detail. Keep this one useful connection.</p></div>
      <div className="kv-story-takeaway"><span className="kv-story-takeaway-icon" aria-hidden="true">✦</span><b>THE ONE THING</b><p>{story.takeaway}</p></div>
      <div className="kv-story-actions"><button className="kv-story-primary" disabled={saving} onClick={()=>void finish()}>{saving?"Saving your progress…":"Finish this little story →"}</button><button className="kv-story-quiet" onClick={()=>setStage("flow")}>Replay the steps</button></div>
      {error && <p className="kv-focus-save-error" role="alert">{error}</p>}
    </div>}

    {stage==="done" && <div className="kv-story-body kv-story-finale">
      <span className="kv-story-finale-icon" aria-hidden="true">✦</span><h3>You've explored one idea.</h3>
      <p>That counts. No score, no performance pressure. You can leave it here or explore another story.</p>
      <strong>{awarded?"+10 XP · Story explored":"Story revisited · no extra XP"}</strong>
      <p className="kv-story-daily">{todayCount>=goal?"Today's small goal is complete. Anything extra is optional.":String(goal-todayCount)+" little story left to meet today's gentle goal."}</p>
      <div className="kv-story-actions">{onNext && <button className="kv-story-primary" onClick={onNext}>Explore another story →</button>}<button className="kv-story-quiet" onClick={()=>{setStage("scene");setOpened([0]);}}>Watch this one again</button><button className="kv-story-quiet" onClick={onReadFull}>Open reference notes</button></div>
    </div>}
    <footer className="kv-story-footer">Start with one story on active days 1–14. Your goal grows gradually with practice, never just because time passes. Knowledge Vault teaches; Practice tests.</footer>
  </section>;
}
