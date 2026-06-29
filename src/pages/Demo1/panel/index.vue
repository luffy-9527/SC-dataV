<script setup lang="ts">
import { computed, watch } from 'vue'
import { gsap } from 'gsap'
import { useDemo1Store } from '../stores'
import Headder from './Headder.vue'
import Footer from './Footer.vue'
import PanelCard from './PanelCard.vue'
import Chart1 from './Chart1.vue'
import Chart2 from './Chart2.vue'
import Chart3 from './Chart3.vue'
import Chart4 from './Chart4.vue'
import Chart5 from './Chart5.vue'
import Chart6 from './Chart6.vue'

const store = useDemo1Store()
const gridClass = computed(() => ({ 'grid-wrapper--hidden': !store.mode }))

watch(
  () => store.mapPlayComplete,
  complete => {
    if (!complete) return
    gsap.fromTo(
      '.panel-card',
      { autoAlpha: 0, y: 24, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.75, stagger: 0.08, ease: 'power3.out' },
    )
  },
)
</script>

<template>
  <div class="panel-layer">
    <Headder />

    <main class="grid-wrapper" :class="gridClass">
      <PanelCard class="card-left-1" title="2025年规模指标分析" subtitle="INDICATOR ANALYSIS">
        <Chart1 />
      </PanelCard>

      <PanelCard class="card-left-2" title="企业税收分析" subtitle="TAX ANALYSIS">
        <Chart2 />
      </PanelCard>

      <PanelCard class="card-left-3" title="行政处罚信息" subtitle="PENALTY INFORMATION">
        <Chart3 />
      </PanelCard>

      <PanelCard class="card-right-1" title="企业收益总数统计" subtitle="REVENUE STATISTICS">
        <Chart4 />
      </PanelCard>

      <PanelCard class="card-right-2" title="企业能耗分析" subtitle="ENERGY CONSUMPTION ANALYSIS">
        <Chart5 />
      </PanelCard>

      <PanelCard class="card-right-3" title="企业税收分析" subtitle="TAX ANALYSIS">
        <Chart6 />
      </PanelCard>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.panel-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.grid-wrapper {
  position: absolute;
  inset: 80px 0 100px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.grid-wrapper--hidden {
  opacity: 0;
  transform: scale(0.985);
  pointer-events: none;
}

.card-left-1 {
  grid-column: 1 / 2;
  grid-row: 1 / 3;
}

.card-left-2 {
  grid-column: 1 / 2;
  grid-row: 3 / 5;
}

.card-left-3 {
  grid-column: 1 / 2;
  grid-row: 5 / 7;
}

.card-right-1 {
  grid-column: 4 / 5;
  grid-row: 1 / 3;
}

.card-right-2 {
  grid-column: 4 / 5;
  grid-row: 3 / 5;
}

.card-right-3 {
  grid-column: 4 / 5;
  grid-row: 5 / 7;
}
</style>
