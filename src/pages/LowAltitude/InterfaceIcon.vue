<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z M9 21v-8h6v8',
  aircraft: 'M9 9h6v6H9z M9 9 5 5m10 4 4-4M9 15l-4 4m10-4 4 4 M2 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0m14 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0M2 19a3 3 0 1 0 6 0 3 3 0 0 0-6 0m14 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  flight: 'm4 17 6-6 4 3 6-10 M14 4h6v6',
  activity: 'M2 12h4l3-8 6 16 3-8h4',
  airspace: 'm3 8 9-5 9 5-9 5Z M3 12l9 5 9-5 M3 16l9 5 9-5',
  mission: 'M8 5H5v16h14V5h-3 M8 3h8v5H8z M8 13l2 2 5-5',
  alert: 'm12 3 10 18H2Z M12 9v5 M12 17h.01',
  weather: 'M6 15a4 4 0 1 1 1-7 5 5 0 0 1 10 1 3 3 0 0 1 0 6Z M9 3v1 M3 6l1 1 M2 11h1',
  layers: 'm3 8 9-5 9 5-9 5Z M3 12l9 5 9-5 M3 16l9 5 9-5',
  reset: 'M4 10a8 8 0 1 1 1 8 M4 4v6h6',
  plus: 'M5 12h14 M12 5v14',
  minus: 'M5 12h14',
  compass: 'm15 9-3 6-3-3 3-6Z M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.activity" /></svg>
</template>
