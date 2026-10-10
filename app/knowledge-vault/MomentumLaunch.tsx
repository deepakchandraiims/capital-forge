"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthProfile } from "../AuthProvider";
import { prefetchKVObject } from "./KVClientCache";

type Sample = { id:string;title:string;category:string;topic?:string|null } | null;
type Stored = { startedAt:string;completed:Array<{id:string;day:string}> };
const KEY="capital-forge-kv-momentum-v1";

function dayString() {
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}

export default function MomentumLaunch({sample}:{sample:Sample}) {
  const router=useRouter();
  const profile=useAuthProfile();
  const [state,setState]=useState<Stored|null>(null);
  useEffect(()=>{
    try{
      const raw=localStorage.getItem(KEY);
      if(raw){
        const item=JSON.parse(raw);
        if(item?.startedAt && Array.isArray(item?.completed))setState(item);
      }
    }catch{}
  },[profile?.id]);
  const activeDays=new Set((state?.completed||[]).map(x=>x.day));
  const day=Math.min(90,Math.max(1,activeDays.size+(activeDays.has(dayString())?0:1)));
  const goal=day<=14?1:day<=30?2:day<=60?3:day<=90?4:5;
  const completed=state?new Set(state.completed.filter(x=>x.day===dayString()).map(x=>x.id)).size:0;
  return <section className="kv-momentum-launch">
    <div className="kv-momentum-icon">✦</div>
    <div className="kv-momentum-copy">
      <span>NEW · FOCUS QUEST</span>
      <h2>Make learning feel lighter.</h2>
      <p>Start with one small challenge, a simple explanation and a quick recall check. Your 90-day program builds up gently. No penalties for skipped days.</p>
      <div className="kv-momentum-progress"><span style={{width:String(Math.min(100,completed/goal*100))+"%"}}/></div>
      <small>Active day {day} of 90 · {completed}/{goal} mini lessons today · Accounting, valuation, markets, deals and every Vault universe</small>
    </div>
    <button disabled={!sample} onMouseEnter={()=>{if(sample&&profile?.id)prefetchKVObject(sample.id,profile.id);}}
      onFocus={()=>{if(sample&&profile?.id)prefetchKVObject(sample.id,profile.id);}}
      onClick={()=>{if(sample)router.push("/knowledge-vault/object/"+sample.id);}}>
      Start a 3-minute quest →
    </button>
  </section>;
}
