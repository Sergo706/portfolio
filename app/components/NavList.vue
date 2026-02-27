<script setup lang="ts">
defineProps({
  as: {
    type: String,
    default: 'div',
  },
});

import type { ComponentPublicInstance } from 'vue';

const container = ref<ComponentPublicInstance | HTMLElement | null>(null);

const children = ref<HTMLElement[]>([]);

onMounted(() => {
  if (container.value) {
    const el: unknown = ('$el' in container.value) ? container.value.$el : container.value;
    if (el instanceof HTMLElement) {
      children.value = Array.from(el.children) as HTMLElement[];
    }
  }
});

provide('peers', children);
</script>

<template>
  <component
    :is="as"
    ref="container"
  >
    <slot />
  </component>
</template>
