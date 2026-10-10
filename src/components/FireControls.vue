<script setup>
import { MONTHS, useFireStore } from "../stores/fire";

const fire = useFireStore();
const sensors = [
  { id: "all", name: "All / Harmonized", detail: "MODIS + VIIRS" },
  { id: "modis", name: "MODIS", detail: "1 km" },
  { id: "viirs", name: "VIIRS", detail: "375 m" },
];

function selectSensor(sensor) {
  fire.setSensor(sensor);
}
</script>

<template>
  <aside class="controls glass">
    <label for="area-select">Area of interest</label>
    <select id="area-select" :value="fire.selectedArea" @change="fire.setArea($event.target.value)">
      <option v-for="(area, key) in fire.areas" :key="key" :value="key">{{ area.name }}</option>
    </select>

    <div class="sensor-options" role="group" aria-label="Fire sensor">
      <button
        v-for="sensor in sensors"
        :key="sensor.id"
        type="button"
        class="sensor-option"
        :class="[`sensor-${sensor.id}`, { selected: fire.sensor === sensor.id }]"
        :aria-pressed="fire.sensor === sensor.id"
        @click="selectSensor(sensor.id)"
      >
        <span>{{ sensor.name }}</span><small>{{ sensor.detail }}</small>
      </button>
    </div>

    <div class="detection-count">
      <strong class="mono">{{ (fire.sensor === "all" ? fire.currentRecord.modisCount + fire.currentRecord.viirsCount : fire.sensor === "modis" ? fire.currentRecord.modisCount : fire.currentRecord.viirsCount).toLocaleString() }}</strong>
      <span>{{ MONTHS[fire.displayedMonth] }} {{ fire.year }} detections</span>
    </div>
    <p class="sub mono">
      MODIS {{ fire.currentRecord.modisCount.toLocaleString() }}
      · VIIRS {{ fire.currentRecord.viirsCount.toLocaleString() }}
    </p>
    <p v-if="fire.currentRecord.unavailable" class="notice">
      No records yet: the 2026 season is still in progress.
    </p>
    <p v-else-if="fire.year < 2012 && fire.sensor === 'viirs'" class="notice">
      VIIRS launched in late 2011, so no VIIRS records exist before 2012.
    </p>
    <p v-else-if="fire.year < 2012 && fire.sensor === 'all'" class="notice">
      Before 2012 the baseline is MODIS only.
    </p>

    <button class="mini-button" type="button" @click="fire.briefOpen = !fire.briefOpen">
      {{ fire.briefOpen ? "Close" : "Early-warning brief" }}
    </button>
    <slot />
  </aside>
</template>
