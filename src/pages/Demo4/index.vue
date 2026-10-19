<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AvatarScene from './components/AvatarScene.vue'
import TopNavBar from './components/TopNavBar.vue'
import LeftPanel from './components/LeftPanel.vue'
import RightPanel from './components/RightPanel.vue'
import ChatDock from './components/ChatDock.vue'
import SettingsModal from './components/SettingsModal.vue'
import { useAIAgent } from './composables/useAIAgent'
import { useSpeechSynthesis } from './composables/useSpeechSynthesis'
import { useSpeechRecognition } from './composables/useSpeechRecognition'
import type { AnimationType, CameraViewMode } from './types'

// Composables
const {
  config,
  saveConfig,
  messages,
  agentState,
  currentEmotion,
  currentAnimation,
  ask,
  setIdle,
  clearMessages,
  toggleWebSearch,
} = useAIAgent()

const {
  isSpeaking,
  voices,
  setVoiceByName,
  currentVisemes,
  audioSpectrum,
  pitch,
  rate,
  enableGptSovits,
  gptSovitsUrl,
  speak,
  stop: stopSpeaking,
  testGptSovits,
} = useSpeechSynthesis()

// Apply saved voice config
if (config.voicePitch) pitch.value = config.voicePitch
if (config.voiceRate) rate.value = config.voiceRate
if (config.selectedVoice) setVoiceByName(config.selectedVoice)
if (config.enableGptSovits !== undefined) enableGptSovits.value = config.enableGptSovits
if (config.gptSovitsUrl) gptSovitsUrl.value = config.gptSovitsUrl

const {
  isListening,
  start: startListening,
  stop: stopListening,
} = useSpeechRecognition()

// Camera view state
const cameraView = ref<CameraViewMode>('medium')
const currentFps = ref(60)
const isSettingsVisible = ref(false)
const modelType = ref<'anime' | 'magical'>('anime')

// Last spoken message and web grounding sources for SubtitleOverlay
const lastSpokenMessage = ref(messages.value[0]?.text || '')
const lastActionTag = ref<string | undefined>(undefined)
const lastSearchSources = ref<{ title: string; url?: string }[] | undefined>(undefined)

// Handle User Sending Message
async function handleSendMessage(text: string) {
  stopListening()
  stopSpeaking()

  await ask(text, (reply) => {
    lastSpokenMessage.value = reply.text
    lastActionTag.value = reply.actionTag
    lastSearchSources.value = reply.searchSources

    if (reply.actionTag === '[FOCUS_CAMERA]') {
      cameraView.value = 'closeup'
    }

    speak(reply.text, {
      onStart: () => {
        agentState.value = 'speaking'
      },
      onEnd: () => {
        setIdle()
      },
    })
  })
}

// Toggle Microphone
function handleToggleMic() {
  if (isListening.value) {
    stopListening()
  } else {
    stopSpeaking()
    agentState.value = 'listening'
    currentAnimation.value = 'Idle'
    startListening((finalText) => {
      handleSendMessage(finalText)
    })
  }
}

// Manual Camera View switch
function handleChangeCameraView(view: CameraViewMode) {
  cameraView.value = view
}

// Manual Action Trigger
function handlePlayAction(action: AnimationType) {
  currentAnimation.value = action
}

// Save Settings
function handleSaveSettings(newConfig: any) {
  saveConfig(newConfig)
  if (newConfig.voicePitch !== undefined) pitch.value = newConfig.voicePitch
  if (newConfig.voiceRate !== undefined) rate.value = newConfig.voiceRate
  if (newConfig.selectedVoice !== undefined) setVoiceByName(newConfig.selectedVoice || '')
  if (newConfig.enableGptSovits !== undefined) enableGptSovits.value = newConfig.enableGptSovits
  if (newConfig.gptSovitsUrl !== undefined) gptSovitsUrl.value = newConfig.gptSovitsUrl
}

// Clear Context History
function handleClearHistory() {
  clearMessages()
  stopSpeaking()
  setIdle()
}

// Stop Speaking Mid-stream
function handleStopSpeaking() {
  stopSpeaking()
  setIdle()
}

function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isSpeaking.value) {
    handleStopSpeaking()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
  <div class="demo4-root">
    <!-- 视口四周科技边角饰件 -->
    <div class="screen-hud-corner tl" />
    <div class="screen-hud-corner tr" />
    <div class="screen-hud-corner bl" />
    <div class="screen-hud-corner br" />

    <!-- 1. 3D WebGL 数字人与赛博全息主场景 -->
    <AvatarScene
      :animation="currentAnimation"
      :emotion="currentEmotion"
      :visemes="currentVisemes"
      :camera-view="cameraView"
      :model-type="modelType"
      @fps-update="(fps) => (currentFps = fps)"
    />

    <!-- 2. 统一顶栏导航 -->
    <TopNavBar
      :fps="currentFps"
      :agent-state="agentState"
      :model-name="config.model"
      :enable-web-search="config.enableWebSearch"
      @open-settings="isSettingsVisible = true"
    />

    <!-- 3. 左侧遥测性能与档案面板 -->
    <LeftPanel
      :agent-state="agentState"
      :current-emotion="currentEmotion"
      :audio-spectrum="audioSpectrum"
    />

    <!-- 4. 右侧知识调度与运镜控制面板 -->
    <RightPanel
      :camera-view="cameraView"
      :current-animation="currentAnimation"
      :model-type="modelType"
      @change-camera-view="handleChangeCameraView"
      @change-model-type="(type) => (modelType = type)"
      @play-action="handlePlayAction"
    />

    <!-- 5. 全息智能对话交互舱 (保留多轮上下文、聊天记录流、声波条、麦克风、快捷提问、输入框、联网搜索) -->
    <ChatDock
      :messages="messages"
      :agent-state="agentState"
      :is-listening="isListening"
      :is-speaking="isSpeaking"
      :audio-spectrum="audioSpectrum"
      :disabled="agentState === 'thinking'"
      :enable-web-search="config.enableWebSearch"
      @send="handleSendMessage"
      @toggle-mic="handleToggleMic"
      @toggle-web-search="toggleWebSearch"
      @stop-speaking="handleStopSpeaking"
      @clear-history="handleClearHistory"
    />

    <!-- 6. 设置浮层 Modal -->
    <SettingsModal
      :visible="isSettingsVisible"
      :config="config"
      :voices="voices"
      :test-gpt-sovits="testGptSovits"
      @close="isSettingsVisible = false"
      @save="handleSaveSettings"
    />
  </div>
</template>

<style scoped>
.demo4-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #02050c;
  background-image:
    radial-gradient(circle at 50% 50%, rgba(0, 242, 254, 0.04) 0%, transparent 60%),
    linear-gradient(rgba(0, 242, 254, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 242, 254, 0.03) 1px, transparent 1px);
  background-size: 100% 100%, 48px 48px, 48px 48px;
  background-position: center center, -1px -1px, -1px -1px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #f1f5f9;
  user-select: none;
}

/* 屏幕四角科技角标饰件 */
.screen-hud-corner {
  position: absolute;
  width: 18px;
  height: 18px;
  pointer-events: none;
  z-index: 30;
}

.screen-hud-corner.tl {
  top: 10px;
  left: 10px;
  border-top: 2px solid rgba(0, 242, 254, 0.6);
  border-left: 2px solid rgba(0, 242, 254, 0.6);
}

.screen-hud-corner.tr {
  top: 10px;
  right: 10px;
  border-top: 2px solid rgba(0, 242, 254, 0.6);
  border-right: 2px solid rgba(0, 242, 254, 0.6);
}

.screen-hud-corner.bl {
  bottom: 10px;
  left: 10px;
  border-bottom: 2px solid rgba(0, 242, 254, 0.6);
  border-left: 2px solid rgba(0, 242, 254, 0.6);
}

.screen-hud-corner.br {
  bottom: 10px;
  right: 10px;
  border-bottom: 2px solid rgba(0, 242, 254, 0.6);
  border-right: 2px solid rgba(0, 242, 254, 0.6);
}
</style>
