<script setup lang="ts">
const { profile } = useAppConfig();
const isZoomed = ref<boolean>(false);
</script>

<template>
  <div class="z-10 flex items-center justify-center">
    <SpotlightButton rounded>
      <div
        class="font-mona relative flex items-center justify-center gap-2 bg-linear-to-b from-white/25 to-white bg-clip-text text-lg font-medium text-transparent transition-all duration-200"
      >
        <NuxtImg
          src="/profile-96.webp"
          format="webp"
          width="96"
          height="96"
          quality="80"
          fetchpriority="high"
          loading="eager"
          class="size-24 cursor-zoom-in rounded-full border-2 border-neutral-800/30 object-cover"
          :alt="profile.name + ' Profile Picture'"
          :aria-label="profile.name + ' Profile Picture'"
          @click="isZoomed = true"
        />
      </div>
    </SpotlightButton>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isZoomed"
          class="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/80 backdrop-blur-sm"
          @click="isZoomed = false"
        >
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="scale-90 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-90 opacity-0"
          >
            <NuxtImg
              v-if="isZoomed"
              src="/profile-400.webp"
              format="webp"
              width="400"
              height="400"
              quality="90"
              class="max-h-[80vh] max-w-[80vw] rounded-2xl object-cover shadow-2xl"
              :alt="profile.name + ' Profile Picture'"
            />
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
