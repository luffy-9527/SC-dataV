<template>
  <div class="footer">
    <div class="footer-content">
      <span>技术支持: Vue 3 + Three.js + ECharts</span>
      <span>|</span>
      <span>© 2026 四川省数据可视化平台</span>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.footer {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  pointer-events: auto;
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 14px;
  color: #fdb961;
  background: rgba(255, 245, 232, 0.8);
  padding: 10px 30px;
  border-radius: 4px;
  border: 1px solid rgba(255, 145, 0, 0.3);
}
</style>
