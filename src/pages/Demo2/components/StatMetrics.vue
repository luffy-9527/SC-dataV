<script setup lang="ts">
import { ref } from 'vue'

const metrics = ref([
  {
    label: '当日累计产油',
    value: '1,428.6',
    unit: '吨 (t)',
    trend: 'up',
    trendVal: '+5.2%',
    sub: '环比昨日增长',
  },
  {
    label: '瞬时产油速率',
    value: '64.8',
    unit: 't/h',
    trend: 'up',
    trendVal: '正常流速',
    sub: '稳产工作状态',
  },
  {
    label: '当前钻进深度',
    value: '3,852.4',
    unit: '米 (m)',
    trend: 'up',
    trendVal: '+18.2m/h',
    sub: '设计靶心 4200m',
  },
  {
    label: '井底环空压力',
    value: '28.4',
    unit: 'MPa',
    trend: 'down',
    trendVal: '安全余量充足',
    sub: '安全阈值 ≤36MPa',
  },
  {
    label: '油田开井运行率',
    value: '98.5',
    unit: '%',
    trend: 'up',
    trendVal: '128 / 130 口',
    sub: '在运机组良好',
  },
])
</script>

<template>
  <div class="stat-metrics">
    <div v-for="item in metrics" :key="item.label" class="metric-card">
      <div class="metric-label">{{ item.label }}</div>
      <div class="metric-value-wrap">
        <span class="metric-value">{{ item.value }}</span>
        <span class="metric-unit">{{ item.unit }}</span>
      </div>
      <div class="metric-footer">
        <span class="metric-trend" :class="`trend--${item.trend}`">
          {{ item.trendVal }}
        </span>
        <span class="metric-sub">{{ item.sub }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-metrics {
  position: absolute;
  top: 92px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
  z-index: 15;
  pointer-events: auto;
}

.metric-card {
  width: 176px;
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(13, 27, 46, 0.85) 0%, rgba(8, 16, 28, 0.9) 100%);
  border: 1px solid rgba(0, 229, 255, 0.25);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(0, 229, 255, 0.05);
  border-radius: 4px;
  backdrop-filter: blur(6px);
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, border-color 0.25s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 229, 255, 0.6);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6), inset 0 0 16px rgba(0, 229, 255, 0.1);
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #00e5ff, #f59e0b);
}

.metric-label {
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.metric-value-wrap {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.metric-value {
  font-family: 'DIN Alternate', 'Helvetica Neue', Arial, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #00e5ff;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
}

.metric-unit {
  font-size: 11px;
  color: #64748b;
}

.metric-footer {
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
}

.metric-trend {
  font-weight: 500;
}

.trend--up {
  color: #34d399;
}

.trend--down {
  color: #38bdf8;
}

.metric-sub {
  color: #64748b;
}
</style>
