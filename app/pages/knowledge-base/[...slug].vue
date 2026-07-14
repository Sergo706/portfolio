<!-- eslint-disable vue/multi-word-component-names -->
<script lang="ts" setup>
import { withLeadingSlash, joinURL } from 'ufo';

const route = useRoute();

const slug = computed(() => 
  Array.isArray(route.params.slug) 
    ? route.params.slug as string[] 
    : [route.params.slug ?? '']
);

const path = computed(() => withLeadingSlash(joinURL('knowledge-base', ...slug.value)));

const { data: page } = await useAsyncData(path.value, async () =>
  await queryCollection('knowledgeBase').path(path.value).first(),
);

const { data: surround } = await useAsyncData(`${path.value}-surround`, () => {
  return queryCollectionItemSurroundings('knowledgeBase', path.value);
});

if (!page.value) 
  throw createError({ statusCode: 404, statusMessage: `Page Not found` });

const { copy } = useClipboard();

function copyGuideLink() {
  void copy(`${window.location.origin}${route.fullPath}`);
  toast.success('Copied to clipboard!');
}

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => {
      void copy(`${window.location.origin}${route.fullPath}`);
      toast.success('Copied to clipboard!');
    },
  },
});

if (page.value.image) {
  defineOgImage({
    url: page.value.image,
  });
}

const contentTypeIcon = computed(() => {
  if (page.value?.contentType === 'guide') return 'i-lucide-book-open';
  if (page.value?.contentType === 'recipe') return 'i-lucide-file-code-2';
  return 'i-lucide-graduation-cap';
});

const contentTypeColor = computed(() => {
  if (page.value?.contentType === 'guide') return 'primary';
  if (page.value?.contentType === 'recipe') return 'warning';
  return 'info';
});

</script>

<template>
  <FolioMeta
    v-if="page"
    :page="page"
    :is-writing="true"
  />
  <UPage
    v-if="page"
    class="writing mx-auto px-4 sm:max-w-2xl md:max-w-3xl lg:max-w-6xl"
    as="article"
  >
    <UPageHeader>
      <NuxtLink
        to="/guides"
        class="mx-auto my-8 flex cursor-pointer items-center gap-2 text-muted hover:text-primary transition-colors duration-200 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
      >
        <UIcon
          name="lucide:arrow-left"
          class="size-4"
        />
        <span class="text-sm font-extralight">
          Knowledge Base
        </span>
      </NuxtLink>
      <h1 class="text-3xl font-bold">
        {{ page?.title }}
      </h1>
      <div class="info-section mt-3 flex flex-wrap items-center gap-3">
        <UBadge
          :icon="contentTypeIcon"
          :color="contentTypeColor"
          variant="subtle"
          size="sm"
          class="capitalize font-medium tracking-wide shadow-sm"
        >
          {{ page.contentType }}
        </UBadge>

        <span class="flex items-center gap-1 text-xs">
          <UIcon
            name="lucide:folder"
            class="size-3"
          />
          {{ page?.category }}
        </span>

        <span class="hidden sm:block text-muted">|</span>
        <NuxtTime
          v-if="page?.date"
          class="text-xs"
          :datetime="page.date"
          month="short"
          day="numeric"
          year="numeric"
        />
        <span class="hidden sm:block text-muted">|</span>
        <span class="text-xs">{{ page?.readingTime }} min read</span>
        <span class="hidden sm:block text-muted">|</span>
        <UTooltip
          text="Copy Link"
          :shortcuts="['⌘', 'K']"
        >
          <p
            class="flex cursor-pointer select-none items-center gap-1 text-xs transition-colors duration-200 hover:text-primary"
            @click="copyGuideLink"
          >
            Share
          </p>
        </UTooltip>
      </div>
      <p class="mt-6 text-lg text-muted font-light leading-relaxed">
        {{ page?.description }}
      </p>
    </UPageHeader>
    <div
      v-if="page?.body?.toc?.links"
      class="block lg:hidden mb-8 mt-0 "
    >
      <UContentToc
        :links="page.body.toc.links"
        class=" mx-auto px-6 bg-transparent!"
      />
    </div>
    <UPageBody>
      <ContentRenderer
        v-if="page"
        :value="page"
      />
      <USeparator />

      <UContentSurround :surround="surround" />
    </UPageBody>
    <template #right>
      <UPageAside
        v-if="page?.body?.toc?.links"
        class="hidden lg:block"
      >
        <UContentToc :links="page.body.toc.links" />
      </UPageAside>
    </template>
  </UPage>
</template>

<style scoped>
.info-section {
  font-weight: 200;
  color: #7d8084;
  text-decoration: none;
  text-align: left;
}
</style>