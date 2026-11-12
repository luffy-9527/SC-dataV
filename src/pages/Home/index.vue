<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { getLiveTelemetrySnapshot, type LiveTelemetrySnapshot } from '../DigitalHuman/composables/useAIAgent'

interface SceneItem {
  id: 'smart-city' | 'low-altitude' | 'smart-oilfield' | 'autopilot' | 'digital-human'
  indexLabel: string
  shortTitle: string
  shortTag: string
  categoryLabel: string
  title: string
  enTitle: string
  path: string
  themeColor: string
  badge?: string
  stageTech: string
  stageHighlight: string
  description: string
  tags: string[]
  ctaText: string
}

type ThemePreference = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'sc-datav-home-theme'
const themeOptions: { value: ThemePreference; label: string; title: string }[] = [
  { value: 'light', label: '白天', title: '切换为明亮白天色调' },
  { value: 'dark', label: '夜晚', title: '切换为通透夜晚色调' },
  { value: 'system', label: '系统', title: '跟随系统浅色/深色外观' },
]

function readSavedTheme(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {}
  return 'system'
}

const router = useRouter()
const baseUrl = import.meta.env.BASE_URL
const currentTime = ref('')
const snapshot = ref<LiveTelemetrySnapshot>(getLiveTelemetrySnapshot())
const activeId = ref<SceneItem['id']>('smart-city')
const brokenImages = reactive<Record<string, boolean>>({})
const dockItemRefs = ref<Record<string, HTMLElement | null>>({})
const themeMode = ref<ThemePreference>(readSavedTheme())
const systemPrefersDark = ref<boolean>(
  typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false : false,
)

const resolvedTheme = computed<'light' | 'dark'>(() => {
  if (themeMode.value === 'system') {
    return systemPrefersDark.value ? 'dark' : 'light'
  }
  return themeMode.value
})

function setThemeMode(mode: ThemePreference) {
  themeMode.value = mode
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {}
}

let clockTimer: number | null = null
let telemetryTimer: number | null = null
let colorSchemeQuery: MediaQueryList | null = null

function handleColorSchemeChange(e: MediaQueryListEvent) {
  systemPrefersDark.value = e.matches
}

const scenes = computed<SceneItem[]>(() => [
  {
    id: 'smart-city',
    indexLabel: '01',
    shortTitle: '智慧城市',
    shortTag: '空间 GIS',
    categoryLabel: '空间 GIS · 政务中枢',
    title: '四川省智慧城市数据大脑',
    enTitle: 'SICHUAN SMART CITY DATA BRAIN',
    path: '/smart-city',
    themeColor: '#f59e0b',
    stageTech: 'Three.js + D3-geo',
    stageHighlight: '21 市州三级下钻 · 5 维气象仿真',
    description:
      '构建四川省高精度三维拔模地形与发光区划边界，支持省-市-区县三级无缝下钻、动态粒子气象仿真与宏观 ECharts 态势联动。',
    tags: ['三维地形', '三级下钻', '气象粒子', 'ECharts 5'],
    ctaText: '进入沉浸大屏',
  },
  {
    id: 'low-altitude',
    indexLabel: '02',
    shortTitle: '低空经济',
    shortTag: '低空治理',
    categoryLabel: '低空治理 · 三维 GIS',
    title: '低空经济综合监管平台',
    enTitle: 'LOW ALTITUDE OPERATIONS CENTER',
    path: '/low-altitude',
    themeColor: '#34d399',
    badge: 'NEW · 成都运行中心',
    stageTech: 'Three.js + Chengdu GeoJSON',
    stageHighlight: '空域围栏 · 无人机巡检 · 应急联动',
    description:
      '以成都市区三维建筑与河网场景为核心，联动飞行器、航线、空域围栏、起降设施与巡检任务，提供综合态势与应急联动多维监管视角。',
    tags: ['成都市级监管', '空域围栏', '飞行航线', '应急演示'],
    ctaText: '进入沉浸大屏',
  },
  {
    id: 'smart-oilfield',
    indexLabel: '03',
    shortTitle: '智慧油田',
    shortTag: '工业孪生',
    categoryLabel: '工业孪生 · 能源勘探',
    title: '智慧油田智能开采数字孪生',
    enTitle: 'INTELLIGENT OILFIELD DIGITAL TWIN',
    path: '/smart-oilfield',
    themeColor: '#38bdf8',
    stageTech: 'Three.js PBR + GSAP',
    stageHighlight: '万米地层透视 · 7 大钻采工序',
    description:
      '面向塔里木万米深地工程的全要素工业数字孪生平台，纵向穿透大漠钻台与油气岩层，集成抽油机物理仿真与 Zen 全景模式。',
    tags: ['PBR 装备', '万米地层', '50Hz 遥测', '沉浸全景'],
    ctaText: '进入沉浸大屏',
  },
  {
    id: 'autopilot',
    indexLabel: '04',
    shortTitle: '自动驾驶',
    shortTag: '智能座舱',
    categoryLabel: '智驾仿真 · 车路协同',
    title: '自动驾驶智能座舱数字孪生',
    enTitle: 'AUTONOMOUS DRIVING COCKPIT TWIN',
    path: '/autopilot',
    themeColor: '#22d3ee',
    stageTech: 'DRACO 精模 + 点云仿真',
    stageHighlight: 'NOA 自主变道 · 昼夜光影切换',
    description:
      '宝马 M4 高精运动轿跑自动驾驶数字座舱，实时模拟多线束激光雷达扫描、TTC 碰撞时距预警、NOA 自主领航变道与实时性能 HUD。',
    tags: ['激光点云', 'NOA 变道', 'TTC 预警', '车机 HUD'],
    ctaText: '进入沉浸大屏',
  },
  {
    id: 'digital-human',
    indexLabel: '05',
    shortTitle: 'AI 数字人',
    shortTag: '全息交互',
    categoryLabel: '全息 AI · 多模态指挥',
    title: '全息 AI 数字人智能指挥中心',
    enTitle: 'HOLOGRAPHIC AI AVATAR COMMAND CENTER',
    path: '/digital-human',
    themeColor: '#a78bfa',
    badge: '多模态 AI 核心',
    stageTech: '67 BlendShapes + Edge-TTS',
    stageHighlight: '唇音同步 · 全网实时联网 · 跨屏调度',
    description:
      '初音未来 3D 全息智能数字讲解官，集成 67 组微表情唇形驱动、6 档高保真声线、ASR 语音提问、全网实时搜索与一键跨屏态势分析播报。',
    tags: ['67 表情基驱动', '神经网络声线', '全网实时检索', '跨屏联动'],
    ctaText: '唤醒数字人',
  },
])

const activeIndex = computed(() => {
  const idx = scenes.value.findIndex((item) => item.id === activeId.value)
  return idx >= 0 ? idx : 0
})

const activeScene = computed<SceneItem>(() => scenes.value[activeIndex.value] ?? scenes.value[0])

function getPreviewUrl(id: SceneItem['id']): string {
  return `${baseUrl}previews/${id}.png`
}

function handleImageError(id: SceneItem['id']) {
  brokenImages[id] = true
}

function setDockItemRef(id: string, el: unknown) {
  dockItemRefs.value[id] = el instanceof HTMLElement ? el : null
}

function selectScene(id: SceneItem['id']) {
  if (activeId.value === id) return
  activeId.value = id
  nextTick(() => {
    const el = dockItemRefs.value[id]
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  })
}

function stepScene(delta: number) {
  const list = scenes.value
  if (list.length === 0) return
  const nextIdx = (activeIndex.value + delta + list.length) % list.length
  selectScene(list[nextIdx].id)
}

function navigateTo(path: string) {
  router.push(path)
}

function getSceneMetrics(id: SceneItem['id']) {
  const s = snapshot.value
  switch (id) {
    case 'smart-city':
      return [
        { label: '接入物联网节点', value: `${s.smartCity.nodesCount} 市州` },
        { label: '天府智算负载', value: s.smartCity.cpuLoad },
      ]
    case 'low-altitude':
      return [
        { label: '模拟在飞/待命', value: '18 架飞行器' },
        { label: '多维监管视角', value: '4 类态势协同' },
      ]
    case 'smart-oilfield':
      return [
        { label: '深地塔科进尺', value: s.smartOilfield.depth },
        { label: '井口回压监测', value: s.smartOilfield.pressure },
      ]
    case 'autopilot':
      return [
        { label: '高精巡航车速', value: s.autopilot.speed },
        { label: '多模态融合时延', value: s.autopilot.latency },
      ]
    case 'digital-human':
      return [
        { label: '全域协同指数', value: `${s.crossScreen.synergyScore} 分` },
        { label: '声线与表情驱动', value: '6 档 · 67 表情基' },
      ]
  }
}

function updateClock() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

function handleKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
    return
  }

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    stepScene(1)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    stepScene(-1)
  } else if (e.key === 'Enter') {
    if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return
    e.preventDefault()
    navigateTo(activeScene.value.path)
  }
}

onMounted(() => {
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)
  telemetryTimer = window.setInterval(() => {
    snapshot.value = getLiveTelemetrySnapshot()
  }, 3000)
  window.addEventListener('keydown', handleKeydown)

  colorSchemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null
  if (colorSchemeQuery) {
    systemPrefersDark.value = colorSchemeQuery.matches
    colorSchemeQuery.addEventListener('change', handleColorSchemeChange)
  }

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!prefersReducedMotion) {
    gsap.fromTo(
      '.vision-entrance',
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out' },
    )
  }
})

onBeforeUnmount(() => {
  if (clockTimer !== null) clearInterval(clockTimer)
  if (telemetryTimer !== null) clearInterval(telemetryTimer)
  window.removeEventListener('keydown', handleKeydown)
  colorSchemeQuery?.removeEventListener('change', handleColorSchemeChange)
})
</script>

<template>
  <div
    class="home-plaza"
    :data-theme="resolvedTheme"
    :style="{ '--active-accent': activeScene.themeColor }"
  >
    <!-- 沉浸式动态空间环境光背景 -->
    <div class="plaza-backdrop" aria-hidden="true">
      <div class="ambient-radial" />
      <div class="ambient-secondary" />
      <div class="subtle-dots" />
    </div>

    <!-- 顶部极简玻璃导航栏 -->
    <header class="plaza-header">
      <div class="plaza-header__inner">
        <div class="brand-group">
          <div class="brand-emblem" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
              <polygon
                points="16,2.5 28,9.25 28,22.75 16,29.5 4,22.75 4,9.25"
                stroke="var(--text-muted)"
                stroke-width="1.4"
                fill="var(--surface-subtle)"
              />
              <polygon
                points="16,8 23,12 23,20 16,24 9,20 9,12"
                stroke="var(--active-accent)"
                stroke-width="1.3"
                fill="var(--surface-subtle)"
              />
              <circle cx="16" cy="16" r="2.2" fill="var(--text-primary)" />
            </svg>
          </div>
          <div class="brand-meta">
            <span class="brand-label">首页广场</span>
            <span class="brand-sub">3D DIGITAL TWIN &amp; AI VISUALIZATION HUB</span>
          </div>
        </div>

        <div class="header-actions">
          <div class="status-chip">
            <span class="status-dot" />
            <span>{{ scenes.length }} 场景在线</span>
          </div>

          <div class="clock-chip">{{ currentTime }}</div>

          <!-- 白天 / 夜晚 / 系统 三态色调切换器 -->
          <div class="theme-switcher" role="radiogroup" aria-label="界面色调模式">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="themeMode === opt.value"
              class="theme-opt-btn"
              :class="{ 'is-selected': themeMode === opt.value }"
              :title="opt.title"
              @click="setThemeMode(opt.value)"
            >
              <!-- 太阳（白天） -->
              <svg v-if="opt.value === 'light'" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <!-- 月亮（夜晚） -->
              <svg v-else-if="opt.value === 'dark'" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
              <!-- 显示器（系统） -->
              <svg v-else viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              <span class="theme-opt-label">{{ opt.label }}</span>
            </button>
          </div>

          <button type="button" class="header-ghost-btn" @click="navigateTo('/digital-human')">
            <span class="ghost-dot" aria-hidden="true" />
            <span>唤醒 AI 数字人</span>
          </button>

          <a
            class="icon-link-btn"
            href="https://github.com/luffy-9527/SC-dataV"
            target="_blank"
            rel="noreferrer"
            title="访问 GitHub 仓库"
            aria-label="访问 GitHub 仓库"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.61.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.52 2.33 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.55 9.55 0 0 1 12 6.99c.85 0 1.71.11 2.51.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86V21c0 .26.18.57.69.48A10 10 0 0 0 12 2Z" />
            </svg>
          </a>
        </div>
      </div>
    </header>

    <!-- 主舞台与底部 Dock 单屏交互工作区 -->
    <main class="gallery-workspace">
      <!-- 紧凑画廊顶栏：零多余介绍与零冗长筛选 -->
      <div class="gallery-topline vision-entrance">
        <div class="topline-title-group">
          <h1 class="gallery-heading">三维数字孪生与全息 AI 展演中心</h1>
          <span class="gallery-sub">全域协同指数 {{ snapshot.crossScreen.synergyScore }} 分 · {{ snapshot.crossScreen.compositeStatus }}</span>
        </div>

        <div class="topline-controls">
          <span class="kbd-hint">← / → 切换 · Enter 进入</span>
          <span class="index-counter">{{ activeScene.indexLabel }} / {{ String(scenes.length).padStart(2, '0') }}</span>
        </div>
      </div>

      <!-- 核心聚光灯主舞台 -->
      <section class="spotlight-stage vision-entrance" aria-label="当前焦点大屏">
        <Transition name="stage-fade" mode="out-in">
          <div :key="activeScene.id" class="stage-card">
            <!-- 左侧：实景 3D 渲染视窗 -->
            <div
              class="stage-media"
              role="button"
              tabindex="0"
              :aria-label="`进入 ${activeScene.title}`"
              @click="navigateTo(activeScene.path)"
              @keydown.enter.prevent="navigateTo(activeScene.path)"
            >
              <img
                v-if="!brokenImages[activeScene.id]"
                :src="getPreviewUrl(activeScene.id)"
                :alt="`${activeScene.title} 实景预览`"
                class="stage-image"
                @error="handleImageError(activeScene.id)"
              />
              <div v-else class="stage-fallback">
                <span class="fallback-index">{{ activeScene.indexLabel }}</span>
                <span class="fallback-title">{{ activeScene.title }}</span>
              </div>

              <div class="media-scrim" aria-hidden="true" />

              <div class="media-top-pills">
                <span class="glass-pill">
                  <span class="pill-accent-dot" />
                  <span>{{ activeScene.categoryLabel }}</span>
                </span>
                <span v-if="activeScene.badge" class="glass-pill glass-pill--highlight">
                  {{ activeScene.badge }}
                </span>
              </div>

              <div class="media-bottom-bar">
                <div class="media-tech-line">
                  <span class="tech-name">{{ activeScene.stageTech }}</span>
                  <span class="tech-sep">·</span>
                  <span class="tech-desc">{{ activeScene.stageHighlight }}</span>
                </div>
                <span class="hover-enter-pill">点击画面进入 ↗</span>
              </div>
            </div>

            <!-- 右侧：留白叙事、指标与纯白主操作 -->
            <div class="stage-details">
              <div class="details-top">
                <div class="details-eyebrow-row">
                  <span class="details-en">{{ activeScene.enTitle }}</span>
                  <span class="details-route">#{{ activeScene.path }}</span>
                </div>

                <h2 class="details-title">{{ activeScene.title }}</h2>
                <p class="details-desc">{{ activeScene.description }}</p>
              </div>

              <div class="details-middle">
                <div class="metrics-pair">
                  <div
                    v-for="(metric, idx) in getSceneMetrics(activeScene.id)"
                    :key="metric.label"
                    class="metric-block"
                    :class="{ 'has-divider': idx > 0 }"
                  >
                    <span class="metric-label">{{ metric.label }}</span>
                    <span class="metric-value">{{ metric.value }}</span>
                  </div>
                </div>

                <div class="capability-row">
                  <span v-for="tag in activeScene.tags" :key="tag" class="capability-pill">
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div class="details-actions">
                <button
                  type="button"
                  class="primary-white-cta"
                  @click="navigateTo(activeScene.path)"
                >
                  <span>{{ activeScene.ctaText }}</span>
                  <span class="cta-arrow" aria-hidden="true">→</span>
                </button>

                <div class="step-controls" role="group" aria-label="切换上下大屏">
                  <button
                    type="button"
                    class="step-circle-btn"
                    title="上一个场景 (←)"
                    aria-label="上一个场景"
                    @click="stepScene(-1)"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    class="step-circle-btn"
                    title="下一个场景 (→)"
                    aria-label="下一个场景"
                    @click="stepScene(1)"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </section>

      <!-- 底部悬浮磨砂 Dock 切换栏：固定结构，扩展任意页面均不变形 -->
      <nav class="gallery-dock-shell vision-entrance" aria-label="数字孪生大屏快捷切换栏">
        <div class="dock-track">
          <div
            v-for="scene in scenes"
            :key="scene.id"
            :ref="(el) => setDockItemRef(scene.id, el)"
            role="button"
            tabindex="0"
            class="dock-item"
            :class="{ 'is-active': scene.id === activeScene.id }"
            :style="{ '--item-accent': scene.themeColor }"
            :aria-current="scene.id === activeScene.id ? 'true' : undefined"
            @click="selectScene(scene.id)"
            @dblclick="navigateTo(scene.path)"
            @keydown.enter.prevent="selectScene(scene.id)"
            @keydown.space.prevent="selectScene(scene.id)"
          >
            <div class="dock-thumb">
              <img
                v-if="!brokenImages[scene.id]"
                :src="getPreviewUrl(scene.id)"
                :alt="scene.shortTitle"
                class="dock-thumb-img"
                @error="handleImageError(scene.id)"
              />
              <span v-else class="dock-thumb-fallback">{{ scene.indexLabel }}</span>
            </div>

            <div class="dock-copy">
              <span class="dock-title">{{ scene.shortTitle }}</span>
              <span class="dock-sub">{{ scene.indexLabel }} · {{ scene.shortTag }}</span>
            </div>

            <button
              type="button"
              class="dock-launch"
              :title="`直接进入 ${scene.shortTitle}`"
              :aria-label="`直接进入 ${scene.title}`"
              @click.stop="navigateTo(scene.path)"
            >
              ↗
            </button>

            <span class="dock-active-bar" aria-hidden="true" />
          </div>
        </div>
      </nav>
    </main>
  </div>
</template>

<style scoped>
/* =========================
   双色系主题设计令牌（明亮夜晚 / 清透白天）
   ========================= */
.home-plaza {
  --active-accent: #f59e0b;
  --bg-base: #10182b;
  --bg-glow-mix: 22%;
  --bg-radial-top: rgba(56, 189, 248, 0.16);
  --bg-radial-bottom: rgba(30, 41, 59, 0.65);
  --dot-color: rgba(226, 232, 240, 0.09);
  --header-bg: rgba(18, 27, 46, 0.76);
  --stage-bg: rgba(25, 36, 58, 0.74);
  --dock-bg: rgba(21, 31, 51, 0.8);
  --media-frame-bg: #121c30;
  --surface-subtle: rgba(255, 255, 255, 0.07);
  --surface-hover: rgba(255, 255, 255, 0.13);
  --surface-active: rgba(255, 255, 255, 0.16);
  --border-subtle: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(255, 255, 255, 0.24);
  --inner-highlight: rgba(255, 255, 255, 0.14);
  --shadow-stage: 0 28px 72px rgba(2, 6, 23, 0.48);
  --shadow-dock: 0 18px 46px rgba(2, 6, 23, 0.44);
  --shadow-media: 0 14px 36px rgba(2, 6, 23, 0.4);
  --text-primary: #f8fafc;
  --text-heading: #ffffff;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-eyebrow: rgba(226, 232, 240, 0.6);
  --cta-bg: #f8fafc;
  --cta-bg-hover: #ffffff;
  --cta-text: #0f172a;
  --cta-shadow: 0 8px 24px rgba(255, 255, 255, 0.16);
  --cta-shadow-hover: 0 12px 30px rgba(255, 255, 255, 0.24);
  --scrollbar-thumb: rgba(255, 255, 255, 0.18);

  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  display: flex;
  flex-direction: column;
  transition: background-color 0.35s ease, color 0.3s ease;
}

.home-plaza[data-theme='light'] {
  --bg-base: #edf2f8;
  --bg-glow-mix: 18%;
  --bg-radial-top: rgba(56, 189, 248, 0.15);
  --bg-radial-bottom: rgba(226, 232, 240, 0.85);
  --dot-color: rgba(15, 23, 42, 0.08);
  --header-bg: rgba(255, 255, 255, 0.78);
  --stage-bg: rgba(255, 255, 255, 0.84);
  --dock-bg: rgba(255, 255, 255, 0.86);
  --media-frame-bg: #e2e8f0;
  --surface-subtle: rgba(15, 23, 42, 0.05);
  --surface-hover: rgba(15, 23, 42, 0.09);
  --surface-active: rgba(255, 255, 255, 0.98);
  --border-subtle: rgba(15, 23, 42, 0.09);
  --border-strong: rgba(15, 23, 42, 0.18);
  --inner-highlight: rgba(255, 255, 255, 0.96);
  --shadow-stage: 0 24px 64px rgba(15, 23, 42, 0.09);
  --shadow-dock: 0 16px 42px rgba(15, 23, 42, 0.1);
  --shadow-media: 0 12px 30px rgba(15, 23, 42, 0.11);
  --text-primary: #0f172a;
  --text-heading: #0b1220;
  --text-secondary: #334155;
  --text-muted: #64748b;
  --text-eyebrow: rgba(51, 65, 85, 0.65);
  --cta-bg: #0f172a;
  --cta-bg-hover: #1e293b;
  --cta-text: #ffffff;
  --cta-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  --cta-shadow-hover: 0 14px 30px rgba(15, 23, 42, 0.26);
  --scrollbar-thumb: rgba(15, 23, 42, 0.2);
}

.home-plaza::-webkit-scrollbar {
  width: 6px;
}

.home-plaza::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 999px;
}

/* 环境光背景层 */
.plaza-backdrop {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.ambient-radial {
  position: absolute;
  inset: -15%;
  background: radial-gradient(
    ellipse 60% 52% at 32% 36%,
    color-mix(in srgb, var(--active-accent) var(--bg-glow-mix), transparent) 0%,
    transparent 72%
  );
  transition: background 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.ambient-secondary {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 82% 18%, var(--bg-radial-top) 0%, transparent 48%),
    radial-gradient(circle at 50% 100%, var(--bg-radial-bottom) 0%, transparent 65%);
}

.subtle-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--dot-color) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse 78% 72% at 50% 45%, black 25%, transparent 92%);
  opacity: 0.65;
}

/* 顶部极简导航 */
.plaza-header {
  position: sticky;
  top: 0;
  z-index: 20;
  flex-shrink: 0;
  background: var(--header-bg);
  backdrop-filter: blur(22px) saturate(150%);
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.35s ease, border-color 0.3s ease;
}

.plaza-header__inner {
  max-width: 1360px;
  margin: 0 auto;
  padding: 10px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-emblem {
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-label {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: var(--text-primary);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
}

.brand-sub {
  font-size: 10.5px;
  letter-spacing: 1.6px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.65);
}

.clock-chip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--text-muted);
  padding: 5px 8px;
  white-space: nowrap;
}

/* 三态色调切换器（白天 / 夜晚 / 系统） */
.theme-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
}

.theme-opt-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.theme-opt-btn:hover {
  color: var(--text-primary);
}

.theme-opt-btn.is-selected {
  background: var(--surface-active);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.14);
}

.header-ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.header-ghost-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.ghost-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
}

.icon-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--text-muted);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.icon-link-btn:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

/* 主工作区：1 屏精聚焦 */
.gallery-workspace {
  position: relative;
  z-index: 1;
  flex: 1 0 auto;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 14px 28px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
}

/* 顶行 */
.gallery-topline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 0 4px;
}

.topline-title-group {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.gallery-heading {
  margin: 0;
  font-size: clamp(19px, 1.8vw, 24px);
  font-weight: 700;
  letter-spacing: 0.4px;
  color: var(--text-heading);
}

.gallery-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.topline-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.kbd-hint {
  font-size: 11.5px;
  color: var(--text-muted);
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
}

.index-counter {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* 主聚光灯舞台 */
.spotlight-stage {
  width: 100%;
}

.stage-card {
  display: grid;
  grid-template-columns: 1.42fr 1fr;
  align-items: stretch;
  border-radius: 24px;
  background: var(--stage-bg);
  backdrop-filter: blur(32px) saturate(155%);
  border: 1px solid var(--border-subtle);
  box-shadow:
    inset 0 1px 0 var(--inner-highlight),
    var(--shadow-stage);
  overflow: hidden;
  transition: background 0.35s ease, border-color 0.3s ease, box-shadow 0.35s ease;
}

/* 左侧实景预览容器 */
.stage-media {
  position: relative;
  margin: 12px 0 12px 12px;
  border-radius: 16px;
  aspect-ratio: 16 / 9;
  max-height: 460px;
  overflow: hidden;
  cursor: pointer;
  outline: none;
  background: var(--media-frame-bg);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-media);
}

.stage-media:focus-visible {
  box-shadow: 0 0 0 2px var(--text-primary);
}

.stage-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.stage-media:hover .stage-image {
  transform: scale(1.028);
}

.stage-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--active-accent) 22%, #0b1120), #060911);
}

.fallback-index {
  font-family: monospace;
  font-size: 32px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.25);
}

.fallback-title {
  font-size: 16px;
  color: #e2e8f0;
}

.media-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(6, 9, 17, 0.28) 0%, transparent 28%),
    linear-gradient(0deg, rgba(6, 9, 17, 0.92) 0%, rgba(6, 9, 17, 0.48) 24%, transparent 48%);
}

.media-top-pills {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  pointer-events: none;
}

.glass-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(14px);
}

.glass-pill--highlight {
  background: rgba(15, 23, 42, 0.78);
  border-color: rgba(255, 255, 255, 0.28);
  color: #ffffff;
}

.pill-accent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--active-accent);
}

.media-bottom-bar {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.media-tech-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
}

.tech-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
}

.tech-sep {
  color: rgba(255, 255, 255, 0.35);
}

.tech-desc {
  color: rgba(226, 232, 240, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hover-enter-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: #090d16;
  background: rgba(248, 250, 252, 0.92);
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  white-space: nowrap;
}

.stage-media:hover .hover-enter-pill {
  opacity: 1;
  transform: translateY(0);
}

/* 右侧叙事与操作区 */
.stage-details {
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
}

.details-top {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.details-eyebrow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.details-en {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 1.8px;
  color: var(--text-eyebrow);
}

.details-route {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: var(--text-muted);
}

.details-title {
  margin: 0;
  font-size: clamp(22px, 2.2vw, 30px);
  font-weight: 700;
  line-height: 1.24;
  letter-spacing: -0.2px;
  color: var(--text-heading);
}

.details-desc {
  margin: 4px 0 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* 无边框数字指标与克制标签 */
.details-middle {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtle);
}

.metrics-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.metric-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-block.has-divider {
  padding-left: 18px;
  border-left: 1px solid var(--border-subtle);
}

.metric-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.metric-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.capability-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.capability-pill {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
}

/* 底部高对比 CTA + 切换箭头 */
.details-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 6px;
}

.primary-white-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  background: var(--cta-bg);
  color: var(--cta-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--cta-shadow);
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.primary-white-cta:hover {
  background: var(--cta-bg-hover);
  transform: translateY(-1px);
  box-shadow: var(--cta-shadow-hover);
}

.cta-arrow {
  transition: transform 0.2s ease;
}

.primary-white-cta:hover .cta-arrow {
  transform: translateX(3px);
}

.step-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-circle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.step-circle-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

/* 舞台切换过场 */
.stage-fade-enter-active,
.stage-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.stage-fade-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.992);
}

.stage-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.996);
}

/* 底部悬浮 Dock 切换栏 */
.gallery-dock-shell {
  width: 100%;
  display: flex;
  justify-content: center;
}

.dock-track {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 8px;
  border-radius: 20px;
  background: var(--dock-bg);
  backdrop-filter: blur(28px) saturate(155%);
  border: 1px solid var(--border-subtle);
  box-shadow:
    inset 0 1px 0 var(--inner-highlight),
    var(--shadow-dock);
  transition: background 0.35s ease, border-color 0.3s ease, box-shadow 0.35s ease;
}

.dock-track::-webkit-scrollbar {
  display: none;
}

.dock-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 156px;
  padding: 7px 11px 9px;
  border-radius: 13px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  text-align: left;
  flex: 1 0 auto;
  transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease, color 0.22s ease, box-shadow 0.22s ease;
}

.dock-item:hover {
  background: var(--surface-subtle);
  color: var(--text-primary);
}

.dock-item.is-active {
  background: var(--surface-active);
  border-color: var(--border-subtle);
  color: var(--text-primary);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
  transform: translateY(-2px);
}

.dock-thumb {
  width: 58px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--media-frame-bg);
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dock-item.is-active .dock-thumb {
  border-color: var(--border-strong);
}

.dock-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.dock-thumb-fallback {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.dock-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.dock-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.dock-sub {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.dock-item.is-active .dock-sub {
  color: var(--text-secondary);
}

.dock-launch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.dock-item:hover .dock-launch,
.dock-item.is-active .dock-launch {
  opacity: 1;
}

.dock-launch:hover {
  background: var(--cta-bg);
  color: var(--cta-text);
}

.dock-active-bar {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 3px;
  height: 2px;
  border-radius: 999px;
  background: var(--item-accent);
  opacity: 0;
  transform: scaleX(0.4);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.dock-item.is-active .dock-active-bar {
  opacity: 0.95;
  transform: scaleX(1);
}

/* 响应式适配 */
@media (max-width: 1060px) {
  .brand-sub,
  .clock-chip {
    display: none;
  }
}

@media (max-width: 860px) {
  .stage-card {
    grid-template-columns: 1fr;
  }

  .stage-media {
    margin: 12px 12px 0;
    max-height: none;
  }

  .stage-details {
    padding: 20px 22px 22px;
  }

  .plaza-header__inner,
  .gallery-workspace {
    padding-left: 16px;
    padding-right: 16px;
  }

  .brand-sub,
  .status-chip,
  .clock-chip,
  .kbd-hint,
  .theme-opt-label {
    display: none;
  }

  .theme-opt-btn {
    padding: 5px 8px;
  }

  .gallery-topline {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .details-actions {
    flex-wrap: wrap;
  }

  .primary-white-cta {
    flex: 1;
  }

  .dock-track {
    width: 100%;
    justify-content: flex-start;
  }

  .dock-item {
    min-width: 152px;
    flex: 0 0 auto;
  }
}
</style>
