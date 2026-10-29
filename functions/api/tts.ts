const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const ttsUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(cleanText)}&spd=${encodeURIComponent(spd)}&source=web`

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
