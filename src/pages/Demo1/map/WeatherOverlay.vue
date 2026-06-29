<script setup lang="ts">
import { computed } from 'vue'
import { useDemo1Store } from '../stores'

const store = useDemo1Store()
const visible = computed(() => store.cloud && (store.weatherMode === 'rain' || store.weatherMode === 'storm'))
const overlayClass = computed(() => [
  'weather-overlay',
  `weather-overlay--${store.weatherMode}`,
  { 'weather-overlay--drill': store.drillLevel > 0 },
])
</script>

<template>
  <div v-if="visible" :class="overlayClass" aria-hidden="true">
    <!-- 第四十四阶段：云团不再做成矩形雾片，改成多个独立云簇围绕地图缓慢旋转。 -->
    <div class="cloud-orbit cloud-orbit--far">
      <div class="cloud-cluster cloud-cluster--a"><span></span><i></i></div>
      <div class="cloud-cluster cloud-cluster--b"><span></span><i></i></div>
      <div class="cloud-cluster cloud-cluster--c"><span></span><i></i></div>
    </div>

    <div class="cloud-orbit cloud-orbit--near">
      <div class="cloud-cluster cloud-cluster--d"><span></span><i></i></div>
      <div class="cloud-cluster cloud-cluster--e"><span></span><i></i></div>
    </div>

    <div class="fog-bank fog-bank--a"></div>
    <div class="fog-bank fog-bank--b"></div>
    <div class="rain-screen"></div>
    <div class="storm-flash"></div>
  </div>
</template>

<style scoped>
.weather-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
  mix-blend-mode: normal;
}

.cloud-orbit,
.cloud-cluster,
.fog-bank,
.rain-screen,
.storm-flash {
  position: absolute;
  pointer-events: none;
  will-change: transform, opacity;
}

.cloud-orbit {
  left: 50%;
  top: 52%;
  transform-origin: center center;
  opacity: 0;
}

.cloud-orbit--far {
  width: 920px;
  height: 390px;
  margin-left: -460px;
  margin-top: -218px;
  animation: cloud-orbit-far 86s linear infinite;
}

.cloud-orbit--near {
  width: 720px;
  height: 310px;
  margin-left: -360px;
  margin-top: -160px;
  animation: cloud-orbit-near 64s linear infinite reverse;
}

.cloud-cluster {
  width: 255px;
  height: 110px;
  opacity: 0;
  filter: drop-shadow(0 18px 24px rgba(96, 102, 94, 0.18));
  transform-origin: center;
  animation: cloud-pulse 8s ease-in-out infinite alternate;
}

.cloud-cluster::before,
.cloud-cluster::after,
.cloud-cluster span,
.cloud-cluster i {
  content: '';
  position: absolute;
  display: block;
  border-radius: 999px;
  background:
    radial-gradient(ellipse at 34% 32%, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.76) 34%, rgba(236, 237, 226, 0.2) 68%, rgba(255, 255, 255, 0) 100%);
}

.cloud-cluster::before {
  left: 8px;
  top: 32px;
  width: 138px;
  height: 70px;
  filter: blur(2px);
}

.cloud-cluster::after {
  left: 82px;
  top: 10px;
  width: 152px;
  height: 92px;
  filter: blur(2.4px);
}

.cloud-cluster span {
  left: 146px;
  top: 38px;
  width: 110px;
  height: 58px;
  opacity: 0.86;
  filter: blur(2.8px);
}

.cloud-cluster i {
  left: 64px;
  top: 68px;
  width: 170px;
  height: 42px;
  opacity: 0.38;
  background: radial-gradient(ellipse at center, rgba(104, 112, 104, 0.26), rgba(174, 178, 160, 0.1) 54%, rgba(255, 255, 255, 0) 100%);
  filter: blur(4px);
}

.cloud-cluster--a {
  left: 9%;
  top: 12%;
  transform: scale(1.18);
}

.cloud-cluster--b {
  right: 3%;
  top: 20%;
  transform: scale(0.95);
  animation-delay: -1.8s;
}

.cloud-cluster--c {
  left: 39%;
  bottom: -6%;
  transform: scale(0.82);
  animation-delay: -3.1s;
}

.cloud-cluster--d {
  left: -2%;
  top: 54%;
  transform: scale(0.72);
  animation-delay: -2.5s;
}

.cloud-cluster--e {
  right: 8%;
  top: 52%;
  transform: scale(0.78);
  animation-delay: -4.2s;
}

.fog-bank {
  left: 50%;
  top: 57%;
  width: 760px;
  height: 230px;
  margin-left: -380px;
  margin-top: -88px;
  opacity: 0;
  border-radius: 999px;
  background:
    radial-gradient(ellipse at 26% 54%, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.18) 42%, transparent 72%),
    radial-gradient(ellipse at 58% 42%, rgba(255, 251, 235, 0.48), rgba(226, 224, 210, 0.18) 38%, transparent 70%),
    radial-gradient(ellipse at 82% 56%, rgba(255, 255, 255, 0.36), rgba(210, 214, 204, 0.12) 40%, transparent 76%);
  filter: blur(10px);
  animation: fog-drift 22s ease-in-out infinite alternate;
}

.fog-bank--b {
  width: 920px;
  height: 280px;
  margin-left: -460px;
  margin-top: -70px;
  transform: rotate(-7deg);
  animation-duration: 28s;
  animation-delay: -7s;
}

.rain-screen {
  inset: -20%;
  opacity: 0;
  background-image:
    repeating-linear-gradient(112deg, rgba(255,255,255,0) 0 18px, rgba(255,255,255,0.32) 20px, rgba(255,255,255,0) 25px),
    repeating-linear-gradient(112deg, rgba(255,255,255,0) 0 36px, rgba(255,226,160,0.18) 38px, rgba(255,255,255,0) 43px);
  background-size: 180px 120px, 240px 170px;
  filter: blur(0.35px);
  animation: rain-move 0.72s linear infinite;
}

.storm-flash {
  inset: 0;
  opacity: 0;
  background: radial-gradient(circle at 58% 22%, rgba(255, 255, 255, 0.72), rgba(255, 244, 184, 0.18) 18%, transparent 48%);
  animation: storm-flash 5.2s steps(1, end) infinite;
}

.weather-overlay--cloudy .cloud-orbit { opacity: 1; }
.weather-overlay--cloudy .cloud-cluster { opacity: 0.78; }
.weather-overlay--cloudy .fog-bank { opacity: 0.13; }

.weather-overlay--fog .cloud-orbit { opacity: 0.52; }
.weather-overlay--fog .cloud-cluster { opacity: 0.44; }
.weather-overlay--fog .fog-bank { opacity: 0.56; }

.weather-overlay--rain .cloud-orbit { opacity: 0.62; }
.weather-overlay--rain .cloud-cluster { opacity: 0.48; }
.weather-overlay--rain .fog-bank { opacity: 0.24; }
.weather-overlay--rain .rain-screen { opacity: 0.2; }

.weather-overlay--storm .cloud-orbit { opacity: 0.68; }
.weather-overlay--storm .cloud-cluster { opacity: 0.5; }
.weather-overlay--storm .fog-bank { opacity: 0.3; }
.weather-overlay--storm .rain-screen { opacity: 0.28; }
.weather-overlay--storm .storm-flash { opacity: 1; }

.weather-overlay--drill.weather-overlay--cloudy .cloud-cluster { opacity: 0.6; }
.weather-overlay--drill .fog-bank { opacity: 0.1; }

@keyframes cloud-orbit-far {
  from { transform: rotate(0deg) translateY(-8px); }
  to { transform: rotate(360deg) translateY(-8px); }
}

@keyframes cloud-orbit-near {
  from { transform: rotate(0deg) translateY(4px); }
  to { transform: rotate(360deg) translateY(4px); }
}

@keyframes cloud-pulse {
  from { scale: 0.96; opacity: 0.68; }
  to { scale: 1.05; opacity: 0.88; }
}

@keyframes fog-drift {
  from { transform: translateX(-44px) translateY(0) rotate(-4deg); }
  to { transform: translateX(42px) translateY(18px) rotate(4deg); }
}

@keyframes rain-move {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 120px, 0 170px; }
}

@keyframes storm-flash {
  0%, 88%, 100% { opacity: 0; }
  89% { opacity: 0.36; }
  90% { opacity: 0; }
  92% { opacity: 0.52; }
  93% { opacity: 0; }
}
</style>
