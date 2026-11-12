<template>
  <!-- 参考原版：地形纹理本身负责颜色，灯光只做柔和体积和立体侧壁，不再把地图照成灰白。 -->
  <TresAmbientLight :intensity="0.52" color="#ffffff" />
  <TresHemisphereLight :intensity="0.42" sky-color="#fff8ee" ground-color="#b8a98d" />
  <TresDirectionalLight :position="[-120, 160, 180]" :intensity="1.28" color="#fff5df" />
  <TresPointLight :position="[130, 88, -120]" :intensity="0.36" color="#ffbf6b" />
</template>
