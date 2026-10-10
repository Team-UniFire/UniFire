import { createRouter, createWebHistory } from "vue-router";
import MapView from "../views/MapView.vue";
import CalibrationView from "../views/CalibrationView.vue";
import SourcesView from "../views/SourcesView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "map", component: MapView },
    { path: "/calibration", name: "calibration", component: CalibrationView },
    { path: "/sources", name: "sources", component: SourcesView },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
