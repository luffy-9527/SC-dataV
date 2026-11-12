<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import AutoFit from '@/components/AutoFit.vue'
import SmartCityMap from './map/index.vue'
import SmartCityPanel from './panel/index.vue'
import { useSmartCityStore } from './stores'

const store = useSmartCityStore()

onBeforeUnmount(() => {
  store.reset()
})
</script>

<template>
  <AutoFit :design-width="1920" :design-height="1080">
    <section class="smart-city-page">
      <SmartCityMap />
      <SmartCityPanel />
    </section>
  </AutoFit>
</template>

<style scoped>
.smart-city-page {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  color: #5a4a42;
  background: radial-gradient(circle at 50% 42%, #fff6e8 0%, #f7dfbc 45%, #eac38f 100%);
}
</style>
