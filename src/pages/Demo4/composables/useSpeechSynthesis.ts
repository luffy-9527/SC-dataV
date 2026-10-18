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

// Web Audio API Synthesizer for futuristic holographic cyber audio effects
class HolographicAudioEngine {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  // Futuristic holographic wake chirp when Miku begins speaking
  playHoloChirp() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      // Dual-tone harmonic crystal chime (F#6 to B6)
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
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.3)
      osc2.stop(now + 0.3)
    } catch {
      // audio context not allowed yet or not supported
    }
  }

  // Subtle sci-fi interaction blip
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

      gain.gain.setValueAtTime(0.06, now)
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

export function useSpeechSynthesis() {
  const isSpeaking = ref(false)
  const isSupported = ref('speechSynthesis' in window)
  const voices = ref<SpeechSynthesisVoice[]>([])
  const currentVoice = ref<SpeechSynthesisVoice | null>(null)

  // Authentic sweet natural voice default: Pitch 1.05 (natural sweet tone), Rate 1.00 (standard cadence)
  const pitch = ref(1.05)
  const rate = ref(1.0)

  // Current calculated viseme values to drive 3D mouth morph targets
  const currentVisemes = ref<VisemeFrame>({
    viseme_aa: 0,
    viseme_O: 0,
    viseme_I: 0,
    viseme_U: 0,
    viseme_PP: 0,
    jawOpen: 0,
    mouthSmile: 0.15,
  })

  // Audio spectrum levels for UI visualizer (array of 32 float numbers 0~1)
  const audioSpectrum = ref<number[]>(new Array(32).fill(0))

  let animFrameId: number | null = null
  let pendingVoiceName: string | null = null

  // Score candidate voices to find the most natural, sweet female voice for Hatsune Miku
  function scoreVoice(v: SpeechSynthesisVoice): number {
    let score = 0
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()

    // 1. Language preference: Chinese MUST be the primary voice for Sichuan DataV
    if (lang.includes('zh') || lang.includes('cmn')) {
      score += 100
    } else if (lang.includes('ja') || lang.includes('jp')) {
      score += 15 // Japanese available for dedicated Japanese mode, but never overrides Chinese default
    } else {
      score -= 80 // English or other languages severely penalized
    }

    // 2. High-quality neural / natural online voices
    if (name.includes('natural') || name.includes('online')) score += 40
    if (name.includes('neural')) score += 30

    // 3. Best youthful & sweet female anime voices
    if (name.includes('xiaoxiao')) score += 50 // Microsoft Xiaoxiao Natural: gold standard sweet female voice
    if (name.includes('yaoyao')) score += 45 // Microsoft Yaoyao: sweet & lively
    if (name.includes('xiaoyi')) score += 40 // Microsoft Xiaoyi: anime girl
    if (name.includes('tingting')) score += 35
    if (name.includes('google') && lang.includes('zh')) score += 30
    if (name.includes('huihui')) score += 20 // Microsoft Huihui Desktop
    if (name.includes('female') || name.includes('女')) score += 15

    // Penalize male voices for default Hatsune Miku
    if (
      name.includes('male') ||
      name.includes('男') ||
      name.includes('kangkang') ||
      name.includes('yunyang') ||
      name.includes('david')
    ) {
      score -= 60
    }

    return score
  }

  function loadVoices() {
    if (!isSupported.value) return
    const list = window.speechSynthesis.getVoices()
    if (!list || list.length === 0) return

    // Sort voices by quality score
    const sorted = [...list].sort((a, b) => scoreVoice(b) - scoreVoice(a))
    voices.value = sorted

    // Retain pending voice or selected voice if requested
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

    // Default to top Chinese voice
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
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }

  // Lip-sync rhythm generator: procedural audio-envelope simulation
  function startLipSyncLoop() {
    let phase = 0

    const update = () => {
      if (!isSpeaking.value) {
        // Smoothly decay mouth to resting smile
        currentVisemes.value.viseme_aa *= 0.82
        currentVisemes.value.viseme_O *= 0.82
        currentVisemes.value.viseme_I *= 0.82
        currentVisemes.value.viseme_U *= 0.82
        currentVisemes.value.viseme_PP *= 0.82
        currentVisemes.value.jawOpen *= 0.82
        currentVisemes.value.mouthSmile = 0.15

        // Decay spectrum
        audioSpectrum.value = audioSpectrum.value.map((v) => v * 0.85)
        animFrameId = requestAnimationFrame(update)
        return
      }

      phase += 0.24

      // Simulate rhythmic speech syllables (vowels: a, o, i, u)
      const syllablePulse = (Math.sin(phase) + 1) * 0.5
      const secondaryPulse = (Math.sin(phase * 1.8 + 0.6) + 1) * 0.5
      const rawAmplitude = syllablePulse * 0.72 + secondaryPulse * 0.28

      // Morph target visemes
      currentVisemes.value = {
        viseme_aa: Math.max(0, Math.sin(phase * 0.95) * 0.7 * rawAmplitude),
        viseme_O: Math.max(0, Math.sin(phase * 1.35 + 1.0) * 0.55 * rawAmplitude),
        viseme_I: Math.max(0, Math.cos(phase * 1.15) * 0.5 * rawAmplitude),
        viseme_U: Math.max(0, Math.sin(phase * 0.85 + 2.0) * 0.45 * rawAmplitude),
        viseme_PP: Math.max(0, Math.cos(phase * 2.3) * 0.3 * (1 - rawAmplitude)),
        jawOpen: rawAmplitude * 0.7,
        mouthSmile: 0.2 + rawAmplitude * 0.15,
      }

      // Generate dynamic audio spectrum for visualizer UI (32 frequency bands)
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

  function speak(
    text: string,
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

    // Cancel any previous speech
    stop()

    // Clean text: strip markdown, URLs, emojis, and bracket action tags like [NAVIGATE_DEMO1]
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[[A-Z_0-9]+\]/g, '') // remove action tags
      .replace(/[*#`_~[\]()]/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // remove emojis
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText) {
      options?.onEnd?.()
      return
    }

    // Play holographic chime only if explicitly requested
    if (options?.suppressChirp === false) {
      audioEngine.playHoloChirp()
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    if (currentVoice.value) {
      utterance.voice = currentVoice.value
    }
    utterance.pitch = pitch.value
    utterance.rate = rate.value
    utterance.lang = currentVoice.value?.lang || 'zh-CN'

    utterance.onstart = () => {
      isSpeaking.value = true
      options?.onStart?.()
    }

    utterance.onend = () => {
      isSpeaking.value = false
      options?.onEnd?.()
    }

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e)
      isSpeaking.value = false
      options?.onEnd?.()
    }

    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (isSupported.value) {
      window.speechSynthesis.cancel()
    }
    isSpeaking.value = false
  }

  // Play audio blip
  function playClickBlip() {
    audioEngine.playBlip()
  }

  // Start animation loop on initialization
  startLipSyncLoop()

  onBeforeUnmount(() => {
    stop()
    if (animFrameId) cancelAnimationFrame(animFrameId)
  })

  return {
    isSupported,
    isSpeaking,
    voices,
    currentVoice,
    setVoiceByName,
    pitch,
    rate,
    currentVisemes,
    audioSpectrum,
    speak,
    stop,
    playClickBlip,
  }
}
