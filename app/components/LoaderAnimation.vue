<template>

    <Transition name="fade">

        <div class="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center z-999 bg-(--ui-bg)" v-if="show">

            <svg class="infinity w-[10vw] h-[10vh] max-sm:w-[50vw]" viewBox="-1 -1 12 8">
            <defs>
                <path id="infinite" d="M5 3C4 2 3.1 1 2 1a2 2 0 000 4c1.1 0 2-1 3-2s1.9-2 3-2a2 2 0 010 4C6.9 5 6 4 5 3"></path>
                <radialGradient id="rgradient" gradientUnits="userSpaceOnUse" cx="5" cy="3" r="3.4">
                <stop offset=".25" stop-color="#000"></stop>
                <stop offset=".9" stop-color="#000" stop-opacity="0"></stop>
                </radialGradient>
                <path id="shadow1" class="clip-shadow" d="M4.5 2.5C3.7 1.7 2.9 1 2 1m6 4c-1 0-1.7-.7-2.5-1.5"></path>
            </defs>
            <use href="#infinite" class="outside"></use>
            <use href="#shadow1" class="shadow"></use>
            <g class="shadow odd">
                <use href="#shadow1" transform="translate(0 6) scale(1, -1)" />
            </g>
            <use href="#infinite" class="inside"></use>
            </svg>

            <h3>Just a moment</h3>


        </div>

    </Transition>

</template>

<script setup lang="ts">

defineProps<{
    show: boolean;
    
}>()

</script>

<style scoped>

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

svg {
  display: block;
}

.outside,
.inside {
  fill: none;
}

.outside {
  stroke-width: inherit;
  stroke: var(--ui-primary);
  stroke-opacity: 0.3;
}

.inside {
  stroke: var(--ui-primary);
  animation: loop 3s linear infinite;
  stroke-width: 0.35;
  stroke-dasharray: 3 24.5;
  stroke-linecap: round;
  animation-delay: -1.5s;
}

.infinity {
  stroke-width: 1.43;
  animation: rot 36s linear infinite;
}

.shadow {
  animation: raise 3s linear infinite;
}

.shadow.odd {
  animation-delay: -1.5s;
}

@keyframes raise {
  0%, 20% {
    opacity: 1;
  }

  30%, 70% {
    opacity: 0;
  }

  80%, 100% {
    opacity: 1;
  }
}

@keyframes loop {
  0% {
    stroke-dashoffset: 0.5;
  }

  100% {
    stroke-dashoffset: 28;
  }
}

.clip-shadow {
  stroke-linecap: butt;
  fill: none;
  opacity: 0.3;
  stroke-width: inherit;
  stroke: url(#rgradient);
}

#rgradient stop {
  stop-color: #2345;
}

</style>