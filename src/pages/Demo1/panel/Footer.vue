<script setup lang="ts">
import { computed } from 'vue'
import { useDemo1Store } from '../stores'

const store = useDemo1Store()

const weatherTextMap = {
  cloudy: '多云',
  fog: '雾气',
  rain: '降雨',
  storm: '雷暴',
  clear: '晴空',
} as const

const weatherButtonLabel = computed(() => (store.cloud ? weatherTextMap[store.weatherMode] : '晴空'))

const buttons = [
  { key: 'cloud', label: '云层', icon: '☁' },
  { key: 'rotation', label: '旋转', icon: '↻' },
  { key: 'mode', label: '面板', icon: '◫' },
  { key: 'heat', label: '热力', icon: '♨' },
  { key: 'bar', label: '柱图', icon: '▥' },
] as const
</script>

<template>
  <footer class="footer">
    <svg class="footer__bg" viewBox="0 0 1920 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 100h1920V62c-268 7-398 27-553 31H553C398 89 268 69 0 62v38Z" fill="rgba(255,245,232,.52)" />
      <path d="M660 68h600l-60 18H720l-60-18Z" fill="rgba(234,88,12,.18)" />
      <path d="M760 82h400" stroke="rgba(234,88,12,.55)" stroke-width="2" />
    </svg>

    <div class="footer__buttons">
      <button
        v-for="item in buttons"
        :key="item.key"
        class="footer__button"
        :class="{ active: item.key === 'cloud' ? store.cloud : store[item.key] }"
        type="button"
        :title="item.key === 'cloud' ? '点击切换天气：多云 / 雾气 / 降雨 / 雷暴 / 晴空' : item.label"
        @click="item.key === 'cloud' ? store.cycleWeather() : store.toggle(item.key)"
      >
        <span>{{ item.icon }}</span>
        <small>{{ item.key === 'cloud' ? weatherButtonLabel : item.label }}</small>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 8;
  width: 100%;
  height: 100px;
  pointer-events: none;
}

.footer__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.footer__buttons {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 640px;
  height: 80px;
  padding-bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 30px;
  pointer-events: auto;
}

.footer__button {
  position: relative;
  width: 50px;
  height: 50px;
  border: 1px solid rgba(234, 88, 12, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #d35400;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.footer__button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(234, 88, 12, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.footer__button:hover {
  transform: translateY(-5px) scale(1.1);
  border-color: #ff6715;
  box-shadow: 0 0 15px rgba(255, 103, 21, 0.4);
  color: #ff6715;
}

.footer__button:hover::before {
  opacity: 1;
}

.footer__button.active {
  width: 60px;
  height: 60px;
  margin-bottom: 5px;
  border: none;
  background: linear-gradient(135deg, #ff6715, #ff8c00);
  color: #fff;
  box-shadow: 0 4px 15px rgba(255, 103, 21, 0.5);
}

.footer__button span {
  font-size: 19px;
  line-height: 1;
}

.footer__button small {
  font-size: 10px;
  line-height: 1;
}
</style>
