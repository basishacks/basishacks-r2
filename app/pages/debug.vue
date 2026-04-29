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
       <USelectMenu v-model="value" :items="items" />
      <div class="flex items-center">
        <input
          id="keepName"
          type="checkbox"
          v-model="keepOriginalName"
          class="w-4 h-4"
        />
        <label for="keepName" class="ml-2 text-sm font-medium">Keep original file name</label>
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

    <section class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Uploaded Asset Files</h2>
        <button
          @click="loadFiles"
          type="button"
          class="bg-secondary text-white px-3 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <div class="rounded border border-slate-200 p-4 bg-slate-50">
          <h3 class="text-xl font-semibold mb-2">/assets</h3>
          <ul class="space-y-2">
            <li v-if="loadingFiles" class="text-sm text-slate-500">Loading assets...</li>
            <li v-else-if="fileLists.assets.length === 0" class="text-sm text-slate-500">No file uploads found.</li>
            <li v-for="file in fileLists.assets" :key="file.name">
              <a :href="file.url" target="_blank" class="text-blue-600 hover:underline">{{ file.name }}</a>
            </li>
          </ul>
        </div>

        <div class="rounded border border-slate-200 p-4 bg-slate-50">
          <h3 class="text-xl font-semibold mb-2">/userast</h3>
          <ul class="space-y-2">
            <li v-if="loadingFiles" class="text-sm text-slate-500">Loading user assets...</li>
            <li v-else-if="fileLists.userast.length === 0" class="text-sm text-slate-500">No user asset uploads found.</li>
            <li v-for="file in fileLists.userast" :key="file.name">
              <a :href="file.url" target="_blank" class="text-blue-600 hover:underline">{{ file.name }}</a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

const file = ref<File | null>(null)
const uploading = ref(false)
const permalink = ref('')
const error = ref('')
const loadingFiles = ref(false)
const fileLists = ref({ assets: [] as Array<{ name: string; url: string }>, userast: [] as Array<{ name: string; url: string }> })

const items = ref(['static', 'user'])
const value = ref('static')
const keepOriginalName = ref(false)

const loadFiles = async () => {
  loadingFiles.value = true
  try {
    const response = await $fetch<{ assets: string[]; userast: string[] }>('/api/debug/files')
    fileLists.value.assets = response.assets.map((name) => ({ name, url: `/assets/${name}` }))
    fileLists.value.userast = response.userast.map((name) => ({ name, url: `/userast/${name}` }))
  } catch (err: any) {
    error.value = err.message || 'Unable to load file list'
  } finally {
    loadingFiles.value = false
  }
}

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

    const params = new URLSearchParams({
      mode: value.value,
      keepName: keepOriginalName.value ? 'true' : 'false',
    })
    const response = await $fetch<{ permalink: string }>(`/api/debug/upload?${params.toString()}`, {
      method: 'POST',
      body: formData,
    })

    permalink.value = response.permalink
    await loadFiles()
  } catch (err: any) {
    error.value = err.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}

onMounted(loadFiles)
</script>