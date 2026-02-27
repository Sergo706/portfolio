<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { withLeadingSlash } from 'ufo';
import type { ContentCollectionItem } from '@nuxt/content';

const route = useRoute();

const slug = computed(() => Array.isArray(route.params.slug) ? route.params.slug as string[] : [route.params.slug]);
const path = computed(() => withLeadingSlash((slug.value).join('/')));

const { data: page } = await useAsyncData<ContentCollectionItem | null>(path.value, async () =>
  await queryCollection('content').path(path.value).first(),
);

if (!page.value)
  throw createError({ statusCode: 404, statusMessage: 'Page not found' });

const { profile } = useAppConfig();

const { copy } = useClipboard();

defineShortcuts({
  meta_o: {
    usingInput: true,
    handler: () => {
      void copy(profile.email);
      toast.success('Copied to clipboard!');
    },
  },
});
</script>

<template>
  <div v-if="page">
    <FolioMeta
      :page="page"
      :is-writing="route.path.includes('/articles/')"
    />
    <ContentRenderer
      :value="page"
    />
  </div>
</template>
