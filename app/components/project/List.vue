<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">

interface Project {
    name: string;
    release: string;
    image: string;
    npm?: string;
    github?: string;
    isPublicRepo: boolean;
    link?: string;
    description?: string;
    featured?: boolean;
}

const props = defineProps<{
  projects: Project[];
}>();


const repoSlug = (github?: string) => {
  if (!github) return '';

  try {
    const url = new URL(github);
    const parts = url.pathname.split('/').filter(Boolean);
    const rawSlug = parts[parts.length - 1] ?? '';
    return rawSlug;
  } catch {
    return '';
  }
};

const featuredProjects = computed(() => props.projects
  .filter(project => project.featured)
  .map((project) => {
    const slug = project.isPublicRepo ? repoSlug(project.github) : '';

    return {
      ...project,
      destination: slug ? `/repo/${slug}` : project.link ?? project.github,
      isRepoView: Boolean(slug),
    };
  }));

</script>


<template>
  <div class="flex w-full flex-col gap-4">
    <NuxtLink
      v-for="project in featuredProjects"
      :key="project.name"
      class="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 hover:bg-neutral-900"
      :to="project.destination"
      :aria-label="'Go to ' + project.name + ' project'"
      :target="project.isRepoView ? undefined : '_blank'"
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
