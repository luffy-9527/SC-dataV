<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import AutoFit from '@/components/AutoFit.vue'
import DemoMap from './map/index.vue'
import DemoPanel from './panel/index.vue'
import { useDemo1Store } from './stores'

const store = useDemo1Store()

onBeforeUnmount(() => {
  store.reset()
})
</script>

<template>
  <AutoFit :design-width="1920" :design-height="1080">
    <section class="demo1-page">
      <DemoMap />
      <DemoPanel />
    </section>
  </AutoFit>
</template>

<style scoped>
.demo1-page {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  color: #5a4a42;
  background: radial-gradient(circle at 50% 42%, #fff6e8 0%, #f7dfbc 45%, #eac38f 100%);
}
</style>
