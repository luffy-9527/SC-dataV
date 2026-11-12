import { onBeforeUnmount, ref } from 'vue'

export function useSpeechRecognition() {
  const isListening = ref(false)
  const transcript = ref('')
  const isSupported = ref(false)
  const errorMessage = ref('')

  // Check window.SpeechRecognition or window.webkitSpeechRecognition
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  isSupported.value = !!SpeechRecognitionClass

  let recognition: any = null

  if (isSupported.value) {
    try {
      recognition = new SpeechRecognitionClass()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'zh-CN'

      recognition.onstart = () => {
        isListening.value = true
        errorMessage.value = ''
      }

      recognition.onresult = (event: any) => {
        let current = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript
        }
        transcript.value = current
      }

      recognition.onerror = (event: any) => {
        errorMessage.value = `语音识别异常: ${event.error || '未知错误'}`
        isListening.value = false
      }

      recognition.onend = () => {
        isListening.value = false
      }
    } catch (e: any) {
      isSupported.value = false
      errorMessage.value = e?.message || '初始化语音识别失败'
    }
  }

  function start(onFinalCallback?: (text: string) => void) {
    if (!recognition) {
      errorMessage.value = '当前浏览器未开启或不支持原生语音输入'
      return
    }

    transcript.value = ''
    errorMessage.value = ''

    if (onFinalCallback) {
      recognition.onresult = (event: any) => {
        let final = ''
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i]
          if (item.isFinal) {
            final += item[0].transcript
          } else {
            interim += item[0].transcript
          }
        }
        transcript.value = final || interim
        if (final && onFinalCallback) {
          onFinalCallback(final.trim())
        }
      }
    }

    try {
      recognition.start()
    } catch {
      // If already started, stop then restart
      try {
        recognition.stop()
        setTimeout(() => recognition.start(), 150)
      } catch (err: any) {
        errorMessage.value = err?.message || '启动识别失败'
      }
    }
  }

  function stop() {
    if (recognition && isListening.value) {
      try {
        recognition.stop()
      } catch {
        // ignore
      }
    }
    isListening.value = false
  }

  onBeforeUnmount(() => {
    stop()
  })

  return {
    isSupported,
    isListening,
    transcript,
    errorMessage,
    start,
    stop,
  }
}
