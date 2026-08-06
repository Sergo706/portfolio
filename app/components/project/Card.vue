<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
const props = defineProps<{
  project: {
    name: string;
    release: string;
    image: string;
    github?: string;
    isPublicRepo: boolean;
    link?: string;
    npm?: string;
    description?: string;
  };
}>();

const img = useImage();
const repoSlug = computed(() => {
  if (!props.project.isPublicRepo || !props.project.github) return '';

  try {
    const url = new URL(props.project.github);
    const parts = url.pathname.split('/').filter(Boolean);
    const rawSlug = parts[parts.length - 1] ?? '';
    return rawSlug;
  } catch {
    return '';
  }
});

const projectLink = computed(() => repoSlug.value ? `/repo/${repoSlug.value}` : props.project.link ?? props.project.github);

</script>

<template>
  <NuxtLink
    :aria-label="project.name + ' project link'"
    :to="projectLink"
    :target="repoSlug ? undefined : '_blank'"
    class="group relative flex h-full cursor-pointer flex-col gap-1 rounded-lg border border-white/10 bg-zinc-900/80 p-1 shadow-2xl shadow-zinc-950/50 backdrop-blur-sm"
  >
    <div class="flex items-center justify-center py-[3px]">
      <div class="flex gap-1 px-2  mr-auto">
        <div class="size-2 rounded-full bg-red-500/90 transition-all duration-300 group-hover:bg-red-500/90 sm:bg-white/10" />
        <div class="size-2 rounded-full bg-yellow-500/90 transition-all duration-300 group-hover:bg-yellow-500/90 sm:bg-white/10" />
        <div class="size-2 rounded-full bg-green-500/90 transition-all duration-300 group-hover:bg-green-500/90 sm:bg-white/10" />
      </div>

      <div class="flex items-center justify-center ml-auto px-2 gap-2">
        <NuxtLink
          v-if="project.npm"
          :to="project.npm"
          target="_blank"
          class="inline-flex items-center justify-center h-6 w-6 rounded-md"
        >
          <Icon
            name="custom:npm"
            class="size-5 transition-all duration-300 text-[#cb3837] sm:text-white/70 hover:text-[#cb3837]"
          />
        </NuxtLink>

        <NuxtLink
          :to="project.github"
          target="_blank"
          class="inline-flex items-center justify-center h-6 w-6 rounded-md"
        >
          <Icon
            name="custom:github"
            class="size-5 transition-all duration-300 text-white sm:text-white/70 hover:text-white"
          />
        </NuxtLink>
      </div>
    </div>

    <div class="relative flex h-56 justify-center overflow-hidden rounded-lg">
      <NuxtImg
        :placeholder="img(`${project.image}`)"
        width="1536"
        :alt="project.name + ' project image'"
        class="h-full w-full rounded-lg object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-20"
        :src="project.image"
        :aria-label="project.name + ' project image'"
      />

      <div
        v-if="project.description"
        class="absolute inset-0 hidden items-center justify-center p-6 text-center text-sm text-white/90 drop-shadow-md opacity-0 translate-y-8 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 lg:flex"
      >
        {{ project.description }}
      </div>
    </div>
    <div class="z-10 flex w-full flex-1 justify-center lg:absolute lg:bottom-0 lg:flex-none">
      <div class="flex w-full flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-950/95 shadow-md lg:w-2/3 lg:flex-none lg:rounded-b-none lg:border-b-0 lg:bg-zinc-900/60 lg:backdrop-blur-md">
        <div class="flex items-center justify-between gap-2 px-4 py-2.5 lg:py-[5px]">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-2">
              <span class="whitespace-nowrap text-sm font-semibold text-white/90">
                {{ project.name }}
              </span>
              <span class="whitespace-nowrap text-xs text-neutral-500">
                {{ project.release === "soon" ? "Soon..." : project.release }}
              </span>
            </div>
          </div>
          <div
            class="flex items-center justify-center rounded-full border border-transparent p-1 shadow-md backdrop-blur-md transition-all duration-500 group-hover:-rotate-45 group-hover:border-white/10"
          >
            <UIcon
              name="heroicons:arrow-right"
              class="size-3 text-white"
            />
          </div>
        </div>

        <p
          v-if="project.description"
          class="flex-1 border-t border-white/10 px-4 py-3 text-xs leading-5 text-zinc-400 lg:hidden"
        >
          {{ project.description }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
