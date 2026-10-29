import { onBeforeUnmount, ref } from 'vue'

export interface VisemeFrame {
  viseme_aa: number
  viseme_O: number
  viseme_I: number
  viseme_U: number
  viseme_PP: number
  jawOpen: number
  mouthSmile: number
}

// 全局共享的 AudioContext 与用户手势解锁状态
let sharedAudioContext: AudioContext | null = null
let isAudioUnlocked = false
const activeUtterances = new Set<SpeechSynthesisUtterance>()
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

// 统一解锁浏览器音频上下文（兼容 iOS Safari、Chrome、移动端 WebView）
export function unlockAudio() {
  if (typeof window === 'undefined') return

  try {
    // 1. 初始化并唤醒 Web Audio Context
    if (!sharedAudioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx()
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {})
    }

    // 2. 唤醒 Web Speech API 底层通道（解决 iOS Safari 挂起/静音限制）
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
      if (!isAudioUnlocked) {
        // 发送 0 音量的极短空白脉冲，换取浏览器授予的永久播放许可
        const dummy = new SpeechSynthesisUtterance('')
        dummy.volume = 0
        window.speechSynthesis.speak(dummy)
      }
    }

    isAudioUnlocked = true
  } catch (err) {
    console.warn('[SpeechSynthesis] 解锁音频上下文异常:', err)
  }
}

// 自动捕获首个用户手势（在捕获阶段优先解锁，确保任何按钮点击都能同步唤醒音频）
if (typeof window !== 'undefined') {
  const handleUserGesture = () => {
    unlockAudio()
  }
  window.addEventListener('click', handleUserGesture, { capture: true, passive: true })
  window.addEventListener('touchstart', handleUserGesture, { capture: true, passive: true })
  window.addEventListener('keydown', handleUserGesture, { capture: true, passive: true })
}

// Web Audio API 合成器：用于数字人登场、唤醒与全息科技提示音
class HolographicAudioEngine {
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!sharedAudioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx()
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {})
    }
    return sharedAudioContext
  }

  // 登场全息水晶共鸣双音和弦 (F#6 到 B6)
  playHoloChirp() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'triangle'

      osc1.frequency.setValueAtTime(1480, now)
      osc1.frequency.exponentialRampToValueAtTime(1976, now + 0.12)

      osc2.frequency.setValueAtTime(740, now)
      osc2.frequency.exponentialRampToValueAtTime(988, now + 0.15)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.3)
      osc2.stop(now + 0.3)
    } catch {
      // 浏览器权限尚未就绪时忽略
    }
  }

  // 界面交互科技音效
  playBlip() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(920, now)
      osc.frequency.exponentialRampToValueAtTime(1840, now + 0.07)

      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.11)
    } catch {
      // ignore
    }
  }
}

const audioEngine = new HolographicAudioEngine()

// 文本分句工具：将长回复按标点拆解为自然短句，杜绝移动端长文本截断与休眠
function splitIntoSentences(text: string): string[] {
  const parts = text.match(/[^。！？!?；;\n]+[。！？!?；;\n]?/g)
  if (!parts || parts.length === 0) return [text]

  const sentences: string[] = []
  let temp = ''
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    temp += trimmed
    // 当带有句尾标点或累积字数达到舒适语块长度（18字以上）时切分为一句
    if (/[。！？!?；;\n]$/.test(temp) || temp.length >= 24) {
      sentences.push(temp)
      temp = ''
    }
  }
  if (temp) {
    if (sentences.length > 0 && temp.length < 5) {
      sentences[sentences.length - 1] += temp
    } else {
      sentences.push(temp)
    }
  }
  return sentences.length > 0 ? sentences : [text]
}

export function useSpeechSynthesis() {
  const isSpeaking = ref(false)
  const isSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
  const isAudioBlocked = ref(false)
  const voices = ref<SpeechSynthesisVoice[]>([])
  const currentVoice = ref<SpeechSynthesisVoice | null>(null)

  // 甜美自然预设参数：音调 1.05，语速 1.00
  const pitch = ref(1.05)
  const rate = ref(1.0)

  // GPT-SoVITS 开源 AI 原声配置
  const enableGptSovits = ref(false)
  const gptSovitsUrl = ref('http://127.0.0.1:9880')
  const gptSovitsCharacter = ref('meiko')
  const isGptSovitsActive = ref(false)

  // 唇形控制 Viseme 帧（驱动 3D 头部口型 morph targets）
  const currentVisemes = ref<VisemeFrame>({
    viseme_aa: 0,
    viseme_O: 0,
    viseme_I: 0,
    viseme_U: 0,
    viseme_PP: 0,
    jawOpen: 0,
    mouthSmile: 0.15,
  })

  // 32 频段音频频谱（用于底部面板律动可视化）
  const audioSpectrum = ref<number[]>(new Array(32).fill(0))

  let animFrameId: number | null = null
  let pendingVoiceName: string | null = null
  let currentSpeechSessionId = 0

  // 保活心跳：防止 Chromium (Chrome/Edge) 连续朗读超过 15 秒发生底层语音休眠卡死
  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }
    }, 6000)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  // 智能发音人打分算法：兼容 Windows、macOS、iOS、Android 等多平台
  function scoreVoice(v: SpeechSynthesisVoice): number {
    let score = 0
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()

    // 1. 语言权重：中文（zh / cmn）为最高优先级
    if (lang.includes('zh') || lang.includes('cmn')) {
      score += 100
    } else if (lang.includes('ja') || lang.includes('jp')) {
      score += 15
    } else {
      score -= 80
    }

    // 2. 高质量神经拟真在线语音
    if (name.includes('natural') || name.includes('online')) score += 45
    if (name.includes('neural')) score += 35

    // 3. 微软 / 苹果 / 谷歌 / 安卓系统甜美发音人优选
    // 微软 Windows / Edge
    if (name.includes('xiaoxiao')) score += 50
    if (name.includes('yaoyao')) score += 45
    if (name.includes('xiaoyi')) score += 40
    if (name.includes('huihui')) score += 20

    // 苹果 iOS / macOS (Ting-Ting, Mei-Jia, Sin-Ji, Yu-shu)
    if (name.includes('ting-ting') || name.includes('tingting')) score += 45
    if (name.includes('mei-jia') || name.includes('meijia')) score += 45
    if (name.includes('sin-ji') || name.includes('sinji')) score += 40
    if (name.includes('yu-shu') || name.includes('yushu')) score += 35

    // 安卓 Google TTS / 系统中文
    if (name.includes('cmn') || (name.includes('chinese') && lang.includes('zh'))) score += 35
    if (name.includes('google') && (lang.includes('zh') || lang.includes('cmn'))) score += 30
    if (name.includes('female') || name.includes('女') || name.includes('woman')) score += 15

    // 惩罚男性音色（保持初音未来二次元美少女调性）
    if (
      name.includes('male') ||
      name.includes('男') ||
      name.includes('kangkang') ||
      name.includes('yunyang') ||
      name.includes('david') ||
      name.includes('george')
    ) {
      score -= 60
    }

    return score
  }

  function loadVoices() {
    if (!isSupported.value) return
    const list = window.speechSynthesis.getVoices()
    if (!list || list.length === 0) return

    // 按评分排序
    const sorted = [...list].sort((a, b) => scoreVoice(b) - scoreVoice(a))
    voices.value = sorted

    // 如果之前设置过偏好音色，优先恢复
    if (pendingVoiceName) {
      const found = sorted.find((v) => v.name === pendingVoiceName)
      if (found) {
        currentVoice.value = found
        return
      }
    }

    if (currentVoice.value && sorted.some((v) => v.name === currentVoice.value?.name)) {
      return
    }

    // 默认选取评分最高的发音人
    currentVoice.value = sorted[0] || null
  }

  function setVoiceByName(voiceName: string) {
    if (!voiceName) {
      pendingVoiceName = null
      if (voices.value.length > 0) {
        currentVoice.value = voices.value[0] || null
      }
      return
    }
    pendingVoiceName = voiceName
    if (voices.value.length === 0) return
    const found = voices.value.find((v) => v.name === voiceName)
    if (found) {
      currentVoice.value = found
    }
  }

  if (isSupported.value) {
    loadVoices()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }

  // 唇形节奏生成器：驱动模型根据发声状态产生灵动口型与声波
  function startLipSyncLoop() {
    let phase = 0

    const update = () => {
      if (!isSpeaking.value) {
        // 静息状态平滑回归微笑唇形
        currentVisemes.value.viseme_aa *= 0.82
        currentVisemes.value.viseme_O *= 0.82
        currentVisemes.value.viseme_I *= 0.82
        currentVisemes.value.viseme_U *= 0.82
        currentVisemes.value.viseme_PP *= 0.82
        currentVisemes.value.jawOpen *= 0.82
        currentVisemes.value.mouthSmile = 0.15

        audioSpectrum.value = audioSpectrum.value.map((v) => v * 0.85)
        animFrameId = requestAnimationFrame(update)
        return
      }

      phase += 0.24
      const syllablePulse = (Math.sin(phase) + 1) * 0.5
      const secondaryPulse = (Math.sin(phase * 1.8 + 0.6) + 1) * 0.5
      const rawAmplitude = syllablePulse * 0.72 + secondaryPulse * 0.28

      currentVisemes.value = {
        viseme_aa: Math.max(0, Math.sin(phase * 0.95) * 0.7 * rawAmplitude),
        viseme_O: Math.max(0, Math.sin(phase * 1.35 + 1.0) * 0.55 * rawAmplitude),
        viseme_I: Math.max(0, Math.cos(phase * 1.15) * 0.5 * rawAmplitude),
        viseme_U: Math.max(0, Math.sin(phase * 0.85 + 2.0) * 0.45 * rawAmplitude),
        viseme_PP: Math.max(0, Math.cos(phase * 2.3) * 0.3 * (1 - rawAmplitude)),
        jawOpen: rawAmplitude * 0.7,
        mouthSmile: 0.2 + rawAmplitude * 0.15,
      }

      const spectrum: number[] = []
      for (let i = 0; i < 32; i++) {
        const freqAmp = Math.sin(phase * 1.6 + i * 0.32) * 0.45 + 0.55
        const wave = rawAmplitude * freqAmp * (1 - i / 38)
        spectrum.push(Math.max(0.06, Math.min(1.0, wave)))
      }
      audioSpectrum.value = spectrum

      animFrameId = requestAnimationFrame(update)
    }

    update()
  }

  let currentAudio: HTMLAudioElement | null = null
  let currentAudioUrl: string | null = null

  async function fetchGptSovitsAudio(
    text: string,
    baseUrl: string,
    character?: string,
  ): Promise<Blob | null> {
    const cleanUrl = baseUrl.replace(/\/+$/, '')
    const char = character || gptSovitsCharacter.value || 'meiko'
    const charParam = `&character=${encodeURIComponent(char)}`

    const primaryUrl = `${cleanUrl}/tts?text=${encodeURIComponent(text)}&text_lang=zh${charParam}`
    try {
      const res = await fetch(primaryUrl, {
        signal: AbortSignal.timeout(45000),
      })
      if (res.ok) {
        const blob = await res.blob()
        if (blob && blob.size > 200) {
          return blob
        }
      }
    } catch (err) {
      console.warn('[GPT-SoVITS] 主接口响应异常或超时:', err)
    }

    const fallbacks = [
      `${cleanUrl}/?text=${encodeURIComponent(text)}&text_language=zh${charParam}`,
      `${cleanUrl}/tts?text=${encodeURIComponent(text)}&text_language=zh${charParam}`,
    ]
    for (const ep of fallbacks) {
      try {
        const res = await fetch(ep, {
          signal: AbortSignal.timeout(12000),
        })
        if (res.ok) {
          const blob = await res.blob()
          if (blob && blob.size > 200) {
            return blob
          }
        }
      } catch {
        // try next
      }
    }
    return null
  }

  // 跨平台高兼容系统原生语音朗读（分句队列流式播报 + GC保护 + iOS防死锁）
  async function speakNative(
    cleanText: string,
    options?: {
      onStart?: () => void
      onEnd?: () => void
      suppressChirp?: boolean
    },
  ) {
    if (!isSupported.value) {
      options?.onEnd?.()
      return
    }

    // 确保音频上下文与播报许可已就绪
    unlockAudio()

    if (options?.suppressChirp !== true) {
      audioEngine.playHoloChirp()
    }

    // 生成新的语音会话 ID，避免旧回调重叠
    const sessionId = ++currentSpeechSessionId

    // 1. 尝试清空旧队列
    try {
      window.speechSynthesis.cancel()
    } catch {}

    // 2. 关键时序优化：等待 35ms，让 iOS WebKit cancel 状态平稳落地
    await new Promise((resolve) => setTimeout(resolve, 35))
    if (sessionId !== currentSpeechSessionId) return

    // 3. 将长文本切分为自然短句
    const sentences = splitIntoSentences(cleanText)
    let currentIndex = 0
    let hasStarted = false

    // 确保声音列表可用
    if (voices.value.length === 0) {
      loadVoices()
    }

    const voiceToUse =
      currentVoice.value ||
      voices.value.find((v) => v.lang.toLowerCase().includes('zh') || v.lang.toLowerCase().includes('cmn')) ||
      voices.value[0] ||
      null

    startHeartbeat()

    function speakNext() {
      if (sessionId !== currentSpeechSessionId) {
        stopHeartbeat()
        return
      }

      if (currentIndex >= sentences.length) {
        // 整段内容朗读完毕
        stopHeartbeat()
        isSpeaking.value = false
        options?.onEnd?.()
        return
      }

      const sentence = sentences[currentIndex]
      currentIndex++

      const utterance = new SpeechSynthesisUtterance(sentence)
      if (voiceToUse) {
        utterance.voice = voiceToUse
      }
      utterance.pitch = pitch.value
      utterance.rate = rate.value
      utterance.lang = voiceToUse?.lang || 'zh-CN'

      // 全局持有，坚决防止 V8 垃圾回收提前销毁 utterance
      activeUtterances.add(utterance)

      utterance.onstart = () => {
        if (sessionId !== currentSpeechSessionId) return
        isAudioBlocked.value = false
        if (!hasStarted) {
          hasStarted = true
          isSpeaking.value = true
          isGptSovitsActive.value = false
          options?.onStart?.()
        }
      }

      utterance.onend = () => {
        activeUtterances.delete(utterance)
        if (sessionId === currentSpeechSessionId) {
          speakNext()
        }
      }

      utterance.onerror = (e) => {
        console.warn('[SpeechSynthesis] 播报分句异常:', e.error, e)
        activeUtterances.delete(utterance)

        if (e.error === 'not-allowed') {
          isAudioBlocked.value = true
        }

        if (sessionId === currentSpeechSessionId) {
          // 容错机制：跳过当前出错短句，继续朗读下一句
          speakNext()
        }
      }

      try {
        window.speechSynthesis.speak(utterance)

        // 针对 iOS Safari：如果处于 paused 状态立即唤醒
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
      } catch (err) {
        console.error('[SpeechSynthesis] speak error:', err)
        activeUtterances.delete(utterance)
        speakNext()
      }
    }

    speakNext()
  }

  async function speak(
    text: string,
    options?: {
      onStart?: () => void
      onEnd?: () => void
      suppressChirp?: boolean
    },
  ) {
    // 立即解除上一次播报
    stop()

    // 净化文本：剔除 markdown 符号、URL 链接、Emoji 及业务指令标记如 [NAVIGATE_DEMO1]
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[[A-Z_0-9]+\]/g, '')
      .replace(/[*#`_~[\]()]/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText) {
      options?.onEnd?.()
      return
    }

    // 1. 若开启 GPT-SoVITS，优先请求高质量 AI 原声服务
    if (enableGptSovits.value && gptSovitsUrl.value.trim()) {
      try {
        const audioBlob = await fetchGptSovitsAudio(
          cleanText,
          gptSovitsUrl.value.trim(),
          gptSovitsCharacter.value,
        )
        if (audioBlob) {
          if (options?.suppressChirp !== true) {
            audioEngine.playHoloChirp()
          }

          const blobUrl = URL.createObjectURL(audioBlob)
          currentAudioUrl = blobUrl
          currentAudio = new Audio(blobUrl)

          currentAudio.onplay = () => {
            isSpeaking.value = true
            isGptSovitsActive.value = true
            isAudioBlocked.value = false
            options?.onStart?.()
          }

          currentAudio.onended = () => {
            isSpeaking.value = false
            isGptSovitsActive.value = false
            if (currentAudioUrl) {
              URL.revokeObjectURL(currentAudioUrl)
              currentAudioUrl = null
            }
            currentAudio = null
            options?.onEnd?.()
          }

          currentAudio.onerror = () => {
            isSpeaking.value = false
            isGptSovitsActive.value = false
            if (currentAudioUrl) {
              URL.revokeObjectURL(currentAudioUrl)
              currentAudioUrl = null
            }
            currentAudio = null
            // 播放出错时平滑回退到系统原生语音
            speakNative(cleanText, options)
          }

          try {
            await currentAudio.play()
            return
          } catch (audioPlayErr: any) {
            console.warn('[GPT-SoVITS] Audio.play() 触发浏览器限制，回退到原生语音:', audioPlayErr)
            if (audioPlayErr?.name === 'NotAllowedError') {
              isAudioBlocked.value = true
            }
          }
        }
      } catch (err) {
        console.warn('GPT-SoVITS 语音服务未响应，自动平滑回退至系统原生语音:', err)
      }
    }

    // 2. 默认或回退通道：调用高度增强的跨平台原生语音合成
    await speakNative(cleanText, options)
  }

  function stop() {
    currentSpeechSessionId++
    stopHeartbeat()
    activeUtterances.clear()

    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl)
      currentAudioUrl = null
    }
    if (isSupported.value) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
    isSpeaking.value = false
    isGptSovitsActive.value = false
  }

  // 测试 GPT-SoVITS 连通性与角色试听
  async function testGptSovits(
    url: string,
    sampleText = '指挥长好！开源AI原声连接正常！',
    character?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      unlockAudio()
      const blob = await fetchGptSovitsAudio(sampleText, url, character)
      if (blob) {
        const testAudioUrl = URL.createObjectURL(blob)
        const testAudio = new Audio(testAudioUrl)
        testAudio.onended = () => URL.revokeObjectURL(testAudioUrl)
        await testAudio.play()
        const charName = character ? character.toUpperCase() : 'AI'
        return { success: true, message: `✅ 连接成功！已听到 ${charName} 拟真原声音色！` }
      }
      return { success: false, message: '未获取到音频流，请确认服务已启动 (如: python run_api.py)' }
    } catch (e: any) {
      return { success: false, message: `连接失败: ${e?.message || '网络连接被拒绝或跨域被拦截'}` }
    }
  }

  // 播放界面交互音效
  function playClickBlip() {
    audioEngine.playBlip()
  }

  // 启动口型同步律动循环
  startLipSyncLoop()

  onBeforeUnmount(() => {
    stop()
    if (animFrameId) cancelAnimationFrame(animFrameId)
  })

  return {
    isSupported,
    isSpeaking,
    isAudioBlocked,
    isGptSovitsActive,
    enableGptSovits,
    gptSovitsUrl,
    gptSovitsCharacter,
    voices,
    currentVoice,
    setVoiceByName,
    pitch,
    rate,
    currentVisemes,
    audioSpectrum,
    speak,
    stop,
    testGptSovits,
    playClickBlip,
    unlockAudio,
  }
}
