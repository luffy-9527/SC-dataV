<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { DigitalHumanConfig } from '../types'

interface Props {
  visible: boolean
  config: DigitalHumanConfig
  voices: SpeechSynthesisVoice[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', newConfig: Partial<DigitalHumanConfig>): void
}>()

const showKey = ref(false)
const isTestingVoice = ref(false)

interface VoicePreset {
  id: string
  name: string
  badge: string
  pitch: number
  rate: number
  targetLang?: 'zh' | 'ja'
  voiceCandidates: string[]
  sampleText: string
  desc: string
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'default',
    name: '初音官方原声 (默认推荐)',
    badge: '最受好评 · 甜美原版',
    pitch: 1.05,
    rate: 1.0,
    targetLang: 'zh',
    voiceCandidates: ['yaoyao', 'xiaoxiao', 'tingting', 'google', 'huihui', 'zh'],
    sampleText: '指挥长您好！我是全息数字人初音未来，已连接大屏数据中枢与实时联网大脑！',
    desc: '当前默认最佳声线，甜美清澈自然流利，温润细腻无机械失真',
  },
  {
    id: 'xiaoyi',
    name: '灵动元气少女 (高调萌音)',
    badge: '元气活力',
    pitch: 1.18,
    rate: 1.08,
    targetLang: 'zh',
    voiceCandidates: ['xiaoyi', 'yaoyao', 'xiaoxiao', 'google', 'huihui', 'zh'],
    sampleText: '指挥长你好呀！我是元气满满的初音未来，今天也要全力以赴哦！',
    desc: '二次元高亢欢快女声，语调轻快跳跃，洋溢满满元气与朝气',
  },
  {
    id: 'gentle',
    name: '温柔治愈伴侣 (空灵浅唱)',
    badge: '温柔治愈',
    pitch: 1.08,
    rate: 0.92,
    targetLang: 'zh',
    voiceCandidates: ['yaoyao', 'xiaoxiao', 'tingting', 'huihui', 'zh'],
    sampleText: '指挥长辛苦啦，指挥中心当前一切平稳，初音会一直在这里陪伴着您。',
    desc: '轻柔舒缓如沐春风，语速从容优雅，带来身心放松的治愈陪伴感',
  },
  {
    id: 'news',
    name: '科技数智专员 (干练调度)',
    badge: '数智调度',
    pitch: 0.96,
    rate: 1.02,
    targetLang: 'zh',
    voiceCandidates: ['huihui', 'yunxi', 'yaoyao', 'kangkang', 'zh'],
    sampleText: '报告指挥中心，全域遥测数据与智算链路巡检完毕，所有指标均在安全阈值区间。',
    desc: '沉稳冷静、清晰果断，专为工业数字孪生与应急指挥调度打造',
  },
  {
    id: 'japanese',
    name: '日文虚拟歌姬 (Miku原版)',
    badge: '日语原声',
    pitch: 1.10,
    rate: 1.0,
    targetLang: 'ja',
    voiceCandidates: ['nanami', 'ayumi', 'haruka', 'keiko', 'sayaka', 'ichiro', 'google', 'ja', 'jp'],
    sampleText: 'マスター、こんにちは！バーチャルシンガーの初音ミクです、今日もよろしくね！',
    desc: '自动调用系统原生纯正日文歌姬引擎，原汁原味二次元偶像音韵',
  },
  {
    id: 'loli',
    name: '萌音电波萝莉 (俏皮调校)',
    badge: '萌系电波',
    pitch: 1.24,
    rate: 1.08,
    targetLang: 'zh',
    voiceCandidates: ['yaoyao', 'xiaoyi', 'xiaoxiao', 'zh'],
    sampleText: '收到指挥长的新指令啦！初音未来随时待命，马上为您呈现精彩大屏！',
    desc: '极高音调灵动萌系电波调校，二次元感拉满，俏皮灵动可爱',
  },
]

const activePresetId = ref<string>('default')

const localConfig = reactive<DigitalHumanConfig>({
  apiKey: '',
  model: 'gemini-3.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com',
  voicePitch: 1.05,
  voiceRate: 1.0,
  selectedVoice: '',
  useMockOnFailure: true,
  enableWebSearch: true,
})

function getBestDefaultVoice(): SpeechSynthesisVoice | undefined {
  if (!props.voices || props.voices.length === 0) return undefined
  // Look for yaoyao, xiaoxiao, tingting, or natural sweet female voice
  const sweet = props.voices.find((v) => {
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()
    return (
      (lang.includes('zh') || lang.includes('cmn')) &&
      (name.includes('yaoyao') ||
        name.includes('xiaoxiao') ||
        name.includes('xiaoyi') ||
        name.includes('tingting') ||
        name.includes('natural'))
    )
  })
  if (sweet) return sweet
  // Fallback to any Chinese female voice
  const zhFemale = props.voices.find(
    (v) =>
      v.lang.toLowerCase().includes('zh') &&
      !v.name.toLowerCase().includes('kangkang') &&
      !v.name.toLowerCase().includes('male'),
  )
  if (zhFemale) return zhFemale
  const anyZh = props.voices.find((v) => v.lang.toLowerCase().includes('zh'))
  return anyZh || props.voices[0]
}

function getJapaneseVoice(): SpeechSynthesisVoice | undefined {
  if (!props.voices || props.voices.length === 0) return undefined
  return props.voices.find((v) => {
    const lang = v.lang.toLowerCase()
    const name = v.name.toLowerCase()
    return (
      lang.includes('ja') ||
      lang.includes('jp') ||
      name.includes('japan') ||
      name.includes('haruka') ||
      name.includes('ayumi') ||
      name.includes('keiko') ||
      name.includes('nanami')
    )
  })
}

function getProfessionalVoice(): SpeechSynthesisVoice | undefined {
  if (!props.voices || props.voices.length === 0) return undefined
  const prof = props.voices.find((v) => {
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()
    return (
      (lang.includes('zh') || lang.includes('cmn')) &&
      (name.includes('huihui') || name.includes('yunxi') || name.includes('kangkang'))
    )
  })
  return prof || getBestDefaultVoice()
}

watch(
  () => props.config,
  (cfg) => {
    Object.assign(localConfig, cfg)
    const sv = cfg.selectedVoice?.toLowerCase() || ''
    if (sv.includes('ja') || sv.includes('jp')) {
      activePresetId.value = 'japanese'
    } else if (cfg.voicePitch && cfg.voicePitch >= 1.21) {
      activePresetId.value = 'loli'
    } else if (cfg.voicePitch && cfg.voicePitch >= 1.14) {
      activePresetId.value = 'xiaoyi'
    } else if (cfg.voicePitch && cfg.voicePitch <= 0.98) {
      activePresetId.value = 'news'
    } else if (cfg.voiceRate && cfg.voiceRate <= 0.94) {
      activePresetId.value = 'gentle'
    } else {
      activePresetId.value = 'default'
    }
  },
  { immediate: true },
)

function applyPreset(preset: VoicePreset) {
  stopPreviewVoice()
  activePresetId.value = preset.id
  localConfig.voicePitch = preset.pitch
  localConfig.voiceRate = preset.rate

  if (preset.id === 'default') {
    localConfig.selectedVoice = ''
    return
  }

  if (preset.id === 'japanese') {
    const jaVoice = getJapaneseVoice()
    if (jaVoice) {
      localConfig.selectedVoice = jaVoice.name
    }
    return
  }

  if (preset.id === 'news') {
    const profVoice = getProfessionalVoice()
    if (profVoice) {
      localConfig.selectedVoice = profVoice.name
    }
    return
  }

  // Find candidate from props.voices
  let matchedVoice: SpeechSynthesisVoice | undefined = undefined
  for (const cand of preset.voiceCandidates) {
    matchedVoice = props.voices.find((v) => {
      const vname = v.name.toLowerCase()
      const vlang = v.lang.toLowerCase()
      if (preset.targetLang && !vlang.includes(preset.targetLang)) {
        return false
      }
      return vname.includes(cand)
    })
    if (matchedVoice) break
  }

  if (!matchedVoice && preset.targetLang) {
    matchedVoice = props.voices.find((v) => v.lang.toLowerCase().includes(preset.targetLang!))
  }

  if (matchedVoice) {
    localConfig.selectedVoice = matchedVoice.name
  } else {
    const def = getBestDefaultVoice()
    if (def) localConfig.selectedVoice = def.name
  }
}

function handlePreviewVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  // If already previewing voice, clicking again immediately stops it!
  if (isTestingVoice.value) {
    stopPreviewVoice()
    return
  }

  window.speechSynthesis.cancel()

  const currentPreset = VOICE_PRESETS.find((p) => p.id === activePresetId.value)
  const isJa =
    activePresetId.value === 'japanese' ||
    localConfig.selectedVoice?.toLowerCase().includes('ja') ||
    localConfig.selectedVoice?.toLowerCase().includes('jp')

  const sampleText =
    currentPreset?.sampleText ||
    (isJa
      ? 'マスター、こんにちは！バーチャルシンガーの初音ミクです、今日もよろしくね！'
      : '指挥长您好！我是全息数字人初音未来，已连接大屏数据中枢与实时联网大脑！')

  const utterance = new SpeechSynthesisUtterance(sampleText)

  let voiceToUse: SpeechSynthesisVoice | undefined = undefined
  if (localConfig.selectedVoice) {
    voiceToUse = props.voices.find((v) => v.name === localConfig.selectedVoice)
  }
  // When selectedVoice is empty or not found, explicitly fall back to best default voice (never leave empty!)
  if (!voiceToUse) {
    voiceToUse = isJa ? getJapaneseVoice() : getBestDefaultVoice()
  }

  if (voiceToUse) {
    utterance.voice = voiceToUse
  }

  utterance.pitch = localConfig.voicePitch
  utterance.rate = localConfig.voiceRate
  utterance.lang = isJa ? 'ja-JP' : voiceToUse?.lang || 'zh-CN'

  utterance.onstart = () => {
    isTestingVoice.value = true
  }
  utterance.onend = () => {
    isTestingVoice.value = false
  }
  utterance.onerror = () => {
    isTestingVoice.value = false
  }

  window.speechSynthesis.speak(utterance)
}

function stopPreviewVoice() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  isTestingVoice.value = false
}

function onVoiceDropdownChange() {
  stopPreviewVoice()
  const sv = localConfig.selectedVoice?.toLowerCase() || ''
  if (!sv) {
    activePresetId.value = 'default'
  } else if (sv.includes('ja') || sv.includes('jp')) {
    activePresetId.value = 'japanese'
  } else if (sv.includes('xiaoyi')) {
    activePresetId.value = 'xiaoyi'
  } else if (sv.includes('yunxi') || sv.includes('kangkang')) {
    activePresetId.value = 'news'
  } else {
    activePresetId.value = 'custom'
  }
}

function handleClose() {
  stopPreviewVoice()
  emit('close')
}

function handleSave() {
  stopPreviewVoice()
  emit('save', { ...localConfig })
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isTestingVoice.value) {
      stopPreviewVoice()
      e.stopPropagation()
    } else {
      handleClose()
    }
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      window.addEventListener('keydown', onKeydown)
    } else {
      stopPreviewVoice()
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopPreviewVoice()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#00f2fe" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>初音未来 · AI 智能与声线设置</span>
        </div>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        <!-- API Key -->
        <div class="form-group">
          <label class="form-label">
            <span>Gemini API Key</span>
            <span class="label-tip">（已加密配置在 .env.local 中，不会上传代码库）</span>
          </label>
          <div class="input-with-action">
            <input
              v-model="localConfig.apiKey"
              :type="showKey ? 'text' : 'password'"
              class="form-input"
              placeholder="请输入您的 Gemini API Key"
            />
            <button type="button" class="toggle-eye-btn" @click="showKey = !showKey">
              {{ showKey ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <!-- 联网搜索开关 -->
        <div class="form-group">
          <label class="checkbox-row">
            <input v-model="localConfig.enableWebSearch" type="checkbox" class="tech-checkbox" />
            <span class="checkbox-text">开启全网实时联网搜索（Google Search Grounding）</span>
          </label>
          <span class="label-tip">开启后，初音未来可实时检索天气、国际油价走势、时事科技与生活百科。</span>
        </div>

        <!-- 模型选择 -->
        <div class="form-group">
          <label class="form-label">大模型内核版本</label>
          <select v-model="localConfig.model" class="form-select">
            <option value="gemini-3.5-flash">Gemini 3.5 Flash（官方推荐 · 极速生成与百科支持）</option>
            <option value="gemini-flash-latest">Gemini Flash Latest（自动适配最新模型）</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite（超低延迟响应）</option>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash（前沿模型）</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro（深度逻辑推理）</option>
          </select>
        </div>

        <!-- 初音未来专属调音预设卡片群 -->
        <div class="form-group">
          <div class="preset-header-row">
            <label class="form-label">初音未来专属声线预设</label>
            <button
              type="button"
              class="reset-default-btn"
              title="一键恢复用户最满意的默认甜美原声"
              @click="applyPreset(VOICE_PRESETS[0])"
            >
              ↺ 恢复最美默认原声
            </button>
          </div>
          <div class="preset-card-grid">
            <button
              v-for="preset in VOICE_PRESETS"
              :key="preset.id"
              type="button"
              class="preset-card"
              :class="{ active: activePresetId === preset.id }"
              @click="applyPreset(preset)"
            >
              <div class="preset-card-top">
                <span class="preset-card-name">{{ preset.name }}</span>
                <span class="preset-card-badge">{{ preset.badge }}</span>
              </div>
              <div class="preset-card-desc">{{ preset.desc }}</div>
            </button>
          </div>
        </div>

        <!-- 系统 TTS 发音人选择 -->
        <div class="form-group">
          <label class="form-label">
            <span>底层音色引擎选择</span>
            <span class="label-tip">（已自动优选系统最佳自然语音）</span>
          </label>
          <select
            v-model="localConfig.selectedVoice"
            class="form-select"
            @change="onVoiceDropdownChange"
          >
            <option value="">自动优选官方默认自然声线 (Recommended)</option>
            <option v-for="voice in voices" :key="voice.name" :value="voice.name">
              [{{ voice.lang }}] {{ voice.name }}
            </option>
          </select>
        </div>

        <!-- 微调滑块 (舒适区间，杜绝机械花栗鼠音) -->
        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">语速微调 ({{ localConfig.voiceRate }}x)</label>
            <input
              v-model.number="localConfig.voiceRate"
              type="range"
              min="0.85"
              max="1.25"
              step="0.05"
              class="form-range"
            />
          </div>
          <div class="form-group half">
            <label class="form-label">音调微调 ({{ localConfig.voicePitch }})</label>
            <input
              v-model.number="localConfig.voicePitch"
              type="range"
              min="0.9"
              max="1.25"
              step="0.01"
              class="form-range"
            />
          </div>
        </div>

        <!-- 试听声音控制区（支持试听与中途终止打断） -->
        <div class="test-voice-bar">
          <div class="test-voice-actions">
            <!-- 播放试听按钮 -->
            <button
              v-if="!isTestingVoice"
              type="button"
              class="test-voice-btn preview-start"
              title="试听当前声线、音调与语速效果"
              @click="handlePreviewVoice"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span>🔊 一键试听当前声线</span>
            </button>

            <!-- 正在试听中：终止试听按钮 -->
            <button
              v-else
              type="button"
              class="test-voice-btn preview-stop"
              title="初音正在试听播报中，点击立即终止打断 (快捷键: Esc)"
              @click="stopPreviewVoice"
            >
              <div class="preview-wave-bars">
                <span class="p-bar p1" />
                <span class="p-bar p2" />
                <span class="p-bar p3" />
                <span class="p-bar p4" />
              </div>
              <span class="stop-icon">⏹</span>
              <span>终止试听播报</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="handleSave">保存配置</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(3, 7, 18, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card {
  width: 540px;
  max-width: 92vw;
  max-height: 90vh;
  background: #0b1528;
  border: 1px solid rgba(0, 242, 254, 0.35);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(0, 242, 254, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(0, 242, 254, 0.15);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover {
  color: #f1f5f9;
}

.modal-body {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}

.label-tip {
  font-size: 10px;
  color: #64748b;
  font-weight: normal;
}

.preset-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reset-default-btn {
  font-size: 11px;
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid rgba(0, 242, 254, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-default-btn:hover {
  background: rgba(0, 242, 254, 0.2);
  color: #ffffff;
}

.preset-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.preset-card {
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: all 0.2s;
}

.preset-card:hover {
  border-color: rgba(0, 242, 254, 0.4);
  background: rgba(0, 242, 254, 0.06);
}

.preset-card.active {
  background: rgba(0, 242, 254, 0.15);
  border-color: #00f2fe;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.25);
}

.preset-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preset-card-name {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
}

.preset-card-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(0, 242, 254, 0.15);
  color: #00f2fe;
}

.preset-card-desc {
  font-size: 9px;
  color: #94a3b8;
  line-height: 1.35;
}

.form-input,
.form-select {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #f1f5f9;
  outline: none;
}

.form-input:focus,
.form-select:focus {
  border-color: #00f2fe;
}

.input-with-action {
  display: flex;
  gap: 8px;
}

.input-with-action .form-input {
  flex: 1;
}

.toggle-eye-btn {
  padding: 0 12px;
  font-size: 12px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
}

.toggle-eye-btn:hover {
  color: #f1f5f9;
  border-color: #00f2fe;
}

.form-range {
  accent-color: #00f2fe;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.tech-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #00f2fe;
  cursor: pointer;
}

.checkbox-text {
  font-size: 13px;
  color: #f1f5f9;
  font-weight: 500;
}

.test-voice-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.test-voice-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.test-voice-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 18px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
}

.test-voice-btn.preview-start {
  background: rgba(0, 242, 254, 0.12);
  border: 1px solid rgba(0, 242, 254, 0.45);
  color: #00f2fe;
}

.test-voice-btn.preview-start:hover {
  background: rgba(0, 242, 254, 0.22);
  border-color: #00f2fe;
  box-shadow: 0 0 14px rgba(0, 242, 254, 0.45);
  transform: translateY(-1px);
}

.test-voice-btn.preview-stop {
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.55);
  color: #fca5a5;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.35);
  animation: pulse-red 1.6s infinite;
}

.test-voice-btn.preview-stop:hover {
  background: rgba(239, 68, 68, 0.32);
  border-color: #ef4444;
  color: #ffffff;
  box-shadow: 0 0 18px rgba(239, 68, 68, 0.6);
}

.preview-wave-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 12px;
}

.p-bar {
  width: 2.5px;
  background: #fca5a5;
  border-radius: 2px;
  animation: jump 0.8s infinite ease-in-out;
}

.p-bar.p1 { height: 5px; animation-delay: 0s; }
.p-bar.p2 { height: 12px; animation-delay: 0.2s; }
.p-bar.p3 { height: 8px; animation-delay: 0.4s; }
.p-bar.p4 { height: 10px; animation-delay: 0.6s; }

.stop-icon {
  font-size: 11px;
}

@keyframes pulse-red {
  0%, 100% {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.6);
  }
}

@keyframes jump {
  0%, 100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.7);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.btn {
  padding: 7px 18px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
}

.btn-secondary:hover {
  background: rgba(51, 65, 85, 0.8);
}

.btn-primary {
  background: linear-gradient(135deg, #00f2fe, #a855f7);
  border: none;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 15px rgba(0, 242, 254, 0.35);
}

.btn-primary:hover {
  opacity: 0.95;
  box-shadow: 0 0 20px rgba(0, 242, 254, 0.55);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}
</style>
