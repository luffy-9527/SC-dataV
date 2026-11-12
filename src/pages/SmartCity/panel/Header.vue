<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header class="city-header">
    <svg class="city-header__bg" viewBox="0 0 1920 82" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 0h1920v26c-180 8-285 33-420 42H420C290 58 172 34 0 26V0Z" fill="rgba(255,245,232,.45)" />
      <path d="M420 68h1080l-70 12H490l-70-12Z" fill="rgba(234,88,12,.22)" />
      <path d="M600 74h720" stroke="rgba(234,88,12,.65)" stroke-width="2" />
      <path d="M0 26c172 8 290 32 420 42h1080c135-9 240-34 420-42" stroke="rgba(234,88,12,.35)" fill="none" />
    </svg>

    <div class="city-header__title">
      四川省智慧城市数据大脑
      <span>SICHUAN SMART BRAIN</span>
    </div>

    <div class="city-header__actions">
      <div class="city-header__switcher">
        <router-link to="/" class="city-header__switch-btn city-header__home-btn" title="返回首页广场">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
          </svg>
          <span>首页广场</span>
        </router-link>
        <span class="city-header__sep" />
        <router-link to="/smart-city" class="city-header__switch-btn" :class="{ active: route.path === '/smart-city' }" title="当前：智慧城市">
          <span>智慧城市</span>
        </router-link>
        <router-link to="/smart-oilfield" class="city-header__switch-btn" :class="{ active: route.path === '/smart-oilfield' }" title="切换到工业级石油开采大屏">
          <span>智慧油田</span>
        </router-link>
        <router-link to="/autopilot" class="city-header__switch-btn" :class="{ active: route.path === '/autopilot' }" title="切换到自动驾驶数字孪生大屏">
          <span>自动驾驶</span>
        </router-link>
        <router-link to="/digital-human" class="city-header__switch-btn" :class="{ active: route.path === '/digital-human' }" title="切换到AI数字人智能指挥舱">
          <span>AI数字人</span>
        </router-link>
      </div>
      <a class="city-header__github" href="https://github.com/luffy-9527/SC-dataV" target="_blank" rel="noreferrer" title="GitHub">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.61.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.52 2.33 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.55 9.55 0 0 1 12 6.99c.85 0 1.71.11 2.51.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86V21c0 .26.18.57.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      </a>
    </div>
  </header>
</template>

<style scoped>
.city-header {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 6;
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.city-header__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
}

.city-header__title {
  text-align: center;
  font-size: 36px;
  line-height: 1;
  letter-spacing: 8px;
  font-weight: 700;
  color: #ea580c;
  background: linear-gradient(to bottom, #ea580c, #ff9100);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 8px 10px rgba(255, 145, 0, 0.35);
}

.city-header__title span {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  letter-spacing: 12px;
  color: rgba(255, 145, 0, 0.68);
  -webkit-text-fill-color: rgba(255, 145, 0, 0.68);
}

.city-header__actions {
  position: absolute;
  top: 14px;
  right: 32px;
  display: flex;
  align-items: center;
  gap: 16px;
  pointer-events: auto;
}

.city-header__switcher {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 245, 232, 0.55);
  backdrop-filter: blur(8px);
  padding: 3px 5px;
  border-radius: 8px;
  border: 1px solid rgba(234, 88, 12, 0.3);
}

.city-header__sep {
  width: 1px;
  height: 14px;
  background: rgba(234, 88, 12, 0.28);
  margin: 0 2px;
}

.city-header__switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #ea580c;
  background: transparent;
  border-radius: 5px;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.city-header__home-btn {
  color: #c2410c;
  background: rgba(234, 88, 12, 0.08);
}

.city-header__switch-btn:hover {
  background: rgba(234, 88, 12, 0.16);
  transform: translateY(-1px);
}

.city-header__switch-btn.active {
  background: rgba(234, 88, 12, 0.9);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(234, 88, 12, 0.4);
}

.city-header__github {
  color: #ea580c;
  display: flex;
  align-items: center;
  transition: transform 0.25s ease;
}

.city-header__github:hover {
  transform: scale(1.1);
}
</style>
