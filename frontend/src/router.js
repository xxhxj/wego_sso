import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from './api.js';
import Layout from './views/Layout.vue';
import Login from './views/Login.vue';
import LoginLogs from './views/LoginLogs.vue';
import Menus from './views/Menus.vue';
import OperationLogs from './views/OperationLogs.vue';
import Roles from './views/Roles.vue';
import Systems from './views/Systems.vue';
import Users from './views/Users.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    {
      path: '/',
      component: Layout,
      redirect: '/systems',
      children: [
        { path: 'systems', component: Systems },
        { path: 'users', component: Users },
        { path: 'roles', component: Roles },
        { path: 'menus', component: Menus },
        { path: 'login-logs', component: LoginLogs },
        { path: 'operation-logs', component: OperationLogs },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (to.path !== '/login' && !getToken()) return '/login';
  return true;
});

export default router;
