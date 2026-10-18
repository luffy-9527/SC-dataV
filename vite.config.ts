import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import path from 'path'

function liveWebSearchPlugin() {
  async function performLiveSearch(q: string) {
    const sources: { title: string; url?: string }[] = []
    const snippets: string[] = []

    // 1. Weather
    if (/天气|下雨|气温|温度|晴天|阴天|降水/.test(q)) {
      try {
        const cityMatch = q.match(/(成都|北京|上海|广州|深圳|绵阳|宜宾|自贡|德阳|南充|[a-zA-Z\u4e00-\u9fa5]+市?)/)
        const city = cityMatch ? cityMatch[0].replace('市', '') : 'Chengdu'
        const wRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+湿度%h+风速%w&lang=zh`, {
          signal: AbortSignal.timeout(3000),
        })
        if (wRes.ok) {
          const wText = await wRes.text()
          snippets.push(`【实时气象监测】${city}当前天气：${wText.trim()}`)
          sources.push({ title: `${city}气象台实时气象`, url: `https://wttr.in/${encodeURIComponent(city)}` })
        }
      } catch {}
    }

    // 2. DuckDuckGo Real-Time Web Search
    try {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

  return {
    name: 'miku-live-web-search-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/websearch', handler)
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/websearch', handler)
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
