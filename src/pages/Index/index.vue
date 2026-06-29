<script setup lang="ts">
const demos = [
  { path: '/demo0', title: 'Demo0' },
  { path: '/demo1', title: 'Demo1' },
  { path: '/demo2', title: 'Demo2' },
  { path: '/demo3', title: 'Demo3' },
]
</script>

<template>
  <main class="index-page">
    <h1>数据可视化大屏</h1>
    <div class="demo-list">
      <RouterLink v-for="demo in demos" :key="demo.path" :to="demo.path" class="demo-card">
        {{ demo.title }}
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.index-page {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 36px;
  color: #dff8ff;
  background: radial-gradient(circle at center, #123e5e 0, #06111d 58%, #02070d 100%);
}

h1 {
  margin: 0;
  text-align: center;
  letter-spacing: 0.18em;
}

.demo-list {
  display: grid;
  grid-template-columns: repeat(4, 160px);
  gap: 18px;
}

.demo-card {
  height: 92px;
  display: grid;
  place-content: center;
  color: #dff8ff;
  text-decoration: none;
  border: 1px solid rgba(80, 213, 255, 0.38);
  border-radius: 8px;
  background: rgba(16, 62, 94, 0.45);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.28);
}

.demo-card:hover {
  border-color: rgba(80, 213, 255, 0.9);
}
</style>
