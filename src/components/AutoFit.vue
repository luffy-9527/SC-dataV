<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    designWidth?: number
    designHeight?: number
    fitMode?: 'stretch' | 'contain' | 'cover' | 'auto'
    background?: string
    showLandscapeHint?: boolean
  }>(),
  {
    designWidth: 1920,
    designHeight: 1080,
    fitMode: 'auto',
    background: undefined,
    showLandscapeHint: true,
  },
)

const viewportWidth = ref(1920)
const viewportHeight = ref(1080)
const isPortraitMobile = ref(false)
const hintDismissed = ref(false)

function updateViewport() {
  const w = window.innerWidth || document.documentElement.clientWidth || props.designWidth
  const h = window.innerHeight || document.documentElement.clientHeight || props.designHeight
  viewportWidth.value = w
  viewportHeight.value = h

  // 判定是否处于窄屏移动设备竖屏状态（宽度 < 900 且 竖屏）
  isPortraitMobile.value = w < 900 && h > w
}

const activeFitMode = computed(() => {
  if (props.fitMode !== 'auto') return props.fitMode
  // 处于移动端或窄竖屏时，自动采用 contain 模式防止画面失真被拉扯
  if (isPortraitMobile.value || viewportWidth.value < 1024) {
    return 'contain'
  }
  return 'stretch'
})

const stageStyle = computed(() => {
  const scaleX = viewportWidth.value / props.designWidth
  const scaleY = viewportHeight.value / props.designHeight

  if (activeFitMode.value === 'contain') {
    const scale = Math.min(scaleX, scaleY)
    return {
      width: `${props.designWidth}px`,
      height: `${props.designHeight}px`,
      transform: `scale(${scale}) translate(-50%, -50%)`,
      left: '50%',
      top: '50%',
    }
  }

  if (activeFitMode.value === 'cover') {
    const scale = Math.max(scaleX, scaleY)
    return {
      width: `${props.designWidth}px`,
      height: `${props.designHeight}px`,
      transform: `scale(${scale}) translate(-50%, -50%)`,
      left: '50%',
      top: '50%',
    }
  }

  return {
    width: `${props.designWidth}px`,
    height: `${props.designHeight}px`,
    transform: `scale(${scaleX}, ${scaleY})`,
    left: '0',
    top: '0',
  }
})

function dismissHint() {
  hintDismissed.value = true
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  window.addEventListener('orientationchange', updateViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('orientationchange', updateViewport)
})
</script>

<template>
  <div class="autofit-viewport" :style="background ? { background } : undefined">
    <div class="autofit-stage" :style="stageStyle">
      <slot />
    </div>

    <!-- 移动端竖屏建议横屏沉浸体验提示 -->
    <transition name="hint-fade">
      <div
        v-if="showLandscapeHint && isPortraitMobile && !hintDismissed"
        class="mobile-orient-hint"
        role="status"
        aria-live="polite"
        @click="dismissHint"
      >
        <span class="rotate-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <path d="M12 18h.01" />
            <path d="M19 8l2 2-2 2" />
            <path d="M21 10h-4" />
          </svg>
        </span>
        <span class="hint-text">建议横屏浏览以获得完整 3D 沉浸效果</span>
        <button type="button" class="hint-close-btn" aria-label="关闭提示" @click.stop="dismissHint">✕</button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.autofit-viewport {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: radial-gradient(circle at 50% 42%, #fff6e8 0%, #f7dfbc 45%, #eac38f 100%);
}

.autofit-stage {
  position: absolute;
  transform-origin: left top;
  overflow: hidden;
}

/* 移动端旋转屏幕悬浮微提示 */
.mobile-orient-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 14px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  color: #f8fafc;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
}

.rotate-icon {
  display: inline-flex;
  align-items: center;
  color: #38bdf8;
  animation: rotate-wiggle 2.5s ease-in-out infinite;
}

@keyframes rotate-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-25deg); }
  75% { transform: rotate(25deg); }
}

.hint-text {
  letter-spacing: 0.2px;
}

.hint-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #cbd5e1;
  font-size: 10px;
  cursor: pointer;
  margin-left: 2px;
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
