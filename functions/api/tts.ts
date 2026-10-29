const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function splitText(text: string, maxLen = 220): string[] {
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

async function fetchTtsChunk(chunk: string, spd: string): Promise<Uint8Array> {
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

export const onRequest = async (context: any): Promise<Response> => {
  const { request } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  }

  try {
    const url = new URL(request.url)
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

    // 净化文本
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[[A-Z_0-9]+\]/g, '')
      .replace(/[*#`_~[\]()]/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .trim()

    const spd = url.searchParams.get('spd') || '5'
    const chunks = splitText(cleanText, 220)

    const respHeaders = new Headers()
    respHeaders.set('Content-Type', 'audio/mpeg')
    respHeaders.set('Cache-Control', 'public, max-age=86400')
    Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v))

    if (chunks.length === 1) {
      const singleBuffer = await fetchTtsChunk(chunks[0], spd)
      return new Response(singleBuffer, {
        status: 200,
        headers: respHeaders,
      })
    }

    // 并行获取多个语段音频帧并进行原生 MP3 二进制无缝拼接，彻底消除网络停顿
    const buffers = await Promise.all(chunks.map((c) => fetchTtsChunk(c, spd)))
    const mergedAudio = concatUint8Arrays(buffers)

    return new Response(mergedAudio, {
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
