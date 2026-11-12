import { Texture, TextureLoader } from 'three'

export default function loadTexture(
  url: string,
  onLoad?: (texture: Texture) => void,
): Promise<Texture> {
  return new Promise((resolve, reject) => {
    new TextureLoader().load(
      url,
      texture => {
        onLoad?.(texture)
        resolve(texture)
      },
      undefined,
      error => reject(error),
    )
  })
}
