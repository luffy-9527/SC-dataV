import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Index', component: () => import('@/pages/Index/index.vue') },
    { path: '/demo0', name: 'Demo0', component: () => import('@/pages/Demo0/index.vue') },
    { path: '/demo1', name: 'Demo1', component: () => import('@/pages/Demo1/index.vue') },
    { path: '/demo2', name: 'Demo2', component: () => import('@/pages/Demo2/index.vue') },
    { path: '/demo3', name: 'Demo3', component: () => import('@/pages/Demo3/index.vue') },
  ],
})

export default router
