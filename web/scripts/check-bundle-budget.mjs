import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const budgetBytes = 220 * 1024;
const distDirectory = resolve(process.cwd(), "dist");
const html = readFileSync(resolve(distDirectory, "index.html"), "utf8");
const initialScripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);

if (initialScripts.length === 0) {
    throw new Error("Bundle budget check could not find an initial JavaScript chunk in dist/index.html");
}

const measurements = initialScripts.map(source => {
    const file = resolve(distDirectory, source.replace(/^\//, ""));
    const content = readFileSync(file);
    return { source, rawBytes: content.byteLength, gzipBytes: gzipSync(content).byteLength };
});
const initialGzipBytes = measurements.reduce((total, item) => total + item.gzipBytes, 0);

for (const item of measurements) {
    console.log(`Initial JS ${item.source}: ${(item.rawBytes / 1024).toFixed(2)} KiB raw, ${(item.gzipBytes / 1024).toFixed(2)} KiB gzip`);
}
console.log(`Initial JS budget: ${(initialGzipBytes / 1024).toFixed(2)} / ${budgetBytes / 1024} KiB gzip`);

if (initialGzipBytes > budgetBytes) {
    throw new Error(`Initial JavaScript exceeds the ${budgetBytes / 1024} KiB gzip budget`);
}
