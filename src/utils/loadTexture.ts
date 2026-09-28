import * as THREE from 'three'

/**
 * 加载纹理
 */
export function loadTexture(
  url: string,
  onLoad?: (texture: THREE.Texture) => void
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (texture) => {
        if (onLoad) {
          onLoad(texture)
        }
        resolve(texture)
      },
      undefined,
      (error) => {
        reject(error)
      }
    )
  })
}

/**
 * 批量加载纹理
 */
export function loadTextures(
  urls: string[],
  onProgress?: (index: number, texture: THREE.Texture) => void
): Promise<THREE.Texture[]> {
  return Promise.all(
    urls.map((url, index) =>
      loadTexture(url, (texture) => {
        if (onProgress) {
          onProgress(index, texture)
        }
      })
    )
  )
}
