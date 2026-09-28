import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/demo1',
    },
    {
      path: '/demo1',
      name: 'Demo1',
      component: () => import('@/pages/Demo1/index.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/demo1',
    },
  ],
})

export default router
