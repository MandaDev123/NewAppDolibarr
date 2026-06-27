import { createRouter, createWebHistory } from 'vue-router';

// Layouts
import BackofficeLayout from '../layouts/BackofficeLayout.vue';
import FrontofficeLayout from '../layouts/FrontofficeLayout.vue';

// Frontoffice Pages
import EmployeeList from '../views/frontoffice/EmployeeList.vue';
import SalaryCreate from '../views/frontoffice/SalaryCreate.vue';

// Backoffice Pages
import Login from '../views/backoffice/Login.vue';
import Dashboard from '../views/backoffice/Dashboard.vue';
import Import from '../views/backoffice/Import.vue';
import Reset from '../views/backoffice/Reset.vue';

const routes = [
  {
    path: '/',
    redirect: '/frontoffice/employees'
  },
  {
    path: '/frontoffice',
    component: FrontofficeLayout,
    children: [
      {
        path: '',
        redirect: '/frontoffice/employees'
      },
      {
        path: 'employees',
        name: 'EmployeeList',
        component: EmployeeList
      },
      {
        path: 'salary/create',
        name: 'SalaryCreate',
        component: SalaryCreate
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

// Simple Auth Guard (Mock)
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
