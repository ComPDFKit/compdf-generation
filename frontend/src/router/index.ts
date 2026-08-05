import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'templates',
      component: () => import('@/pages/index.vue'),
    },
    {
      path: '/templates/:id/editor',
      name: 'template-editor',
      component: () => import('@/pages/template-editor.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
