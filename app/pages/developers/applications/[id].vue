<script setup lang="ts">
import { hasPermission, DevPermissions } from '~~/shared/permissions'

definePageMeta({
  layout: 'developers-dashboard'
})

const route = useRoute()
const clientID = route.params.id as string

// Client-side permission guard
const { user: me } = await useApiUser()
if (!hasPermission(me.value?.role, DevPermissions.APPLICATIONS) && !hasPermission(me.value?.role, 'admin')) {
  await navigateTo('/developers')
  useToast().add({ title: 'Access denied', description: 'You do not have permission to view applications.', color: 'error' })
}

const { data, status, error } = await useFetch<OAuth2Application>(`/api/applications/${clientID}`, {
  lazy: true
})
</script>

<template>
  <UDashboardPanel id="application-detail">
    <template #header>
      <UDashboardNavbar :title="data?.name ?? 'Application'">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/developers/applications"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="flex justify-center py-12">
        <ULoader />
      </div>

      <div v-else-if="status === 'error' || !data" class="text-center py-12 text-muted">
        <UIcon name="i-lucide-circle-x" class="text-4xl mb-2" />
        <p class="text-lg font-medium">Application not found</p>
        <p class="text-sm">{{ error?.statusMessage || 'The requested application does not exist.' }}</p>
      </div>

      <div v-else class="space-y-4">
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UAvatar
                v-if="data.profile_picture"
                :src="data.profile_picture"
                size="xl"
              />
              <div>
                <h2 class="text-lg font-semibold">{{ data.name }}</h2>
                <p class="text-sm text-muted">{{ data.client_id }}</p>
              </div>
            </div>
          </template>

          <div class="space-y-3">
            <div>
              <p class="text-sm text-muted">Description</p>
              <p>{{ data.description ?? 'No description' }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-muted">Type</p>
                <UBadge
                  class="capitalize mt-0.5"
                  variant="subtle"
                  :color="data.type === 'first' ? 'primary' : 'warning'"
                >
                  {{ data.type }}
                </UBadge>
              </div>

              <div>
                <p class="text-sm text-muted">Proxy Microsoft</p>
                <UBadge
                  class="capitalize mt-0.5"
                  variant="subtle"
                  :color="data.proxy_microsoft ? 'success' : 'neutral'"
                >
                  {{ data.proxy_microsoft ? 'Yes' : 'No' }}
                </UBadge>
              </div>
            </div>

            <div>
              <p class="text-sm text-muted">Redirect URIs</p>
              <p class="break-all">{{ data.redirect_uris ?? '-' }}</p>
            </div>

            <div>
              <p class="text-sm text-muted">Permissions</p>
              <p class="break-all">{{ data.permissions ?? '-' }}</p>
            </div>

            <div>
              <p class="text-sm text-muted">Client Secret</p>
              <p class="font-mono text-sm break-all">{{ data.client_secret }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
