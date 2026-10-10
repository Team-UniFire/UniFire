<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { useFireStore } from "../stores/fire";
import FireControls from "../components/FireControls.vue";
import MapCanvas from "../components/MapCanvas.vue";
import TimelineDock from "../components/TimelineDock.vue";
import EarlyWarningBrief from "../components/EarlyWarningBrief.vue";

const fire = useFireStore();
const mapCanvas = ref(null);
let playbackTimer;

watch(
  () => fire.isPlaying,
  (playing) => {
    window.clearInterval(playbackTimer);
    if (playing) playbackTimer = window.setInterval(fire.advancePlayback, 900);
  },
);

function exportCsv() {
  const rows = ["aoi,year,month,modis_frp_mw,viirs_frp_mw,harmonized_frp_mw"];
  for (let year = 2000; year <= 2026; year += 1) {
    fire.area.records[year].forEach((record, month) => {
      if (!record.unavailable) {
        rows.push(
          `"${fire.area.name.replaceAll('"', '""')}",${year},${month + 1},${record.modis.toFixed(0)},${record.viirs.toFixed(0)},${fire.harmonized(record, year).toFixed(0)}`,
        );
      }
    });
  }
  const objectUrl = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `unifire-${fire.selectedArea}.csv`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function setCustomArea() {
  mapCanvas.value?.useCurrentBounds();
}

onBeforeUnmount(() => {
  fire.isPlaying = false;
  window.clearInterval(playbackTimer);
});
</script>

<template>
  <main class="map-page">
    <MapCanvas ref="mapCanvas" />
    <FireControls>
      <button class="mini-button" type="button" @click="setCustomArea">
        Use current map view as custom AOI
      </button>
    </FireControls>
    <EarlyWarningBrief @export="exportCsv" />
    <TimelineDock />
  </main>
</template>
