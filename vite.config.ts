import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import path from 'path'

function liveWebSearchPlugin() {
  async function performLiveSearch(q: string) {
    const sources: { title: string; url?: string }[] = []
    const snippets: string[] = []

    // 1. 实时成品油牌号零售价格检索 (覆盖全国各省市 92号/95号/98号/0号柴油/89号汽油)
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
            snippets.push(`【发改委成品油实时零售价】${provName}地区（含成都市）今日最新挂牌价：92号汽油 ${d.p92} 元/升，95号汽油 ${d.p95} 元/升，98号汽油 ${d.p98} 元/升，0号柴油 ${d.p0} 元/升${d.p89 && d.p89 !== '0.00' ? `，89号汽油 ${d.p89} 元/升` : ''}。数据核验更新时间：${d.time || '今日'}。`)
            sources.push({
              title: `${provName}发改委实时成品油挂牌报价`,
              url: 'http://www.ndrc.gov.cn/',
            })
          }
        }
      } catch {}
    }

    // 2. 实时全球与各市气象监测查询
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

    // 3. DuckDuckGo Instant Answer 极速问答检索 API
    try {
      const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`
      const ddgRes = await fetch(ddgApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
        signal: AbortSignal.timeout(3000),
      })
      if (ddgRes.ok) {
        const ddgData: any = await ddgRes.json()
        if (ddgData.AbstractText) {
          snippets.push(`【全网权威速览·${ddgData.Heading || q}】${ddgData.AbstractText}`)
          sources.push({
            title: `${ddgData.Heading || q} · 实时速览`,
            url: ddgData.AbstractURL || 'https://duckduckgo.com',
          })
        }
      }
    } catch {}

    // 4. DuckDuckGo 全网实时检索
    try {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(4500),
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

    // 3. Wikipedia Full-text Search fallback
    if (snippets.length < 2) {
      try {
        const wUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          q,
        )}&utf8=&format=json&origin=*`
        const wRes = await fetch(wUrl, { signal: AbortSignal.timeout(3000) })
        if (wRes.ok) {
          const wData = await wRes.json()
          const items = wData?.query?.search || []
          for (const item of items.slice(0, 2)) {
            const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').trim()
            snippets.push(`【权威百科·${item.title}】${cleanSnippet}`)
            sources.push({
              title: `${item.title} · 维基百科`,
              url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            })
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

  const ttsHandler = async (req: any, res: any) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const text = (url.searchParams.get('text') || '').trim()
      if (!text) {
        res.statusCode = 400
        return res.end('Text required')
      }
      const spd = url.searchParams.get('spd') || '5'
      const chunks = splitTextForTts(text, 220)

      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Access-Control-Allow-Origin', '*')

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
