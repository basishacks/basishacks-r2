<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel } from '@tanstack/table-core'
import { hasPermission, DevPermissions } from '~~/shared/permissions'

definePageMeta({
  layout: 'developers-dashboard'
})

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')
const NuxtLink = resolveComponent('NuxtLink')

const toast = useToast()
const table = useTemplateRef<any>('table')
const modalOpen = ref(false)

const columnFilters = ref([{
  id: 'name',
  value: ''
}])
const columnVisibility = ref()
const rowSelection = ref<Record<string, boolean>>({})

const { data, status, refresh } = await useFetch<OAuth2Application[]>('/api/applications', {
  lazy: true
})

// Client-side permission guard
const { user: me }: any = await useApiUser()
if (!hasPermission(me.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW) && !hasPermission(me.value?.role, 'admin')) {
  await navigateTo('/developers')
  useToast().add({ title: 'Access denied', description: 'You do not have permission to view applications.', color: 'error' })
}

const selectedRows = computed<any[]>(() => {
  if (!table.value?.tableApi) return []
  return table.value.tableApi.getFilteredSelectedRowModel().rows
})

const selectedIds = computed(() =>
  selectedRows.value.map((row: any) => row.original.client_id as string)
)

async function onDelete() {
  if (selectedIds.value.length === 0) return

  try {
    await $fetch('/api/applications', {
      method: 'DELETE',
      body: { ids: selectedIds.value }
    })

    toast.add({
      title: 'Applications deleted',
      description: `Successfully deleted ${selectedIds.value.length} application(s).`,
      color: 'success'
    })

    rowSelection.value = {}
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.message || 'Failed to delete applications.',
      color: 'error'
    })
  } finally {
    modalOpen.value = false
  }
}

const columns: TableColumn<OAuth2Application>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
  {
    accessorKey: 'client_id',
    header: 'Client ID'
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Name',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type
      const color = type === 'first' ? 'primary' : 'warning'
      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => type)
    }
  },
  {
    accessorKey: 'proxy_microsoft',
    header: 'Proxy MS',
    cell: ({ row }) => {
      const proxy = row.original.proxy_microsoft
      return h(UBadge, {
        class: 'capitalize',
        variant: 'subtle',
        color: proxy ? 'success' : 'neutral'
      }, () => (proxy ? 'Yes' : 'No'))
    }
  },

  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          NuxtLink,
          { to: `/developers/applications/${row.original.client_id}` },
          () =>
            h(UButton, {
              icon: 'i-lucide-arrow-right',
              color: 'neutral',
              variant: 'ghost',
              label: 'Edit'
            })
        )
      )
    }
  }
]

const nameFilter = computed({
  get: (): string => {
    return (table.value?.tableApi?.getColumn('name')?.getFilterValue() as string) || ''
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn('name')?.setFilterValue(value || undefined)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})


const create_authorized = computed(() => {
  return hasPermission(me.value?.role, DevPermissions.PORTAL_APPLICATIONS_CREATE) || hasPermission(me.value?.role, 'admin')
})
</script>

<template>
  <UDashboardPanel id="applications">
    <template #header>
      <UDashboardNavbar title="Applications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>

      <!--Actions-->
      <div class="flex flex-wrap items-center justify-start gap-1.5">
        <UButton icon="i-lucide-plus" label="Create Application" :disabled="!create_authorized" @click="navigateTo('/developers/applications/create')" />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="nameFilter"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filter names..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            v-if="selectedRows.length"
            label="Delete selected"
            color="error"
            variant="subtle"
            icon="i-lucide-trash"
            @click="modalOpen = true"
          >
            <template #trailing>
              <UKbd>{{ selectedRows.length }}</UKbd>
            </template>
          </UButton>

          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault()
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="shrink-0"
        :data="data"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ selectedRows.length || 0 }} of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="modalOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-trash" class="text-error" />
            <h3 class="text-base font-semibold">Delete applications</h3>
          </div>
        </template>

        <p class="text-muted">
          Are you sure you want to delete <strong>{{ selectedRows.length }}</strong> selected application(s)?
          This action cannot be undone.
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="modalOpen = false">
              Cancel
            </UButton>
            <UButton color="error" @click="onDelete">
              Delete
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
