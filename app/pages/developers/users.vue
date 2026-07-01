<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel } from '@tanstack/table-core'
import { hasPermission, DevPermissions, parsePermissions } from '~~/shared/permissions'

definePageMeta({
  layout: 'developers-dashboard'
})

const UserAvatar = resolveComponent('UserAvatar')
const UserPopover = resolveComponent('UserPopover')
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const table = useTemplateRef<any>('table')
const modalOpen = ref(false)

const columnFilters = ref([{
  id: 'email',
  value: ''
}])
const columnVisibility = ref()
const rowSelection = ref<Record<string, boolean>>({})

type AdminUser = User & { past_team_ids: string | null }

const { data, status, refresh } = await useFetch<AdminUser[]>('/api/users', {
  lazy: true
})

// Client-side permission guard
const { user: me } = await useApiUser()
if (!hasPermission(me.value?.role, DevPermissions.PORTAL_USERS_VIEW) && !hasPermission(me.value?.role, 'admin')) {
    useToast().add({ title: 'Access denied', description: 'You do not have permission to view users.', color: 'error' })
    throw await navigateTo('/developers')
}

const selectedRows = computed<any[]>(() => {
  if (!table.value?.tableApi) return []
  return table.value.tableApi.getFilteredSelectedRowModel().rows
})

const selectedIds = computed(() =>
  selectedRows.value.map((row: any) => row.original.id as number)
)

async function onDelete() {
  if (selectedIds.value.length === 0) return

  try {
    await $fetch('/api/users', {
      method: 'DELETE',
      body: { ids: selectedIds.value }
    })

    toast.add({
      title: 'Users deleted',
      description: `Successfully deleted ${selectedIds.value.length} user(s).`,
      color: 'success'
    })

    rowSelection.value = {}
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.message || 'Failed to delete users.',
      color: 'error'
    })
  } finally {
    modalOpen.value = false
  }
}

const columns: TableColumn<AdminUser>[] = [
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
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const name = row.original.name ?? 'Unknown'
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UserPopover, { user: row.original.id }, {
          default: () => h(UserAvatar, {
            user: row.original,
            size: 'lg'
          })
        }),
        h('p', { class: 'font-medium text-highlighted' }, name)
      ])
    }
  },
  {
    accessorKey: 'email',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Email',
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
    accessorKey: 'role',
    header: 'Permissions',
    cell: ({ row }) => {
      const perms = parsePermissions(row.original.role)
      return h('div', { class: 'flex flex-wrap gap-1' },
        perms.map((p) => {
          const color = p === 'admin' ? 'error' : p === 'judge' ? 'warning' : 'primary'
          return h(UBadge, { class: 'capitalize', variant: 'subtle', color, size: 'sm' }, () => p)
        })
      )
    }
  },
  {
    accessorKey: 'team_id',
    header: 'Team ID',
    cell: ({ row }) => row.original.team_id ?? '-'
  },
  {
    accessorKey: 'past_team_ids',
    header: 'Past Teams',
    cell: ({ row }) => {
      const ids = row.original.past_team_ids
      if (!ids) return '-'
      const idList = ids.split(',').map((s) => parseInt(s.trim())).filter(Boolean)
      return h('div', { class: 'flex flex-wrap gap-1' },
        idList.map((tid) => h(UBadge, { variant: 'subtle', color: 'neutral', size: 'sm' }, () => String(tid)))
      )
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const userId = row.original.id
      return h('div', { class: 'text-right' }, [
        h(UDropdownMenu, {
          items: [
            {
              label: 'Log in as user',
              icon: 'i-lucide-log-in',
              onSelect: async () => {
                try {
                  await $fetch('/api/auth/impersonate', {
                    method: 'POST',
                    body: { userId },
                  })
                  window.location.href = '/'
                } catch (e: any) {
                  useToast().add({
                    title: 'Error',
                    description: e?.data?.message || e?.message || 'Failed to log in as user.',
                    color: 'error',
                  })
                }
              },
            },
          ],
          content: { align: 'end' },
        }, {
          default: () => h(UButton, {
            icon: 'i-lucide-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost',
            ariaLabel: 'Actions',
          }),
        }),
      ])
    },
  },
]

const email = computed({
  get: (): string => {
    return (table.value?.tableApi?.getColumn('email')?.getFilterValue() as string) || ''
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn('email')?.setFilterValue(value || undefined)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="email"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filter emails..."
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
            <h3 class="text-base font-semibold">Delete users</h3>
          </div>
        </template>

        <p class="text-muted">
          Are you sure you want to delete <strong>{{ selectedRows.length }}</strong> selected user(s)?
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
