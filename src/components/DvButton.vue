<script setup lang="ts">
withDefaults(
  defineProps<{
    active?: boolean
  }>(),
  {
    active: false,
  },
)
</script>

<template>
  <button class="dv-button" :class="{ active }">
    <slot />
  </button>
</template>

<style scoped>
.dv-button {
  min-width: 96px;
  height: 34px;
  padding: 0 18px;
  border: 1px solid rgba(64, 220, 255, 0.5);
  border-radius: 4px;
  color: #c9f6ff;
  background: linear-gradient(180deg, rgba(26, 89, 128, 0.55), rgba(8, 30, 51, 0.65));
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}

.dv-button:hover,
.dv-button.active {
  color: #fff;
  border-color: rgba(64, 220, 255, 0.95);
  box-shadow: 0 0 16px rgba(64, 220, 255, 0.28) inset, 0 0 12px rgba(64, 220, 255, 0.2);
}
</style>
