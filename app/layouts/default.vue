<script setup lang="ts">
import { agent } from "~~/shared/agent";
import { startNewChat } from "~/composables/chat/navigation";
import { useThreadList } from "~/composables/chat/useThreads";

const sidebarOpen = ref(false);
const searchOpen = ref(false);

const { threads, pending, refresh } = useThreadList();

const searchGroups = computed(() => [
  {
    id: "actions",
    label: "Actions",
    items: [
      {
        label: "New chat",
        to: "/",
        icon: "i-lucide-circle-plus",
        kbds: ["meta", "o"],
        onSelect: () => startNewChat(),
      },
    ],
  },
  ...(threads.value.length
    ? [{
        id: "threads",
        label: "Recent chats",
        items: threads.value.map(thread => ({
          label: thread.title,
          to: `/chat/${thread.id}`,
          icon: "i-lucide-message-square",
        })),
      }]
    : []),
]);

defineShortcuts({
  meta_o: () => startNewChat(),
  meta_k: () => {
    searchOpen.value = true;
  },
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      :menu="{ inset: true }"
      class="border-r-0 py-4 dark:[--ui-bg-elevated:var(--ui-color-neutral-900)]"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          v-if="!collapsed"
          to="/"
          class="flex items-center gap-2"
        >
          <Logo class="size-8 shrink-0" />
          <span class="text-xl font-bold text-highlighted">{{ agent.name }}</span>
        </NuxtLink>

        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="[
            {
              label: 'New chat',
              icon: 'i-lucide-circle-plus',
              kbds: ['meta', 'o'],
              onSelect: () => startNewChat(),
            },
            {
              label: 'Search',
              icon: 'i-lucide-search',
              kbds: ['meta', 'k'],
              onSelect: () => {
                searchOpen = true;
              },
            },
          ]"
          :collapsed="collapsed"
          orientation="vertical"
        >
          <template #item-trailing="{ item }">
            <div
              v-if="item.kbds?.length"
              class="flex items-center gap-px opacity-0 transition-opacity group-hover:opacity-100"
            >
              <UKbd
                v-for="kbd in item.kbds"
                :key="kbd"
                :value="kbd"
                size="sm"
                variant="soft"
                class="bg-accented/50"
              />
            </div>
          </template>
        </UNavigationMenu>

        <ChatThreadList
          v-if="!collapsed"
          class="mt-4 min-h-0 flex-1"
          :threads="threads"
          :pending="pending"
          @refresh="refresh()"
        />
      </template>

      <template #footer />
    </UDashboardSidebar>

    <UDashboardSearch
      v-model:open="searchOpen"
      placeholder="Search chats and actions..."
      :groups="searchGroups"
    />

    <div class="m-4 flex flex-1 min-w-0 overflow-hidden rounded-lg bg-default/75 shadow ring ring-default lg:ml-0">
      <slot />
    </div>
  </UDashboardGroup>
</template>
