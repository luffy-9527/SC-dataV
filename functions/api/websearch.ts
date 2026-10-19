import { performLiveSearch } from '../_shared/search'

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
    let q = (url.searchParams.get('q') || '').trim()

    // 亦支持 POST body 传递 { q: "..." }
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
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS,
        },
      })
    }

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
      JSON.stringify({
        contextText: '',
        sources: [],
        error: err?.message || 'Search failed',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS,
        },
      },
    )
  }
}
