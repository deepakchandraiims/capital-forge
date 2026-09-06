import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

const fileArg=process.argv.find(x=>x.endsWith(".jsonl"))||"capital_forge_3000_master.jsonl";
const filePath=path.resolve(process.cwd(),fileArg);
const dryRun=process.argv.includes("--dry-run");
const expected={total:3000,categories:25,perCategory:120,unique:2400,variants:600,sourceGrounded:1800,authored:1200};
const universes=new Set(["Technicals","Market History","Legendary Trades & Deals","Crises & Events","Finance Facts"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function slugify(v){return String(v||"").trim().toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function str(v){return typeof v==="string"?v.trim():"";}
function arr(v){return Array.isArray(v)?v:[];}
function normalize(raw,line){
  const key=str(raw.source_record_key||raw.id||raw.record_key);
  const title=str(raw.title||raw.question||raw.prompt||raw.event||raw.name);
  const universe=str(raw.universe||raw.learning_universe);
  const category=str(raw.category);
  const sourceKind=str(raw.source_kind)||(raw.source_grounded===true?"source_grounded":"authored");
  const variant=str(raw.unique_or_variant)||((raw.variant_of||raw.variant_family_id)?"variant":"unique");
  const sourceIds=arr(raw.source_ids).filter(x=>typeof x==="string"&&uuid.test(x));
  const sourceMetadata=raw.source_metadata&&typeof raw.source_metadata==="object"?raw.source_metadata:{sources:arr(raw.sources)};
  return {
    id:raw.id&&uuid.test(String(raw.id))?raw.id:undefined,
    source_record_key:key,
    title,
    universe,
    category,
    category_slug:str(raw.category_slug)||slugify(category),
    topic:str(raw.topic)||null,
    subtopic:str(raw.subtopic)||null,
    difficulty:Number(raw.difficulty||5),
    content_type:str(raw.content_type)||"question",
    question_type:str(raw.question_type)||null,
    prompt:str(raw.prompt||raw.question)||null,
    answer:str(raw.answer||raw.model_answer)||null,
    explanation:str(raw.explanation)||null,
    intuition:str(raw.intuition)||null,
    common_mistake:str(raw.common_mistake)||null,
    why_it_matters:str(raw.why_it_matters)||null,
    pattern_to_remember:str(raw.pattern_to_remember)||null,
    estimated_time_seconds:Number.isFinite(Number(raw.estimated_time_seconds))?Number(raw.estimated_time_seconds):null,
    source_kind:sourceKind,
    source_ids:sourceIds,
    source_metadata:sourceMetadata,
    content:raw.content&&typeof raw.content==="object"?raw.content:raw,
    tags:arr(raw.tags).map(String),
    entities:raw.entities&&typeof raw.entities==="object"?raw.entities:{},
    event_date:str(raw.event_date||raw.date)||null,
    unique_or_variant:variant,
    variant_of:str(raw.variant_of)||null,
    variant_family_id:str(raw.variant_family_id)||null,
    variant_number:Number.isFinite(Number(raw.variant_number))?Number(raw.variant_number):null,
    repetition_type:str(raw.repetition_type)||null,
    quality_score:Number.isFinite(Number(raw.quality_score))?Number(raw.quality_score):null,
    validation_status:str(raw.validation_status)||"canonical",
    status:"published",
    _line:line
  };
}
function validate(row){
  const e=[];
  if(!row.source_record_key)e.push("missing source_record_key");
  if(!row.title)e.push("missing title/question/prompt");
  if(!universes.has(row.universe))e.push(`invalid universe: ${row.universe||"(blank)"}`);
  if(!row.category)e.push("missing category");
  if(!row.category_slug)e.push("missing category_slug");
  if(!Number.isInteger(row.difficulty)||row.difficulty<1||row.difficulty>10)e.push(`difficulty out of range: ${row.difficulty}`);
  if(!row.content_type)e.push("missing content_type");
  if(!["source_grounded","authored"].includes(row.source_kind))e.push(`invalid source_kind: ${row.source_kind}`);
  if(!["unique","variant"].includes(row.unique_or_variant))e.push(`invalid unique_or_variant: ${row.unique_or_variant}`);
  if(row.unique_or_variant==="variant"&&!row.variant_of&&!row.variant_family_id)e.push("variant missing variant_of/variant_family_id");
  if(row.event_date&&!/^\d{4}-\d{2}-\d{2}$/.test(row.event_date))e.push(`event_date must be YYYY-MM-DD: ${row.event_date}`);
  return e;
}

if(!fs.existsSync(filePath)){console.error(`Knowledge Vault import file not found: ${filePath}`);process.exit(2);}
const rows=[];const failures=[];const keys=new Set();
const rl=readline.createInterface({input:fs.createReadStream(filePath,{encoding:"utf8"}),crlfDelay:Infinity});
let lineNo=0;
for await(const line of rl){lineNo+=1;if(!line.trim())continue;let raw;try{raw=JSON.parse(line);}catch(err){failures.push({line:lineNo,error:`malformed JSON: ${err.message}`});continue;}const row=normalize(raw,lineNo);const errors=validate(row);if(keys.has(row.source_record_key))errors.push(`duplicate source_record_key: ${row.source_record_key}`);keys.add(row.source_record_key);if(errors.length)failures.push({line:lineNo,key:row.source_record_key,errors});rows.push(row);}

const categoryCounts=new Map();for(const r of rows)categoryCounts.set(r.category,(categoryCounts.get(r.category)||0)+1);
const summary={Expected:expected.total,Parsed:rows.length,Categories:categoryCounts.size,ObjectsPerCategory:[...categoryCounts.values()].sort((a,b)=>a-b),Unique:rows.filter(r=>r.unique_or_variant==="unique").length,Variants:rows.filter(r=>r.unique_or_variant==="variant").length,SourceGrounded:rows.filter(r=>r.source_kind==="source_grounded").length,Authored:rows.filter(r=>r.source_kind==="authored").length,Failures:failures.length};
const reconciliation=[];
if(rows.length!==expected.total)reconciliation.push(`Expected ${expected.total}, parsed ${rows.length}`);
if(categoryCounts.size!==expected.categories)reconciliation.push(`Expected ${expected.categories} categories, found ${categoryCounts.size}`);
for(const [category,count] of categoryCounts)if(count!==expected.perCategory)reconciliation.push(`${category}: expected ${expected.perCategory}, found ${count}`);
if(summary.Unique!==expected.unique)reconciliation.push(`Expected ${expected.unique} unique objects, found ${summary.Unique}`);
if(summary.Variants!==expected.variants)reconciliation.push(`Expected ${expected.variants} variants, found ${summary.Variants}`);
if(summary.SourceGrounded!==expected.sourceGrounded)reconciliation.push(`Expected ${expected.sourceGrounded} source-grounded, found ${summary.SourceGrounded}`);
if(summary.Authored!==expected.authored)reconciliation.push(`Expected ${expected.authored} authored, found ${summary.Authored}`);
if(failures.length)reconciliation.push(`${failures.length} line-level validation failures`);
console.log(JSON.stringify({file:filePath,dryRun,summary,reconciliation,failures:failures.slice(0,50)},null,2));
if(reconciliation.length){console.error("CF3 reconciliation failed. Nothing was written to Supabase.");process.exit(1);}
if(dryRun){console.log("Dry run passed. Database was not modified.");process.exit(0);}

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");process.exit(2);}
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const payload=rows.map(({_line,...row})=>row);
for(let i=0;i<payload.length;i+=250){const batch=payload.slice(i,i+250);const {error}=await supabase.from("knowledge_objects").upsert(batch,{onConflict:"source_record_key"});if(error){console.error(`Upsert failed at records ${i+1}-${i+batch.length}:`,error.message);process.exit(1);}console.log(`Imported ${Math.min(i+batch.length,payload.length)} / ${payload.length}`);}
const {count,error:countError}=await supabase.from("knowledge_objects").select("id",{count:"exact",head:true}).eq("status","published");if(countError){console.error(countError.message);process.exit(1);}if(count!==expected.total){console.error(`Database reconciliation failed: expected ${expected.total}, found ${count}.`);process.exit(1);}const {data:dbRows,error:dbError}=await supabase.from("knowledge_objects").select("source_record_key,category,unique_or_variant,source_kind,variant_of,variant_family_id,status").eq("status","published").limit(4000);if(dbError){console.error(dbError.message);process.exit(1);}const dbKeys=new Set((dbRows||[]).map(x=>x.source_record_key));const missing=payload.filter(x=>!dbKeys.has(x.source_record_key)).map(x=>x.source_record_key);if(missing.length){console.error("Database is missing imported keys:",missing.slice(0,25));process.exit(1);}console.log(JSON.stringify({status:"READY",Expected:3000,Parsed:3000,Database:count,Categories:25,ObjectsPerCategory:120,Unique:2400,Variants:600,SourceGrounded:1800,Authored:1200,DuplicateSourceRecordKey:0,VariantLineage:"validated",Sources:"preserved",ContentTypes:"stored for shared renderer"},null,2));
