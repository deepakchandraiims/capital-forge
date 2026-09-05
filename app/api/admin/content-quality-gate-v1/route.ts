import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_SHA256 = "4d7054695a26bdcfebe447d506f0d600af23abeffe516e5f7d52d49493b5b436";
const MANIFEST_SHA256 = "2019cd4fbf0b2b5be3f7477feeaa15c107c8303aebbf20a20431911f7eedff09";
const BATCH_ID = "91b16582-a135-42e8-a11b-374ac6268e17";
const REVIEWER_MODEL = "capital-forge-import-review-v1";

function sha256(value:string){ return createHash("sha256").update(value).digest("hex"); }
function tokenMatches(value:string|null){
  const supplied=(value||"").trim(); if(!supplied) return false;
  const actual=createHash("sha256").update(supplied).digest();
  const expected=Buffer.from(TOKEN_SHA256,"hex");
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
function chunk<T>(items:T[], size:number){ const out:T[][]=[]; for(let i=0;i<items.length;i+=size) out.push(items.slice(i,i+size)); return out; }

export async function POST(request:NextRequest){
  if(!tokenMatches(request.headers.get("x-capital-forge-remediate"))) return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const text=await request.text();
  if(sha256(text)!==MANIFEST_SHA256) return NextResponse.json({ok:false,error:"Quality-review manifest checksum mismatch."},{status:400});
  let manifest:any; try{manifest=JSON.parse(text);}catch{return NextResponse.json({ok:false,error:"Invalid JSON manifest"},{status:400});}
  if(manifest?.batch_id!==BATCH_ID || !Array.isArray(manifest?.records) || manifest.records.length!==605) return NextResponse.json({ok:false,error:"Review manifest contract mismatch"},{status:400});
  const keys=manifest.records.map((r:any)=>r.source_record_key);
  if(new Set(keys).size!==605) return NextResponse.json({ok:false,error:"Review manifest keys are not unique"},{status:400});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return NextResponse.json({ok:false,error:"Supabase server configuration incomplete"},{status:503});
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

  const {data:staging,error:readError}=await supabase.from("cf_content_staging")
    .select("id,source_record_key,content_type,validation_status,deterministic_status,raw_content")
    .eq("import_batch_id",BATCH_ID);
  if(readError) return NextResponse.json({ok:false,stage:"staging_read",error:readError.message},{status:500});
  if((staging||[]).length!==605) return NextResponse.json({ok:false,error:`Expected 605 staging rows; found ${(staging||[]).length}.`},{status:409});
  const byKey=new Map((staging||[]).map((r:any)=>[r.source_record_key,r]));
  const missing=keys.filter((k:string)=>!byKey.has(k));
  if(missing.length) return NextResponse.json({ok:false,error:"Manifest contains keys not found in staging",missing:missing.slice(0,20),missingCount:missing.length},{status:409});

  const structuralBlockers=(staging||[]).filter((r:any)=>r.validation_status!=="validated");
  const calcBlockers=(staging||[]).filter((r:any)=>r.raw_content?.calculation_required===true && r.deterministic_status!=="passed");
  if(structuralBlockers.length || calcBlockers.length){
    return NextResponse.json({
      ok:false,
      error:"Pre-gate checks are not complete. Run structural remediation and 204-object deterministic verification first.",
      structuralBlockers:structuralBlockers.length,
      calculationBlockers:calcBlockers.length,
      structuralSample:structuralBlockers.slice(0,15).map((r:any)=>({key:r.source_record_key,status:r.validation_status})),
      calculationSample:calcBlockers.slice(0,15).map((r:any)=>({key:r.source_record_key,status:r.deterministic_status}))
    },{status:409});
  }

  const {error:deleteError}=await supabase.from("cf_content_reviews").delete().eq("reviewer_model",REVIEWER_MODEL).in("staging_id",(staging||[]).map((r:any)=>r.id));
  if(deleteError) return NextResponse.json({ok:false,stage:"review_cleanup",error:deleteError.message},{status:500});

  const reviewRows=manifest.records.map((rec:any)=>{
    const s:any=byKey.get(rec.source_record_key);
    return {
      staging_id:s.id,
      reviewer_type:"ai_reviewer",
      reviewer_model:REVIEWER_MODEL,
      factual_accuracy:rec.factual_accuracy,
      answer_correctness:rec.answer_correctness,
      clarity:rec.clarity,
      ambiguity_score:rec.ambiguity_score,
      source_quality:rec.source_quality,
      difficulty_accuracy:rec.difficulty_accuracy,
      uniqueness:rec.uniqueness,
      realism:rec.realism,
      educational_value:rec.educational_value,
      overall_score:rec.overall_score,
      verdict:rec.verdict,
      comments:rec.comments
    };
  });
  for(const part of chunk(reviewRows,50)){
    const {error}=await supabase.from("cf_content_reviews").insert(part);
    if(error) return NextResponse.json({ok:false,stage:"review_insert",error:error.message},{status:500});
  }

  let gated=0; const gateErrors:any[]=[];
  for(const s of staging||[]){
    let success=false; let last="";
    for(const params of [{p_staging_id:s.id},{staging_id:s.id},{p_id:s.id}]){
      const {error}=await supabase.rpc("cf_evaluate_publication_gate_v2",params);
      if(!error){success=true;break;}
      last=String(error.message||"");
      if(!/function .* does not exist|Could not find the function|schema cache|parameter/i.test(last)) break;
    }
    if(success) gated++; else gateErrors.push({key:s.source_record_key,error:last});
  }
  if(gateErrors.length) return NextResponse.json({ok:false,stage:"gate",gated,gateErrors:gateErrors.slice(0,20),gateErrorCount:gateErrors.length},{status:500});

  const {data:after,error:afterError}=await supabase.from("cf_content_staging")
    .select("source_record_key,content_type,publication_decision,final_quality_score,validation_status,deterministic_status")
    .eq("import_batch_id",BATCH_ID);
  if(afterError) return NextResponse.json({ok:false,stage:"summary",error:afterError.message},{status:500});
  const decisions:Record<string,number>={}; let totalQuality=0; let qualityN=0;
  for(const r of after||[]){ decisions[String(r.publication_decision)]=(decisions[String(r.publication_decision)]||0)+1; if(typeof r.final_quality_score==="number"){totalQuality+=r.final_quality_score;qualityN++;} }
  return NextResponse.json({
    ok:true,
    batchId:BATCH_ID,
    reviewsInserted:reviewRows.length,
    gated,
    publicationDecisionSummary:decisions,
    avgFinalQuality:qualityN?Number((totalQuality/qualityN).toFixed(2)):null,
    readyToPublish:decisions["ready_to_publish"]||0,
    note:"Qualitative reviews and publication gates completed. No canonical publication has occurred yet."
  });
}
