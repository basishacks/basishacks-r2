import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineLoader } from "vitepress";

export interface PackageVersion {
    name: string;
    version: string;
}

export interface PackageVersionsData {
    dependencies: PackageVersion[];
    devDependencies: PackageVersion[];
    overrides: PackageVersion[];
    generatedAt: string;
}

function parseDependencies(record: Record<string, string> | undefined): PackageVersion[] {
    if (!record) return [];
    return Object.entries(record)
        .map(([name, version]) => ({ name, version }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

declare const data: PackageVersionsData;
export { data };

export default defineLoader({
    watch: [resolve(import.meta.dirname, "../../../package.json")],
    load(): PackageVersionsData {
        const packagePath = resolve(import.meta.dirname, "../../../package.json");
        const raw = readFileSync(packagePath, "utf-8");
        const pkg = JSON.parse(raw) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
            overrides?: Record<string, string>;
        };

        return {
            dependencies: parseDependencies(pkg.dependencies),
            devDependencies: parseDependencies(pkg.devDependencies),
            overrides: parseDependencies(pkg.overrides),
            generatedAt: new Date().toISOString(),
        };
    },
});
