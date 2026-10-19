<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { AgentState, ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  agentState: AgentState
  isListening: boolean
  isSpeaking: boolean
  audioSpectrum: number[]
  disabled?: boolean
  enableWebSearch?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'toggleMic'): void
  (e: 'toggleWebSearch'): void
  (e: 'stopSpeaking'): void
  (e: 'clearHistory'): void
}>()

const router = useRouter()
const inputText = ref('')
const isExpanded = ref(true)
const streamRef = ref<HTMLElement | null>(null)

function formatSourceUrl(url?: string, title?: string): string {
  if (!url) {
    return `https://www.google.com/search?q=${encodeURIComponent(title || '全网实时检索')}`
  }
  if (url.startsWith('//')) {
    return `https:${url}`
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const match = url.match(/uddg=([^&]+)/)
  if (match) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      // ignore
    }
  }
  return `https://${url.replace(/^\/+/, '')}`
}

function handleSubmit() {
  const val = inputText.value.trim()
  if (!val || props.disabled) return
  emit('send', val)
  inputText.value = ''
  isExpanded.value = true
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (streamRef.value) {
      streamRef.value.scrollTop = streamRef.value.scrollHeight
    }
  })
}

watch(
  () => props.messages.length,
  () => {
    isExpanded.value = true
    scrollToBottom()
  },
)

watch(
  () => props.agentState,
  () => {
    scrollToBottom()
  },
)

function cleanMessageText(text: string): string {
  return text.replace(/\[[A-Z_0-9]+\]/g, '').trim()
}

function getActionInfo(actionTag?: string) {
  if (!actionTag) return null
  switch (actionTag) {
    case '[NAVIGATE_DEMO1]':
      return { text: '点击跳转 Demo1 智慧城市大屏', path: '/demo1', color: '#00f2fe' }
    case '[NAVIGATE_DEMO2]':
      return { text: '点击跳转 Demo2 万米深地大屏', path: '/demo2', color: '#f59e0b' }
    case '[NAVIGATE_DEMO3]':
      return { text: '点击跳转 Demo3 自动驾驶大屏', path: '/demo3', color: '#a855f7' }
    default:
      return null
  }
}
</script>

<template>
  <div class="chat-console-wrapper">
    <div class="chat-console-card" :class="{ 'is-collapsed': !isExpanded }">
      <!-- 科技四角与高光线 -->
      <div class="dock-corner tl" />
      <div class="dock-corner tr" />
      <div class="dock-corner bl" />
      <div class="dock-corner br" />
      <div class="dock-top-light" />

      <!-- 1. 控制台顶栏（状态展示、快速操作、展开/折叠） -->
      <div class="console-header" @click.self="isExpanded = !isExpanded">
        <div class="header-left">
          <span class="miku-avatar-icon">🌸</span>
          <span class="header-title">初音未来 · AI 全息对话中枢</span>
          <span
            class="status-pill"
            :class="{
              thinking: agentState === 'thinking',
              speaking: isSpeaking,
              listening: isListening,
            }"
          >
            <span class="status-dot" />
            <span v-if="agentState === 'thinking'">全网检索思考中...</span>
            <span v-else-if="isSpeaking">语音播报中</span>
            <span v-else-if="isListening">正在聆听中...</span>
            <span v-else>交互就绪</span>
          </span>
        </div>

        <div class="header-right">
          <!-- 播报中停止快捷按钮 -->
          <button
            v-if="isSpeaking"
            type="button"
            class="header-stop-btn"
            title="打断当前语音播报 (快捷键: Esc)"
            @click.stop="emit('stopSpeaking')"
          >
            <span class="stop-icon">⏹</span>
            <span>打断播报</span>
          </button>

          <!-- 清空上下文按钮 -->
          <button
            type="button"
            class="header-action-btn"
            title="清空当前多轮对话记录"
            @click.stop="emit('clearHistory')"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>清空记录</span>
          </button>

          <!-- 折叠 / 展开按钮 -->
          <button
            type="button"
            class="header-action-btn toggle-expand-btn"
            :title="isExpanded ? '收起对话流，无遮挡欣赏 3D 初音未来' : '展开多轮对话流'"
            @click.stop="isExpanded = !isExpanded"
          >
            <span>{{ isExpanded ? '收起' : '展开对话' }}</span>
            <span class="expand-arrow">{{ isExpanded ? '▾' : '▴' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. 多轮对话上下文消息流 (保留完整多轮对话上下文) -->
      <div v-show="isExpanded" ref="streamRef" class="chat-messages-stream">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <!-- 角色身份与时间标签 -->
          <div class="message-meta">
            <span v-if="msg.role === 'user'" class="user-role-badge">👤 指挥长</span>
            <span v-else class="assistant-role-badge">
              <span class="miku-mini-icon">🌸</span>
              <span>初音未来</span>
            </span>
            <span class="message-time">{{ msg.time }}</span>

            <!-- 正在播报中的音波律动 -->
            <div
              v-if="msg.role === 'assistant' && isSpeaking && msg.id === messages[messages.length - 1].id"
              class="inline-speaking-wave"
              title="当前正在播报此条回答"
            >
              <span class="w-bar b1" />
              <span class="w-bar b2" />
              <span class="w-bar b3" />
            </div>
          </div>

          <!-- 消息气泡正文 -->
          <div class="message-bubble" :class="msg.role">
            <p class="bubble-text">{{ cleanMessageText(msg.text) }}</p>

            <!-- 联网搜索实时信源展示条 -->
            <div
              v-if="msg.role === 'assistant' && msg.searchSources && msg.searchSources.length > 0"
              class="message-sources-bar"
            >
              <span class="sources-label">🌐 实时信源：</span>
              <a
                v-for="(src, idx) in msg.searchSources"
                :key="idx"
                class="source-pill-tag"
                :href="formatSourceUrl(src.url, src.title)"
                target="_blank"
                rel="noopener noreferrer"
                :title="`点击在新标签页访问来源：${src.title}`"
                @click.stop
              >
                <span>{{ src.title }}</span>
                <svg
                  class="source-link-icon"
                  viewBox="0 0 24 24"
                  width="10"
                  height="10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>

            <!-- 业务大屏一键调度联动胶囊 -->
            <div
              v-if="msg.role === 'assistant' && msg.actionTag && getActionInfo(msg.actionTag)"
              class="action-jump-wrap"
            >
              <button
                type="button"
                class="action-jump-btn"
                :style="{
                  borderColor: getActionInfo(msg.actionTag)?.color,
                  color: getActionInfo(msg.actionTag)?.color,
                }"
                @click="router.push(getActionInfo(msg.actionTag)!.path)"
              >
                <span>{{ getActionInfo(msg.actionTag)?.text }}</span>
                <span class="jump-arrow">→</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 思考中动态占位 -->
        <div v-if="agentState === 'thinking'" class="message-row assistant thinking-row">
          <div class="message-meta">
            <span class="assistant-role-badge">
              <span class="miku-mini-icon">🌸</span>
              <span>初音未来</span>
            </span>
            <span class="thinking-text-tip">正在全网检索实时数据并组织回答...</span>
          </div>
          <div class="message-bubble assistant thinking-bubble">
            <div class="typing-indicator">
              <span class="dot" />
              <span class="dot" />
              <span class="dot" />
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 输入交互区 -->
      <div class="input-row">
        <!-- 麦克风录音按钮 -->
        <button
          type="button"
          class="mic-btn"
          :class="{ listening: isListening }"
          :title="isListening ? '点击停止语音输入' : '点击开始语音提问'"
          @click="emit('toggleMic')"
        >
          <div v-if="isListening" class="mic-wave-pulse" />
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <!-- 联网搜索切换按钮 -->
        <button
          type="button"
          class="web-search-toggle"
          :class="{ active: enableWebSearch }"
          :title="enableWebSearch ? '已开启全网实时联网搜索（Google Grounding）' : '点击开启全网实时联网搜索'"
          @click="emit('toggleWebSearch')"
        >
          <span class="globe-icon">🌐</span>
          <span class="toggle-text">联网</span>
          <span class="toggle-dot" />
        </button>

        <!-- 语音播报中途停止按钮 -->
        <button
          v-if="isSpeaking"
          type="button"
          class="stop-speech-dock-btn"
          title="初音未来正在播报中，点击立即打断停止 (快捷键: Esc)"
          @click="emit('stopSpeaking')"
        >
          <span class="stop-dock-icon">⏹</span>
          <span>停止播报</span>
        </button>

        <!-- 文本输入框 -->
        <input
          v-model="inputText"
          type="text"
          class="chat-input"
          :placeholder="
            isListening
              ? '正在聆听您的声音，请说话...'
              : enableWebSearch
                ? '已开启全网搜索，可问天气、油价、资讯或大屏指令...'
                : '向初音未来下达调度指令或提问，按 Enter 键发送...'
          "
          :disabled="disabled"
          @focus="isExpanded = true"
          @keydown.enter.prevent="handleSubmit"
        />

        <!-- 发送按钮 -->
        <button
          type="button"
          class="send-btn"
          :disabled="!inputText.trim() || disabled"
          @click="handleSubmit"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <!-- 5. 动态声波条 (Audio Visualizer) -->
      <div class="visualizer-strip">
        <span
          v-for="(val, idx) in audioSpectrum"
          :key="idx"
          class="spec-bar"
          :style="{
            height: `${Math.max(3, Math.round(val * 16))}px`,
            opacity: isSpeaking || isListening ? 0.95 : 0.25,
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-console-wrapper {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  width: min(720px, 88vw);
  pointer-events: none;
}

.chat-console-card {
  pointer-events: auto;
  position: relative;
  background: linear-gradient(135deg, rgba(8, 16, 32, 0.95) 0%, rgba(11, 22, 44, 0.92) 100%);
  border: 1px solid rgba(0, 242, 254, 0.35);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 32px rgba(0, 242, 254, 0.16);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  pointer-events: none;
}

.dock-corner.tl {
  top: -1px;
  left: -1px;
  border-top: 2px solid #00f2fe;
  border-left: 2px solid #00f2fe;
}
.dock-corner.tr {
  top: -1px;
  right: -1px;
  border-top: 2px solid #00f2fe;
  border-right: 2px solid #00f2fe;
}
.dock-corner.bl {
  bottom: -1px;
  left: -1px;
  border-bottom: 2px solid #00f2fe;
  border-left: 2px solid #00f2fe;
}
.dock-corner.br {
  bottom: -1px;
  right: -1px;
  border-bottom: 2px solid #00f2fe;
  border-right: 2px solid #00f2fe;
}

.dock-top-light {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 242, 254, 0.8), transparent);
}

/* 1. 控制台顶栏 */
.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: rgba(15, 23, 42, 0.88);
  border-bottom: 1px solid rgba(0, 242, 254, 0.16);
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.miku-avatar-icon {
  font-size: 14px;
}

.header-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.5px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.status-pill.thinking {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.4);
}

.status-pill.speaking {
  background: rgba(0, 242, 254, 0.15);
  color: #00f2fe;
  border-color: rgba(0, 242, 254, 0.4);
}

.status-pill.listening {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.4);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-stop-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.header-stop-btn:hover {
  background: rgba(239, 68, 68, 0.35);
  color: #ffffff;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.header-action-btn:hover {
  color: #00f2fe;
  border-color: rgba(0, 242, 254, 0.45);
  background: rgba(0, 242, 254, 0.1);
}

.expand-arrow {
  font-size: 11px;
  font-weight: bold;
}

/* 2. 多轮对话流 */
.chat-messages-stream {
  max-height: 200px;
  min-height: 80px;
  overflow-y: auto;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.chat-messages-stream::-webkit-scrollbar {
  width: 4px;
}

.chat-messages-stream::-webkit-scrollbar-thumb {
  background: rgba(0, 242, 254, 0.35);
  border-radius: 2px;
}

.message-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 90%;
}

.message-row.user {
  align-self: flex-end;
  align-items: flex-end;
}

.message-row.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: #64748b;
  margin-bottom: 2px;
}

.user-role-badge {
  color: #38bdf8;
  font-weight: 600;
}

.assistant-role-badge {
  color: #00f2fe;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.miku-mini-icon {
  font-size: 11px;
}

.message-time {
  font-size: 10px;
  color: #64748b;
}

.inline-speaking-wave {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 10px;
  margin-left: 2px;
}

.w-bar {
  width: 2.5px;
  background: #00f2fe;
  border-radius: 1px;
  animation: bar-jump 0.8s infinite ease-in-out;
}

.w-bar.b1 { height: 4px; animation-delay: 0s; }
.w-bar.b2 { height: 10px; animation-delay: 0.2s; }
.w-bar.b3 { height: 6px; animation-delay: 0.4s; }

@keyframes bar-jump {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

.message-bubble {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}

.message-bubble.user {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(2, 132, 199, 0.22) 100%);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #e0f2fe;
  border-top-right-radius: 2px;
}

.message-bubble.assistant {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(20, 32, 60, 0.8) 100%);
  border: 1px solid rgba(0, 242, 254, 0.3);
  color: #f1f5f9;
  border-top-left-radius: 2px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.bubble-text {
  margin: 0;
  letter-spacing: 0.2px;
}

.message-sources-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10px;
}

.sources-label {
  color: #38bdf8;
  font-weight: 600;
}

.source-pill-tag {
  color: #7dd3fc;
  background: rgba(0, 242, 254, 0.08);
  border: 1px solid rgba(0, 242, 254, 0.25);
  border-radius: 10px;
  padding: 1px 8px;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.source-pill-tag:hover {
  color: #ffffff;
  background: rgba(0, 242, 254, 0.22);
  border-color: rgba(0, 242, 254, 0.65);
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.4);
  transform: translateY(-1px);
}

.source-link-icon {
  opacity: 0.75;
  transition: transform 0.2s;
}

.source-pill-tag:hover .source-link-icon {
  opacity: 1;
  transform: translate(1px, -1px);
}

.action-jump-wrap {
  margin-top: 6px;
}

.action-jump-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.action-jump-btn:hover {
  background: rgba(0, 242, 254, 0.25);
  transform: translateY(-1px);
}

.jump-arrow {
  font-weight: bold;
}

/* 思考中动效 */
.thinking-text-tip {
  font-size: 10px;
  color: #c084fc;
}

.thinking-bubble {
  padding: 6px 12px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #00f2fe;
  animation: typing 1.2s infinite ease-in-out;
}

.typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { opacity: 0.2; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}

/* 4. 输入交互区 */
.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 10px 14px;
}

.mic-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(0, 242, 254, 0.35);
  color: #00f2fe;
  cursor: pointer;
  transition: all 0.25s;
  flex-shrink: 0;
}

.mic-btn:hover {
  background: rgba(0, 242, 254, 0.18);
  border-color: #00f2fe;
  box-shadow: 0 0 14px rgba(0, 242, 254, 0.4);
}

.mic-btn.listening {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

.mic-wave-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #ef4444;
  animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

.web-search-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 10px;
  border-radius: 17px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.25s;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.web-search-toggle:hover {
  border-color: #38bdf8;
  color: #f1f5f9;
}

.web-search-toggle.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
}

.globe-icon {
  font-size: 12px;
}

.toggle-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #64748b;
}

.web-search-toggle.active .toggle-dot {
  background: #38bdf8;
  box-shadow: 0 0 6px #38bdf8;
}

.stop-speech-dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 10px;
  border-radius: 17px;
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s;
  flex-shrink: 0;
  animation: pulse-red 1.6s infinite;
}

.stop-speech-dock-btn:hover {
  background: rgba(239, 68, 68, 0.35);
  border-color: #ef4444;
  color: #ffffff;
}

.stop-dock-icon {
  font-size: 10px;
}

.chat-input {
  flex: 1;
  height: 36px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
  color: #f1f5f9;
  outline: none;
  transition: all 0.25s;
}

.chat-input:focus {
  border-color: #00f2fe;
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.25);
  background: rgba(15, 23, 42, 0.95);
}

.chat-input::placeholder {
  color: #64748b;
  font-size: 12px;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: linear-gradient(135deg, #00f2fe, #3b82f6);
  border: none;
  color: #020817;
  cursor: pointer;
  transition: all 0.25s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.92;
  box-shadow: 0 0 14px rgba(0, 242, 254, 0.5);
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* 5. 动态声波条 */
.visualizer-strip {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  height: 10px;
  padding: 0 12px 4px 12px;
}

.spec-bar {
  flex: 1;
  max-width: 8px;
  background: linear-gradient(to top, #00f2fe, #a855f7);
  border-radius: 1px;
  transition: height 0.08s ease;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.6); }
}
</style>
