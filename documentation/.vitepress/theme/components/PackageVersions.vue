<script setup lang="ts">
import { computed, ref } from "vue";
import { data } from "../../data/packageVersions.data.ts";

const search = ref("");

const filteredDependencies = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return data.dependencies;
    return data.dependencies.filter(
        (pkg) => pkg.name.toLowerCase().includes(term) || pkg.version.toLowerCase().includes(term),
    );
});

const filteredDevDependencies = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return data.devDependencies;
    return data.devDependencies.filter(
        (pkg) => pkg.name.toLowerCase().includes(term) || pkg.version.toLowerCase().includes(term),
    );
});

const generatedDate = computed(() => {
    return new Date(data.generatedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
});
</script>

<template>
    <div class="package-versions">
        <div class="package-versions__header">
            <input
                v-model="search"
                type="text"
                placeholder="Filter packages..."
                class="package-versions__search"
            />
            <span class="package-versions__timestamp">Generated at {{ generatedDate }}</span>
        </div>

        <div class="package-versions__grid">
            <div class="package-versions__section">
                <h3 class="package-versions__title">
                    Dependencies
                    <span class="package-versions__count">({{ filteredDependencies.length }})</span>
                </h3>
                <div class="package-versions__table-wrap">
                    <table class="package-versions__table">
                        <thead>
                            <tr>
                                <th>Package</th>
                                <th>Version</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="pkg in filteredDependencies" :key="pkg.name">
                                <td>
                                    <code>{{ pkg.name }}</code>
                                </td>
                                <td>
                                    <code>{{ pkg.version }}</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="package-versions__section">
                <h3 class="package-versions__title">
                    Dev Dependencies
                    <span class="package-versions__count">
                        ({{ filteredDevDependencies.length }})
                    </span>
                </h3>
                <div class="package-versions__table-wrap">
                    <table class="package-versions__table">
                        <thead>
                            <tr>
                                <th>Package</th>
                                <th>Version</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="pkg in filteredDevDependencies" :key="pkg.name">
                                <td>
                                    <code>{{ pkg.name }}</code>
                                </td>
                                <td>
                                    <code>{{ pkg.version }}</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div v-if="data.overrides.length" class="package-versions__overrides">
            <h3 class="package-versions__title">
                Overrides
                <span class="package-versions__count">({{ data.overrides.length }})</span>
            </h3>
            <div class="package-versions__table-wrap">
                <table class="package-versions__table">
                    <thead>
                        <tr>
                            <th>Package</th>
                            <th>Pinned Version</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="pkg in data.overrides" :key="pkg.name">
                            <td>
                                <code>{{ pkg.name }}</code>
                            </td>
                            <td>
                                <code>{{ pkg.version }}</code>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<style scoped>
.package-versions {
    margin-top: 1rem;
}

.package-versions__header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.package-versions__search {
    flex: 1;
    min-width: 12rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 0.5rem;
    background: var(--vp-c-bg-soft);
    color: var(--vp-c-text-1);
    font-family: var(--vp-font-family-mono);
    font-size: 0.875rem;
}

.package-versions__search:focus {
    outline: none;
    border-color: var(--vp-c-brand-1);
}

.package-versions__timestamp {
    font-size: 0.75rem;
    color: var(--vp-c-text-2);
    white-space: nowrap;
}

.package-versions__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: 1.5rem;
}

.package-versions__section {
    min-width: 0;
}

.package-versions__title {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    font-weight: 600;
}

.package-versions__count {
    font-weight: 400;
    color: var(--vp-c-text-2);
}

.package-versions__table-wrap {
    overflow-x: auto;
    border: 1px solid var(--vp-c-divider);
    border-radius: 0.5rem;
}

.package-versions__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.package-versions__table th,
.package-versions__table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--vp-c-divider);
}

.package-versions__table th {
    background: var(--vp-c-bg-soft);
    font-weight: 600;
    color: var(--vp-c-text-1);
}

.package-versions__table tr:last-child td {
    border-bottom: none;
}

.package-versions__table code {
    font-size: 0.8125rem;
}

.package-versions__overrides {
    margin-top: 1.5rem;
}
</style>
