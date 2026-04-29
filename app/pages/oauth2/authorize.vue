<template>
  <div class="oauth-container">
    <div class="oauth-card">
      <h1>Authorization Request</h1>
      <p class="subtitle">A client wants to access your account</p>

      <div class="client-info">
        <h2>{{ clientName }}</h2>
      </div>

      <div class="scopes">
        <h3>Requested Permissions:</h3>
        <ul>
          <li v-for="scope in scopes" :key="scope">{{ scope }}</li>
        </ul>
      </div>

      <div class="user-select">
        <label>Login as:</label>
        <select v-model="selectedUserId">
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }} ({{ user.email }})
          </option>
        </select>
      </div>

      <div class="actions">
        <button @click="deny" class="btn-deny">Deny</button>
        <button @click="approve" class="btn-approve">Approve</button>
      </div>
    </div>

    
  </div>
</template>

<style scoped>
      .oauth-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
      }

      .oauth-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 100%;
        padding: 40px;
      }

      h1 {
        margin-bottom: 8px;
        font-size: 28px;
        color: #1a1a1a;
      }

      .subtitle {
        color: #666;
        margin-bottom: 30px;
        font-size: 14px;
      }

      .client-info {
        background: #f5f5f5;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }

      .client-info h2 {
        margin: 0;
        font-size: 18px;
        color: #1a1a1a;
      }

      .scopes {
        margin-bottom: 30px;
      }

      .scopes h3 {
        font-size: 14px;
        margin-bottom: 12px;
        color: #1a1a1a;
      }

      .scopes ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .scopes li {
        padding: 8px 0;
        color: #666;
        font-size: 14px;
        border-bottom: 1px solid #eee;
      }

      .scopes li:last-child {
        border-bottom: none;
      }

      .user-select {
        margin-bottom: 30px;
      }

      .user-select label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        font-size: 14px;
        color: #1a1a1a;
      }

      .user-select select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .actions {
        display: flex;
        gap: 12px;
      }

      button {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .btn-deny {
        background: #f0f0f0;
        color: #1a1a1a;
      }

      .btn-deny:hover {
        background: #e0e0e0;
      }

      .btn-approve {
        background: #667eea;
        color: white;
      }

      .btn-approve:hover {
        background: #5568d3;
      }
    </style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { oauth2Store } from '~/../server/utils/oauth2'

const route = useRoute()
const router = useRouter()

const clientId = ref(route.query.client_id as string)
const scope = ref((route.query.scope as string) || '')
const selectedUserId = ref(1)

const users = ref([
  { id: 1, name: 'Test User', email: 'user@example.com' },
  { id: 2, name: 'Admin User', email: 'admin@example.com' }
])

const scopes = computed(() => scope.value.split(' ').filter(s => s))

const clientName = computed(() => {
  // This would normally come from the server
  return clientId.value === 'test-client' ? 'Test Client' : clientId.value
})

async function approve() {
  try {
    const response = await $fetch('/api/oauth2/authorize', {
      method: 'POST',
      body: {
        action: 'approve',
        user_id: selectedUserId.value
      }
    })
  } catch (error) {
    console.error('Approval failed:', error)
  }
}

function deny() {
  // Trigger a POST to deny
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/api/oauth2/authorize'
  
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'action'
  input.value = 'deny'
  
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
}
</script>
