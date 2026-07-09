<script setup lang="ts">
import type { ContentCollectionItem, ProjectsCollectionItem } from '@nuxt/content';

const { page, isWriting } = defineProps<{
  page: ContentCollectionItem | ProjectsCollectionItem
  isWriting: boolean
}>();

const route = useRoute();
const { link, seo, profile } = useAppConfig();

const isProject = (p: ContentCollectionItem | ProjectsCollectionItem): p is ProjectsCollectionItem => 'name' in p && 'github' in p;

const pageSEO = computed(() => {
  if (isProject(page)) {
    return {
      title: page.name,
      description: page.description ?? seo.description,
      image: page.image || `${seo.url}/projects/portfolio.png`,
      url: `${seo.url}${route.path}`
    };
  }
  return {
    title: isWriting ? page.title : page.title || seo.title,
    description: isWriting ? page.description : page.description || seo.description,
    image: `${seo.url}/projects/portfolio.png`,
    url: seo.url
  };
});

const getTitleTemplate = (titleChunk: string | undefined): string => {
  if (route.path === '/') return titleChunk ?? seo.title;
  if (isWriting) return titleChunk ?? '';
  return titleChunk ? `${titleChunk} | ${seo.title}` : seo.title;
};

useSeoMeta({
  ogSiteName: seo.title,
  ogTitle: pageSEO.value.title,
  ogDescription: pageSEO.value.description,
  ogType: isWriting ? 'article' : 'website',
  ogUrl: pageSEO.value.url,
  ogImage: pageSEO.value.image,
  author: profile.name,
  title: pageSEO.value.title,
  description: pageSEO.value.description,
  twitterTitle: pageSEO.value.title,
  twitterDescription: pageSEO.value.description,
  twitterImage: pageSEO.value.image,
  twitterCard: 'summary_large_image',
});

useHead({
  title: pageSEO.value.title,
  titleTemplate: getTitleTemplate,
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: 'charset', content: 'utf-8' },
    { name: 'robots', content: 'index, follow' },
    { name: 'color-scheme', content: 'light dark' },
  ],
  link,
});

defineOgImage({ url: pageSEO.value.image, width: 1200, height: 630, alt: pageSEO.value.title });
</script>

<template>
  <slot />
</template>
