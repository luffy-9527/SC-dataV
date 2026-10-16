<script setup lang="ts">
import type { DecisionLogItem } from '../types'

defineProps<{
  logs: DecisionLogItem[]
}>()
</script>

<template>
  <aside class="decision-log-root">
    <div class="decision-log-box">
      <!-- 科技风格边角修饰符 -->
      <div class="corner corner-tl" />
      <div class="corner corner-tr" />
      <div class="corner corner-bl" />
      <div class="corner corner-br" />

      <!-- 标题 -->
      <div class="decision-log-header">
        <span class="dot-indicator" />
        <span>决策日志 · DECISION LOG</span>
      </div>

      <!-- 日志列表 -->
      <div class="decision-log-list">
        <div
          v-for="log in logs"
          :key="log.id"
          class="log-row"
        >
          <span class="log-time">{{ log.time }}</span>
          <span
            class="log-text"
            :class="{ 'log-highlight': log.text.includes('变道') }"
          >
            {{ log.text }}
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.decision-log-root {
  position: absolute;
  left: 20px;
  top: 112px;
  z-index: 20;
  width: 320px;
  pointer-events: none;
}

.decision-log-box {
  position: relative;
  padding: 14px;
  background-color: rgba(2, 6, 23, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(6, 182, 212, 0.6);
}
.corner-tl { top: 4px; left: 4px; border-top: 2px solid; border-left: 2px solid; }
.corner-tr { top: 4px; right: 4px; border-top: 2px solid; border-right: 2px solid; }
.corner-bl { bottom: 4px; left: 4px; border-bottom: 2px solid; border-left: 2px solid; }
.corner-br { bottom: 4px; right: 4px; border-bottom: 2px solid; border-right: 2px solid; }

.decision-log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(30, 41, 59, 0.6);
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}

.dot-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #22d3ee;
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.8);
}

.decision-log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 192px;
  overflow-y: auto;
  padding-right: 4px;
  font-size: 11px;
  font-family: monospace;
  line-height: 1.5;
}

.log-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.log-row:hover {
  background-color: rgba(15, 23, 42, 0.5);
}

.log-time {
  color: rgba(34, 211, 238, 0.9);
  flex-shrink: 0;
  font-weight: 500;
}

.log-text {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #cbd5e1;
}

.log-text.log-highlight {
  color: #6ee7b7;
  font-weight: 500;
}

/* 纤细滚动条 */
.decision-log-list::-webkit-scrollbar {
  width: 3px;
}
.decision-log-list::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 2px;
}
</style>
