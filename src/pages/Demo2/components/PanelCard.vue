<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    badge?: string
    badgeType?: 'success' | 'warning' | 'info'
  }>(),
  {
    subtitle: '',
    badge: '',
    badgeType: 'info',
  },
)
</script>

<template>
  <section class="oil-panel-card">
    <!-- 装饰性切角与流光框线 -->
    <div class="card-border-corner top-left"></div>
    <div class="card-border-corner top-right"></div>
    <div class="card-border-corner bottom-left"></div>
    <div class="card-border-corner bottom-right"></div>
    <div class="card-header-bar"></div>

    <div class="oil-panel-card__header">
      <div class="title-wrap">
        <span class="title-icon"></span>
        <h3 class="title-text">{{ title }}</h3>
        <span v-if="subtitle" class="subtitle-text">{{ subtitle }}</span>
      </div>
      <div v-if="badge" class="badge" :class="`badge--${badgeType}`">
        <span class="badge-dot"></span>
        {{ badge }}
      </div>
    </div>

    <div class="oil-panel-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.oil-panel-card {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(9, 18, 32, 0.88) 0%, rgba(13, 27, 46, 0.82) 100%);
  border: 1px solid rgba(0, 229, 255, 0.22);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(0, 229, 255, 0.04);
  backdrop-filter: blur(8px);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.oil-panel-card:hover {
  border-color: rgba(0, 229, 255, 0.45);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(0, 229, 255, 0.08);
}

.card-header-bar {
  position: absolute;
  top: 0;
  left: 30px;
  right: 30px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #00e5ff 30%, #f59e0b 70%, transparent 100%);
  opacity: 0.7;
}

.card-border-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  pointer-events: none;
}

.top-left {
  top: -1px;
  left: -1px;
  border-top: 2px solid #00e5ff;
  border-left: 2px solid #00e5ff;
}

.top-right {
  top: -1px;
  right: -1px;
  border-top: 2px solid #00e5ff;
  border-right: 2px solid #00e5ff;
}

.bottom-left {
  bottom: -1px;
  left: -1px;
  border-bottom: 2px solid #00e5ff;
  border-left: 2px solid #00e5ff;
}

.bottom-right {
  bottom: -1px;
  right: -1px;
  border-bottom: 2px solid #00e5ff;
  border-right: 2px solid #00e5ff;
}

.oil-panel-card__header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title-icon {
  display: inline-block;
  width: 4px;
  height: 14px;
  background: linear-gradient(to bottom, #00e5ff, #0284c7);
  box-shadow: 0 0 8px #00e5ff;
  border-radius: 1px;
}

.title-text {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #e2e8f0;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.35);
}

.subtitle-text {
  font-size: 10px;
  color: #64748b;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.badge--success {
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.3);
}

.badge--warning {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}

.badge--info {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.3);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.oil-panel-card__body {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  position: relative;
}
</style>
