<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import AppErrorBlock from '~/components/AppErrorBlock.vue';

defineProps({
  error: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <AppErrorBlock
    :status-code="error.statusCode"
    :message="error.message || error.statusMessage"
    :error-description="error.data?.errorDescription"
    :image="error.data?.image"
  />
</template>
