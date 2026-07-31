import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineLoader } from "vitepress";

export interface TestData {
    total: number;
    files: number;
    failed: number;
    generatedAt: string;
}

declare const data: TestData;
export { data };

export default defineLoader({
    watch: [resolve(import.meta.dirname, "../../../tests/.test-meta.json")],
    load(): TestData {
        try {
            const metaPath = resolve(import.meta.dirname, "../../../tests/.test-meta.json");
            const raw = readFileSync(metaPath, "utf-8");
            const parsed = JSON.parse(raw);
            return {
                total: parsed.total ?? 0,
                files: parsed.files ?? 0,
                failed: parsed.failed ?? 0,
                generatedAt: parsed.generatedAt ?? new Date().toISOString(),
            };
        } catch {
            return { total: 0, files: 0, failed: 0, generatedAt: new Date().toISOString() };
        }
    },
});
