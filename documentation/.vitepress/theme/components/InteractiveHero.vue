<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

const bootLines = ref<string[]>([]);
const showMain = ref(false);
const terminalLines = ref<{ type: string; text: string }[]>([]);
const terminalDone = ref(false);

const bootSequence = [
    "BIOS v2.0.26 — BIBS-C Network Systems Inc.",
    "POST: Memory test... 640K OK",
    "Loading basishacks_kernel.bin at 0x7C00...",
    "0x7C00: B8 00 10 8E D8 8E C0 8E D0 BC 00 90 FB",
    "Initializing network interface... OK",
    "DHCP lease acquired: 10.0.0.42",
    "ARP cache: 3 entries resolved",
    "Connecting to hackathon subnet... OK",
    "Loading modules: [oauth2] [rubric] [ballot] [teams]",
    "  MOV AX, 0x0026  ; season 2, 2026",
    "  INT 0x21        ; dispatch",
    "All systems nominal.",
    "",
    "> hackathon --status=READY",
    "> Season 2 — 2025/26",
    "> Awaiting operators...",
];

const terminalCommands = [
    { type: "prompt", text: "$ nmap -sV 10.0.0.0/24 --top-ports 1024" },
    { type: "output", text: "" },
    { type: "output", text: "Starting Nmap 7.94 ( https://nmap.org )" },
    { type: "output", text: "Scanning 256 hosts... [################################] 100%" },
    { type: "output", text: "" },
    { type: "output", text: "PORT     STATE  SERVICE       VERSION" },
    { type: "output", text: "80/tcp   open   http          Nitro/2.x (h3 server)" },
    { type: "output", text: "443/tcp  open   https         Nitro/2.x (TLS 1.3)" },
    { type: "output", text: "5432/tcp open   postgresql    SQLite proxy" },
    { type: "output", text: "8080/tcp open   http-proxy    Vite HMR dev server" },
    { type: "output", text: "" },
    { type: "output", text: "Nmap done: 256 IP addresses (54 hosts up)" },
    { type: "output", text: "" },
    { type: "prompt", text: "$ basishacks recon --deep" },
    { type: "output", text: "" },
    { type: "output", text: "[*] Enumerating attack surface..." },
    { type: "output", text: "[+] 54 API endpoints discovered" },
    { type: "output", text: "[+] 18 Vue components loaded" },
    { type: "output", text: "[+] 23 page routes mapped" },
    { type: "output", text: "[+] 6 layouts registered" },
    { type: "output", text: "[+] 8 OAuth2 scopes available" },
    { type: "output", text: "[+] 5 rubric criteria (scores 0-5)" },
    { type: "output", text: "[+] 2 auth methods: ms_oauth2, devconnect" },
    { type: "output", text: "[+] Zod validation: ALL endpoints hardened" },
    { type: "output", text: "[+] Rate limit: 60 req/min per IP" },
    { type: "output", text: "" },
    { type: "output", text: "[*] Vulnerability scan: 0 critical | 0 high | 0 medium" },
    { type: "output", text: "[OK] System is locked down. Ready for operators." },
    { type: "output", text: "" },
    { type: "prompt", text: "$ _" },
];

const asciiBanner = ` █████  ██████  ███████ ███    ███  █████  ██████   █████
██   ██ ██   ██ ██      ████  ████ ██   ██ ██   ██ ██   ██
███████ ██████  █████   ██ ████ ██ ███████ ██████  ███████
██   ██ ██   ██ ██      ██  ██  ██ ██   ██ ██   ██ ██   ██
██   ██ ██   ██ ███████ ██      ██ ██   ██ ██   ██ ██   ██`;

onMounted(() => {
    bootSequence.forEach((line, i) => {
        setTimeout(() => {
            bootLines.value.push(line);
        }, i * 110);
    });
    setTimeout(
        () => {
            showMain.value = true;
        },
        bootSequence.length * 110 + 300,
    );

    let delay = 1200;
    terminalCommands.forEach((cmd, i) => {
        setTimeout(
            () => {
                terminalLines.value.push(cmd);
                if (i === terminalCommands.length - 1) {
                    terminalDone.value = true;
                }
            },
            delay + i * 180,
        );
    });
});

const binaryGibberish = computed(() => {
    const lines = [];
    for (let i = 0; i < 8; i++) {
        let line = "";
        for (let j = 0; j < 48; j++) {
            line += Math.random() > 0.5 ? "1" : "0";
            if (j % 8 === 7) line += " ";
        }
        lines.push(line);
    }
    return lines.join("\n");
});
</script>

<template>
    <div class="vp-interactive-hero crt-scanlines">
        <div v-if="!showMain" class="boot-sequence">
            <div class="ascii-art boot-art">{{ asciiBanner }}</div>
            <div class="boot-lines">
                <p v-for="(line, i) in bootLines" :key="i" class="boot-line">
                    <span v-if="line.startsWith('>')" class="prompt">█</span>
                    {{ line }}
                    <span v-if="i === bootLines.length - 1" class="crt-cursor-inline">_</span>
                </p>
            </div>
        </div>

        <div v-else class="main-content">
            <div class="hero-section">
                <div class="ascii-art hero-art">{{ asciiBanner }}</div>
                <h2 class="hero-subtitle">Network Hackathon Platform Docs</h2>
                <p class="hero-tagline">Season 2 — 2025/26 &nbsp;|&nbsp; BIBS-C Network</p>

                <div class="hero-status">
                    <span>
                        <span class="status-dot"></span>
                        System Online
                    </span>
                    <span class="status-center">HACKATHON_STATUS: READY</span>
                    <span>Nodes: 54</span>
                </div>

                <div class="hero-actions">
                    <a href="/guide/getting-started" class="hero-btn primary">Get Started</a>
                    <a href="/architecture/overview" class="hero-btn">Architecture</a>
                    <a href="/backend/api-reference" class="hero-btn">API Ref</a>
                </div>
            </div>

            <div class="binary-section">
                <div class="binary-stream">{{ binaryGibberish }}</div>
            </div>

            <div class="bh-terminal">
                <div class="terminal-titlebar">
                    <div class="terminal-dots">
                        <span class="dot-red"></span>
                        <span class="dot-yellow"></span>
                        <span class="dot-green"></span>
                    </div>
                    <span class="terminal-title">basishacks@recon:~</span>
                    <span class="terminal-size">bash — 80×24</span>
                </div>
                <div class="terminal-body">
                    <div
                        v-for="(line, i) in terminalLines"
                        :key="i"
                        :class="['terminal-line', line.type]"
                    >
                        <template v-if="line.type === 'prompt'">
                            <span class="ps1-user">basishacks</span>
                            <span class="ps1-host">@recon</span>
                            <span class="ps1-path">:~</span>
                            <span class="ps1-cmd">{{ line.text.replace("$ ", "") }}</span>
                        </template>
                        <template v-else>
                            {{ line.text }}
                        </template>
                    </div>
                    <span v-if="terminalDone" class="term-cursor">_</span>
                </div>
            </div>

            <div class="network-grid">
                <div class="network-node">
                    <div class="node-title">Full-Stack Nuxt 3</div>
                    <div class="node-desc">Vue 3 + Nitro + TypeScript + SQLite</div>
                </div>
                <div class="network-node">
                    <div class="node-title">Multi-Auth</div>
                    <div class="node-desc">Microsoft OAuth2, DevConnect PKCE</div>
                </div>
                <div class="network-node">
                    <div class="node-title">Hackathon Engine</div>
                    <div class="node-desc">Teams, submissions, peer voting, judge rubrics</div>
                </div>
                <div class="network-node">
                    <div class="node-title">Dev Portal</div>
                    <div class="node-desc">OAuth2 apps, secrets, scopes, URL generator</div>
                </div>
                <div class="network-node">
                    <div class="node-title">MS Graph</div>
                    <div class="node-desc">Meetings, Teams chat, webhooks, DeepSeek AI</div>
                </div>
                <div class="network-node">
                    <div class="node-title">VPS</div>
                    <div class="node-desc">Node.js server + SQLite + CI/CD</div>
                </div>
            </div>

            <div class="asm-section">
                <div class="asm-block">
                    <span class="asm-comment">; basishacks_kernel.bin — bootstrap routine</span>
                    <span class="asm-label">_start:</span>
                    <span class="asm-instr">MOV</span>
                    <span class="asm-reg">AX</span>
                    , 0x0026
                    <span class="asm-comment">; season 2, 2026</span>
                    <span class="asm-instr">MOV</span>
                    <span class="asm-reg">DS</span>
                    , AX
                    <span class="asm-instr">MOV</span>
                    <span class="asm-reg">SI</span>
                    , hackathon
                    <span class="asm-comment">; ptr to event state</span>
                    <span class="asm-instr">MOV</span>
                    <span class="asm-reg">CX</span>
                    , 0x0036
                    <span class="asm-comment">; 54 endpoints</span>
                    <span class="asm-instr">REPZ</span>
                    <span class="asm-reg">MOVSB</span>
                    <span class="asm-comment">; load all routes</span>
                    <span class="asm-instr">INT</span>
                    <span class="asm-reg">0x21</span>
                    <span class="asm-comment">; dispatch to Nitro</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.boot-art,
.hero-art {
    font-size: clamp(0.3rem, 1.1vw, 0.65rem);
    line-height: 1.15;
    overflow-x: auto;
    margin-bottom: 1rem;
}

.boot-lines {
    margin-top: 1rem;
}

.boot-line {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
}

.prompt {
    opacity: 0.6;
}

.crt-cursor-inline {
    animation: cursor-blink 1s step-end infinite;
}

.main-content {
    animation: fade-in-up 0.5s ease;
}

.hero-section {
    padding: 1.5rem 0 1rem;
}

.hero-section .hero-actions {
    margin-top: 1.5rem;
}

.binary-section {
    margin: 0.75rem 0;
    overflow: hidden;
}

.asm-section {
    margin: 1rem 0;
}

.asm-block {
    white-space: pre;
}
</style>
