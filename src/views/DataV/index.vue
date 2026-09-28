<template>
  <div class="datav-container">
    <!-- 3D 地图场景 -->
    <MapScene />
    
    <!-- UI 面板 -->
    <Panel />
  </div>
</template>

<script setup lang="ts">
import MapScene from './MapScene.vue'
import Panel from './Panel.vue'
</script>

<style scoped>
.datav-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
