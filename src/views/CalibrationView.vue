<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { MONTHS, useFireStore } from "../stores/fire";

Chart.register(CategoryScale, LinearScale, PointElement, LineController, LineElement, BarController, BarElement, Filler, Tooltip, Legend);

const fire = useFireStore();
const timeChartCanvas = ref(null);
const footprintChartCanvas = ref(null);
let timeChart;
let footprintChart;

const timeChartData = computed(() => {
  const modis = [];
  const viirs = [];
  const harmonized = [];
  for (let year = 2000; year <= 2026; year += 1) {
    const records = fire.area.records[year].filter((record) => !record.unavailable);
    modis.push(records.reduce((sum, record) => sum + record.modis, 0) / records.length / 1000);
    viirs.push(
      year >= 2012
        ? records.reduce((sum, record) => sum + record.viirs, 0) / records.length / 1000
        : null,
    );
    harmonized.push(
      records.reduce((sum, record) => sum + fire.harmonized(record, year), 0) / records.length / 1000,
    );
  }
  return { modis, viirs, harmonized };
});

const footprintData = computed(() => {
  const year = fire.area.records[fire.year];
  const modis = [];
  const viirs = [];
  const correctedDifference = [];
  for (const record of year) {
    const harmonized = fire.harmonized(record, fire.year);
    if (record.unavailable || !harmonized) {
      modis.push(null);
      viirs.push(null);
      correctedDifference.push(null);
      continue;
    }
    modis.push(((record.modis - harmonized) / harmonized) * 100);
    viirs.push(fire.year >= 2012 ? ((record.viirs - harmonized) / harmonized) * 100 : null);
    correctedDifference.push(
      fire.year >= 2012
        ? ((record.modis * 1.282 * fire.alpha * fire.timeCorrection -
            record.viirs * 0.893 * fire.beta * fire.timeCorrection) /
            harmonized) *
          100
        : null,
    );
  }
  return { modis, viirs, correctedDifference };
});

const sensorMatrix = computed(() => [
  ["Terra MODIS", "1 km", 10.5],
  ["Aqua MODIS", "1 km", 13.5],
  ["S-NPP VIIRS", "375 m", 13.5],
  ["NOAA-20 VIIRS", "375 m", 13.75],
  ["NOAA-21 VIIRS", "375 m", 13.75],
].map(([name, footprint, localPass]) => {
  const adjustedTime = localPass + fire.timeDelta;
  const hour = Math.floor(((adjustedTime % 24) + 24) % 24);
  const minute = Math.round((adjustedTime - Math.floor(adjustedTime)) * 60);
  const factor = (time) => 0.25 + 0.75 * Math.exp(-((time - 14) ** 2) / 18);
  return {
    name,
    footprint,
    localPass: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    factor: (factor(13.6) / factor(adjustedTime)).toFixed(2),
  };
}));

function updateCharts() {
  if (!timeChart || !footprintChart) return;
  const timeData = timeChartData.value;
  timeChart.data.datasets[0].data = timeData.modis;
  timeChart.data.datasets[1].data = timeData.viirs;
  timeChart.data.datasets[2].data = timeData.harmonized;
  timeChart.update("none");
  const deviation = footprintData.value;
  footprintChart.data.datasets[0].data = deviation.modis;
  footprintChart.data.datasets[1].data = deviation.viirs;
  footprintChart.data.datasets[2].data = deviation.correctedDifference;
  footprintChart.update("none");
}

const sharedOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: "index", intersect: false },
  plugins: { legend: { labels: { boxWidth: 12 } } },
};

onMounted(() => {
  timeChart = new Chart(timeChartCanvas.value, {
    type: "line",
    data: {
      labels: Array.from({ length: 27 }, (_, index) => 2000 + index),
      datasets: [
        { label: "MODIS raw", borderColor: "#ff9900", backgroundColor: "#ff9900", borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, tension: 0.25, data: timeChartData.value.modis },
        { label: "VIIRS raw", borderColor: "#00f0ff", backgroundColor: "#00f0ff", borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, tension: 0.25, data: timeChartData.value.viirs },
        { label: "Harmonized baseline", borderColor: "#ff5500", backgroundColor: "rgba(255,85,0,.16)", fill: true, borderWidth: 3, pointRadius: 0, tension: 0.25, data: timeChartData.value.harmonized },
      ],
    },
    options: {
      ...sharedOptions,
      scales: {
        y: { title: { display: true, text: "Mean monthly FRP (GW)" }, beginAtZero: true },
        x: { ticks: { maxTicksLimit: 9 } },
      },
    },
  });
  footprintChart = new Chart(footprintChartCanvas.value, {
    type: "bar",
    data: {
      labels: MONTHS,
      datasets: [
        { label: "MODIS raw vs H (%)", backgroundColor: "#ff9900", data: footprintData.value.modis },
        { label: "VIIRS raw vs H (%)", backgroundColor: "#00f0ff", data: footprintData.value.viirs },
        { type: "line", label: "Calibrated MODIS minus VIIRS (% of H)", borderColor: "#d32f2f", backgroundColor: "#d32f2f", borderWidth: 2.5, pointRadius: 3, data: footprintData.value.correctedDifference },
      ],
    },
    options: {
      ...sharedOptions,
      scales: { y: { title: { display: true, text: "Deviation from harmonized (%)" } } },
    },
  });
});

watch(
  () => [fire.selectedArea, fire.year, fire.alpha, fire.beta, fire.timeDelta],
  updateCharts,
);

onBeforeUnmount(() => {
  timeChart?.destroy();
  footprintChart?.destroy();
});
</script>

<template>
  <main class="content-page">
    <section class="page-intro">
      <h1>Sensor Calibration Engine</h1>
      <p>
        MODIS (1 km) and VIIRS (375 m) see the same fires differently: the coarse pixel misses small
        fires, the fine pixel reports lower FRP per pixel, and each satellite crosses at a different
        local time. Adjust the factors and watch the harmonized baseline respond for
        <strong>{{ fire.area.name }}</strong>.
      </p>
    </section>

    <div class="calibration-layout">
      <div>
        <section class="card">
          <h2>FRP over time: raw sensors vs harmonized baseline</h2>
          <div class="chart-container"><canvas ref="timeChartCanvas" /></div>
        </section>
        <section class="card">
          <h2>Footprint discrepancy by month ({{ fire.area.name }}, {{ fire.year }})</h2>
          <div class="chart-container"><canvas ref="footprintChartCanvas" /></div>
        </section>
      </div>
      <div>
        <section class="card">
          <h2>Live formula adjuster</h2>
          <label class="slider-control" for="alpha">
            <span>Alpha: footprint scaling (α) <b class="mono">{{ fire.alpha.toFixed(2) }}</b></span>
            <input id="alpha" :value="fire.alpha" type="range" min="0.5" max="1.5" step="0.01" @input="fire.setCalibration('alpha', $event.target.value)" />
          </label>
          <label class="slider-control" for="beta">
            <span>Beta: detection sensitivity (β) <b class="mono">{{ fire.beta.toFixed(2) }}</b></span>
            <input id="beta" :value="fire.beta" type="range" min="0.5" max="1.5" step="0.01" @input="fire.setCalibration('beta', $event.target.value)" />
          </label>
          <label class="slider-control" for="delta-time">
            <span>Overpass time delta (Δt, hours) <b class="mono">{{ fire.timeDelta.toFixed(2) }} h</b></span>
            <input id="delta-time" :value="fire.timeDelta" type="range" min="-3" max="3" step="0.25" @input="fire.setCalibration('timeDelta', $event.target.value)" />
          </label>
          <div class="formula">
            H = [ w·M·cM·α + (1−w)·V·cV·β ] · k(Δt)<br />
            w = 0.4 (MODIS weight), cM = 1.28, cV = 0.89<br />
            k(Δt) = D(13.6h) / D(13.6h + Δt)<br />
            Before 2012 only MODIS exists, so H = M·cM·α·k.
          </div>
        </section>
        <section class="card">
          <h2>Overpass offset matrix</h2>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Sensor</th><th>Footprint</th><th>Local pass</th><th>Diurnal factor</th></tr></thead>
              <tbody>
                <tr v-for="sensor in sensorMatrix" :key="sensor.name">
                  <td>{{ sensor.name }}</td><td>{{ sensor.footprint }}</td>
                  <td class="mono">{{ sensor.localPass }}</td><td class="numeric">×{{ sensor.factor }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="muted">Factor rescales each sensor's FRP to a common 13:36 afternoon reference using a modeled diurnal fire cycle.</p>
        </section>
      </div>
    </div>
  </main>
</template>
