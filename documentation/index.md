---
layout: home
---

<script setup>
import { onMounted, ref, computed } from 'vue'

const bootLines = ref([])
const showMain = ref(false)
const terminalLines = ref([])
const terminalDone = ref(false)

const bootSequence = [
  { text: 'BIOS v2.0.26 — BIBS-C Network Systems Inc.', delay: 0 },
  { text: 'POST: Memory test... 640K OK', delay: 80 },
  { text: 'Loading basishacks_kernel.bin at 0x7C00...', delay: 60 },
  { text: '0x7C00: B8 00 10 8E D8 8E C0 8E D0 BC 00 90 FB', delay: 40 },
  { text: 'Initializing network interface... OK', delay: 100 },
  { text: 'DHCP lease acquired: 10.0.0.42', delay: 80 },
  { text: 'ARP cache: 3 entries resolved', delay: 60 },
  { text: 'Connecting to hackathon subnet... OK', delay: 100 },
  { text: 'Loading modules: [oauth2] [rubric] [ballot] [teams]', delay: 80 },
  { text: '  MOV AX, 0x0026  ; season 2, 2026', delay: 40 },
  { text: '  INT 0x21        ; dispatch', delay: 40 },
  { text: 'All systems nominal.', delay: 80 },
  { text: '', delay: 40 },
  { text: '> hackathon --status=READY', delay: 60 },
  { text: '> Season 2 — 2025/26', delay: 60 },
  { text: '> Awaiting operators...', delay: 60 },
]

const terminalCommands = [
  { type: 'prompt', text: '$ nmap -sV 10.0.0.0/24 --top-ports 1024' },
  { type: 'output', text: '' },
  { type: 'output', text: 'Starting Nmap 7.94 ( https://nmap.org )' },
  { type: 'output', text: 'Scanning 256 hosts... [################################] 100%' },
  { type: 'output', text: '' },
  { type: 'output', text: 'PORT     STATE  SERVICE       VERSION' },
  { type: 'output', text: '80/tcp   open   http          Nitro/2.x (h3 server)' },
  { type: 'output', text: '443/tcp  open   https         Nitro/2.x (TLS 1.3)' },
  { type: 'output', text: '5432/tcp open   postgresql    Cloudflare D1 proxy' },
  { type: 'output', text: '8080/tcp open   http-proxy    Vite HMR dev server' },
  { type: 'output', text: '' },
  { type: 'output', text: 'Nmap done: 256 IP addresses (54 hosts up)' },
  { type: 'output', text: '' },
  { type: 'prompt', text: '$ basishacks recon --deep' },
  { type: 'output', text: '' },
  { type: 'output', text: '[*] Enumerating attack surface...' },
  { type: 'output', text: '[+] 54 API endpoints discovered' },
  { type: 'output', text: '[+] 18 Vue components loaded' },
  { type: 'output', text: '[+] 23 page routes mapped' },
  { type: 'output', text: '[+] 6 layouts registered' },
  { type: 'output', text: '[+] 8 OAuth2 scopes available' },
  { type: 'output', text: '[+] 5 rubric criteria (scores 0-5)' },
  { type: 'output', text: '[+] 3 auth methods: magic_code, ms_oauth2, devconnect' },
  { type: 'output', text: '[+] Zod validation: ALL endpoints hardened' },
  { type: 'output', text: '[+] Rate limit: 60 req/min per IP' },
  { type: 'output', text: '' },
  { type: 'output', text: '[*] Vulnerability scan: 0 critical | 0 high | 0 medium' },
  { type: 'output', text: '[✓] System is locked down. Ready for operators.' },
  { type: 'output', text: '' },
  { type: 'prompt', text: '$ _' },
]

onMounted(() => {
  bootSequence.forEach((item, i) => {
    setTimeout(() => {
      bootLines.value.push(item.text)
    }, i * 110 + item.delay)
  })
  setTimeout(() => {
    showMain.value = true
  }, bootSequence.length * 110 + 300)

  let delay = 1200
  terminalCommands.forEach((cmd, i) => {
    setTimeout(() => {
      terminalLines.value.push(cmd)
      if (i === terminalCommands.length - 1) {
        terminalDone.value = true
      }
    }, delay + i * 180)
  })
})

const binaryGibberish = computed(() => {
  const lines = []
  for (let i = 0; i < 8; i++) {
    let line = ''
    for (let j = 0; j < 48; j++) {
      line += Math.random() > 0.5 ? '1' : '0'
      if (j % 8 === 7) line += ' '
    }
    lines.push(line)
  }
  return lines.join('\n')
})
</script>

<div class="crt-home crt-scanlines">

<div class="boot-sequence" v-if="!showMain">
  <div class="ascii-art boot-art">
 █████  ██████  ███████ ███    ███  █████  ██████   █████
██   ██ ██   ██ ██      ████  ████ ██   ██ ██   ██ ██   ██
███████ ██████  █████   ██ ████ ██ ███████ ██████  ███████
██   ██ ██   ██ ██      ██  ██  ██ ██   ██ ██   ██ ██   ██
██   ██ ██   ██ ███████ ██      ██ ██   ██ ██   ██ ██   ██
  </div>
  <div class="boot-lines">
    <p v-for="(line, i) in bootLines" :key="i" class="boot-line">
      <span v-if="line.startsWith('>')" class="prompt">█ </span>{{ line }}<span v-if="i === bootLines.length - 1" class="crt-cursor-inline">_</span>
    </p>
  </div>
</div>

<div class="main-content" v-if="showMain">

<div class="hero-section">
  <div class="ascii-art hero-art">
 █████  ██████  ███████ ███    ███  █████  ██████   █████
██   ██ ██   ██ ██      ████  ████ ██   ██ ██   ██ ██   ██
███████ ██████  █████   ██ ████ ██ ███████ ██████  ███████
██   ██ ██   ██ ██      ██  ██  ██ ██   ██ ██   ██ ██   ██
██   ██ ██   ██ ███████ ██      ██ ██   ██ ██   ██ ██   ██
  </div>
  <h2 class="hero-subtitle">NETWORK HACKATHON PLATFORM DOCS</h2>
  <p class="hero-tagline">Season 2 — 2025/26 &nbsp;|&nbsp; BIBS-C Network</p>

  <div class="status-bar">
    <span><span class="status-dot"></span>SYSTEM ONLINE</span>
    <span class="status-center">HACKATHON_STATUS: READY</span>
    <span>NODES: 54</span>
  </div>

  <div class="action-buttons">
    <a href="/guide/getting-started" class="crt-btn crt-btn-primary">GET STARTED</a>
    <a href="/architecture/overview" class="crt-btn crt-btn-secondary">ARCHITECTURE</a>
    <a href="/backend/api-reference" class="crt-btn crt-btn-secondary">API REF</a>
  </div>
</div>

<div class="binary-section">
  <div class="binary-stream">{{ binaryGibberish }}</div>
</div>

<div class="terminal-window">
  <div class="terminal-titlebar">
    <div class="terminal-dots">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
    </div>
    <span class="terminal-title">basishacks@recon:~</span>
    <span class="terminal-shell-info">bash — 80×24</span>
  </div>
  <div class="terminal-body">
    <div v-for="(line, i) in terminalLines" :key="i" :class="['terminal-line', line.type]">
      <template v-if="line.type === 'prompt'">
        <span class="t-user">basishacks</span><span class="t-at">@</span><span class="t-host">recon</span><span class="t-colon">:</span><span class="t-path">~</span><span class="t-dollar">$ </span><span class="t-cmd">{{ line.text.replace('$ ', '') }}</span>
      </template>
      <template v-else>
        {{ line.text }}
      </template>
    </div>
    <span v-if="terminalDone" class="crt-cursor-inline">_</span>
  </div>
</div>

<div class="network-grid">
  <div class="network-node">
    <div class="node-title">⚡ FULL-STACK NUXT 3</div>
    <div class="node-desc">Vue 3 + Nitro + TypeScript + SQLite/D1</div>
  </div>
  <div class="network-node">
    <div class="node-title">🔐 MULTI-AUTH</div>
    <div class="node-desc">Magic code, Microsoft OAuth2, DevConnect PKCE</div>
  </div>
  <div class="network-node">
    <div class="node-title">🏆 HACKATHON ENGINE</div>
    <div class="node-desc">Teams, submissions, peer voting, judge rubrics</div>
  </div>
  <div class="network-node">
    <div class="node-title">🛠 DEV PORTAL</div>
    <div class="node-desc">OAuth2 apps, secrets, scopes, URL generator</div>
  </div>
  <div class="network-node">
    <div class="node-title">📡 MS GRAPH</div>
    <div class="node-desc">Meetings, Teams chat, webhooks, DeepSeek AI</div>
  </div>
  <div class="network-node">
    <div class="node-title">☁️ CLOUDFLARE</div>
    <div class="node-desc">Pages + D1 + GitHub Actions CI/CD</div>
  </div>
</div>

<div class="asm-section">
  <div class="asm-block"><span class="asm-comment">; basishacks_kernel.bin — bootstrap routine</span>
<span class="asm-label">_start:</span>
    <span class="asm-mnemonic">MOV</span>  <span class="asm-hex">AX</span>, 0x0026     <span class="asm-comment">; season 2, 2026</span>
    <span class="asm-mnemonic">MOV</span>  <span class="asm-hex">DS</span>, AX
    <span class="asm-mnemonic">MOV</span>  <span class="asm-hex">SI</span>, hackathon  <span class="asm-comment">; ptr to event state</span>
    <span class="asm-mnemonic">MOV</span>  <span class="asm-hex">CX</span>, 0x0036     <span class="asm-comment">; 54 endpoints</span>
    <span class="asm-mnemonic">REPZ</span> <span class="asm-hex">MOVSB</span>         <span class="asm-comment">; load all routes</span>
    <span class="asm-mnemonic">INT</span>  <span class="asm-hex">0x21</span>          <span class="asm-comment">; dispatch to Nitro</span></div>
</div>

<div class="binary-section binary-bottom">
  <div class="binary-stream">01001000 01100001 01100011 01101011 00100000 01110100 01101000 01100101
00100000 01110000 01101100 01100001 01101110 01100101 01110100 00101110
01000011 01101111 01101110 01101110 01100101 01100011 01110100 00100000
01110100 01101111 00100000 01110100 01101000 01100101 00100000 01101110
01100101 01110100 01110111 01101111 01110010 01101011 00101110 00100000
01010011 01110100 01100001 01111001 00100000 01110011 01100001 01100110</div>
</div>

<div class="footer-ascii">
<pre class="ascii-art footer-art">────────────────────────────────────────
  BISZ Developers' Club  ×  BINJ Hack Club
  BIBS-C Network Hackathon — Season 2
────────────────────────────────────────</pre>
</div>

</div>

</div>

<style scoped>
.crt-home {
  min-height: 100vh;
  padding: 1.5rem 1rem;
  max-width: 960px;
  margin: 0 auto;
  overflow-x: hidden;
}

.boot-sequence {
  padding-top: 10vh;
}

.boot-art {
  font-size: 0.5rem;
  line-height: 1.15;
  overflow-x: auto;
}

.boot-lines {
  margin-top: 1.25rem;
}

.boot-line {
  font-family: 'Space Mono', 'Courier New', monospace;
  color: var(--crt-green);
  font-size: 0.78rem;
  line-height: 1.55;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt {
  color: var(--crt-green-dim);
}

.crt-cursor-inline {
  animation: cursor-blink 1s step-end infinite;
  color: var(--crt-green);
}

.main-content {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.hero-section {
  text-align: center;
  padding: 2rem 0 1.5rem;
}

.hero-art {
  font-size: 0.5rem;
  line-height: 1.15;
  margin-bottom: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.dark .hero-art {
  text-shadow: 0 0 8px var(--crt-green-glow), 0 0 16px rgba(51, 255, 102, 0.12);
  animation: glow-pulse 4s ease-in-out infinite;
}

.hero-subtitle {
  color: var(--crt-green);
  font-family: 'IBM Plex Mono', monospace;
  font-size: clamp(0.75rem, 2.5vw, 1.05rem);
  font-weight: 600;
  letter-spacing: 0.15em;
  margin: 0.5rem 0;
}

.dark .hero-subtitle {
  text-shadow: 0 0 6px var(--crt-green-glow);
}

.hero-tagline {
  color: var(--vp-c-text-2);
  font-family: 'IBM Plex Mono', monospace;
  font-size: clamp(0.72rem, 2vw, 0.85rem);
  margin: 0.5rem 0 1rem;
}

.status-bar {
  background: var(--crt-bg-mute);
  border: 1px solid var(--crt-green-dark);
  border-radius: 4px;
  padding: 0.45rem 0.65rem;
  margin: 0.75rem 0;
  font-family: 'Space Mono', monospace;
  font-size: clamp(0.6rem, 1.5vw, 0.72rem);
  color: var(--crt-green-dim);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.status-center {
  text-align: center;
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--crt-green);
  margin-right: 5px;
  vertical-align: middle;
}

.dark .status-dot {
  box-shadow: 0 0 6px var(--crt-green-glow);
  animation: glow-pulse 2s ease-in-out infinite;
}

.action-buttons {
  display: flex;
  gap: 0.65rem;
  justify-content: center;
  flex-wrap: wrap;
  margin: 1.25rem 0 1.5rem;
}

.crt-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: clamp(0.68rem, 1.8vw, 0.78rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 0.5rem 1.2rem;
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.crt-btn-primary {
  background: var(--crt-green);
  color: var(--vp-c-bg);
  border: 1px solid var(--crt-green);
}

.crt-btn-primary:hover {
  filter: brightness(1.15);
  text-decoration: none;
}

.dark .crt-btn-primary:hover {
  box-shadow: 0 0 14px rgba(51, 255, 102, 0.25);
}

.crt-btn-secondary {
  background: transparent;
  color: var(--crt-green);
  border: 1px solid var(--crt-green-dark);
}

.crt-btn-secondary:hover {
  border-color: var(--crt-green);
  background: var(--crt-green-subtle);
  text-decoration: none;
}

.dark .crt-btn-secondary:hover {
  box-shadow: 0 0 10px rgba(51, 255, 102, 0.1);
}

.binary-section {
  margin: 0.75rem 0;
  overflow: hidden;
}

.binary-bottom {
  margin-top: 1.5rem;
}

.binary-stream {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  line-height: 1.3;
  color: var(--crt-green-dark);
  opacity: 0.3;
  overflow: hidden;
  white-space: pre;
  word-break: break-all;
  max-height: 4em;
  position: relative;
  user-select: none;
}

.binary-stream::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1.5em;
  background: linear-gradient(transparent, var(--vp-c-bg));
}

.dark .binary-stream {
  opacity: 0.2;
}

.terminal-window {
  border: 1px solid var(--crt-green-dark);
  border-radius: 8px;
  overflow: hidden;
  margin: 1.5rem 0;
  font-family: 'Space Mono', monospace;
}

.terminal-titlebar {
  background: var(--crt-bg-mute);
  border-bottom: 1px solid var(--crt-green-dark);
  padding: 0.4rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

.dark .terminal-titlebar {
  background: #1a1a1a;
}

.terminal-dots {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot-red { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green { background: #28c840; }

.terminal-title {
  flex: 1;
  text-align: center;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.terminal-shell-info {
  color: var(--vp-c-text-3);
  font-size: 0.6rem;
  flex-shrink: 0;
}

.terminal-body {
  background: var(--crt-bg-soft);
  padding: 0.75rem 1rem;
  font-size: clamp(0.62rem, 1.3vw, 0.72rem);
  line-height: 1.55;
  min-height: 280px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.dark .terminal-body {
  background: #080808;
}

.terminal-line {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.terminal-line.output {
  color: var(--vp-c-text-2);
}

.terminal-line.prompt {
  color: var(--crt-green);
}

.t-user { color: #5af78e; font-weight: 600; }
.t-at { color: var(--vp-c-text-3); }
.t-host { color: #57c7ff; font-weight: 600; }
.t-colon { color: var(--vp-c-text-3); }
.t-path { color: #ff6ac1; font-weight: 500; }
.t-dollar { color: var(--vp-c-text-2); }
.t-cmd { color: #f3f99d; }

.dark .t-user { color: #5af78e; }
.dark .t-host { color: #57c7ff; }
.dark .t-path { color: #ff6ac1; }
.dark .t-cmd { color: #f3f99d; }

.asm-section {
  margin: 1rem 0;
}

.asm-block {
  font-family: 'Space Mono', monospace;
  font-size: clamp(0.58rem, 1.4vw, 0.68rem);
  line-height: 1.5;
  color: var(--vp-c-text-3);
  background: var(--crt-bg-mute);
  border: 1px solid var(--crt-green-dark);
  border-radius: 4px;
  padding: 0.6rem 0.75rem;
  overflow-x: auto;
  white-space: pre;
  -webkit-overflow-scrolling: touch;
}

.asm-block :deep(.asm-label) {
  color: var(--crt-green);
}

.asm-block :deep(.asm-mnemonic) {
  color: var(--crt-green-dim);
  font-weight: 600;
}

.asm-block :deep(.asm-comment) {
  color: var(--vp-c-text-3);
  opacity: 0.7;
}

.asm-block :deep(.asm-hex) {
  color: var(--vp-c-text-2);
}

.network-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
  margin: 1.25rem 0;
}

.network-node {
  background: var(--crt-bg-mute);
  border: 1px solid var(--crt-green-dark);
  border-radius: 6px;
  padding: 0.75rem 0.5rem;
  text-align: center;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.network-node:hover {
  border-color: var(--crt-green);
}

.dark .network-node:hover {
  box-shadow: 0 0 10px rgba(51, 255, 102, 0.1);
}

.node-title {
  color: var(--crt-green);
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: clamp(0.7rem, 1.6vw, 0.82rem);
  margin-bottom: 0.3rem;
}

.node-desc {
  color: var(--vp-c-text-2);
  font-size: clamp(0.65rem, 1.4vw, 0.76rem);
}

.footer-ascii {
  text-align: center;
  margin-top: 1.5rem;
  opacity: 0.5;
}

.footer-art {
  font-size: clamp(0.45rem, 1.2vw, 0.6rem);
  line-height: 1.3;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .crt-home {
    padding: 1rem 0.75rem;
  }

  .boot-sequence {
    padding-top: 5vh;
  }

  .boot-art,
  .hero-art {
    font-size: 0.32rem;
  }

  .hero-section {
    padding: 1.5rem 0 1rem;
  }

  .network-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .status-bar {
    justify-content: center;
    text-align: center;
  }

  .status-center {
    width: 100%;
    order: -1;
  }

  .terminal-body {
    min-height: 200px;
    padding: 0.6rem 0.75rem;
  }

  .terminal-shell-info {
    display: none;
  }
}

@media (max-width: 480px) {
  .crt-home {
    padding: 0.75rem 0.5rem;
  }

  .boot-art,
  .hero-art {
    font-size: 0.24rem;
    line-height: 1.1;
  }

  .boot-line {
    font-size: 0.68rem;
  }

  .hero-section {
    padding: 1rem 0 0.75rem;
  }

  .network-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .network-node {
    padding: 0.6rem 0.4rem;
  }

  .action-buttons {
    gap: 0.5rem;
  }

  .crt-btn {
    padding: 0.45rem 0.9rem;
    font-size: 0.65rem;
  }

  .terminal-body {
    min-height: 160px;
    font-size: 0.58rem;
    padding: 0.5rem 0.6rem;
  }

  .terminal-titlebar {
    padding: 0.3rem 0.5rem;
    font-size: 0.6rem;
  }

  .dot {
    width: 8px;
    height: 8px;
  }

  .asm-block {
    font-size: 0.52rem;
    padding: 0.5rem 0.6rem;
  }

  .binary-stream {
    font-size: 0.42rem;
  }
}

@media (max-width: 360px) {
  .boot-art,
  .hero-art {
    font-size: 0.2rem;
  }

  .network-grid {
    grid-template-columns: 1fr;
  }
}
</style>
