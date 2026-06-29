import { createRouter, createWebHistory } from 'vue-router';

// Layouts
import BackofficeLayout from '../layouts/BackofficeLayout.vue';
import FrontofficeLayout from '../layouts/FrontofficeLayout.vue';

// Frontoffice Pages
import SalaryList   from '../views/frontoffice/SalaryList.vue';
import SalaryCreate from '../views/frontoffice/SalaryCreate.vue';
import SalaryDetail from '../views/frontoffice/SalaryDetail.vue';

// Backoffice Pages
import Login     from '../views/backoffice/Login.vue';
import Dashboard from '../views/backoffice/Dashboard.vue';
import Import    from '../views/backoffice/Import.vue';
import Reset     from '../views/backoffice/Reset.vue';

const routes = [
  {
    path: '/',
    redirect: '/frontoffice/salary'
  },
  {
    path: '/frontoffice',
    component: FrontofficeLayout,
    children: [
      {
        path: '',
        redirect: '/frontoffice/salary'
      },
      {
        path: 'salary',
        name: 'SalaryList',
        component: SalaryList
      },
      {
        path: 'salary/create',
        name: 'SalaryCreate',
        component: SalaryCreate
      },
      {
        path: 'salary/:id',
        name: 'SalaryDetail',
        component: SalaryDetail,
        props: true
      }
    ]
  },
  {
    path: '/backoffice/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/backoffice',
    component: BackofficeLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/backoffice/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'import',
        name: 'Import',
        component: Import
      },
      {
        path: 'reset',
        name: 'Reset',
        component: Reset
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Simple Auth Guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isBackofficeAuthenticated') === 'true';

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;