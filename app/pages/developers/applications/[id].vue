<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { ManageRedirectUriRequest } from "~~/shared/schemas";
import { OAuth2Scopes } from "~~/shared/oauth2-scopes";
import type { FormSubmitEvent } from "@nuxt/ui";
import { useRequestURL } from "nuxt/app";

definePageMeta({
    layout: "developers-dashboard",
});

const route = useRoute();
const router = useRouter();
const clientID = route.params.id as string;
const toast = useToast();

// Client-side permission guard
const { user: me } = await useApiUser();

const isAdminUser = computed(
    () =>
        hasPermission(me.value?.role, "admin") ||
        hasPermission(me.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL),
);

const { data, status, error } = await useFetch<OAuth2Application>(`/api/applications/${clientID}`, {
    lazy: true,
});

const {
    data: secrets,
    status: secretsStatus,
    refresh: refreshSecrets,
} = await useFetch<{ abbreviated: string }[]>(() => `/api/applications/${clientID}/secrets`, {
    lazy: true,
});

const {
    data: redirectUris,
    status: redirectUrisStatus,
    refresh: refreshRedirectUris,
} = await useFetch<{ uri: string }[]>(() => `/api/applications/${clientID}/redirect_uris`, {
    lazy: true,
});

const {
    data: currentScopes,
    status: scopesStatus,
    refresh: refreshScopes,
} = await useFetch<{ scope: string; description: string; adminOnly: boolean }[]>(
    () => `/api/applications/${clientID}/scopes`,
    { lazy: true },
);

console.log(error);

const activeTab = computed({
    get: () => {
        const tab = route.query.tab;
        return (Array.isArray(tab) ? tab[0] : tab) || "general";
    },
    set: (value: string) => {
        router.replace({ query: { ...route.query, tab: value } });
    },
});

const navItems = computed<NavigationMenuItem[]>(() => [
    {
        label: "General details",
        icon: "i-lucide-info",
        active: activeTab.value === "general",
        onSelect: () => {
            activeTab.value = "general";
        },
    },
    {
        label: "Authorization (DevConnect)",
        icon: "i-lucide-shield-check",
        active: activeTab.value === "authorization",
        onSelect: () => {
            activeTab.value = "authorization";
        },
    },
]);

// --- Secrets ---
const creatingSecret = ref(false);
const deletingAbbrev = ref<string | null>(null);
const newSecretModalOpen = ref(false);
const newSecretPlain = ref("");

async function createSecret() {
    creatingSecret.value = true;
    try {
        const result = await $fetch<{ plain_secret: string }>(
            `/api/applications/${clientID}/secrets`,
            { method: "POST" },
        );
        newSecretPlain.value = result.plain_secret;
        newSecretModalOpen.value = true;
        await refreshSecrets();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        creatingSecret.value = false;
    }
}

async function deleteSecret(abbreviated: string) {
    deletingAbbrev.value = abbreviated;
    try {
        await $fetch(`/api/applications/${clientID}/secrets`, {
            method: "DELETE",
            body: { abbreviated },
        });
        toast.add({ title: "Success", description: "Secret deleted.", color: "success" });
        await refreshSecrets();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        deletingAbbrev.value = null;
    }
}

async function copySecret() {
    try {
        await navigator.clipboard.writeText(newSecretPlain.value);
        toast.add({
            title: "Copied",
            description: "Secret copied to clipboard.",
            color: "success",
        });
    } catch {
        toast.add({ title: "Error", description: "Failed to copy.", color: "error" });
    }
}

// --- Redirect URIs ---
const newUri = ref("");
const addingUri = ref(false);
const deletingUri = ref<string | null>(null);

async function addUri(event: FormSubmitEvent<typeof ManageRedirectUriRequest> | any) {
    addingUri.value = true;
    try {
        await $fetch(`/api/applications/${clientID}/redirect_uris`, {
            method: "POST",
            body: event.data,
        });
        toast.add({ title: "Success", description: "Redirect URI added.", color: "success" });
        newUri.value = "";
        await refreshRedirectUris();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        addingUri.value = false;
    }
}

async function removeUri(uri: string) {
    deletingUri.value = uri;
    try {
        await $fetch(`/api/applications/${clientID}/redirect_uris`, {
            method: "DELETE",
            body: { uri },
        });
        toast.add({ title: "Success", description: "Redirect URI removed.", color: "success" });
        await refreshRedirectUris();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        deletingUri.value = null;
    }
}

// --- Scope Permissions ---
const scopeModalOpen = ref(false);
const scopeSearch = ref("");
const selectedScopes = ref<string[]>([]);

const availableScopes = computed(() => {
    const current = new Set(currentScopes.value?.map((s) => s.scope) || []);
    return Object.entries(OAuth2Scopes)
        .filter(([scope]) => !current.has(scope))
        .filter(([scope, meta]: [string, any]) => {
            const q = scopeSearch.value.toLowerCase();
            return scope.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
        });
});

async function addSelectedScopes() {
    if (selectedScopes.value.length === 0) return;
    try {
        await $fetch(`/api/applications/${clientID}/scopes`, {
            method: "POST",
            body: { scopes: selectedScopes.value },
        });
        toast.add({ title: "Success", description: "Scopes added.", color: "success" });
        selectedScopes.value = [];
        scopeModalOpen.value = false;
        await refreshScopes();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    }
}

async function removeScope(scope: string) {
    try {
        await $fetch(`/api/applications/${clientID}/scopes`, {
            method: "DELETE",
            body: { scope },
        });
        toast.add({ title: "Success", description: "Scope removed.", color: "success" });
        await refreshScopes();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    }
}

// --- OAuth2 URL Generator ---
const urlScopeSearch = ref("");
const selectedUrlScopes = ref<string[]>([]);
const selectedRedirectUri = ref("");

const filteredUrlScopes = computed(() => {
    if (!currentScopes.value) return [];
    return currentScopes.value.filter((item) => {
        const q = urlScopeSearch.value.toLowerCase();
        return item.scope.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });
});

const redirectUriOptions = computed(() => (redirectUris.value || []).map((item) => item.uri));

const requestUrl = useRequestURL();
const generatedUrl = computed(() => {
    if (!data.value || !selectedRedirectUri.value || selectedUrlScopes.value.length === 0)
        return "";
    const params = new URLSearchParams({
        client_id: data.value.client_id,
        redirect_uri: selectedRedirectUri.value,
        scope: selectedUrlScopes.value.join(" "),
        response_type: "code",
    });
    return `${requestUrl.origin}/api/oauth2/authorize?${params.toString()}`;
});

async function copyGeneratedUrl() {
    try {
        await navigator.clipboard.writeText(generatedUrl.value);
        toast.add({ title: "Copied", description: "URL copied to clipboard.", color: "success" });
    } catch {
        toast.add({ title: "Error", description: "Failed to copy.", color: "error" });
    }
}
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
                <LoaderAnimationInline :show="true" />
            </div>

            <div v-else-if="status === 'error' || !data" class="text-center py-12 text-muted">
                <UIcon name="i-lucide-circle-x" class="text-4xl mb-2" />
                <p class="text-lg font-medium">Application not found</p>
                <p class="text-sm">
                    {{ error?.data?.message || "The requested application does not exist." }}
                </p>
            </div>

            <div v-else class="flex gap-6">
                <UNavigationMenu orientation="vertical" :items="navItems" class="w-48 shrink-0" />

                <div class="flex-1 min-w-0 space-y-4">
                    <UCard v-if="activeTab === 'general'">
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
                                <p>{{ data.description ?? "No description" }}</p>
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
                                        {{ data.proxy_microsoft ? "Yes" : "No" }}
                                    </UBadge>
                                </div>
                            </div>

                            <div>
                                <p class="text-sm text-muted">Redirect URIs</p>
                                <p class="break-all">{{ data.redirect_uris ?? "-" }}</p>
                            </div>
                        </div>
                    </UCard>

                    <UCard v-else-if="activeTab === 'authorization'">
                        <template #header>
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold">Authorization (DevConnect)</h3>
                            </div>
                        </template>

                        <div class="space-y-8">
                            <!-- Client Secrets -->
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="text-base font-medium">Client Secrets</h4>
                                        <p class="text-sm text-muted">
                                            Secrets are used to authenticate your application with
                                            the token endpoint.
                                        </p>
                                    </div>
                                    <UButton
                                        icon="i-lucide-plus"
                                        label="Create Secret"
                                        @click="createSecret"
                                        :loading="creatingSecret"
                                    />
                                </div>

                                <div
                                    v-if="secretsStatus === 'pending'"
                                    class="flex justify-center py-8"
                                >
                                    <LoaderAnimationInline :show="true" />
                                </div>

                                <div
                                    v-else-if="!secrets || secrets.length === 0"
                                    class="text-center py-8 text-muted"
                                >
                                    <UIcon name="i-lucide-key" class="text-4xl mb-2" />
                                    <p>No secrets created yet.</p>
                                </div>

                                <div v-else class="space-y-2">
                                    <div
                                        v-for="secret in secrets"
                                        :key="secret.abbreviated"
                                        class="flex items-center justify-between p-3 border rounded-lg border-default"
                                    >
                                        <div>
                                            <p class="font-mono text-sm">
                                                {{ secret.abbreviated }}
                                            </p>
                                        </div>
                                        <UButton
                                            icon="i-lucide-trash"
                                            color="error"
                                            variant="ghost"
                                            @click="deleteSecret(secret.abbreviated)"
                                            :loading="deletingAbbrev === secret.abbreviated"
                                        />
                                    </div>
                                </div>
                            </div>

                            <USeparator />

                            <!-- Redirect URIs -->
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="text-base font-medium">Redirect URIs</h4>
                                        <p class="text-sm text-muted">
                                            Registered URIs that the OAuth2 authorization flow may
                                            redirect to after authentication.
                                        </p>
                                    </div>
                                </div>

                                <UAlert
                                    color="neutral"
                                    variant="subtle"
                                    title="Redirect URI Requirement"
                                    icon="i-lucide-info"
                                >
                                    <template #description>
                                        <p>
                                            OAuth2.1 requires all redirect URIs to start with
                                            <code>http://localhost</code>
                                            or
                                            <code>https://</code>
                                        </p>
                                    </template>
                                </UAlert>

                                <UForm
                                    :schema="ManageRedirectUriRequest"
                                    :state="{ uri: newUri }"
                                    @submit="addUri"
                                    class="flex gap-2"
                                >
                                    <UFormField name="uri" class="flex-1">
                                        <UInput
                                            v-model="newUri"
                                            placeholder="https://example.com/callback"
                                            class="w-full"
                                        />
                                    </UFormField>
                                    <UButton
                                        type="submit"
                                        icon="i-lucide-plus"
                                        label="Add URI"
                                        :loading="addingUri"
                                    />
                                </UForm>

                                <div
                                    v-if="redirectUrisStatus === 'pending'"
                                    class="flex justify-center py-8"
                                >
                                    <LoaderAnimationInline :show="true" />
                                </div>

                                <div
                                    v-else-if="!redirectUris || redirectUris.length === 0"
                                    class="text-center py-8 text-muted"
                                >
                                    <UIcon name="i-lucide-link" class="text-4xl mb-2" />
                                    <p>No redirect URIs configured.</p>
                                </div>

                                <div v-else class="space-y-2">
                                    <div
                                        v-for="item in redirectUris"
                                        :key="item.uri"
                                        class="flex items-center justify-between p-3 border rounded-lg border-default"
                                    >
                                        <p class="text-sm break-all">{{ item.uri }}</p>
                                        <UButton
                                            icon="i-lucide-trash"
                                            color="error"
                                            variant="ghost"
                                            @click="removeUri(item.uri)"
                                            :loading="deletingUri === item.uri"
                                        />
                                    </div>
                                </div>
                            </div>

                            <USeparator />

                            <!-- Scope Permissions -->
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="text-base font-medium">Scope Permissions</h4>
                                        <p class="text-sm text-muted">
                                            Scopes define what user data your application can access
                                            during OAuth2 authorization.
                                        </p>
                                    </div>
                                    <UButton
                                        icon="i-lucide-plus"
                                        label="Add Scopes"
                                        @click="scopeModalOpen = true"
                                    />
                                </div>

                                <div
                                    v-if="scopesStatus === 'pending'"
                                    class="flex justify-center py-8"
                                >
                                    <LoaderAnimationInline :show="true" />
                                </div>

                                <div
                                    v-else-if="!currentScopes || currentScopes.length === 0"
                                    class="text-center py-8 text-muted"
                                >
                                    <UIcon name="i-lucide-scan-eye" class="text-4xl mb-2" />
                                    <p>No scope permissions configured.</p>
                                </div>

                                <div v-else class="space-y-2">
                                    <div
                                        v-for="item in currentScopes"
                                        :key="item.scope"
                                        class="flex items-center justify-between p-3 border rounded-lg border-default"
                                    >
                                        <div class="flex items-center gap-2">
                                            <div>
                                                <p class="font-mono text-sm font-medium">
                                                    {{ item.scope }}
                                                </p>
                                                <p class="text-xs text-muted">
                                                    {{ item.description }}
                                                </p>
                                            </div>
                                            <UBadge
                                                v-if="item.adminOnly"
                                                color="error"
                                                variant="subtle"
                                                size="sm"
                                            >
                                                Admin
                                            </UBadge>
                                        </div>
                                        <UButton
                                            icon="i-lucide-trash"
                                            color="error"
                                            variant="ghost"
                                            @click="removeScope(item.scope)"
                                        />
                                    </div>
                                </div>
                            </div>

                            <USeparator />

                            <!-- OAuth2 URL Generator -->
                            <div class="space-y-4">
                                <div>
                                    <h4 class="text-base font-medium">OAuth2 URL Generator</h4>
                                    <p class="text-sm text-muted">
                                        Generate an authorization URL for your application by
                                        selecting scopes and a redirect URI.
                                    </p>
                                </div>

                                <div>
                                    <p class="text-sm text-muted mb-2">Scopes</p>
                                    <UInput
                                        v-model="urlScopeSearch"
                                        placeholder="Search scopes..."
                                        icon="i-lucide-search"
                                        class="mb-2"
                                    />
                                    <div
                                        v-if="!currentScopes || currentScopes.length === 0"
                                        class="text-center py-4 text-muted border rounded-lg border-default"
                                    >
                                        <p class="text-sm">
                                            No scopes configured for this application.
                                        </p>
                                    </div>
                                    <div
                                        v-else
                                        class="space-y-1 max-h-48 overflow-y-auto border rounded-lg border-default p-2"
                                    >
                                        <label
                                            v-for="item in filteredUrlScopes"
                                            :key="item.scope"
                                            class="flex items-start gap-3 p-2 rounded hover:bg-elevated/50 cursor-pointer"
                                        >
                                            <input
                                                v-model="selectedUrlScopes"
                                                :value="item.scope"
                                                type="checkbox"
                                                class="mt-0.5 accent-primary"
                                            />
                                            <div>
                                                <p class="font-mono text-sm font-medium">
                                                    {{ item.scope }}
                                                </p>
                                                <p class="text-xs text-muted">
                                                    {{ item.description }}
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <USelectMenu
                                    v-model="selectedRedirectUri"
                                    :items="redirectUriOptions"
                                    placeholder="Select redirect URI"
                                    class="w-full"
                                />

                                <div>
                                    <p class="text-sm text-muted mb-1">Generated URL</p>
                                    <div class="flex gap-2">
                                        <UInput
                                            :model-value="generatedUrl"
                                            readonly
                                            placeholder="Select scopes and a redirect URI to generate a URL"
                                            class="font-mono text-xs flex-1"
                                        />
                                        <UButton
                                            icon="i-lucide-copy"
                                            color="neutral"
                                            variant="outline"
                                            @click="copyGeneratedUrl"
                                            :disabled="!generatedUrl"
                                        />
                                    </div>
                                </div>
                                <UAlert
                                    color="neutral"
                                    variant="subtle"
                                    title="Redirect URI Requirement"
                                    icon="i-lucide-info"
                                >
                                    <template #description>
                                        <div class="space-y-2">
                                            <p>
                                                For security reasons, DevConnect requires all
                                                application to supply a valid
                                                <code>state</code>
                                                parameter on authorization flow. You will need to
                                                add your own URL parameters for your application.
                                            </p>
                                            <p>
                                                OAuth2.1 requires
                                                <ULink
                                                    href="https://oauth.net/2/pkce/"
                                                    target="_blank"
                                                >
                                                    Proof Key for Code Exchange (PKCE)
                                                </ULink>
                                                (parameters such as
                                                <code>code_challenge</code>
                                                and
                                                <code>code_challenge_method</code>
                                                ) for
                                                <strong>both</strong>
                                                public and private applications, but your
                                                authorization flow will fallback to legacy OAuth2.0
                                                if no PKCE is provided.
                                            </p>
                                        </div>
                                    </template>
                                </UAlert>
                            </div>
                        </div>
                    </UCard>
                </div>
            </div>
        </template>
    </UDashboardPanel>

    <!-- Secret Created Modal -->
    <UModal v-model:open="newSecretModalOpen">
        <template #content>
            <UCard>
                <template #header>
                    <h3 class="text-base font-semibold">Secret Created</h3>
                </template>

                <p class="text-sm text-muted mb-3">
                    Copy this secret now. You won't be able to see it again.
                </p>
                <div class="flex gap-2">
                    <UInput :model-value="newSecretPlain" readonly class="font-mono flex-1" />
                    <UButton
                        icon="i-lucide-copy"
                        color="neutral"
                        variant="outline"
                        @click="copySecret"
                    />
                </div>

                <template #footer>
                    <div class="flex justify-end">
                        <UButton
                            color="neutral"
                            variant="outline"
                            @click="newSecretModalOpen = false"
                        >
                            Close
                        </UButton>
                    </div>
                </template>
            </UCard>
        </template>
    </UModal>

    <!-- Add Scopes Modal -->
    <UModal v-model:open="scopeModalOpen">
        <template #content>
            <UCard>
                <template #header>
                    <h3 class="text-base font-semibold">Add Scopes</h3>
                </template>

                <UInput
                    v-model="scopeSearch"
                    placeholder="Search scopes..."
                    icon="i-lucide-search"
                    class="mb-4"
                />

                <div v-if="availableScopes.length === 0" class="text-center py-6 text-muted">
                    <p>No available scopes to add.</p>
                </div>

                <div v-else class="space-y-2 max-h-64 overflow-y-auto">
                    <label
                        v-for="[scope, meta] in availableScopes"
                        :key="scope"
                        class="flex items-start gap-3 p-2 rounded hover:bg-elevated/50 cursor-pointer"
                        :class="{
                            'opacity-50 cursor-not-allowed hover:bg-transparent':
                                meta.adminOnly && !isAdminUser,
                        }"
                    >
                        <input
                            v-model="selectedScopes"
                            :value="scope"
                            type="checkbox"
                            class="mt-0.5 accent-primary"
                            :disabled="meta.adminOnly && !isAdminUser"
                        />
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <p class="font-mono text-sm font-medium">{{ scope }}</p>
                                <UBadge
                                    v-if="meta.adminOnly"
                                    color="error"
                                    variant="subtle"
                                    size="sm"
                                >
                                    Mod Approval
                                </UBadge>
                                <UBadge
                                    v-if="meta.sensitive"
                                    color="warning"
                                    variant="subtle"
                                    size="sm"
                                >
                                    User Consent
                                </UBadge>
                            </div>
                            <p class="text-xs text-muted">{{ meta.description }}</p>
                        </div>
                    </label>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <UButton color="neutral" variant="outline" @click="scopeModalOpen = false">
                            Cancel
                        </UButton>
                        <UButton @click="addSelectedScopes" :disabled="selectedScopes.length === 0">
                            Add Selected
                        </UButton>
                    </div>
                </template>
            </UCard>
        </template>
    </UModal>
</template>
