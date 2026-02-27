<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';

const props = defineProps({
  as: {
    type: String,
    default: 'div',
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const container = ref<ComponentPublicInstance | HTMLElement | null>(null);

interface NavContext {
  activeItem: { index: number };
  isMounted: boolean;
  isVertical: boolean;
  setMounted: () => void;
  setActiveItem: (index: number, size: number, offset: number) => void;
}

const context = inject<NavContext>('nav-context');

const peers = inject<Ref<HTMLElement[]>>('peers');
const index = computed(() => {
  if (!container.value) return -1;
  const el: unknown = ('$el' in container.value) ? container.value.$el : container.value;
  return peers?.value ? peers.value.indexOf(el as HTMLElement) : -1;
});

// active item indicator
const isActive = computed(() => {
  return context?.activeItem.index === index.value;
});

watch(index, () => {
  // set default element as active
  if (props.active) {
    setActive();
  }

  if (peers?.value && index.value === peers.value.length - 1) {
    context?.setMounted();
  }
});

watch(() => context?.isMounted, () => {
  // set first element as active
  if (context?.activeItem.index === -1 && index.value === 0) {
    setActive();
  }
});

function setActive() {
  if (!context || !container.value) return;
  const el: unknown = ('$el' in container.value) ? container.value.$el : container.value;
  if (!(el instanceof HTMLElement)) return;

  if (context.isVertical) {
    context.setActiveItem(index.value, el.getBoundingClientRect().height, el.offsetTop);
  }
  else {
    context.setActiveItem(index.value, el.getBoundingClientRect().width, el.offsetLeft);
  }
}
</script>

<template>
  <component
    :is="as"
    ref="container"
  >
    <slot
      :set-active
      :is-active
    />
  </component>
</template>
