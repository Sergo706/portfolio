<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
const { data: projects } = await useAsyncData('projects', async () => {
  return await queryCollection('projects').all();
});
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <h3 class="font-newsreader italic text-white-shadow text-xl">
      Works & Projects
    </h3>
    <ProjectList
      v-if="projects"
      :projects="projects"
    />
    <NuxtLink
      to="/works"
      aria-label="View all works and projects"
    >
      <span class="font-newsreader italic text-white-shadow cursor-pointer">
        See all works & projects →
      </span>
    </NuxtLink>
  </div>
</template>
