<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">

defineProps<{
  projects: {
    name: string;
    release: string;
    image: string;
    link?: string;
    github: string;
    npm?: string;
    description?: string;
    featured?: boolean;
  }[];
}>();
</script>


<template>
  <div class="flex w-full flex-col gap-4">
    <NuxtLink
      v-for="project in projects?.filter((work) => work.featured)"
      :key="project.name"
      role="link"
      class="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 hover:bg-neutral-900"
      :to="project.release === 'soon' ? '/' : project.link"
      :aria-label="'go to ' + project.name + ' project website'"
      :target="project.release === 'soon' ? '_self' : '_blank'"
    >
      <span class="whitespace-nowrap font-medium">
        {{ project.name }}
      </span>
      <div class="mx-2 h-[0.1px] w-full bg-muted" />
      <span class="whitespace-nowrap">
        {{ project.release === "soon" ? "soon..." : project.release }}
      </span>
    </NuxtLink>
  </div>
</template>
