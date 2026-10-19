export interface SearchSource {
  title: string
  url?: string
}

export interface SearchResult {
  contextText: string
  sources: SearchSource[]
}

export async function performLiveSearch(q: string): Promise<SearchResult> {
  const sources: SearchSource[] = []
  const snippets: string[] = []

  // 1. 实时天气查询
  if (/天气|下雨|气温|温度|晴天|阴天|降水/.test(q)) {
    try {
      const cityMatch = q.match(
        /(成都|北京|上海|广州|深圳|绵阳|宜宾|自贡|泸州|德阳|南充|达州|乐山|凉山|阿坝|甘孜|[a-zA-Z\u4e00-\u9fa5]+市?)/,
      )
      const city = cityMatch ? cityMatch[0].replace('市', '') : 'Chengdu'
      const wRes = await fetch(
        `https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+湿度%h+风速%w&lang=zh`,
        { signal: AbortSignal.timeout(3500) },
      )
      if (wRes.ok) {
        const wText = await wRes.text()
        snippets.push(`【实时气象监测】${city}当前天气：${wText.trim()}`)
        sources.push({
          title: `${city}气象台实时气象`,
          url: `https://wttr.in/${encodeURIComponent(city)}`,
        })
      }
    } catch {
      // ignore
    }
  }

  // 2. DuckDuckGo 全球边缘实时检索
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
          } catch {
            // ignore
          }
        }
        let title = '全网实时检索'
        try {
          const u = new URL(url)
          title = `${u.hostname} · 实时动态`
        } catch {
          // ignore
        }

        snippets.push(`【全网快讯·${title}】${snippet}`)
        sources.push({ title, url })
      }
    }
  } catch {
    // ignore
  }

  // 3. 维基百科全球权威百科检索（兜底）
  if (snippets.length < 2) {
    try {
      const wUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        q,
      )}&utf8=&format=json&origin=*`
      const wRes = await fetch(wUrl, {
        headers: {
          'User-Agent': 'MikuDataV/1.0 (DigitalHuman; miku@sc-datav.org)',
        },
        signal: AbortSignal.timeout(3500),
      })
      if (wRes.ok) {
        const wData: any = await wRes.json()
        const items = wData?.query?.search || []
        for (const item of items.slice(0, 2)) {
          const cleanSnippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim()
          snippets.push(`【权威百科·${item.title}】${cleanSnippet}`)
          sources.push({
            title: `${item.title} · 维基百科`,
            url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          })
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    contextText: snippets.join('\n\n'),
    sources,
  }
}
