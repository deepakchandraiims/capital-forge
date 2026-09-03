import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const bundlePath = path.join(root, "source.bundle.br");
if (!fs.existsSync(bundlePath)) process.exit(0);
const encoded = fs.readFileSync(bundlePath, "utf8").trim();
const payload = JSON.parse(zlib.brotliDecompressSync(Buffer.from(encoded, "base64")).toString("utf8"));
for (const [relative, content] of Object.entries(payload.files)) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}
console.log(`Capital Forge source materialized: ${Object.keys(payload.files).length} files.`);
