<script setup lang="ts">
import { ref } from 'vue'

const quotes = [
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
  { text: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'It works on my machine.', author: 'Every developer, eventually' },
  { text: 'Hackathons are where dreams compile faster.', author: 'BIBS-C Network' },
]

const index = ref(0)

function next() {
  index.value = (index.value + 1) % quotes.length
}
</script>

<template>
  <div class="vp-quote-cycler" @click="next" role="button" tabindex="0" @keydown.enter="next">
    <div class="quote-text">"{{ quotes[index].text }}"</div>
    <div class="quote-author">— {{ quotes[index].author }}</div>
  </div>
</template>
