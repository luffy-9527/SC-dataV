<script setup lang="ts">
import { computed } from 'vue'
import SeamVirtualScroll from '@/components/SeamVirtualScroll.vue'
import cityData from '../cityData'

interface RowData {
  city: string
  code: string
  amount: string
  rate: number
}

const keys = Object.keys(cityData)
const list = computed<RowData[]>(() =>
  keys.map((city, index) => {
    const rate = 52 + ((index * 19) % 48)
    return {
      city,
      code: `ZL${String(7300000 + index * 9317).padStart(8, '0')}`,
      amount: (320 + index * 67.26).toLocaleString('zh-CN', { maximumFractionDigits: 2 }),
      rate,
    }
  }),
)

function rateColor(rate: number) {
  if (rate > 90) return '#fbdf88'
  if (rate > 60) return '#ffa800'
  return '#ea580c'
}
</script>

<template>
  <div class="table">
    <div class="thead">
      <span>城市</span>
      <span>处罚编号</span>
      <span>金额</span>
      <span>完成率</span>
    </div>
    <SeamVirtualScroll :list="list" :item-height="38" :speed="0.26">
      <template #default="{ item }">
        <div class="row">
          <span>{{ item.city }}</span>
          <span>{{ item.code }}</span>
          <span>{{ item.amount }}</span>
          <span :style="{ color: rateColor(item.rate) }">{{ item.rate.toFixed(2) }}%</span>
        </div>
      </template>
    </SeamVirtualScroll>
  </div>
</template>

<style scoped>
.table {
  height: 100%;
  display: grid;
  grid-template-rows: 40px 1fr;
  color: rgba(0, 0, 0, 0.78);
  mask-image: linear-gradient(to bottom, black 82%, transparent 100%);
}

.thead,
.row {
  display: grid;
  grid-template-columns: 1fr 1.4fr 0.9fr 0.9fr;
  gap: 8px;
  align-items: center;
  padding: 0 8px;
  font-size: 13px;
}

.thead {
  color: rgba(0, 0, 0, 0.55);
  border-bottom: 1px solid rgba(234, 88, 12, 0.15);
}

.row {
  height: 38px;
  border-top: 1px solid rgba(255, 145, 0, 0.08);
}

.row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
