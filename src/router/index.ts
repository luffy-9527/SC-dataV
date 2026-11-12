import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/pages/Home/index.vue'),
      meta: {
        title: '首页广场 · SC-dataV 数字孪生视界',
      },
    },
    {
      path: '/smart-city',
      name: 'SmartCity',
      component: () => import('@/pages/SmartCity/index.vue'),
      meta: {
        title: '智慧城市 · 四川省智慧城市数据大脑',
      },
    },
    {
      path: '/low-altitude',
      name: 'LowAltitude',
      component: () => import('@/pages/LowAltitude/index.vue'),
      meta: {
        title: '低空经济综合监管平台 · 成都市级低空运行中心',
      },
    },
    {
      path: '/smart-oilfield',
      name: 'SmartOilfield',
      component: () => import('@/pages/SmartOilfield/index.vue'),
      meta: {
        title: '智慧油田 · 智能开采数字孪生平台',
      },
    },
    {
      path: '/autopilot',
      name: 'Autopilot',
      component: () => import('@/pages/Autopilot/index.vue'),
      meta: {
        title: '自动驾驶 · 智能座舱数字孪生系统',
      },
    },
    {
      path: '/digital-human',
      name: 'DigitalHuman',
      component: () => import('@/pages/DigitalHuman/index.vue'),
      meta: {
        title: 'AI数字人 · 全息智能指挥中心',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.afterEach((to) => {
  if (typeof to.meta?.title === 'string') {
    document.title = to.meta.title
  }
})

export default router
