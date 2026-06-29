<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'

const props = withDefaults(
  defineProps<{
    value: number
    duration?: number
    decimals?: number
    prefix?: string
    suffix?: string
  }>(),
  {
    duration: 0.8,
    decimals: 0,
    prefix: '',
    suffix: '',
  },
)

const current = ref(0)
const text = computed(() => `${props.prefix}${current.value.toFixed(props.decimals)}${props.suffix}`)

function animate(to: number) {
  gsap.to(current, {
    value: to,
    duration: props.duration,
    ease: 'power2.out',
  })
}

onMounted(() => animate(props.value))
watch(() => props.value, value => animate(value))
</script>

<template>
  <span>{{ text }}</span>
</template>
