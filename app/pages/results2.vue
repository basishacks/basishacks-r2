<template >

    <Transition name="fade">
      <div v-show="showScrollText" class="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center flex flex-col items-center gap-4 z-30">
        <h3 class="text-2xl text-gray-200">Scroll for more</h3>
        <UIcon name="i-mdi-chevron-double-down" size="2em" class="text-gray-200" />
      </div>
    </Transition>


    <div class="m-0 bg-black text-white landscape min-h-screen flex flex-col items-center justify-center gap-4 relative z-20">

        <div class="ml-auto text-right">
            <h3 class="mx-32 text-2xl text-gray-200">Feburary 2026</h3>
            <h1 class="mx-32 text-6xl text-right leading-16">When there is <br><span class="bold glow text-primary neon">Signal</span></h1>
        </div>

    </div>


    <!--Team 1-->

    <div id="team1" ref="team1Ref" class="bg-black text-white min-h-screen flex items-center justify-center">

        <div ref="team1DescriptionWrapper" class="team1-description-wrapper ml-48 pl-16 relative overflow-visible" @mousemove="updateTeam1Cursor" @mouseleave="resetTeam1Cursor">
            <div class="team1-background-number" ref="team1NumberRef" :style="team1NumberStyle">#1</div>
            <div v-if="cursorAuraVisible" class="team1-cursor-aura" :style="team1AuraStyle"></div>
            <Transition name="slide-right">
                <div v-if="team1showDescriptionRef" class="team1-description transition-team1">

                    <h3 class="text-2xl text-left text-neutral-400 uppercase leading-16">Featuring 白鹿青崖间</h3>
                    <h1 class="text-6xl text-left leading-16 bold glow">Syl</h1>
                    
                    <p class="mt-16 text-neutral-400">
                        ... by 6 scenes, the player can experience the story of a fallen civilization and a blade of grass
                        in a fading world seeking self-redemption
                    </p>
                    <p class="mt-4 text-neutral-400">
                        In this chaotic time, Syl tries to give herself purpose by delivering the mail "feather", imitating
                        a predecessor.
                    </p>
                    <p class="mt-4 text-white">
                        If the player pays more
                        attention to the surroundings while playing, they may discover and reveal a hidden truth of that world
                    </p>

                    <div class="mt-4">
                        <ResultsProjectLinks
                        githubLink="https://github.com/Rua-You/Syl"
                        demoLink="https://rua-you.itch.io/syl"
                        videoLink="/assets/ee2c39cc-c590-4c36-a73e-43d335c76a86"></ResultsProjectLinks>
                    </div>
                    
                </div>
            </Transition>

            
        </div>
        
        <video ref="videoRef" src="/assets/8a214d32-c43d-4141-b534-5225722a4d2b" muted preload="metadata" class="ml-auto h-auto"></video>
        <!-- text -->
    </div>


    


    <div>
        <p class="py-500"></p>
    </div>

</template> 
<script setup>
definePageMeta({
  layout: 'fullwidth'
})

useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: '/assets/c6c7b5b3-4256-4f9d-9899-15a7905a154c'
    }
  ]
})

const showScrollText = ref(true)
const videoRef = ref()
const team1showDescriptionRef = ref(false)
const team1Ref = ref()
const team1DescriptionWrapper = ref(null)
const team1NumberRef = ref(null)
const cursorAuraVisible = ref(false)
const cursorPosition = ref({ x: 0, y: 0 })
const team1Proximity = ref(0)

const team1NumberStyle = computed(() => {
  const intensity = team1Proximity.value
  const glow = 12 + intensity * 44
  const alpha = 0.14 + intensity * 0.18
  return {
    color: `rgba(255, 215, 0, ${alpha})`,
    textShadow: `0 0 ${glow}px rgba(255, 215, 0, ${0.55 * intensity})`,
    transition: 'color 0.15s ease, text-shadow 0.15s ease'
  }
})

const team1AuraStyle = computed(() => {
  const intensity = team1Proximity.value
  const size = 120 + intensity * 80
  const opacity = 0.1 + intensity * 0.45
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${cursorPosition.value.x - size / 2}px`,
    top: `${cursorPosition.value.y - size / 2}px`,
    opacity,
    boxShadow: `0 0 ${size / 2}px rgba(255, 215, 0, ${opacity}), 0 0 ${size}px rgba(255, 215, 0, ${opacity * 0.35})`,
    transition: 'width 0.12s ease, height 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease'
  }
})

const updateTeam1Cursor = (event) => {
  const wrapper = team1DescriptionWrapper.value
  const numberEl = team1NumberRef.value
  if (!wrapper || !numberEl) return

  const rect = wrapper.getBoundingClientRect()
  const cursorX = event.clientX - rect.left
  const cursorY = event.clientY - rect.top
  cursorPosition.value = { x: cursorX, y: cursorY }
  cursorAuraVisible.value = true

  const numRect = numberEl.getBoundingClientRect()
  const dx = event.clientX - (numRect.left + numRect.width / 2)
  const dy = event.clientY - (numRect.top + numRect.height / 2)
  const distance = Math.sqrt(dx * dx + dy * dy)
  const maxDistance = 280
  team1Proximity.value = Math.max(0, 1 - Math.min(distance, maxDistance) / maxDistance)
}

const resetTeam1Cursor = () => {
  cursorAuraVisible.value = false
  team1Proximity.value = 0
}

onMounted(() => {
  const handleScroll = () => {
    const scrollThreshold = window.innerHeight * 0.25
    if (showScrollText.value) showScrollText.value = window.scrollY < scrollThreshold;
    

    // Team 1 video scroll animation
    const element = team1Ref.value
    if (element && videoRef.value) {
      const rect = element.getBoundingClientRect()

      const elementTop = rect.top + window.scrollY - window.innerHeight / 2 // preload twice height
      const elementHeight = rect.height * 0.5 // twice
      const scrollY = window.scrollY

      if (scrollY >= elementTop && scrollY <= elementTop + elementHeight) {

        // also trigger description fade in
        if (!team1showDescriptionRef.value) team1showDescriptionRef.value = true

        const progress = (scrollY - elementTop) / elementHeight
        videoRef.value.currentTime = progress * videoRef.value.duration
      }
    }
  }

  window.addEventListener('scroll', handleScroll)
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
})
</script>
<style scoped>

.transition-team1 {
    animation: display 1.5s;
}

.landscape {
    background-image: url('/assets/c6c7b5b3-4256-4f9d-9899-15a7905a154c');
    background-size: cover;
    background-position: center;
}

.section-divider-number {
  font-size: 32rem;
  line-height: 0.85;
  font-weight: 900;
  letter-spacing: -0.08em;
  color: rgba(255, 255, 255, 0.12);
  white-space: nowrap;
}

.team1-description-wrapper {
  position: relative;
}

.team1-background-number {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(-10%, -70%);
  font-size: 32rem;
  line-height: 0.8;
  font-style: italic;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.14);
  white-space: nowrap;
  pointer-events: none;
  z-index: 0;
  transition: color 0.15s ease, text-shadow 0.15s ease;
}

.team1-cursor-aura {
  position: absolute;
  pointer-events: none;
  border-radius: 9999px;
  background: rgba(255, 215, 0, 0.08);
  filter: blur(14px);
  z-index: 0;
}

.team1-description {
  position: relative;
  z-index: 1;
}

.neon {

  text-transform: uppercase;
  animation: flicker 1.5s infinite alternate;
}

@keyframes flicker {
  /* Fully On */
  0%, 18%, 22%, 25%, 53%, 57%, 100% {
    text-shadow: 0 0 0.05em color-mix(in srgb, currentColor 75%, var(--background-color-default) 25%), 0 0 0.1em color-mix(in srgb, currentColor 75%, var(--background-color-default) 25%);
    opacity: 1;
  }
  /* The "Broken" Moments (Dim/Off) */
  20%, 24%, 55% {       
    text-shadow: none;
    opacity: 0.4;
  }
}

.fade-leave-to {
  opacity: 0;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.8s ease;
}

.slide-right-enter-active {
  transition: all 0.8s ease-out;
}

.slide-right-enter-from {
  transform: translateX(-25%);
  opacity: 0;
}

.slide-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}

.metallic-gold {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-silver {
  background: linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 25%, #E8E8E8 50%, #C0C0C0 75%, #E8E8E8 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-bronze {
  background: linear-gradient(135deg, #CD7F32 0%, #B87333 25%, #df9953 50%, #B87333 75%, #CD7F32 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

</style>