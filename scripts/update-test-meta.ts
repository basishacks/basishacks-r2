import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const metaPath = resolve(import.meta.dirname, "..", "tests", ".test-meta.json");

try {
    const output = execSync("vitest run --reporter=json --pool=forks", {
        encoding: "utf-8",
        timeout: 120000,
    });
    const lines = output.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    if (lastLine) {
        const result = JSON.parse(lastLine);
        const meta = {
            total: result.numTotalTests ?? 0,
            files: result.numTotalTestSuites ?? 0,
            failed: result.numFailedTests ?? 0,
            generatedAt: new Date().toISOString(),
        };
        writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
        if (meta.failed > 0) {
            console.error(`Tests failed: ${meta.failed} failures`);
            process.exit(1);
        }
        console.log(`Test meta written: ${meta.total} tests, ${meta.files} files`);
    }
} catch (err) {
    console.error("Failed to generate test meta:", err);
    process.exit(1);
}
