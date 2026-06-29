<script setup lang="ts">
import { useDemo1Store } from '../stores'

const store = useDemo1Store()
const toggles = [
  ['cloud', '云雾层'],
  ['bar', '数据柱'],
  ['rotation', '底部旋转'],
  ['heat', '热力层'],
  ['mode', '展示模式'],
] as const
</script>

<template>
  <aside class="debug-panel">
    <h4>Vue3 调试面板</h4>
    <button v-for="[key, label] in toggles" :key="key" :class="{ active: store[key] }" @click="store.toggle(key)">
      {{ label }}：{{ store[key] ? '开' : '关' }}
    </button>

    <label>
      地图厚度
      <input v-model.number="store.config.mapDepth" type="range" min="2" max="12" step="1" />
    </label>
    <label>
      动画速度
      <input v-model.number="store.config.lightSpeed" type="range" min="0.2" max="3" step="0.1" />
    </label>
  </aside>
</template>

<style scoped>
.debug-panel {
  position: absolute;
  right: 500px;
  bottom: 72px;
  z-index: 6;
  display: grid;
  gap: 8px;
  width: 180px;
  padding: 14px;
  color: #eafaff;
  background: rgba(4, 18, 32, 0.58);
  border: 1px solid rgba(112, 237, 255, 0.24);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

h4 {
  margin: 0 0 4px;
  font-size: 14px;
  letter-spacing: 0.08em;
}

button {
  height: 28px;
  color: #9edcff;
  cursor: pointer;
  background: rgba(112, 237, 255, 0.06);
  border: 1px solid rgba(112, 237, 255, 0.18);
  border-radius: 6px;
}

button.active {
  color: #10222b;
  background: #70edff;
}

label {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: #9edcff;
}

input {
  width: 100%;
}
</style>
