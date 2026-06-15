<script setup lang="ts">
import type { ThreadSummary } from "#shared/types/thread";
import { deleteThread } from "~/composables/chat/navigation";
import { formatThreadTime } from "~/composables/chat/useThreads";

defineProps<{
  threads: ThreadSummary[];
  pending?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const route = useRoute();
const deletingId = ref<string | null>(null);
const confirmOpen = ref(false);
const targetThread = ref<ThreadSummary | null>(null);

function isActive(id: string) {
  return route.params.id === id;
}

function openDelete(thread: ThreadSummary) {
  targetThread.value = thread;
  confirmOpen.value = true;
}

async function confirmDelete() {
  if (!targetThread.value) return;

  deletingId.value = targetThread.value.id;
  try {
    await deleteThread(targetThread.value.id);
    emit("refresh");
  }
  finally {
    deletingId.value = null;
    confirmOpen.value = false;
    targetThread.value = null;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <p class="mb-2 px-3 text-xs font-medium text-muted">
      Recent
    </p>

    <div
      v-if="pending && !threads.length"
      class="px-3 text-sm text-dimmed"
    >
      Loading…
    </div>

    <p
      v-else-if="!threads.length"
      class="px-3 text-sm text-dimmed"
    >
      No chats yet.
    </p>

    <nav
      v-else
      class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2"
    >
      <div
        v-for="thread in threads"
        :key="thread.id"
        class="group flex items-center gap-1 rounded-md"
        :class="isActive(thread.id) ? 'bg-elevated' : 'hover:bg-elevated/60'"
      >
        <NuxtLink
          :to="`/chat/${thread.id}`"
          class="min-w-0 flex-1 px-2 py-2"
        >
          <p class="truncate text-sm text-highlighted">
            {{ thread.title }}
          </p>
          <p class="text-xs text-dimmed">
            {{ formatThreadTime(thread.updatedAt) }}
          </p>
        </NuxtLink>

        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          class="me-1 shrink-0 opacity-0 group-hover:opacity-100"
          :loading="deletingId === thread.id"
          aria-label="Delete chat"
          @click.prevent="openDelete(thread)"
        />
      </div>
    </nav>

    <UModal
      v-model:open="confirmOpen"
      title="Delete chat?"
      :description="`“${targetThread?.title}” will be removed from your history. This cannot be undone.`"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="confirmOpen = false"
        />
        <UButton
          color="error"
          label="Delete"
          :loading="!!deletingId"
          @click="confirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
