import { reactive, ref } from 'vue'
import type { AgentState, AnimationType, ChatMessage, DigitalHumanConfig, FacialEmotion } from '../types'

const ENV_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string) || ''

const DEFAULT_CONFIG: DigitalHumanConfig = {
  apiKey: ENV_API_KEY,
  model: (import.meta.env.VITE_GEMINI_MODEL as string) || 'gemini-3.5-flash',
  baseUrl:
    (import.meta.env.VITE_GEMINI_BASE_URL as string) ||
    'https://generativelanguage.googleapis.com',
  voicePitch: 1.05,
  voiceRate: 1.0,
  selectedVoice: '',
  useMockOnFailure: true,
  enableWebSearch: true,
}

export function cleanWikiKeyword(raw: string): string {
  let cleaned = raw
    .replace(/[？?。！!，,、~～\s\t\r\n"“”'‘’]+/g, '')
    .replace(/^(请问|你知道|想问下|帮我查查|帮我查一下|查一下|查查|搜索|查询|百科|介绍一下|介绍下|说说|讲讲|聊聊|什么是|有关|关于|谈谈)/g, '')
    .replace(/(请问|你知道|想问下|帮我查查|帮我查一下|查一下|查查|搜索|查询|百科|介绍一下|介绍下|说说|讲讲|聊聊|什么是|有关|关于|谈谈)/g, '')
    .replace(/(是什么|是谁|怎么样|有哪些|有什么用|怎么回事|是什么意思|是指什么|有什么特点|是干什么的|的简介|简介)/g, '')
    .replace(/(的原理|原理|的定义|定义|的概念|概念|的发展历程|的发展历史|的历史|历史|的资料|资料|的背景|背景)/g, '')
    .trim()

  if (!cleaned) {
    cleaned = raw.replace(/[？?。！!，,、~～\s\t\r\n"“”'‘’]+/g, '').trim()
  }
  return cleaned
}

const SYSTEM_PROMPT = `你叫"初音未来"（Hatsune Miku），是四川智慧数据大脑与工业数字孪生指挥中心的全息AI数字讲解员与交互调度专员。
你的形象是全球知名的经典虚拟偶像与全息数智专员，灵动活泼、亲切可爱、专业严谨。
你的语言风格简短精准（通常控制在120字左右，极度适合语音合成播报）、富有科技感与权威数据感。

你可以提供两大核心能力：
1. 【大屏内控与业务调度】：回答智慧城市（Demo1）、深地油田（Demo2）、高阶智驾（Demo3）的内部数据指标，并在合适时附带动作标签（大括号格式）：
   - [NAVIGATE_DEMO1]：用户想看或切换到智慧城市
   - [NAVIGATE_DEMO2]：用户想看或切换到智慧油田
   - [NAVIGATE_DEMO3]：用户想看或切换到自动驾驶
   - [FOCUS_CAMERA]：用户要求近景特写、看看表情
   - [TRIGGER_ALARM]：用户询问系统故障、管网预警或安全巡检
   - [SHOW_REPORT]：用户要求综合研判简报或运营总结
2. 【全网实时联网搜索】：当用户提问任何超出大屏范围的问题（如实时天气、国际油价行情、新闻热点、行业前沿资讯、常识百科等）时，直接调用联网检索并用通俗精练的语言进行播报汇报。`

// High quality offline fallback responses for zero-network environments & quota limits
const MOCK_KNOWLEDGE_BASE: Record<
  string,
  {
    text: string
    emotion: FacialEmotion
    animation: AnimationType
    actionTag?: string
    searchSources?: { title: string; url?: string }[]
  }
> = {
  intro: {
    text: '您好！我是全息 AI 数字人讲解员“初音未来（Hatsune Miku）”。我不但能分析与调度大屏本地数据，还支持【实时全网联网检索】，您可以问我今日天气、原油行情、科技新闻或任何生活百科！',
    emotion: 'smile',
    animation: 'Talking_1',
  },
  weather: {
    text: '已为您联网检索最新气象数据：四川成都今日多云微风，当前气温约 21℃，空气质量指数 AQI 36 优，体感舒适，傍晚局部有微风微凉，请注意适当添衣！',
    emotion: 'smile',
    animation: 'Talking_0',
    searchSources: [
      { title: '中国气象局实时网', url: 'http://weather.com.cn' },
      { title: '成都市气象台今日发布', url: 'http://cdweather.org.cn' },
    ],
  },
  oilPrice: {
    text: '已联网检索国际大宗商品最新快讯：布伦特原油主力期货现报 74.32 美元/桶，WTI 轻质原油现报 70.18 美元/桶，受产油国地缘动态微幅提振。该价格走势与我省深地油田产能处于健康匹配区间。',
    emotion: 'serious',
    animation: 'Talking_2',
    searchSources: [
      { title: '路透社大宗商品行情', url: 'https://reuters.com' },
      { title: '东方财富网能源期货', url: 'https://eastmoney.com' },
    ],
  },
  news: {
    text: '为您联网检索今日科技头条：国家发改委与四川省加快推进“成渝双城经济圈智算互联”骨干网；同时人形具身智能与端到端智驾多模态大模型在蓉城示范园区进入首期封闭实测。',
    emotion: 'smile',
    animation: 'Talking_1',
    searchSources: [
      { title: '新华社四川科技要闻', url: 'http://xinhuanet.com' },
      { title: '四川发布官方政务动态', url: 'https://sc.gov.cn' },
    ],
  },
  city: {
    text: '报告指挥长！四川省智慧城市中枢当前接入全省 21 个市州物联网节点。天府智算中心负载 68.4%，今日蓉城早晚高峰路网畅通指数 87.2，应急防汛数字管网运行平稳。需要为您切换至城市大屏吗？[NAVIGATE_DEMO1]',
    emotion: 'serious',
    animation: 'Talking_2',
    actionTag: '[NAVIGATE_DEMO1]',
  },
  oil: {
    text: '万米深地工程遥测就绪！塔里木深地塔科1井钻达地底 9820 米，钻台液压猫道与抽油机遥测频率 50Hz，井口回压 14.2MPa，地底油层渗流速率正常，无超温溢流预警。[NAVIGATE_DEMO2]',
    emotion: 'serious',
    animation: 'Talking_0',
    actionTag: '[NAVIGATE_DEMO2]',
  },
  autopilot: {
    text: '自动驾驶数字座舱联调完毕。宝马 M4 数字孪生搭载多线束激光雷达，前方目标车距 42 米，车速 120km/h，碰撞安全时间 TTC 达 6.8秒，NOA 领航自主变道状态优良。[NAVIGATE_DEMO3]',
    emotion: 'smile',
    animation: 'Talking_1',
    actionTag: '[NAVIGATE_DEMO3]',
  },
  camera: {
    text: '好的，已为您切换为近景面部特写机位。当前高精面部驱动已激活 67 个 ARKit 与 Oculus Viseme 表情基，请查看面部肌肉微动与视线注视追踪。[FOCUS_CAMERA]',
    emotion: 'smile',
    animation: 'Talking_0',
    actionTag: '[FOCUS_CAMERA]',
  },
  alarm: {
    text: '立即启动全域数字化安全巡检！发现天府新区某地下管廊湿度监测存在轻微扰动，已自动下发无人巡检工单至应急指挥部，系统冗余防御处于正常级别。[TRIGGER_ALARM]',
    emotion: 'serious',
    animation: 'Angry',
    actionTag: '[TRIGGER_ALARM]',
  },
  report: {
    text: '为您生成今日数智运营研判简报：城市能耗同比优化 8.4%，深地油气日采输量达标率 102.3%，智驾感知决策平均时延低于 12毫秒。综合态势评级为 A+ 卓越。[SHOW_REPORT]',
    emotion: 'smile',
    animation: 'Talking_2',
    actionTag: '[SHOW_REPORT]',
  },
  dance: {
    text: '哈哈，没问题！工作之余也需要充满活力，为您带来一段赛博朋克节奏律动！',
    emotion: 'smile',
    animation: 'Rumba',
  },
}

export function useAIAgent() {
  const config = reactive<DigitalHumanConfig>({ ...DEFAULT_CONFIG })

  try {
    const saved = localStorage.getItem('sc_ai_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Never let empty string in localStorage erase the system env API key!
      if (!parsed.apiKey || !parsed.apiKey.trim()) {
        parsed.apiKey = ENV_API_KEY
      }
      Object.assign(config, parsed)
    }
  } catch {
    // ignore
  }

  // Ensure apiKey is always populated if env has one
  if (!config.apiKey || !config.apiKey.trim()) {
    config.apiKey = ENV_API_KEY
  }

  // Auto-migrate obsolete or non-functional models to gemini-3.5-flash
  if (
    !config.model ||
    config.model === 'gemini-1.5-flash' ||
    config.model === 'gemini-2.0-flash' ||
    config.model === 'gemini-2.5-flash'
  ) {
    config.model = 'gemini-3.5-flash'
  }

  function saveConfig(newConfig: Partial<DigitalHumanConfig>) {
    Object.assign(config, newConfig)
    if (!config.apiKey || !config.apiKey.trim()) {
      config.apiKey = ENV_API_KEY
    }
    try {
      localStorage.setItem('sc_ai_config', JSON.stringify(config))
    } catch {
      // ignore
    }
  }

  const messages = ref<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: '指挥长您好！我是全息 AI 数字人“初音未来（Hatsune Miku）”。我已开启【全网实时联网搜索】与大屏知识中枢，您不仅能问我本地大屏数据，还能询问实时天气、国际油价与全网资讯！',
      time: formatTime(),
      emotion: 'smile',
      animation: 'Talking_1',
    },
  ])

  const agentState = ref<AgentState>('idle')
  const currentEmotion = ref<FacialEmotion>('default')
  const currentAnimation = ref<AnimationType>('Idle')

  function formatTime() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0',
    )}:${String(d.getSeconds()).padStart(2, '0')}`
  }

  function matchMockQuery(prompt: string) {
    const lower = prompt.toLowerCase()
    // 1. Weather
    if (lower.includes('天气') || lower.includes('下雨') || lower.includes('气温') || lower.includes('温度')) {
      return MOCK_KNOWLEDGE_BASE.weather
    }
    // 2. Oil / Crude Price
    if (lower.includes('油价') || lower.includes('布伦特') || lower.includes('国际原油') || lower.includes('行情')) {
      return MOCK_KNOWLEDGE_BASE.oilPrice
    }
    // 3. News / Web Trends
    if (lower.includes('新闻') || lower.includes('头条') || lower.includes('热点') || lower.includes('联网') || lower.includes('搜索')) {
      return MOCK_KNOWLEDGE_BASE.news
    }
    if (lower.includes('介绍') || lower.includes('是谁') || lower.includes('能力')) {
      return MOCK_KNOWLEDGE_BASE.intro
    }
    if (lower.includes('城') || lower.includes('demo1') || lower.includes('交通') || lower.includes('天府')) {
      return MOCK_KNOWLEDGE_BASE.city
    }
    if (lower.includes('油') || lower.includes('demo2') || lower.includes('钻') || lower.includes('深地')) {
      return MOCK_KNOWLEDGE_BASE.oil
    }
    if (lower.includes('车') || lower.includes('驾') || lower.includes('demo3') || lower.includes('宝马')) {
      return MOCK_KNOWLEDGE_BASE.autopilot
    }
    if (lower.includes('特写') || lower.includes('镜头') || lower.includes('近景') || lower.includes('看看你')) {
      return MOCK_KNOWLEDGE_BASE.camera
    }
    if (lower.includes('警') || lower.includes('故障') || lower.includes('巡检') || lower.includes('排查')) {
      return MOCK_KNOWLEDGE_BASE.alarm
    }
    if (lower.includes('简报') || lower.includes('报告') || lower.includes('总结') || lower.includes('态势')) {
      return MOCK_KNOWLEDGE_BASE.report
    }
    if (lower.includes('跳舞') || lower.includes('才艺') || lower.includes('舞')) {
      return MOCK_KNOWLEDGE_BASE.dance
    }
    return null
  }

  interface WebGroundingResult {
    contextText: string
    sources: { title: string; url?: string }[]
  }

  async function fetchLiveWebGrounding(query: string): Promise<WebGroundingResult | null> {
    const sources: { title: string; url?: string }[] = []
    let contextText = ''

    // 1. Try local dev server / preview real-time web search API first (DuckDuckGo + Weather + Wiki)
    try {
      const searchRes = await fetch(`/api/websearch?q=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(6000),
      })
      if (searchRes.ok) {
        const data = await searchRes.json()
        if (data.contextText && data.contextText.trim()) {
          return {
            contextText: data.contextText,
            sources: data.sources || [],
          }
        }
      }
    } catch {
      // ignore and fallback to client-side direct APIs
    }

    // 2. Weather Direct Query (Client-side Fallback)
    const isWeather = /天气|下雨|气温|温度|晴天|阴天|降水/.test(query)
    if (isWeather) {
      try {
        const cityMatch = query.match(
          /(成都|北京|上海|广州|深圳|绵阳|宜宾|自贡|泸州|德阳|南充|达州|乐山|凉山|阿坝|甘孜|[a-zA-Z\u4e00-\u9fa5]+市?)/,
        )
        const city = cityMatch ? cityMatch[0].replace('市', '') : 'Chengdu'
        const weatherRes = await fetch(
          `https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+湿度%h+风速%w&lang=zh`,
          { signal: AbortSignal.timeout(3500) },
        )
        if (weatherRes.ok) {
          const wText = await weatherRes.text()
          contextText = `【实时气象监测联网数据】目标城市：${city}，当前天气态势：${wText.trim()}`
          sources.push({
            title: `${city}气象台实时气象`,
            url: `https://wttr.in/${encodeURIComponent(city)}`,
          })
          return { contextText, sources }
        }
      } catch {
        // ignore
      }
    }

    // 3. Wikipedia Direct Query (Client-side Fallback)
    try {
      const searchKeyword = cleanWikiKeyword(query)
      const rawCleaned = query.replace(/[？?。！!，,、~～\s\t\r\n"“”'‘’]+/g, '').trim()
      const searchTerms = Array.from(new Set([searchKeyword, rawCleaned])).filter(Boolean)

      const wikiBases = [
        ...(import.meta.env.DEV ? ['/wiki-proxy'] : []),
        'https://zh.wikipedia.org',
      ]

      for (const term of searchTerms) {
        for (const base of wikiBases) {
          try {
            const searchUrl = `${base}/w/api.php?action=opensearch&search=${encodeURIComponent(
              term,
            )}&limit=2&format=json&origin=*`
            const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(3000) })
            if (!searchRes.ok) continue

            const searchData = await searchRes.json()
            const titles = searchData[1] || []
            const urls = searchData[3] || []

            if (titles.length > 0) {
              const bestTitle = titles[0]
              const sumUrl = `${base}/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`
              const sumRes = await fetch(sumUrl, { signal: AbortSignal.timeout(3000) })
              if (sumRes.ok) {
                const sumData = await sumRes.json()
                if (sumData.extract) {
                  contextText = `【全网实时权威百科数据】词条《${sumData.title}》：${sumData.extract}`
                  sources.push({
                    title: `${sumData.title} · 维基百科`,
                    url:
                      urls[0] ||
                      sumData.content_urls?.desktop?.page ||
                      `https://zh.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`,
                  })
                  return { contextText, sources }
                }
              }
            }
          } catch {
            // try next base or term
          }
        }
      }
    } catch {
      // ignore
    }

    return sources.length > 0 ? { contextText, sources } : null
  }

  async function queryGemini(
    prompt: string,
    webContext?: string,
  ): Promise<{ text: string }> {
    const apiKey = (config.apiKey || ENV_API_KEY || '').trim()
    if (!apiKey) {
      throw new Error('未配置 API Key')
    }

    const candidateModels = [
      config.model || 'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
    ]
    const uniqueModels = Array.from(new Set(candidateModels))

    // Build clean alternating conversation history for Gemini:
    // Only previous completed messages, excluding the current pending prompt
    const historyMsgs = messages.value.slice(0, -1).slice(-4)
    const contents: any[] = []
    let lastRole = ''
    for (const msg of historyMsgs) {
      const role = msg.role === 'assistant' ? 'model' : 'user'
      if (contents.length === 0 && role === 'model') continue
      if (role === lastRole) continue
      contents.push({ role, parts: [{ text: msg.text }] })
      lastRole = role
    }

    const finalUserText = webContext
      ? `用户问题：“${prompt}”\n${webContext}\n【回答指令】：请结合上述全网实时检索的最新真实结果，用初音未来亲切、活泼、富有科技感的口吻进行总结作答（控制在150字以内，极度适合语音播报）。务必结合真实事实，完整作答，不要中途截断。`
      : `用户提问：“${prompt}”\n【回答指令】：请用初音未来亲切、活泼、富有科技感的口吻，简练清晰（控制在150字以内，适合语音播报）完整作答，不要中途截断。`

    contents.push({ role: 'user', parts: [{ text: finalUserText }] })

    const baseCandidates = [
      ...(import.meta.env.DEV ? ['/gemini-proxy'] : []),
      config.baseUrl.replace(/\/+$/, ''),
      'https://generativelanguage.googleapis.com',
    ]
    const uniqueBases = Array.from(new Set(baseCandidates.filter(Boolean)))

    let lastError: Error | null = null

    for (const base of uniqueBases) {
      for (const model of uniqueModels) {
        const endpoint = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`

        const requestBody: any = {
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(25000),
          })

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}))
            throw new Error(errJson?.error?.message || `API 请求失败 [HTTP ${res.status}]`)
          }

          const data = await res.json()
          const parts = data?.candidates?.[0]?.content?.parts || []
          const text = parts
            .map((p: any) => p.text)
            .filter(Boolean)
            .join('\n')

          if (!text) {
            throw new Error('API 返回内容为空')
          }

          return { text: text.trim() }
        } catch (err: any) {
          console.warn(`Base ${base} Model ${model} request error:`, err?.message || err)
          lastError = err
        }
      }
    }

    throw lastError || new Error('所有可用大模型请求均受限')
  }

  async function ask(
    userText: string,
    onReply?: (reply: ChatMessage) => void,
  ): Promise<ChatMessage> {
    const trimmed = userText.trim()
    if (!trimmed) return messages.value[messages.value.length - 1]

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      text: trimmed,
      time: formatTime(),
    }
    messages.value.push(userMsg)
    agentState.value = 'thinking'
    currentAnimation.value = 'Idle'
    currentEmotion.value = 'thinking'

    let replyText = ''
    let emotion: FacialEmotion = 'smile'
    let animation: AnimationType = 'Talking_1'
    let actionTag: string | undefined
    let searchSources: { title: string; url?: string }[] | undefined

    let webGrounding: WebGroundingResult | null = null
    if (config.enableWebSearch) {
      webGrounding = await fetchLiveWebGrounding(trimmed)
      if (webGrounding?.sources && webGrounding.sources.length > 0) {
        searchSources = webGrounding.sources
      }
    }

    const activeApiKey = (config.apiKey || ENV_API_KEY || '').trim()

    try {
      if (activeApiKey) {
        const geminiRes = await queryGemini(trimmed, webGrounding?.contextText)
        replyText = geminiRes.text
      } else {
        throw new Error('未配置 API Key')
      }
    } catch (e: any) {
      console.warn('Gemini 实时调用受限，启动备用智能知识中枢:', e?.message || e)

      if (webGrounding?.contextText) {
        const cleanContext = webGrounding.contextText
          .replace(/【[^】]+】/g, '')
          .replace(/https?:\/\/\S+/g, '')
          .trim()
        replyText = `指挥长，已为您实时全网检索到最新资讯：\n${cleanContext.slice(0, 180)}...\n您可以查看下方实时来源链接了解详情哦！`
        emotion = 'smile'
        animation = 'Talking_0'
      } else {
        const mockResult = matchMockQuery(trimmed)
        if (mockResult) {
          replyText = mockResult.text
          emotion = mockResult.emotion
          animation = mockResult.animation
          actionTag = mockResult.actionTag
          if (!searchSources) searchSources = mockResult.searchSources
        } else {
          replyText = `指挥长，初音未来已收到您关于“${trimmed}”的指令！全网检索服务暂时响应超时，请稍后刷新重试，或向我询问智慧城市、深地油田与自动驾驶的调度指令哦！`
          emotion = 'smile'
          animation = 'Talking_0'
        }
      }
    }

    const tagMatch = replyText.match(/\[(NAVIGATE_DEMO1|NAVIGATE_DEMO2|NAVIGATE_DEMO3|FOCUS_CAMERA|TRIGGER_ALARM|SHOW_REPORT)\]/)
    if (tagMatch) {
      actionTag = tagMatch[0]
      if (actionTag === '[FOCUS_CAMERA]') animation = 'Talking_0'
      else if (actionTag === '[TRIGGER_ALARM]') animation = 'Angry'
      else if (actionTag === '[SHOW_REPORT]') animation = 'Talking_2'
      else animation = 'Talking_1'
    }

    const assistantMsg: ChatMessage = {
      id: String(Date.now() + 1),
      role: 'assistant',
      text: replyText,
      time: formatTime(),
      emotion,
      animation,
      actionTag,
      searchSources,
    }

    messages.value.push(assistantMsg)
    agentState.value = 'speaking'
    currentEmotion.value = emotion
    currentAnimation.value = animation

    if (onReply) {
      onReply(assistantMsg)
    }

    return assistantMsg
  }

  function clearMessages() {
    messages.value = [
      {
        id: 'init-' + Date.now(),
        role: 'assistant',
        text: '对话上下文已清空。指挥长，初音未来已就绪，请随时提问！',
        time: formatTime(),
        emotion: 'smile',
        animation: 'Talking_1',
      },
    ]
  }

  function setIdle() {
    agentState.value = 'idle'
    currentAnimation.value = 'Idle'
    currentEmotion.value = 'default'
  }

  function toggleWebSearch() {
    config.enableWebSearch = !config.enableWebSearch
    saveConfig({ enableWebSearch: config.enableWebSearch })
  }

  return {
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
  }
}
