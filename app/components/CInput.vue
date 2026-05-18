<script setup lang="ts">
import type { InputProps, InputEmits, InputSlots } from '@nuxt/ui/components/Input.vue'

interface Props extends /* @vue-ignore */ InputProps {
  maxlength?: number
}

const props = defineProps<Props>()
const emit = defineEmits<InputEmits>()

const slots = defineSlots<Pick<InputSlots, 'leading' | 'trailing' | 'default'>>()

const modelValue = computed<any>({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const currentLength = computed(() => String(modelValue.value ?? '').length)
</script>

<template>
  <UInput
    v-bind="props"
    v-model="modelValue"
    @blur="emit('blur', $event)"
    @change="emit('change', $event)"
  >
    <template v-if="slots.leading" #leading="scope">
      <slot name="leading" v-bind="scope" />
    </template>
    <template v-if="slots.trailing" #trailing="scope">
      <slot name="trailing" v-bind="scope" />
    </template>
    <template #default="{ ui }">
      <slot name="default" :ui="ui" />
      <span
        v-if="typeof maxlength === 'number'"
        class="absolute top-full right-0 translate-y-1 text-xs text-neutral-500 select-none"
      >
        {{ currentLength }}/{{ maxlength }}
      </span>
    </template>
  </UInput>
</template>
