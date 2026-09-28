import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', {
  state: () => ({
    mapPlayComplete: false,
    cloud: true,
    bar: true,
    rotation: true,
    heat: true,
    mode: true
  }),
  actions: {
    toggle(key: string) {
      (this as any)[key] = !(this as any)[key]
    },
    reset() {
      this.$reset()
    }
  }
})
