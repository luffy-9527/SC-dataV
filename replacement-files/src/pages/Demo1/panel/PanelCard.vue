<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
  }>(),
  {
    subtitle: '',
  },
)
</script>

<template>
  <section class="panel-card">
    <div class="panel-card__title">
      <span>{{ title }}</span>
      <em v-if="subtitle">{{ subtitle }}</em>
    </div>
    <div class="panel-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel-card {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 15px;
  border: 1px solid rgba(255, 145, 0, 0.3);
  border-radius: 4px;
  background: rgba(255, 245, 232, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  z-index: 4;
}

.panel-card::before,
.panel-card::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  transition: all 0.3s ease;
  pointer-events: none;
}

.panel-card::before {
  top: -1px;
  left: -1px;
  border-top: 2px solid #ea580c;
  border-left: 2px solid #ea580c;
}

.panel-card::after {
  right: -1px;
  bottom: -1px;
  border-right: 2px solid #ea580c;
  border-bottom: 2px solid #ea580c;
}

.panel-card:hover::before,
.panel-card:hover::after {
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

.panel-card__title {
  flex: 0 0 auto;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 4px solid #fdb961;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #5a4a42;
  font-size: 18px;
  line-height: 1.2;
}

.panel-card__title em {
  font-style: normal;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.panel-card__body {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
}
</style>
