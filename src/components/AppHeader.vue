<script setup>
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useFireStore } from "../stores/fire";

const fire = useFireStore();
const route = useRoute();
const telemetry = computed(() => fire.telemetry);

const links = [
  { name: "map", label: "🛰️ Map & Calendar View" },
  { name: "calibration", label: "📊 Sensor Calibration Engine" },
  { name: "sources", label: "📑 Data Sources & API Docs" },
];
</script>

<template>
  <header class="top glass">
    <RouterLink class="brand" to="/" aria-label="UniFire home">
      <span class="brand-icon" aria-hidden="true">🔥</span>
      <span>UniFire<small>Harmonized burning activity engine</small></span>
    </RouterLink>

    <div class="telemetry" aria-label="Current fire activity">
      <span class="badge">Active sensors <b>{{ telemetry.sensorCount }}</b></span>
      <span class="badge">Total FRP <b>{{ telemetry.frp }}</b></span>
      <span class="badge">Harmonization delta <b>{{ telemetry.delta }}</b></span>
    </div>

    <nav class="tabs" aria-label="Main navigation">
      <RouterLink
        v-for="link in links"
        :key="link.name"
        class="tab"
        :class="{ active: route.name === link.name }"
        :to="{ name: link.name }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </header>
</template>
