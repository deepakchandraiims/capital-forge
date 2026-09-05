#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function loadSimpleEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

function fail(message, detail) {
  console.error(`\nERROR: ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { file: null, batch: 'CF-FULL-EXPORT-20260905-001', validate: true, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!args.file && !token.startsWith('--')) args.file = token;
    else if (token === '--batch') args.batch = argv[++i];
    else if (token === '--no-validate') args.validate = false;
    else if (token === '--dry-run') args.dryRun = true;
    else fail(`Unknown argument: ${token}`);
  }
  if (!args.file) fail('Usage: npm run import:content -- /absolute/path/to/capital_forge_export_staging_payload.json [--batch NAME] [--no-validate] [--dry-run]');
  return args;
}

function normalizeInput(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.objects)) {
    return parsed.objects.map((o) => ({
      source_type: 'manual',
      source_model: 'capital-forge-authored-export',
      content_type: o.content_type,
      source_record_key: o.source_record_key,
      content_hash: o.content_hash,
      normalized_text: o.normalized_text,
      detected_domain: o.domain,
      detected_topic: o.topic,
      proposed_difficulty: o.difficulty,
      raw_content: o.raw_content,
    }));
  }
  fail('Input JSON must be the staging-payload array or a normalized manifest with an objects array.');
}

async function main() {
  const args = parseArgs(process.argv);
  loadSimpleEnvFile(path.resolve(process.cwd(), '.env.local'));
  loadSimpleEnvFile(path.resolve(process.cwd(), '.env'));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Put them in .env.local or export them in your shell.');

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) fail(`Input file not found: ${filePath}`);
  const rows = normalizeInput(JSON.parse(fs.readFileSync(filePath, 'utf8')));

  if (rows.length !== 605) fail(`Expected exactly 605 parsed objects from the full export; found ${rows.length}. Refusing to import a partial payload.`);
  const uniqueKeys = new Set(rows.map((r) => r.source_record_key));
  if (uniqueKeys.size !== 605) fail(`Expected 605 unique source_record_key values; found ${uniqueKeys.size}.`);

  const contentCounts = rows.reduce((acc, r) => {
    acc[r.content_type] = (acc[r.content_type] || 0) + 1;
    return acc;
  }, {});

  const domainTopicPairs = new Map();
  for (const row of rows) {
    const domain = row.detected_domain || row.raw_content?.domain;
    const topic = row.detected_topic || row.raw_content?.topic;
    if (!domain || !topic) fail(`Missing domain/topic on ${row.source_record_key}`);
    domainTopicPairs.set(`${domain}|||${topic}`, { domain, topic });
  }

  console.log('Capital Forge content import preflight');
  console.log({ file: filePath, batch: args.batch, rows: rows.length, contentCounts, domainTopicPairs: domainTopicPairs.size, dryRun: args.dryRun });
  if (args.dryRun) return;

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  const domainNames = [...new Set([...domainTopicPairs.values()].map((x) => x.domain))].sort();
  const domainRows = domainNames.map((name, idx) => ({
    slug: slugify(name),
    name,
    description: `Capital Forge normalized content domain: ${name}.`,
    sort_order: 100 + idx * 10,
    active: true,
  }));

  const { error: domainInsertError } = await supabase.from('cf_domains').upsert(domainRows, { onConflict: 'slug', ignoreDuplicates: true });
  if (domainInsertError) fail('Unable to ensure cf_domains taxonomy.', domainInsertError.message);

  const { data: domainData, error: domainReadError } = await supabase.from('cf_domains').select('id,slug,name').in('slug', domainRows.map((d) => d.slug));
  if (domainReadError) fail('Unable to read cf_domains taxonomy.', domainReadError.message);

  const domainIdBySlug = new Map((domainData || []).map((d) => [d.slug, d.id]));
  if (domainIdBySlug.size !== domainRows.length) fail(`Expected ${domainRows.length} domains after upsert; resolved ${domainIdBySlug.size}.`);

  const topicRows = [...domainTopicPairs.values()].map(({ domain, topic }) => ({
    domain_id: domainIdBySlug.get(slugify(domain)),
    slug: slugify(topic),
    name: topic,
    description: `Imported from Capital Forge Full Content Export: ${topic}.`,
    difficulty_min: 1,
    difficulty_max: 10,
    active: true,
  }));

  for (const part of chunk(topicRows, 100)) {
    const { error } = await supabase.from('cf_topics').upsert(part, { onConflict: 'domain_id,slug', ignoreDuplicates: true });
    if (error) fail('Unable to ensure cf_topics taxonomy.', error.message);
  }

  let { data: batch, error: batchReadError } = await supabase.from('cf_import_batches').select('id,batch_name,status').eq('batch_name', args.batch).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (batchReadError) fail('Unable to read cf_import_batches.', batchReadError.message);

  if (!batch) {
    const { data, error } = await supabase.from('cf_import_batches').insert({
      batch_name: args.batch,
      source_type: 'json',
      source_model: 'capital-forge-authored-export',
      original_filename: 'capital_forge_full_content_export.pdf',
      status: 'created',
      metadata: {
        source: 'user-provided Capital Forge Full Content Export',
        object_count: 605,
        decision_cases: 105,
        practice_items: 500,
        parser_contract: 'capital-forge-pdf-import-v1',
      },
    }).select('id,batch_name,status').single();
    if (error) fail('Unable to create cf_import_batches row.', error.message);
    batch = data;
  }

  console.log(`Using import batch ${batch.batch_name} (${batch.id})`);

  const existing = new Set();
  for (const part of chunk([...uniqueKeys], 100)) {
    const { data, error } = await supabase.from('cf_content_staging').select('source_record_key').in('source_record_key', part);
    if (error) fail('Unable to check existing staging keys.', error.message);
    for (const row of data || []) existing.add(row.source_record_key);
  }

  const newRows = rows.filter((r) => !existing.has(r.source_record_key)).map((r) => ({
    import_batch_id: batch.id,
    source_type: 'manual',
    source_model: r.source_model || 'capital-forge-authored-export',
    content_type: r.content_type,
    source_record_key: r.source_record_key,
    raw_content: r.raw_content,
    detected_domain: r.detected_domain,
    detected_topic: r.detected_topic,
    proposed_difficulty: r.proposed_difficulty,
    content_hash: r.content_hash,
    normalized_text: r.normalized_text,
  }));

  console.log(`Staging ${newRows.length} new rows; ${existing.size} source keys already exist and will be skipped.`);
  for (const [idx, part] of chunk(newRows, 50).entries()) {
    const { error } = await supabase.from('cf_content_staging').insert(part);
    if (error) fail(`Staging insert failed in chunk ${idx + 1}.`, error.message);
    console.log(`  inserted chunk ${idx + 1}: ${part.length}`);
  }

  const { error: statusError } = await supabase.from('cf_import_batches').update({ status: 'staged' }).eq('id', batch.id);
  if (statusError) console.warn(`Warning: could not update batch status to staged: ${statusError.message}`);

  let validationCalled = false;
  if (args.validate) {
    const variants = [{ p_batch_id: batch.id }, { p_import_batch_id: batch.id }, { batch_id: batch.id }];
    for (const params of variants) {
      const { error } = await supabase.rpc('cf_validate_import_batch', params);
      if (!error) {
        validationCalled = true;
        console.log(`Validation RPC completed using argument ${Object.keys(params)[0]}.`);
        break;
      }
      const message = String(error.message || '');
      const argMismatch = /function .* does not exist|Could not find the function|schema cache|parameter/i.test(message);
      if (!argMismatch) {
        console.warn(`Validation RPC returned: ${message}`);
        break;
      }
    }
    if (!validationCalled) console.warn('Batch was staged successfully, but automatic validation RPC could not be invoked. No rows were published.');
  }

  const { data: stagedRows, error: summaryError } = await supabase.from('cf_content_staging').select('content_type,validation_status,deterministic_status,source_record_key').eq('import_batch_id', batch.id);
  if (summaryError) fail('Unable to read import summary.', summaryError.message);

  const summary = {};
  for (const row of stagedRows || []) {
    const key = `${row.content_type} / ${row.validation_status}`;
    summary[key] = (summary[key] || 0) + 1;
  }

  console.log('\nIMPORT COMPLETE — STAGING ONLY');
  console.log({
    batch: batch.batch_name,
    batchId: batch.id,
    stagedObjects: stagedRows?.length || 0,
    validationCalled,
    statusSummary: summary,
    note: 'Nothing is auto-published. Numerical items remain subject to Capital Forge deterministic verification before publication.',
  });
}

main().catch((error) => fail(error?.message || String(error), error?.stack));
