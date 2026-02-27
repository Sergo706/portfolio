<script setup lang="ts">
import type { ContentCollectionItem } from '@nuxt/content';

const { page, isWriting } = defineProps<{
  page: ContentCollectionItem
  isWriting: boolean
}>();

const route = useRoute();
const { link, seo, profile } = useAppConfig();

const pageSEO = computed(() => ({
  title: isWriting ? page.title : page.title || seo.title,
  description: isWriting ? page.description : page.description || seo.description,
}));

const getTitleTemplate = (title: string | undefined): string | undefined => {
  if (route.path === '/') return title ?? seo.title;
  if (isWriting) return title;
  return `${String(title)} | ${seo.title}`;
};

useSeoMeta({
  ogSiteName: seo.title,
  ogTitle: pageSEO.value.title,
  ogDescription: pageSEO.value.description,
  ogType: isWriting ? 'article' : 'website',
  ogUrl: seo.url,
  author: profile.name,
  title: pageSEO.value.title,
  description: pageSEO.value.description,
  twitterTitle: pageSEO.value.title,
  twitterDescription: pageSEO.value.description,
  twitterCard: 'summary_large_image',
});

useHead({
  title: pageSEO.value.title,
  titleTemplate: getTitleTemplate(undefined),
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: 'charset', content: 'utf-8' },
    { name: 'robots', content: 'index, follow' },
    { name: 'color-scheme', content: 'light dark' },
  ],
  link,
});

defineOgImage({ url: `${seo.url}/projects/portfolio.png`, width: 1200, height: 630, alt: 'Portfolio Site image' });
</script>

<template>
  <slot />
</template>
