<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
const { data: projects } = await useAsyncData('projects_list', async () => {
  return await queryCollection('projects').all();
});
</script>

<template>
  <div
    v-if="projects"
    class="flex w-full flex-col gap-4"
  >
    <NuxtLink
      v-for="project in projects.filter((project) => project.featured)"
      :key="project.name"
      class="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 hover:bg-secondary"
      :to="project.release === 'soon' ? '/' : project.link"
      :aria-label="project.name + ' project link'"
      :target="project.release === 'soon' ? '_self' : '_blank'"
    >
      <span class="whitespace-nowrap">
        {{ project.name }}
      </span>
      <div class="mx-2 h-[0.1px] w-full bg-muted" />
      <span class="whitespace-nowrap text-muted">
        {{ project.release === "soon" ? "soon..." : project.release }}
      </span>
    </NuxtLink>
    <div class="mt-4 flex justify-center">
      <button
        class="btn-primary"
        @click="useRouter().push('/works')"
      >
        See more
      </button>
    </div>
  </div>
</template>
