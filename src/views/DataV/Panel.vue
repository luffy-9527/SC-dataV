<template>
  <AutoFit>
    <div ref="topBoxRef">
      <Header />
    </div>
    
    <div class="grid-wrapper">
      <div class="card" ref="leftBoxRef" style="grid-area: 1 / 1 / 3 / 2">
        <div class="card-title">
          2025年规模指标分析
          <span>INDICATOR ANALYSIS</span>
        </div>
        <Chart1 />
      </div>
      
      <div class="card" ref="leftBox1Ref" style="grid-area: 3 / 1 / 5 / 2">
        <div class="card-title">
          企业税收分析
          <span>TAX ANALYSIS</span>
        </div>
        <Chart2 />
      </div>
      
      <div class="card" ref="leftBox2Ref" style="grid-area: 5 / 1 / 7 / 2">
        <div class="card-title">
          行政处罚信息
          <span>PENALTY INFORMATION</span>
        </div>
        <Chart3 />
      </div>
      
      <div class="card" ref="rightBoxRef" style="grid-area: 1 / 4 / 3 / 5">
        <div class="card-title">
          企业收益总数统计
          <span>REVENUE STATISTICS</span>
        </div>
        <Chart4 />
      </div>
      
      <div class="card" ref="rightBox1Ref" style="grid-area: 3 / 4 / 5 / 5">
        <div class="card-title">
          企业能耗分析
          <span>ENERGY CONSUMPTION ANALYSIS</span>
        </div>
        <Chart5 />
      </div>
      
      <div class="card" ref="rightBox2Ref" style="grid-area: 5 / 4 / 7 / 5">
        <div class="card-title">
          企业税收分析
          <span>TAX ANALYSIS</span>
        </div>
        <Chart6 />
      </div>
    </div>
    
    <div ref="bottomBoxRef">
      <Footer />
    </div>
  </AutoFit>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AutoFit from '@/components/AutoFit.vue'
import { useMoveTo } from '@/composables/useMoveTo'
import { useConfigStore } from '@/stores/config'
import Header from './Header.vue'
import Footer from './Footer.vue'
import Chart1 from './charts/Chart1.vue'
import Chart2 from './charts/Chart2.vue'
import Chart3 from './charts/Chart3.vue'
import Chart4 from './charts/Chart4.vue'
import Chart5 from './charts/Chart5.vue'
import Chart6 from './charts/Chart6.vue'

const topBox = useMoveTo('toBottom', 0.6)
const leftBox = useMoveTo('toRight', 0.8, 0.5)
const leftBox1 = useMoveTo('toRight', 0.8, 0.6)
const leftBox2 = useMoveTo('toRight', 0.8, 0.7)
const rightBox = useMoveTo('toLeft', 0.8, 0.5)
const rightBox1 = useMoveTo('toLeft', 0.8, 0.6)
const rightBox2 = useMoveTo('toLeft', 0.8, 0.7)
const bottomBox = useMoveTo('toTop', 0.8, 0.5)

const topBoxRef = topBox.ref
const leftBoxRef = leftBox.ref
const leftBox1Ref = leftBox1.ref
const leftBox2Ref = leftBox2.ref
const rightBoxRef = rightBox.ref
const rightBox1Ref = rightBox1.ref
const rightBox2Ref = rightBox2.ref
const bottomBoxRef = bottomBox.ref

onMounted(() => {
  const configStore = useConfigStore()
  
  // 监听地图加载完成
  const unMapPlaySub = configStore.$subscribe((_mutation, state) => {
    if (state.mapPlayComplete) {
      topBox.restart()
      bottomBox.restart()
      leftBox.restart()
      leftBox1.restart()
      leftBox2.restart()
      rightBox.restart()
      rightBox1.restart()
      rightBox2.restart()
    }
  })
  
  // 监听模式切换
  const unModeSub = configStore.$subscribe((_mutation, state) => {
    if (state.mode) {
      topBox.restart()
      leftBox.restart()
      leftBox1.restart()
      leftBox2.restart()
      rightBox.restart()
      rightBox1.restart()
      rightBox2.restart()
    } else {
      topBox.reverse()
      leftBox.reverse()
      leftBox1.reverse()
      leftBox2.reverse()
      rightBox.reverse()
      rightBox1.reverse()
      rightBox2.reverse()
    }
  })
  
  onUnmounted(() => {
    unMapPlaySub()
    unModeSub()
  })
})
</script>

<style scoped>
.grid-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
  pointer-events: none;
}

.card {
  position: relative;
  background: rgba(255, 245, 232, 0.65);
  border: 1px solid rgba(255, 145, 0, 0.3);
  padding: 15px;
  backdrop-filter: blur(4px);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  z-index: 9999;
}

.card::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 10px;
  height: 10px;
  border-top: 2px solid #ea580c;
  border-left: 2px solid #ea580c;
  transition: all 0.3s ease;
  pointer-events: none;
}

.card::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-bottom: 2px solid #ea580c;
  border-right: 2px solid #ea580c;
  transition: all 0.3s ease;
  pointer-events: none;
}

.card:hover::before,
.card:hover::after {
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

.card-title {
  font-size: 18px;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 4px solid #fdb961;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #5a4a42;
}

.card-title span {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.4);
  font-weight: normal;
}
</style>
