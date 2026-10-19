const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  const clientUrl = new URL(request.url)
  const subPath = clientUrl.pathname.replace(/^\/wiki-proxy/, '')
  const targetUrl = new URL(`https://zh.wikipedia.org${subPath}${clientUrl.search}`)

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
      JSON.stringify({
        error: `Cloudflare Wiki Proxy 转发异常: ${err?.message || 'Upstream Error'}`,
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS,
        },
      },
    )
  }
}
