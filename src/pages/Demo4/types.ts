export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'explaining'

export type FacialEmotion = 'default' | 'smile' | 'surprised' | 'serious' | 'thinking'

export type AnimationType =
  | 'Idle'
  | 'Talking_0'
  | 'Talking_1'
  | 'Talking_2'
  | 'Laughing'
  | 'Angry'
  | 'Crying'
  | 'Terrified'
  | 'Rumba'
  | 'Walk'
  | 'StagePose'
  | 'StageCheer'
  | 'FocusPose'

export type CameraViewMode = 'wide' | 'medium' | 'closeup'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  time: string
  emotion?: FacialEmotion
  animation?: AnimationType
  actionTag?: string
  searchSources?: { title: string; url?: string }[]
}

export interface TelemetryMetrics {
  fps: number
  audioLevel: number
  latencyMs: number
  tokenSpeed: number
  asrConfidence: number
  emotionScore: number
}

export interface DigitalHumanConfig {
  apiKey: string
  model: string
  baseUrl: string
  voicePitch: number
  voiceRate: number
  selectedVoice: string
  useMockOnFailure: boolean
  enableWebSearch: boolean
}
