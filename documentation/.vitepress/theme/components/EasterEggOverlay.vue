<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface Props {
    mode?: "konami" | "hackplanet" | "matrix";
}

const props = withDefaults(defineProps<Props>(), {
    mode: "konami",
});

const emit = defineEmits<{
    (e: "close"): void;
}>();

const konamiArt = `        _nnnn_
       dGGGGMMb
      @p~qp~~qMb
      M|@||@) M|
      @,----.JM|
     JS^\\__/  qKL
    dZP        qKRb
   dZP          qKKb
  fZP            SMMb
  HZM            MMMM
  FqM            MMMM
 __| ".        |\\dS"qML
 |    ".       | ' \\Zq
_)      \\.___.,|     .'
\\____   )MMMMMP|   .'
     '-'       '--'

SYSTEM BREACH DETECTED
Access granted, operator.`;

const hackPlanetArt = `╔══════════════════════════════════════╗
║  HACK THE PLANET                      ║
╠══════════════════════════════════════╣
║  > Initializing dial-up handshake...  ║
║  > Bypassing mainframe...             ║
║  > Crashing 15,000 systems...         ║
║  > Messing with the stock market...   ║
║                                       ║
║  [████████████████████] 100%          ║
║                                       ║
║  "There is no right and wrong.        ║
║   There is only fun and boring."      ║
║           — The Mentor                ║
╚══════════════════════════════════════╝`;

const matrixChars = "0123456789ABCDEFαβγδεζηθλμξπρστφχψω∀∃∈∉∑∏∂∆∞";
const matrixLines = ref<string[]>([]);
let matrixInterval: ReturnType<typeof setInterval> | null = null;

const displayArt = computed(() => {
    if (props.mode === "hackplanet") return hackPlanetArt;
    return konamiArt;
});

onMounted(() => {
    if (props.mode === "matrix") {
        const width = typeof window !== "undefined" ? Math.floor(window.innerWidth / 14) : 60;
        for (let i = 0; i < 20; i++) {
            matrixLines.value.push(generateMatrixLine(width));
        }
        matrixInterval = setInterval(() => {
            matrixLines.value.shift();
            matrixLines.value.push(generateMatrixLine(width));
        }, 80);
    }
});

onUnmounted(() => {
    if (matrixInterval) clearInterval(matrixInterval);
});

function generateMatrixLine(width: number) {
    let line = "";
    for (let i = 0; i < width; i++) {
        line += matrixChars[Math.floor(Math.random() * matrixChars.length)];
        if (Math.random() > 0.7) line += " ";
    }
    return line;
}

function close() {
    emit("close");
}
</script>

<template>
    <div class="vp-easter-overlay" @click.self="close">
        <div class="vp-easter-content">
            <button class="vp-easter-close" @click="close" type="button">close [x]</button>
            <div v-if="mode === 'matrix'" class="matrix-rain">
                <div v-for="(line, i) in matrixLines" :key="i" class="matrix-line">{{ line }}</div>
            </div>
            <pre v-else>{{ displayArt }}</pre>
        </div>
    </div>
</template>

<style scoped>
.matrix-rain {
    font-size: 0.7rem;
    line-height: 1.2;
    white-space: pre-wrap;
    word-break: break-all;
}

.matrix-line {
    opacity: 0.85;
    animation: fade-in-up 0.2s ease;
}
</style>
