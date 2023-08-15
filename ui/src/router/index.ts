// Composables
import { RouteRecordRaw, createRouter, createWebHistory } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("@/layouts/default/Default.vue"),
    children: [
      {
        path: "",
        name: "Home",
        component: () => import("@/views/Home.vue"),
      },
      {
        path: "/lights",
        name: "Lights",
        component: () => import("@/views/Lights.vue"),
        meta: {
          fixedHeight: true,
        },
      },
      {
        path: "/entertainment",
        name: "Entertainment",
        component: () => import("@/views/Entertainment.vue"),
      },
      {
        path: "/irrigation",
        name: "Irrigation",
        component: () => import("@/views/Irrigation.vue"),
      },
      {
        path: "/settings",
        name: "Settings",
        component: () => import("@/views/Settings.vue"),
      },
    ],
  },
  {
    path: "/redirect/:host",
    component: () => {},
    beforeEnter: (to) => {
      window.location.href = "https://" + to.params.host + ".viselaya.org";
    },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

export default router;
