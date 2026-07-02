<script lang="ts" setup>
import { CreateApplicationRequest } from "~~/shared/schemas";
import type { FormSubmitEvent } from "@nuxt/ui";
import { DevPermissions, hasPermission } from "~~/shared/permissions";

definePageMeta({
    layout: "developers-dashboard",
});

const state = reactive<Partial<CreateApplicationRequest>>({
    name: undefined,
    description: undefined,
    proxy_microsoft: false,
    type: "third",
});

const toast = useToast();
async function onSubmit(event: FormSubmitEvent<CreateApplicationRequest>) {
    try {
        await $fetch("/api/applications", {
            method: "POST",
            body: event.data,
        });
        toast.add({ title: "Success", description: "Application created.", color: "success" });
        await navigateTo("/developers/applications");
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    }
}

// elements
const ms_proxy_items = ref([
    { label: "Yes", value: true },
    { label: "No", value: false },
]);

const type_items = ref([
    { label: "First Party", value: "first" },
    { label: "Third Party", value: "third" },
]);

const { user }: { user: Ref<APIUser | null | undefined> } = await useApiUser();

const authorized = computed(() => {
    return (
        hasPermission(user?.value?.role, DevPermissions.PORTAL_APPLICATIONS_CREATE) ||
        hasPermission(user.value?.role, "admin")
    );
});

const canCreateFirstParty = computed(() => {
    return (
        hasPermission(user?.value?.role, DevPermissions.PORTAL_APPLICATIONS_CREATE_FIRST_PARTY) ||
        hasPermission(user.value?.role, "admin")
    );
});
</script>

<template>
    <UDashboardPanel>
        <template #header>
            <UDashboardNavbar>
                <template #title>
                    <ULink raw class="hover:underline" to="/developers/applications">
                        Applications
                    </ULink>
                    <UIcon name="i-lucide-arrow-right"></UIcon>
                    Create
                </template>
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UForm
                :schema="CreateApplicationRequest"
                :state="state"
                class="w-[600px] space-y-3"
                @submit="onSubmit"
            >
                <UFormField name="name">
                    <template #label>
                        Application Name
                        <UIcon name="i-lucide-asterisk" class="text-red-400"></UIcon>
                    </template>
                    <UInput
                        :maxlength="64"
                        v-model="state.name"
                        class="w-full"
                        placeholder='e.g. "FreeCodex, Aaron Assistant, ...'
                    >
                        <template #trailing>
                            <div
                                id="character-count"
                                class="text-xs text-muted tabular-nums"
                                aria-live="polite"
                                role="status"
                            >
                                {{ 64 - (state.name ? state.name.length : 0) }}
                            </div>
                        </template>
                    </UInput>
                </UFormField>

                <UFormField label="Application Description" name="description">
                    <UTextarea
                        :maxlength="1024"
                        :rows="12"
                        v-model="state.description"
                        class="w-full"
                        placeholder="e.g. This App provides free Codex tokens to all users. By hacking into OpenAI's internal database, this application..."
                    >
                        <template #trailing>
                            <div
                                id="character-count"
                                class="text-xs text-muted tabular-nums"
                                aria-live="polite"
                                role="status"
                            >
                                {{ 1024 - (state.description ? state.description.length : 0) }}
                            </div>
                        </template>
                    </UTextarea>
                </UFormField>

                <UFormField name="type" label="Application Type">
                    <USelect
                        v-model="state.type"
                        :items="type_items"
                        :disabled="!canCreateFirstParty"
                    />
                </UFormField>

                <p class="text-xs text-muted">
                    First-party applications are trusted internal applications. Third-party
                    applications are external integrations. Admin consent is required to create a
                    first-party application.
                </p>

                <UFormField name="proxy_microsoft" label="Serve as Microsoft Proxy">
                    <USelect v-model="state.proxy_microsoft" :items="ms_proxy_items" />
                </UFormField>

                <p class="text-xs text-muted">
                    Selecting "Yes" will tell the OAuth login flow to automatically redirect the
                    user login to Microsoft, instead of giving them an option to choose whether to
                    log in with a teams code or with Microsoft. This option is great for creating
                    applications that does not want to affiliate with basishacks accounts.
                </p>

                <UButton type="submit" :disabled="!authorized">Create Application</UButton>

                <p class="text-xs text-muted">
                    API keys, secrets, and permissions can be configured after the creation of this
                    app.
                </p>

                <USeparator></USeparator>
                <FormRequiredNotification></FormRequiredNotification>
            </UForm>
        </template>
    </UDashboardPanel>
</template>
