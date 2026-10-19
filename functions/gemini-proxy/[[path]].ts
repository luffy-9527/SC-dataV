const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-client, x-goog-api-key',
}

export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  }

  const clientUrl = new URL(request.url)
  // 去除 /gemini-proxy 前缀，保留其余路径与查询参数
  const subPath = clientUrl.pathname.replace(/^\/gemini-proxy/, '')
  const targetUrl = new URL(`https://generativelanguage.googleapis.com${subPath}${clientUrl.search}`)

  // 若客户端未携带 key，且 Cloudflare 环境变量中配置了 GEMINI_API_KEY，自动附加
  const serverApiKey = (env?.GEMINI_API_KEY || env?.VITE_GEMINI_API_KEY || '').trim()
  if (!targetUrl.searchParams.has('key') && serverApiKey) {
    targetUrl.searchParams.set('key', serverApiKey)
  }

  // 构造代理请求头，剔除 Cloudflare 与浏览器特定的宿主头
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
          message: `Cloudflare Gemini Proxy 转发异常: ${err?.message || 'Upstream Unreachable'}`,
        },
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
