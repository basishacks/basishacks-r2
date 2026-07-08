import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

function findVueFiles(dir: string): string[] {
    const entries = readdirSync(dir);
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = resolve(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            files.push(...findVueFiles(fullPath));
        } else if (fullPath.endsWith(".vue")) {
            files.push(fullPath);
        }
    }

    return files;
}

const vueFiles = findVueFiles(resolve(import.meta.dirname, "..", "..", "app"));

describe("useAPIUser enforcement", () => {
    it("does not fetch GetUserResponse directly from any Vue file", () => {
        for (const file of vueFiles) {
            const source = readFileSync(file, "utf-8");
            expect(source, file).not.toContain("useFetch<GetUserResponse>");
        }
    });

    it("keeps the only direct GetUserResponse fetch inside useAPIUser.ts", () => {
        const composableSource = readFileSync(
            resolve(import.meta.dirname, "..", "..", "app", "composables", "useAPIUser.ts"),
            "utf-8",
        );
        expect(composableSource).toContain("useFetch<GetUserResponse>");
    });
});
