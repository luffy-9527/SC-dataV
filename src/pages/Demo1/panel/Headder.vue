<template>
  <header class="headder">
    <svg class="headder__bg" viewBox="0 0 1920 82" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 0h1920v26c-180 8-285 33-420 42H420C290 58 172 34 0 26V0Z" fill="rgba(255,245,232,.45)" />
      <path d="M420 68h1080l-70 12H490l-70-12Z" fill="rgba(234,88,12,.22)" />
      <path d="M600 74h720" stroke="rgba(234,88,12,.65)" stroke-width="2" />
      <path d="M0 26c172 8 290 32 420 42h1080c135-9 240-34 420-42" stroke="rgba(234,88,12,.35)" fill="none" />
    </svg>

    <div class="headder__title">
      四川省智慧城市数据大脑
      <span>SICHUAN SMART BRAIN</span>
    </div>

    <a class="headder__github" href="https://github.com/luffy-9527/SC-dataV" target="_blank" rel="noreferrer" title="GitHub">
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.61.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.52 2.33 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.55 9.55 0 0 1 12 6.99c.85 0 1.71.11 2.51.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86V21c0 .26.18.57.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    </a>
  </header>
</template>

<style scoped>
.headder {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 6;
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.headder__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
}

.headder__title {
  text-align: center;
  font-size: 36px;
  line-height: 1;
  letter-spacing: 8px;
  font-weight: 700;
  color: #ea580c;
  background: linear-gradient(to bottom, #ea580c, #ff9100);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 8px 10px rgba(255, 145, 0, 0.35);
}

.headder__title span {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  letter-spacing: 12px;
  color: rgba(255, 145, 0, 0.68);
  -webkit-text-fill-color: rgba(255, 145, 0, 0.68);
}

.headder__github {
  position: absolute;
  top: 12px;
  right: 32px;
  color: #ea580c;
  pointer-events: auto;
}
</style>
