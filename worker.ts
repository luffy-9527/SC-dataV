import { performLiveSearch } from './functions/_shared/search'
import { synthesizeWithEdgeWorkers } from './functions/_shared/edgeTts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-client, x-goog-api-key',
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

async function fetchBaiduTtsChunk(chunk: string, spd: string): Promise<Uint8Array> {
  const ttsUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(chunk)}&spd=${encodeURIComponent(spd)}&source=web`
  const res = await fetch(ttsUrl, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://fanyi.baidu.com/',
    },
  })
  if (!res.ok) {
    throw new Error(`TTS upstream failed with ${res.status}`)
  }
  const ab = await res.arrayBuffer()
  return new Uint8Array(ab)
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, val) => acc + val.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
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

    // 5. 云端通用 TTS 语音流服务（并行获取与MP3原生帧无缝融合，保证长段连贯流畅零停顿）
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
      const voice = url.searchParams.get('voice') || 'zh-CN-XiaoxiaoNeural'
      const rate = spd === '6' ? '+10%' : spd === '7' ? '+20%' : spd === '4' ? '-10%' : '+0%'

      const respHeaders = new Headers()
      respHeaders.set('Content-Type', 'audio/mpeg')
      respHeaders.set('Cache-Control', 'public, max-age=86400')
      Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v))

      // 1. 优先采用微软 Edge-TTS (晓晓高保真原声音色)
      try {
        const edgeAudio = await synthesizeWithEdgeWorkers(cleanText, voice, rate, 5500)
        if (edgeAudio && edgeAudio.length > 0) {
          return new Response(edgeAudio, { status: 200, headers: respHeaders })
        }
      } catch (edgeErr: any) {
        console.warn('[Cloudflare Worker] EdgeTTS 合成异常，平滑降级至百度TTS兜底:', edgeErr?.message)
      }

      // 2. 百度高可靠 TTS 兜底（并行拉取与二进制帧拼接）
      const chunks = splitTextForTts(cleanText, 220)
      try {
        if (chunks.length === 1) {
          const singleBuffer = await fetchBaiduTtsChunk(chunks[0], spd)
          return new Response(singleBuffer, { status: 200, headers: respHeaders })
        }

        // 并行拉取多段音频并在边缘进行零间隙 MP3 二进制帧拼接
        const buffers = await Promise.all(chunks.map((c) => fetchBaiduTtsChunk(c, spd)))
        const mergedAudio = concatUint8Arrays(buffers)

        return new Response(mergedAudio, { status: 200, headers: respHeaders })
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
