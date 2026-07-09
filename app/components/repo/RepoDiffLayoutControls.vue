<script setup lang="ts">
const isWrapped = defineModel<boolean>('isWrapped', { required: true });
const viewMode = defineModel<'unified' | 'split'>('viewMode', { required: true });

const setViewMode = (mode: 'unified' | 'split') => {
  viewMode.value = mode;
};
</script>

<template>
  <div class="flex justify-start px-1">
    <div class="hidden md:flex items-center gap-4">
      <UCheckbox
        v-model="isWrapped"
        label="Wrap words"
      />
      <UButtonGroup
        size="sm"
        orientation="horizontal"
      >
        <UButton
          icon="i-lucide-align-justify"
          label="Unified"
          :color="viewMode === 'unified' ? 'primary' : 'neutral'"
          :variant="viewMode === 'unified' ? 'solid' : 'ghost'"
          @click="setViewMode('unified')"
        />
        <UButton
          icon="i-lucide-columns"
          label="Split"
          :color="viewMode === 'split' ? 'primary' : 'neutral'"
          :variant="viewMode === 'split' ? 'solid' : 'ghost'"
          @click="setViewMode('split')"
        />
      </UButtonGroup>
    </div>

    <!-- mobile  -->
    <div class="flex md:hidden">
      <UDropdownMenu
        :items="[
          [
            { label: 'Wrap words', icon: isWrapped ? 'i-lucide-check-square' : 'i-lucide-square', onSelect: () => { isWrapped = !isWrapped } }
          ],
          [
            { label: 'Unified View', icon: 'i-lucide-align-justify', color: viewMode === 'unified' ? 'primary' : 'neutral', onSelect: () => setViewMode('unified') },
            { label: 'Split View', icon: 'i-lucide-columns', color: viewMode === 'split' ? 'primary' : 'neutral', onSelect: () => setViewMode('split') }
          ]
        ]"
      >
        <UButton
          icon="i-lucide-settings-2"
          label="Layout"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
