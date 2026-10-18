import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/demo4',
    },
    {
      path: '/demo1',
      name: 'Demo1',
      component: () => import('@/pages/Demo1/index.vue'),
    },
    {
      path: '/demo2',
      name: 'Demo2',
      component: () => import('@/pages/Demo2/index.vue'),
    },
    {
      path: '/demo3',
      name: 'Demo3',
      component: () => import('@/pages/Demo3/index.vue'),
    },
    {
      path: '/demo4',
      name: 'Demo4',
      component: () => import('@/pages/Demo4/index.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/demo4',
    },
  ],
})

export default router
