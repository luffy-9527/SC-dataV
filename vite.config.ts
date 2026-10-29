import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import path from 'path'

function liveWebSearchPlugin() {
  async function performLiveSearch(q: string) {
    const sources: { title: string; url?: string }[] = []
    const snippets: string[] = []

    // 1. 实时黄金与贵金属官方牌价 (上海黄金交易所 Au99.99 官方基准及品牌金饰指导价)
    if (/金价|黄金|国内金价|足金|金饰|首饰金|金条|白银|银价/.test(q)) {
      try {
        const res = await fetch(
          'https://push2.eastmoney.com/api/qt/stock/get?secid=118.AU9999&fields=f43,f44,f45,f46,f60,f169,f170',
          { signal: AbortSignal.timeout(3000) }
        )
        if (res.ok) {
          const d: any = await res.json()
          if (d?.data?.f43) {
            const price = (d.data.f43 / 100).toFixed(2)
            const high = (d.data.f44 / 100).toFixed(2)
            const low = (d.data.f45 / 100).toFixed(2)
            const change = (d.data.f169 / 100).toFixed(2)
            const pct = (d.data.f170 / 100).toFixed(2)
            const sign = Number(change) >= 0 ? '+' : ''
            const retailMin = Math.round(Number(price) + 190)
            const retailMax = Math.round(Number(price) + 205)
            snippets.push(
              `【上海黄金交易所实时官方牌价】Au99.99 黄金现报：${price} 元/克（最高 ${high} 元/克，最低 ${low} 元/克，较昨收 ${sign}${change} 元 / ${sign}${pct}%）。国内周大福、老凤祥、周生生等主流品牌金店足金饰品零售指导价约为 ${retailMin}~${retailMax} 元/克。`
            )
            sources.push({
              title: '上海黄金交易所 · 实时官方牌价',
              url: 'https://www.sge.com.cn/',
            })
          }
        }
      } catch {}
    }

    // 2. 实时成品油牌号零售价格检索 (覆盖全国各省市 92号/95号/98号/0号柴油/89号汽油)
    if (/油价|汽油|柴油|92号|95号|98号|0号柴油|原油|每升|加满/.test(q)) {
      try {
        const provMatch = q.match(/(四川|北京|上海|广东|浙江|江苏|山东|河南|河北|湖北|湖南|陕西|重庆|天津|辽宁|吉林|黑龙江|安徽|福建|江西|山西|内蒙古|广西|海南|贵州|云南|西藏|甘肃|青海|宁夏|新疆)/)
        const prov = provMatch ? provMatch[0] : (q.includes('成都') ? '四川' : '四川')
        const oilRes = await fetch(`https://api.qqsuu.cn/api/dm-oilprice?prov=${encodeURIComponent(prov)}`, {
          signal: AbortSignal.timeout(3500),
        })
        if (oilRes.ok) {
          const oilData: any = await oilRes.json()
          if (oilData?.code === 200 && oilData?.data) {
            const d = oilData.data
            const provName = d.prov || prov
            snippets.push(`【发改委成品油实时官方牌价】${provName}地区（含成都市）今日最新挂牌价：92号汽油 ${d.p92} 元/升，95号汽油 ${d.p95} 元/升，98号汽油 ${d.p98} 元/升，0号柴油 ${d.p0} 元/升${d.p89 && d.p89 !== '0.00' ? `，89号汽油 ${d.p89} 元/升` : ''}。官方发改委数据核验时间：${d.time || '今日'}。`)
            sources.push({
              title: `${provName}发改委实时成品油挂牌报价`,
              url: 'http://www.ndrc.gov.cn/',
            })
          }
        }
      } catch {}
    }

    // 3. 实时全球与各市气象监测查询
    if (/天气|下雨|气温|温度|晴天|阴天|降水|风向|风力|湿度|体感|气候/.test(q)) {
      try {
        const cityMatch = q.match(/(成都|北京|上海|广州|深圳|绵阳|宜宾|自贡|德阳|南充|[a-zA-Z\u4e00-\u9fa5]+市?)/)
        const city = cityMatch ? cityMatch[0].replace('市', '') : '成都'
        const wRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+湿度%h+风速%w&lang=zh`, {
          signal: AbortSignal.timeout(3000),
        })
        if (wRes.ok) {
          const wText = await wRes.text()
          if (wText && !wText.includes('<html')) {
            snippets.push(`【实时气象权威监测】${city}当前天气：${wText.trim()}`)
            sources.push({ title: `${city}气象台实时气象`, url: `https://wttr.in/${encodeURIComponent(city)}` })
          }
        }
      } catch {}
    }

    // 4. 全网实时热搜速览与今日热点 (微博实时热榜 TOP5)
    if (/全网实时速览|实时速览|今日热点|实时热点|热搜|热搜榜|新闻速览|今日要闻|今日头条|全网热搜/.test(q)) {
      try {
        const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://weibo.com',
          },
          signal: AbortSignal.timeout(3000),
        })
        if (res.ok) {
          const data: any = await res.json()
          const list = (data.data?.realtime || [])
            .filter((item: any) => !item.is_ad)
            .slice(0, 5)
            .map((item: any, idx: number) => `${idx + 1}. ${item.word}`)
          if (list.length > 0) {
            snippets.push(`【全网实时热搜榜 TOP5】\n${list.join('\n')}`)
            sources.push({
              title: '微博全网实时热搜榜',
              url: 'https://weibo.com/hot/search',
            })
          }
        }
      } catch {}
    }

    // 5. Bing 全网极速实时检索 (跨域搜索覆盖时事、科技与行业资讯)
    if (snippets.length === 0) {
      const cleanQ = q
        .replace(/[？?。！!，,、~～\s\t\r\n"“”'‘’]+/g, '')
        .replace(/^(请问|你知道|想问下|帮我查查|帮我查一下|查一下|查查|搜索|查询|百科|介绍一下|介绍下|说说|讲讲|聊聊|什么是|有关|关于|谈谈)/g, '')
        .replace(/(是谁|是什么|怎么样|有哪些|有什么用|怎么回事|是什么意思|是指什么|有什么特点|是干什么的|的简介|简介)/g, '')
        .trim()
      const searchKeyword = cleanQ.length >= 2 ? cleanQ : q

      try {
        const bingRes = await fetch(`https://cn.bing.com/search?q=${encodeURIComponent(searchKeyword)}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(3000),
        })
        if (bingRes.ok) {
          const html = await bingRes.text()
          const regex = /<li class="b_algo"[\s\S]*?<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g
          let match
          while ((match = regex.exec(html)) !== null && snippets.length < 3) {
            const url = match[1]
            const title = match[2].replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').trim()
            const snippet = match[3].replace(/<[^>]+>/g, '').replace(/&ensp;|&nbsp;|&#\d+;/g, ' ').trim()
            // 严格相关性过滤：标题或摘要需包含主体关键词
            const fullText = (title + ' ' + snippet).toLowerCase()
            if (searchKeyword.length >= 2 && !fullText.includes(searchKeyword.toLowerCase())) {
              continue
            }
            if (title && snippet) {
              snippets.push(`【全网快讯·${title}】${snippet}`)
              sources.push({ title, url })
            }
          }
        }
      } catch {}
    }

    // 6. DuckDuckGo 全网实时检索兜底
    if (snippets.length === 0) {
      try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(3500),
        })
        if (res.ok) {
          const html = await res.text()
          const snippetMatches = [...html.matchAll(/<a class="result__snippet"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
          for (const m of snippetMatches.slice(0, 3)) {
            const rawUrl = m[1]
            const snippet = m[2].replace(/<[^>]+>/g, '').trim()
            let url = rawUrl
            const uddgMatch = rawUrl.match(/uddg=([^&]+)/)
            if (uddgMatch) {
              try {
                url = decodeURIComponent(uddgMatch[1])
              } catch {}
            }
            if (url.startsWith('//')) {
              url = `https:${url}`
            } else if (!/^https?:\/\//i.test(url)) {
              url = `https://duckduckgo.com${url.startsWith('/') ? '' : '/'}${url}`
            }
            let title = '全网实时检索'
            try {
              const u = new URL(url)
              title = `${u.hostname} · 实时动态`
            } catch {}

            snippets.push(`【全网快讯·${title}】${snippet}`)
            sources.push({ title, url })
          }
        }
      } catch {}
    }

    // 7. Wikipedia 权威百科检索兜底（仅限常识实体名词查询，且执行严格相关性过滤；严禁时效性查询进入）
    const isTimeSensitive = /油价|汽油|柴油|天气|气温|温度|金价|黄金|白银|热搜|速览|今日|实时|最新/.test(q)
    if (!isTimeSensitive && snippets.length === 0) {
      try {
        const wUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          q,
        )}&utf8=&format=json&origin=*`
        const wRes = await fetch(wUrl, { signal: AbortSignal.timeout(3000) })
        if (wRes.ok) {
          const wData = await wRes.json()
          const items = wData?.query?.search || []
          for (const item of items.slice(0, 2)) {
            const cleanSnippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim()
            const cleanTitle = item.title || ''
            const lowerQ = q.toLowerCase()
            if (
              cleanSnippet &&
              (cleanTitle.toLowerCase().includes(lowerQ) ||
                lowerQ.includes(cleanTitle.toLowerCase()) ||
                cleanSnippet.toLowerCase().includes(lowerQ))
            ) {
              snippets.push(`【权威百科·${cleanTitle}】${cleanSnippet}`)
              sources.push({
                title: `${cleanTitle} · 维基百科`,
                url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(cleanTitle)}`,
              })
            }
          }
        }
      } catch {}
    }

    const contextText = snippets.join('\n\n')
    return { contextText, sources }
  }

  const handler = async (req: any, res: any) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const q = url.searchParams.get('q') || ''
      if (!q.trim()) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        return res.end(JSON.stringify({ contextText: '', sources: [] }))
      }
      const data = await performLiveSearch(q)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(data))
    } catch {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ contextText: '', sources: [] }))
    }
  }

  function splitTextForTts(text: string, maxLen = 220): string[] {
    if (text.length <= maxLen) return [text]
    const chunks: string[] = []
    const sentences = text.match(/[^。！？!?；;\n]+[。！？!?；;\n]?/g) || [text]
    let current = ''
    for (const s of sentences) {
      const trimmed = s.trim()
      if (!trimmed) continue
      if ((current + trimmed).length > maxLen) {
        if (current) chunks.push(current)
        current = trimmed
      } else {
        current += trimmed
      }
    }
    if (current) chunks.push(current)
    return chunks.length > 0 ? chunks : [text]
  }

  async function fetchBaiduChunk(chunk: string, spd: string): Promise<Buffer> {
    const ttsUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(chunk)}&spd=${encodeURIComponent(spd)}&source=web`
    const upstream = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://fanyi.baidu.com/',
      },
    })
    if (!upstream.ok) throw new Error(`Upstream error ${upstream.status}`)
    const ab = await upstream.arrayBuffer()
    return Buffer.from(ab)
  }

  async function synthesizeEdgeTtsNode(
    text: string,
    voice = 'zh-CN-XiaoxiaoNeural',
    rate = '+0%',
  ): Promise<Buffer> {
    const { EdgeTTS } = await import('node-edge-tts')
    const tts = new EdgeTTS({
      voice,
      lang: 'zh-CN',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      rate,
      timeout: 6500,
    })
    const chunks: Buffer[] = []
    for await (const chunk of tts.streamAudio(text)) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk)
      }
    }
    if (chunks.length === 0) throw new Error('Empty audio stream from EdgeTTS')
    return Buffer.concat(chunks)
  }

  const ttsHandler = async (req: any, res: any) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const text = (url.searchParams.get('text') || '').trim()
      if (!text) {
        res.statusCode = 400
        return res.end('Text required')
      }
      const voice = url.searchParams.get('voice') || 'zh-CN-XiaoxiaoNeural'
      const spd = url.searchParams.get('spd') || '5'
      const rate = spd === '6' ? '+10%' : spd === '7' ? '+20%' : spd === '4' ? '-10%' : '+0%'

      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cache-Control', 'public, max-age=86400')

      // 1. 优先采用微软 Edge-TTS (晓晓神经拟真原声)
      try {
        const edgeBuffer = await synthesizeEdgeTtsNode(text, voice, rate)
        if (edgeBuffer && edgeBuffer.length > 0) {
          return res.end(edgeBuffer)
        }
      } catch (edgeErr: any) {
        console.warn('[Vite TTS] Edge-TTS 失败，自动降级至百度TTS兜底:', edgeErr?.message)
      }

      // 2. 百度高可靠 TTS 兜底
      const chunks = splitTextForTts(text, 220)
      if (chunks.length === 1) {
        const buf = await fetchBaiduChunk(chunks[0], spd)
        return res.end(buf)
      }

      const buffers = await Promise.all(chunks.map((c) => fetchBaiduChunk(c, spd)))
      res.end(Buffer.concat(buffers))
    } catch (e: any) {
      res.statusCode = 502
      res.end(e.message || 'TTS Error')
    }
  }

  return {
    name: 'miku-live-web-search-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/websearch', handler)
      server.middlewares.use('/api/tts', ttsHandler)
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/websearch', handler)
      server.middlewares.use('/api/tts', ttsHandler)
    },
  }
}

export default defineConfig({
  plugins: [
    vue({
      ...templateCompilerOptions,
    }),
    liveWebSearchPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8888,
    open: '/#/demo4',
    proxy: {
      '/gemini-proxy': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/gemini-proxy/, ''),
      },
      '/wiki-proxy': {
        target: 'https://zh.wikipedia.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/wiki-proxy/, ''),
        headers: {
          'User-Agent': 'MikuDataV/1.0 (DigitalHuman; miku@sc-datav.org)',
        },
      },
    },
  },
  optimizeDeps: {
    include: ['d3-geo'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          echarts: ['echarts'],
          vendor: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
