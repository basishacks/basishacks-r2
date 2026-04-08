<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Debug File Upload</h1>
    <form @submit.prevent="uploadFile" class="space-y-4">
      <div>
        <label for="file" class="block text-sm font-medium">Select File</label>
        <input
          id="file"
          type="file"
          @change="handleFileChange"
          class="mt-1 block w-full"
          required
        />
      </div>
      <button
        type="submit"
        :disabled="!file || uploading"
        class="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {{ uploading ? 'Uploading...' : 'Upload' }}
      </button>
    </form>
    <div v-if="permalink" class="mt-4">
      <p>Permalink: <a :href="permalink" target="_blank" class="text-blue-500">{{ permalink }}</a></p>
    </div>
    <div v-if="error" class="mt-4 text-red-500">
      Error: {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const file = ref<File | null>(null)
const uploading = ref(false)
const permalink = ref('')
const error = ref('')

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] || null
}

const uploadFile = async () => {
  if (!file.value) return

  uploading.value = true
  error.value = ''
  permalink.value = ''

  try {
    const formData = new FormData()
    formData.append('file', file.value)

    const response = await $fetch<{ permalink: string }>('/api/debug/upload', {
      method: 'POST',
      body: formData,
    })

    permalink.value = response.permalink
  } catch (err: any) {
    error.value = err.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}
</script>