# Capital Forge bulk content import

Capital Forge keeps authored training content out of the public GitHub repository. The repository only stores importer code; private JSON manifests and source PDFs must remain local or in private storage.

## Safe import path

1. Parse the source PDF into a normalized staging payload.
2. Review parser QA, taxonomy mapping and duplicate report.
3. Keep the payload outside Git.
4. Run the staging importer with the server-only Supabase service-role key.
5. Run structural/deterministic review gates before canonical publication.

## Staging importer

```bash
npm run import:content -- /absolute/path/to/capital_forge_export_staging_payload.json
```

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The importer is deliberately staging-only. It verifies a complete 605-object payload, ensures domain/topic taxonomy, creates or reuses an import batch, skips existing source keys, inserts in chunks, and attempts the existing batch validator RPC. It never auto-publishes content.

## Security

The repository is public. Never commit the source PDF, normalized manifest, staging payload, or any Supabase secret. `.gitignore` explicitly blocks the standard generated import filenames.
