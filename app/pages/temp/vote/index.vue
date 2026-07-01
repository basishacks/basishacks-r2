<script setup lang="ts">
import type { ComponentPublicInstance, Ref } from "vue";
import { nextTick, onMounted, onUnmounted } from "vue";
import { hasPermission, VotePermissions } from "~~/shared/permissions";

definePageMeta({
    layout: "default",
    middleware: ["auth"],
});

useHead({
    title: "Vote",
});

type Candidate = ElectionCandidate & { rank: number[] };
type Position = ElectionPosition & { candidates: Candidate[] };

const { user: me } = await useApiUser();
if (
    !hasPermission(me.value?.role, VotePermissions.VOTE) &&
    !hasPermission(me.value?.role, "admin")
) {
    throw await navigateTo("/");
}

const { data, error } = await useFetch<ElectionPosition[]>("/api/election/candidates");
if (error.value) {
    throw error.value;
}

const positions = ref<Position[]>(
    data.value?.map((pos) => ({
        ...pos,
        candidates: pos.candidates.map((c) => ({ ...c, rank: [] as number[] })),
    })) ?? [],
);

type PinInputInstance = ComponentPublicInstance & {
    inputsRef: Ref<ComponentPublicInstance[]>;
};

const pinRefs = ref<Record<string, PinInputInstance | null>>({});

function setPinRef(el: unknown, id: string) {
    if (el) {
        pinRefs.value[id] = el as PinInputInstance;
    } else {
        delete pinRefs.value[id];
    }
}

const candidateIds = computed(() => positions.value.flatMap((p) => p.candidates.map((c) => c.id)));

function focusPin(id: string) {
    const pin = pinRefs.value[id];
    const inputEl = pin?.inputsRef?.value?.[0];
    if (!inputEl) return;
    const el = (inputEl as any).$el ?? inputEl;
    if (el && typeof el.focus === "function") {
        el.focus();
    }
}

function onPinKeydown(event: KeyboardEvent, candidate: Candidate) {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        const ids = candidateIds.value;
        const idx = ids.indexOf(candidate.id);
        const nextId = ids[idx + 1];
        if (nextId) focusPin(nextId);
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const ids = candidateIds.value;
        const idx = ids.indexOf(candidate.id);
        const prevId = ids[idx - 1];
        if (prevId) focusPin(prevId);
    }
}

function onComplete(candidate: Candidate) {
    const ids = candidateIds.value;
    const idx = ids.indexOf(candidate.id);
    const nextId = ids[idx + 1];
    if (nextId) focusPin(nextId);
}

const abstainedCandidates = ref<Set<string>>(new Set());
const invalidCandidates = ref<Set<string>>(new Set());
const invalidPositions = ref<Set<string>>(new Set());
const checked = ref(false);
const isSubmitting = ref(false);
const toast = useToast();

const { data: resultData, refresh: refreshResults } =
    await useFetch<ElectionResult>("/api/election/vote");

const showResults = ref(false);

const candidateNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const pos of positions.value) {
        for (const c of pos.candidates) {
            map.set(c.id, c.shortName);
        }
    }
    return map;
});

const resultByTitle = computed(() => {
    const map = new Map<string, ElectionResult["positions"][number]>();
    resultData.value?.positions.forEach((p) => map.set(p.title, p));
    return map;
});

const hasErrors = computed(
    () => invalidCandidates.value.size > 0 || invalidPositions.value.size > 0,
);

function handleGlobalKey(event: KeyboardEvent) {
    if (event.key === "x" || event.key === "X") {
        if (checked.value && !hasErrors.value) {
            submit();
        } else {
            check();
        }
    }
}

onMounted(() => {
    window.addEventListener("keydown", handleGlobalKey);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleGlobalKey);
});

function check() {
    abstainedCandidates.value.clear();
    invalidCandidates.value.clear();
    invalidPositions.value.clear();
    checked.value = true;

    for (const position of positions.value) {
        const entered: { id: string; rank: number }[] = [];

        for (const candidate of position.candidates) {
            if (candidate.rank.length === 0) {
                abstainedCandidates.value.add(candidate.id);
            } else {
                entered.push({ id: candidate.id, rank: candidate.rank[0]! });
            }
        }

        const ranks = entered.map((e) => e.rank);
        const rankSet = new Set(ranks);
        let positionInvalid = false;

        if (rankSet.size !== ranks.length) {
            positionInvalid = true;
            for (const e of entered) invalidCandidates.value.add(e.id);
        }

        const sorted = [...rankSet].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] !== i + 1) {
                positionInvalid = true;
                for (const e of entered) invalidCandidates.value.add(e.id);
                break;
            }
        }

        if (positionInvalid) {
            invalidPositions.value.add(position.title);
        }
    }
}

async function submit() {
    isSubmitting.value = true;
    try {
        const payload = {
            positions: positions.value.map((pos) => ({
                title: pos.title,
                candidates: pos.candidates.map((c: Candidate) => ({
                    id: c.id,
                    rank: c.rank[0] ?? null,
                })),
            })),
        };

        const res = await $fetch<{ message: string }>("/api/election/vote", {
            method: "POST",
            body: payload,
        });

        toast.add({
            color: "success",
            title: res.message,
        });

        await refreshResults();

        for (const pos of positions.value) {
            for (const c of pos.candidates) {
                c.rank = [];
            }
        }

        abstainedCandidates.value.clear();
        invalidCandidates.value.clear();
        invalidPositions.value.clear();
        checked.value = false;

        await nextTick();
        const firstId = candidateIds.value[0];
        if (firstId) focusPin(firstId);
    } catch (e: any) {
        toast.add({
            color: "error",
            title: "Submission failed",
            description: e?.data?.statusMessage || e?.message || "Unknown error",
        });
    } finally {
        isSubmitting.value = false;
    }
}
</script>

<template>
    <div class="min-h-screen p-6">
        <UContainer>
            <h1 class="text-4xl bold glow mb-2">Preference Voting</h1>

            <div class="flex items-center justify-between mb-8">
                <p class="text-sm text-muted">
                    Ballots cast:
                    <span class="font-medium text-neutral-200">
                        {{ resultData?.totalBallots ?? 0 }}
                    </span>
                </p>
                <ULink class="text-sm" href="/temp/vote/all">View all / edit ballots</ULink>
                <UButton
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    :icon="showResults ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    @click="showResults = !showResults"
                >
                    {{ showResults ? "Hide results" : "Show results" }}
                </UButton>
            </div>

            <p class="text-sm">
                <span class="bold">Tip</span>
                : You can enter ranks as is on the ballots!
            </p>

            <br />

            <div class="text-sm">
                Tips for keybinds:
                <ul class="list-disc list-inside">
                    <li>
                        Use
                        <UKbd>X</UKbd>
                        to check your ballot for errors. Press
                        <UKbd>X</UKbd>
                        again to submit if there are no errors.
                    </li>
                    <li>
                        Use
                        <UKbd>tab</UKbd>
                        to go to the next candidate, and
                        <UKbd>shift</UKbd>
                        +
                        <UKbd>tab</UKbd>
                        to go to the previous candidate.
                    </li>
                    <li>
                        Leave empty if a vote is abstained. Abstained candidates will be highlighted in yellow, and candidates with errors will be highlighted in red.
                    </li>
                    <li>
                        If you made a mistake, click <span class="text-primary">View all / edit ballots</span> above to view or delete your previous ballots.
                    </li>
                </ul>
            </div>

            <br>
            
            <p class="text-sm">Click on <code>Show results</code> to toggle whether to show the winner or not. NOTE THAT all results are computed based on submitted ballots. In other words, the winner will change as more ballots are added</p>

            <USeparator class="my-4"></USeparator>

            <div class="mb-8">
                <UButton
                    :color="checked && !hasErrors ? 'primary' : 'neutral'"
                    :variant="checked && !hasErrors ? 'solid' : 'outline'"
                    :loading="isSubmitting"
                    @click="checked && !hasErrors ? submit() : check()"
                >
                    <UKbd>X</UKbd>
                    {{ checked && !hasErrors ? "Submit" : "Check" }}
                </UButton>
            </div>

            <div class="space-y-10">
                <section v-for="position in positions" :key="position.title">
                    <h2 class="text-2xl bold mb-1">{{ position.title }}</h2>
                    <p class="text-muted text-sm mb-2">Rank 1-{{ position.candidates.length }}</p>

                    <div v-if="showResults && resultData" class="mb-4">
                        <template v-if="resultByTitle.get(position.title)">
                            <p
                                v-if="resultByTitle.get(position.title)!.status === 'elected'"
                                class="text-sm text-green-400"
                            >
                                Current winner:
                                {{
                                    candidateNameMap.get(
                                        resultByTitle.get(position.title)!.winner!,
                                    ) ?? resultByTitle.get(position.title)!.winner
                                }}
                            </p>
                            <p
                                v-else-if="resultByTitle.get(position.title)!.status === 'tie'"
                                class="text-sm text-yellow-400"
                            >
                                Tie: {{ resultByTitle.get(position.title)!.details }}
                            </p>
                            <p v-else class="text-sm text-neutral-500">No votes yet</p>
                        </template>
                        <p v-else class="text-sm text-neutral-500">No data</p>
                    </div>

                    <div
                        v-if="position.candidates.length"
                        :class="[
                            'flex flex-col gap-4',
                            invalidPositions.has(position.title)
                                ? 'border border-red-500 rounded-lg p-2'
                                : '',
                        ]"
                    >
                        <div
                            v-for="candidate in position.candidates"
                            :key="candidate.id"
                            class="flex flex-col"
                        >
                            <div
                                :class="[
                                    'flex items-center gap-4',
                                    abstainedCandidates.has(candidate.id)
                                        ? 'bg-yellow-500/10 rounded p-1'
                                        : '',
                                    invalidCandidates.has(candidate.id)
                                        ? 'bg-red-500/10 rounded p-1'
                                        : '',
                                ]"
                            >
                                <UPinInput
                                    :ref="(el) => setPinRef(el, candidate.id)"
                                    v-model="candidate.rank"
                                    :length="1"
                                    type="number"
                                    class="w-10"
                                    placeholder=""
                                    @keydown="onPinKeydown($event, candidate)"
                                    @complete="onComplete(candidate)"
                                />
                                <span class="text-sm">{{ candidate.shortName }}</span>
                                <UserPopover
                                    :user="
                                        {
                                            ...candidate,
                                            name: candidate.fullName,
                                        } as unknown as APIUser
                                    "
                                    external
                                >
                                    <div
                                        class="relative inline-flex cursor-pointer items-center justify-center text-neutral-400 hover:text-neutral-200"
                                    >
                                        <UIcon name="i-lucide-user" size="1.25em" />
                                    </div>
                                </UserPopover>
                            </div>
                            <p
                                v-if="abstainedCandidates.has(candidate.id)"
                                class="text-xs text-yellow-500 mt-1"
                            >
                                {{ candidate.shortName }}'s rank is abstained.
                            </p>
                            <p
                                v-if="invalidCandidates.has(candidate.id)"
                                class="text-xs text-red-500 mt-1"
                            >
                                {{ candidate.shortName }}'s rank is invalid.
                            </p>
                        </div>
                    </div>

                    <p v-else class="text-neutral-500 italic">No candidates listed yet.</p>
                </section>
            </div>

            <div class="mt-8">
                <UButton
                    :color="checked && !hasErrors ? 'primary' : 'neutral'"
                    :variant="checked && !hasErrors ? 'solid' : 'outline'"
                    :loading="isSubmitting"
                    @click="checked && !hasErrors ? submit() : check()"
                >
                    <UKbd>X</UKbd>
                    {{ checked && !hasErrors ? "Submit" : "Check" }}
                </UButton>
            </div>
        </UContainer>
    </div>
</template>
