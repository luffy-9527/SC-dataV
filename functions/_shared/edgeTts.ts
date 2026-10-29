/**
 * Edge-TTS 微软边缘神经拟真语音合成模块 (纯 Web 标准 API 实现，兼容 Cloudflare Workers 与 Node.js)
 * 默认音色：zh-CN-XiaoxiaoNeural (微软晓晓 · 甜美温暖自然大模型级原声)
 */

const CHROMIUM_FULL_VERSION = '143.0.3650.75'
export const SEC_MS_GEC_VERSION_V2 = `2-${CHROMIUM_FULL_VERSION}`
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const WINDOWS_FILE_TIME_EPOCH = 11644473600n

// 'Copyright (C) Microsoft Corporation. All rights reserved.'
const PREFIX_STR = 'Copyright (C) Microsoft Corporation. All rights reserved.'
const PREFIX_BYTES = new TextEncoder().encode(PREFIX_STR)

const COEFFICIENTS: [number, number][] = [
  [0xe82e91b1, 0xb32700d0],
  [0x44de24c6, 0x88dff51d],
  [0x3beb65bc, 0x29514038],
  [0xc89c5933, 0xb328cbdf],
  [0x8d1ec211, 0xd405b4d5],
  [0x314ef5d5, 0x26e55f3c],
  [0xe92491b1, 0x607801c6],
  [0xf0a5b9d5, 0x82b2c1fb],
  [0x06064cf3, 0xfa51a3da],
  [0xda79fa60, 0x207cc464],
  [0xbed20560, 0x3c3c74f3],
  [0x89f9c9f8, 0xd2d14b61],
  [0x35fa38c6, 0xbb04a2c1],
  [0xcb49e3c6, 0xc5626167],
]

const mul = Math.imul
const rol16 = (x: number) => ((x << 16) | (x >>> 16)) >>> 0

function cs64Digest(data: Uint8Array, shaDigest: Uint8Array): Uint8Array {
  const shaView = new DataView(shaDigest.buffer, shaDigest.byteOffset, shaDigest.byteLength)
  const keyA = (shaView.getUint32(0, true) | 1) >>> 0
  const keyB = (shaView.getUint32(4, true) | 1) >>> 0
  const factors = [mul(keyA, 0x82893933) >>> 0, mul(keyB, 0x82893933) >>> 0]
  const terms = COEFFICIENTS.map(([coefficient], i) => mul(coefficient, factors[i % 2]) >>> 0)
  const offsets = COEFFICIENTS.map(([, offset]) => offset)
  const paddedLen = Math.ceil((data.length + 1) / 8) * 8
  const padded = new Uint8Array(paddedLen)
  padded.set(data, 1)
  const paddedView = new DataView(padded.buffer, padded.byteOffset, padded.byteLength)
  for (let i = 0; i < paddedLen / 4; i++) {
    const word = paddedView.getUint32(i * 4, true)
    let term = mul(word, i % 2 === 0 ? keyA : keyB)
    let offset = mul(rol16(word), i % 2 === 0 ? 0xef0569fb : 0xc31713db)
    if (i === 0) {
      term = (term + mul(0xf2f90b1a, factors[0])) >>> 0
      offset = (offset + 0x0b1a0000) >>> 0
    }
    terms.push(term >>> 0)
    offsets.push(offset >>> 0)
  }
  let swapAcc = 0
  let swapLast = 0
  let state = 0
  let acc = 0
  for (let i = 0; i < terms.length; i += 2) {
    const x = terms[i]
    const y = terms[i + 1]
    let t = rol16((offsets[i] + x) >>> 0)
    let q = mul(t, 0x76f50f34)
    swapAcc += (mul(rol16(q), 0xc3efea97) + q) >>> 0
    t = rol16((offsets[i + 1] + y) >>> 0)
    q = mul(t, 0x1881ce3c)
    swapLast = (mul(rol16(q), 0x35bd1ec9) + q) >>> 0
    swapAcc = (swapAcc + swapLast) >>> 0
    state = (mul(state, keyA) + x) >>> 0
    for (const k of [0xcf98b111, 0x87085b9f, 0x12ceb96d, 0x257e1d83]) {
      state = mul(rol16(state), k) >>> 0
    }
    acc += state
    t = (mul(state, keyB) + y) >>> 0
    t = mul(rol16(t), 0xa27416f5) >>> 0
    t = mul(rol16(t), 0xd38396ff) >>> 0
    state = mul(rol16(mul(rol16(t), 0x7c932b89)), 0xbfa49f69) >>> 0
    acc = (acc + state) >>> 0
  }
  const result = new Uint8Array(8)
  const resultView = new DataView(result.buffer)
  resultView.setUint32(0, (swapLast ^ state) >>> 0, true)
  resultView.setUint32(4, (swapAcc ^ acc) >>> 0, true)
  return result
}

export async function generateSecMsGecTokenV2(unixSeconds = Date.now() / 1000): Promise<string> {
  const epochSeconds = BigInt(Math.floor(unixSeconds)) + WINDOWS_FILE_TIME_EPOCH
  const roundedSeconds = epochSeconds - (epochSeconds % 300n)
  const ticks = roundedSeconds * 10000000n
  const dataStr = `${ticks}${TRUSTED_CLIENT_TOKEN}`
  const data = new TextEncoder().encode(dataStr)

  const merged = new Uint8Array(PREFIX_BYTES.length + data.length)
  merged.set(PREFIX_BYTES, 0)
  merged.set(data, PREFIX_BYTES.length)

  const subtle = globalThis.crypto?.subtle || (globalThis as any).subtle
  if (!subtle) {
    throw new Error('WebCrypto subtle is required for EdgeTTS DRM')
  }
  const hashBuffer = await subtle.digest('SHA-256', merged)
  const sha = new Uint8Array(hashBuffer)
  const cs64 = cs64Digest(data, sha)

  const cs64Hex = Array.from(cs64)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  const shaHex = Array.from(sha)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `${cs64Hex}-${shaHex}`
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

/**
 * 纯 Web 标准 WebSocket 合成客户端（适用于 Cloudflare Workers 出站 WebSocket 机制）
 */
export async function synthesizeWithEdgeWorkers(
  text: string,
  voice = 'zh-CN-XiaoxiaoNeural',
  rate = '+0%',
  pitch = 'default',
  timeoutMs = 6500,
): Promise<Uint8Array> {
  const token = await generateSecMsGecTokenV2()
  const wsUrl = `https://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION_V2}`

  const resp = await fetch(wsUrl, {
    headers: {
      Upgrade: 'websocket',
      Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0`,
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
    },
  })

  const ws = (resp as any).webSocket
  if (!ws) {
    throw new Error('Cloudflare Workers 未获得上游 WebSocket 对象')
  }
  ws.accept()

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let isFinished = false

    const timer = setTimeout(() => {
      if (isFinished) return
      isFinished = true
      try {
        ws.close()
      } catch {}
      reject(new Error('EdgeTTS synthesis timeout'))
    }, timeoutMs)

    ws.addEventListener('message', (event: any) => {
      try {
        if (typeof event.data === 'string') {
          if (event.data.includes('Path:turn.end')) {
            if (isFinished) return
            isFinished = true
            clearTimeout(timer)
            try {
              ws.close()
            } catch {}
            if (chunks.length > 0) {
              resolve(concatUint8Arrays(chunks))
            } else {
              reject(new Error('EdgeTTS returned no audio chunks'))
            }
          }
        } else if (event.data instanceof ArrayBuffer) {
          const buf = new Uint8Array(event.data)
          if (buf.length >= 2) {
            const headerLen = (buf[0] << 8) | buf[1]
            const payloadOffset = headerLen + 2
            if (payloadOffset <= buf.length) {
              const audioData = buf.subarray(payloadOffset)
              if (audioData.length > 0) {
                chunks.push(audioData)
              }
            }
          }
        }
      } catch (err) {
        if (isFinished) return
        isFinished = true
        clearTimeout(timer)
        try {
          ws.close()
        } catch {}
        reject(err)
      }
    })

    ws.addEventListener('error', (err: any) => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {}
      reject(new Error(err?.message || 'WebSocket error'))
    })

    ws.addEventListener('close', () => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timer)
      if (chunks.length > 0) {
        resolve(concatUint8Arrays(chunks))
      } else {
        reject(new Error('WebSocket closed before audio completed'))
      }
    })

    // 发送语音合成参数协议头
    ws.send(
      `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: 'false',
                  wordBoundaryEnabled: 'false',
                },
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
              },
            },
          },
        }),
    )

    const requestId =
      globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, '') : Date.now().toString(16)
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    const lang = voice.toLowerCase().startsWith('ja') ? 'ja-JP' : 'zh-CN'

    ws.send(
      `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">` +
        `<voice name="${voice}">` +
        `<prosody rate="${rate}" pitch="${pitch}" volume="default">` +
        `${escapedText}` +
        `</prosody>` +
        `</voice>` +
        `</speak>`,
    )
  })
}
