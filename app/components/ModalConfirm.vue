<template>

<UModal>
    <slot/>
    <template #body>
        <slot name="content"/>
        
    </template>
    
    <template #footer="{ close }">

        <UButton :color="color" @click="click">Confirm</UButton>
        <UButton color="neutral" variant="outline" @click="close">Cancel</UButton>

    </template>
</UModal>

 </template>

 <script setup lang="ts"> 
 
const props = defineProps({
  color: {
    type: String,
    default: 'primary',
  },
  click: {
    type: Function,
    default: () => {},
  },

  
})

console.log(props.click)

</script>