---
layout: home
---

<script setup>
import { onMounted, ref } from 'vue'

const bootLines = ref([])
const showMain = ref(false)

const bootSequence = [
  'BIOS v2.0.26 — BIBS-C Network Systems Inc.',
  'Memory test... 640K OK',
  'Loading basishacks_kernel.bin...',
  'Initializing network interface... OK',
  'DHCP lease acquired: 10.0.0.42',
  'Connecting to hackathon subnet... OK',
  'Loading modules: [oauth2] [rubric] [ballot] [teams]',
  'All systems nominal.',
  '',
  '> hackathon --status=READY',
  '> Season 2 — 2025/26',
  '> Awaiting operators...',
]

onMounted(() => {
  bootSequence.forEach((line, i) => {
    setTimeout(() => {
      bootLines.value.push(line)
    }, i * 120)
  })
  setTimeout(() => {
    showMain.value = true
  }, bootSequence.length * 120 + 400)
})
</script>

<div class="crt-home crt-scanlines">

<div class="boot-sequence" v-if="!showMain">
  <div class="ascii-art">
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
    <span>HACKATHON_STATUS: READY</span>
    <span>NODE_COUNT: 54_ACTIVE</span>
  </div>

  <div class="action-buttons">
    <a href="/guide/getting-started" class="crt-btn crt-btn-primary">GET STARTED</a>
    <a href="/architecture/overview" class="crt-btn crt-btn-secondary">ARCHITECTURE</a>
    <a href="/backend/api-reference" class="crt-btn crt-btn-secondary">API REF</a>
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

<div class="terminal-block">
  <span class="prompt">$</span> basishacks --info<br>
  <span class="output">Version: 2.0.26 | Endpoints: 54 | Components: 18 | Pages: 23</span><br>
  <span class="prompt">$</span> <span class="crt-cursor-inline">_</span>
</div>

<div class="footer-ascii">
<pre class="ascii-art footer-art">
─────────────────────────────────────────────────────
  BISZ Developers' Club  ×  BINJ Hack Club
  BIBS-C Network Hackathon — Season 2, 2025/26
─────────────────────────────────────────────────────
</pre>
</div>

</div>

</div>

<style scoped>
.crt-home {
  min-height: 100vh;
  padding: 2rem;
  max-width: 960px;
  margin: 0 auto;
}

.boot-sequence {
  padding-top: 15vh;
}

.boot-lines {
  margin-top: 1.5rem;
}

.boot-line {
  font-family: 'Space Mono', 'Courier New', monospace;
  color: var(--crt-green);
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
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
  padding: 3rem 0 2rem;
}

.hero-art {
  font-size: 0.55rem;
  line-height: 1.15;
  text-shadow: 0 0 8px var(--crt-green-glow), 0 0 16px rgba(51, 255, 51, 0.15);
  animation: glow-pulse 4s ease-in-out infinite;
  margin-bottom: 1rem;
}

.hero-subtitle {
  color: var(--crt-green);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-shadow: 0 0 6px var(--crt-green-glow);
  margin: 0.5rem 0;
}

.hero-tagline {
  color: var(--vp-c-text-2);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  margin: 0.5rem 0 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin: 1.5rem 0 2.5rem;
}

.crt-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  padding: 0.6rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.crt-btn-primary {
  background: var(--crt-green);
  color: #0a0a0a;
  border: 1px solid var(--crt-green);
}

.crt-btn-primary:hover {
  background: #55ff55;
  border-color: #55ff55;
  box-shadow: 0 0 16px rgba(51, 255, 51, 0.3);
  text-decoration: none;
}

.crt-btn-secondary {
  background: transparent;
  color: var(--crt-green);
  border: 1px solid var(--crt-green-dark);
}

.crt-btn-secondary:hover {
  border-color: var(--crt-green);
  background: var(--crt-green-subtle);
  box-shadow: 0 0 12px rgba(51, 255, 51, 0.15);
  text-decoration: none;
}

.network-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .network-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero-art {
    font-size: 0.35rem;
  }
}

@media (max-width: 480px) {
  .network-grid {
    grid-template-columns: 1fr;
  }
  .hero-art {
    font-size: 0.28rem;
  }
}

.network-node {
  background: var(--crt-bg-mute);
  border: 1px solid var(--crt-green-dark);
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
}

.network-node:hover {
  border-color: var(--crt-green);
  box-shadow: 0 0 12px rgba(51, 255, 51, 0.15);
}

.node-title {
  color: var(--crt-green);
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
}

.node-desc {
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
}

.terminal-block {
  background: #080808;
  border: 1px solid var(--crt-green-dark);
  border-radius: 6px;
  padding: 1rem 1.25rem;
  margin: 2rem 0;
  font-family: 'Space Mono', monospace;
  color: var(--crt-green);
  font-size: 0.82rem;
  line-height: 1.6;
}

.terminal-block .output {
  color: var(--vp-c-text-2);
}

.footer-ascii {
  text-align: center;
  margin-top: 2rem;
  opacity: 0.6;
}

.footer-art {
  font-size: 0.65rem;
  line-height: 1.3;
}
</style>
