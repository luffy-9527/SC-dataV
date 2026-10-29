import { performLiveSearch } from './functions/_shared/search'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-client, x-goog-api-key',
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url)

    // 1. OPTIONS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // 2. 实时全网搜索 API
    if (url.pathname === '/api/websearch') {
      let q = (url.searchParams.get('q') || '').trim()
      if (!q && request.method === 'POST') {
        try {
          const body: any = await request.json()
          q = (body?.q || '').trim()
        } catch {
          // ignore
        }
      }

      if (!q) {
        return new Response(JSON.stringify({ contextText: '', sources: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
        })
      }

      try {
        const data = await performLiveSearch(q)
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=120',
            ...CORS_HEADERS,
          },
        })
      } catch (err: any) {
        return new Response(
          JSON.stringify({ contextText: '', sources: [], error: err?.message || 'Search failed' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
          },
        )
      }
    }

    // 3. Gemini 边缘反向代理
    if (url.pathname.startsWith('/gemini-proxy')) {
      const subPath = url.pathname.replace(/^\/gemini-proxy/, '')
      const targetUrl = new URL(`https://generativelanguage.googleapis.com${subPath}${url.search}`)
      const serverApiKey = (env?.GEMINI_API_KEY || env?.VITE_GEMINI_API_KEY || '').trim()
      if (!targetUrl.searchParams.has('key') && serverApiKey) {
        targetUrl.searchParams.set('key', serverApiKey)
      }

      const forwardHeaders = new Headers(request.headers)
      forwardHeaders.delete('host')
      forwardHeaders.delete('origin')
      forwardHeaders.delete('referer')

      try {
        const upstreamRes = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: forwardHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        })
        const respHeaders = new Headers(upstreamRes.headers)
        Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v))
        return new Response(upstreamRes.body, {
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          headers: respHeaders,
        })
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            error: {
              code: 502,
              message: `Cloudflare Gemini Proxy 转发异常: ${err?.message || 'Upstream Error'}`,
            },
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
          },
        )
      }
    }

    // 4. 中文维基百科边缘代理
    if (url.pathname.startsWith('/wiki-proxy')) {
      const subPath = url.pathname.replace(/^\/wiki-proxy/, '')
      const targetUrl = new URL(`https://zh.wikipedia.org${subPath}${url.search}`)
      const forwardHeaders = new Headers()
      forwardHeaders.set('User-Agent', 'MikuDataV/1.0 (DigitalHuman; miku@sc-datav.org)')
      forwardHeaders.set('Accept', 'application/json')

      try {
        const upstreamRes = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: forwardHeaders,
        })
        const respHeaders = new Headers(upstreamRes.headers)
        Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v))
        return new Response(upstreamRes.body, {
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          headers: respHeaders,
        })
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: `Cloudflare Wiki Proxy 转发异常: ${err?.message || 'Upstream Error'}` }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
          },
        )
      }
    }

    // 5. 云端通用 TTS 语音流服务（专为小米自带浏览器、夸克、微信等国产WebView兜底）
    if (url.pathname === '/api/tts') {
      let text = (url.searchParams.get('text') || '').trim()
      if (!text && request.method === 'POST') {
        try {
          const body: any = await request.json()
          text = (body?.text || '').trim()
        } catch {}
      }

      if (!text) {
        return new Response(JSON.stringify({ error: 'Text required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
        })
      }

      const cleanText = text
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\[[A-Z_0-9]+\]/g, '')
        .replace(/[*#`_~[\]()]/g, '')
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
        .trim()

      const spd = url.searchParams.get('spd') || '5'
      const ttsUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(cleanText)}&spd=${encodeURIComponent(spd)}&source=web`

      try {
        const upstreamRes = await fetch(ttsUrl, {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://fanyi.baidu.com/',
          },
        })

        if (!upstreamRes.ok) {
          return new Response(JSON.stringify({ error: 'TTS upstream failed' }), {
            status: upstreamRes.status,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
          })
        }

        const respHeaders = new Headers()
        respHeaders.set('Content-Type', 'audio/mpeg')
        respHeaders.set('Cache-Control', 'public, max-age=86400')
        Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v))

        return new Response(upstreamRes.body, {
          status: 200,
          headers: respHeaders,
        })
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: `Cloudflare TTS Proxy 异常: ${err?.message || 'Upstream Error'}` }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
          },
        )
      }
    }

    // 6. 静态资源托管回退 (Cloudflare Workers Static Assets)
    if (env?.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request)
    }

    return new Response('Not Found', { status: 404 })
  },
}
