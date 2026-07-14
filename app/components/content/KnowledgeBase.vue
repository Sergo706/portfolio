<script lang="ts" setup>
const searchedTags = ref<string[]>([]);
const searchedCategory = ref<string[]>([]);
const searchedContentType = ref<"guide" | "tutorial" | "recipe" | "">('');
const searchedTitle = ref('');
const showSearch = ref(false);

const { data: guides } = await useAsyncData('knowledgeBase', async () => {
  return await queryCollection('knowledgeBase').all();
});

if (!guides.value)
  throw createError({ statusCode: 404, statusMessage: 'Page not found' });

const tags = computed(() =>
  Array.from(new Set(guides.value?.flatMap(guide => guide.tags))),
);

const categories = computed(() =>
  Array.from(new Set(guides.value?.map(guide => guide.category).filter(Boolean))),
);

const filteredGuides = computed(() =>
  guides.value?.filter(guide =>
    (searchedTags.value.length === 0 || searchedTags.value.some(tag => guide.tags.includes(tag))) &&
    (searchedCategory.value.length === 0 || searchedCategory.value.includes(guide.category)) &&
    (searchedContentType.value === '' || guide.contentType === searchedContentType.value) &&
    (searchedTitle.value === '' || guide.title.toLowerCase().includes(searchedTitle.value.toLowerCase())),
  ) ?? [],
);

const toggleTag = (tag: string) => {
  searchedTags.value = searchedTags.value.includes(tag)
    ? searchedTags.value.filter(t => t !== tag)
    : [...searchedTags.value, tag];
};

const toggleCategory = (category: string) => {
  searchedCategory.value = searchedCategory.value.includes(category)
    ? searchedCategory.value.filter(c => c !== category)
    : [...searchedCategory.value, category];
};
</script>

<template>
  <section class="mx-auto mt-4 flex max-w-4xl flex-col p-7 sm:mt-20">
    <h1 class="font-newsreader italic text-white-shadow text-center text-4xl">
      <slot
        name="title"
        mdc-unwrap="p"
      />
    </h1>
    <h2 class="text-center text-lg font-extralight italic text-muted">
      <slot
        name="subtitle"
        mdc-unwrap="p"
      />
    </h2>
    <Divider class="mb-8 mt-2" />
    <div
      :class="showSearch ? '' : 'mb-3'"
      class="flex items-center justify-between"
    >
      <span
        class="font-newsreader italic text-white-shadow cursor-pointer select-none text-lg hover:opacity-80 transition-opacity"
        @click="showSearch = !showSearch"
      >
        {{ showSearch ? "Hide filters" : "Search guides" }}
      </span>
      <NuxtLink
        to="/writing"
        class="font-newsreader italic text-muted hover:text-white-shadow cursor-pointer select-none text-lg transition-colors duration-200"
      >
        Back To Blog &rarr;
      </NuxtLink>
    </div>
    <div
      v-if="showSearch"
      class="mb-6 flex flex-col gap-6 rounded-md border border-white/5 bg-neutral-900/30 p-4"
    >
      <div>
        <UInput
          v-model="searchedTitle"
          class="w-full sm:w-96"
          placeholder="Search by title..."
        />
      </div>

      <div v-if="categories.length > 0">
        <span class="text-sm text-muted mb-2 block font-medium">Categories</span>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="category of categories"
            :key="category"
            class="hover:text-shadow-md flex cursor-pointer select-none items-center rounded-md bg-neutral-800 px-2 py-1 text-xs transition-colors duration-100 text-shadow-sm hover:bg-neutral-700 sm:text-sm"
            :class="{ 'bg-zinc-700': searchedCategory.includes(category) }"
            @click="toggleCategory(category)"
          >
            <div class="font-extralight">
              {{ category }}
            </div>
          </div>
        </div>
      </div>


      <div>
        <span class="text-sm text-muted mb-2 block font-medium">Content Type</span>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="type in ['guide', 'tutorial', 'recipe']"
            :key="type"
            class="hover:text-shadow-md flex cursor-pointer select-none items-center rounded-md bg-neutral-800 px-2 py-1 text-xs transition-colors duration-100 text-shadow-sm hover:bg-neutral-700 sm:text-sm capitalize"
            :class="{ 'bg-zinc-700': searchedContentType === type }"
            @click="searchedContentType = searchedContentType === type ? '' : type as any"
          >
            <div class="font-extralight">
              {{ type }}
            </div>
          </div>
        </div>
      </div>


      <div v-if="tags.length > 0">
        <span class="text-sm text-muted mb-2 block font-medium">Tags</span>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="tag of tags"
            :key="tag"
            class="hover:text-shadow-md flex cursor-pointer select-none items-center rounded-md bg-neutral-800 px-2 py-1 text-xs transition-colors duration-100 text-shadow-sm hover:bg-neutral-700 sm:text-sm"
            :class="{ 'bg-zinc-700': searchedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            <div class="font-extralight">
              {{ tag }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <TransitionGroup
      v-if="filteredGuides.length"
      name="list"
      tag="ul"
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-4"
    >
      <li
        v-for="guide of filteredGuides"
        :key="guide.path"
      >
        <GuideCard
          :title="guide.title"
          :description="guide.description"
          :date="guide.date"
          :image="guide.image"
          :path="guide.path"
          :content-type="guide.contentType"
          :category="guide.category"
          :reading-time="guide.readingTime"
          :tags="guide.tags"
        />
      </li>
    </TransitionGroup>
    
    <div
      v-else
      class="flex h-64 flex-col items-center justify-center gap-2 mt-4"
    >
      <span class="text-2xl font-newsreader italic text-white-shadow">
        No guides found.
      </span>
      <span class="text-sm text-muted font-light">
        Try adjusting your filters!
      </span>
    </div>
  </section>
</template>