<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import "leaflet.heat";
import { generateEvents, useFireStore } from "../stores/fire";

const fire = useFireStore();
const mapElement = ref(null);
const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
let map;
let heatLayer;
let detections;
let glowLayer;

function drawDetections() {
  if (!map) return;
  const area = fire.area;
  const record = fire.currentRecord;
  const month = fire.displayedMonth;
  const events = generateEvents(area, fire.selectedArea, record, fire.year, month);
  const points = [];
  detections.clearLayers();
  glowLayer.clearLayers();

  for (const event of events) {
    let point = null;
    if (fire.sensor === "all") {
      const harmonized = fire.harmonized(record, fire.year);
      point = { ...event, value: (event.frp * harmonized) / record.total, type: "harmonized" };
    } else if (fire.sensor === "modis") {
      if (event.variation < Math.min(1, event.frp / 12)) {
        point = {
          ...event,
          latitude: Math.round(event.latitude / 0.01) * 0.01,
          longitude: Math.round(event.longitude / 0.01) * 0.01,
          value: (event.frp * 1.3 * record.modis) / record.total,
          type: "modis",
        };
      }
    } else if (fire.year >= 2012) {
      point = {
        ...event,
        latitude: event.latitude + (event.variation - 0.5) * 0.006,
        longitude: event.longitude + (event.variation - 0.5) * 0.006,
        value: (event.frp * 0.9 * record.viirs) / record.total,
        type: "viirs",
      };
    }
    if (!point) continue;

    const color = `hsl(${Math.max(2, 42 - point.value * 1.8)}, 100%, 52%)`;
    const label = { harmonized: "Harmonized", modis: "MODIS 1 km", viirs: "VIIRS 375 m" }[point.type];
    points.push([point.latitude, point.longitude, Math.min(1, point.value / 20)]);

    if (point.type === "harmonized") {
      L.circleMarker([point.latitude, point.longitude], {
        radius: 6 + point.value * 0.7,
        stroke: false,
        fillColor: color,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(glowLayer);
    }

    const style =
      point.type === "modis"
        ? { radius: 7, color: "#ff9900", weight: 1.5, fillColor: color, fillOpacity: 0.3 }
        : point.type === "viirs"
          ? { radius: 3, color: "#00f0ff", weight: 1, fillColor: color, fillOpacity: 0.85 }
          : { radius: 2.5 + point.value * 0.15, stroke: false, fillColor: color, fillOpacity: 0.95 };

    L.circleMarker([point.latitude, point.longitude], style)
      .bindTooltip(
        `<b>${point.value.toFixed(1)} MW</b> ${label}<br><span class="mono">${point.latitude.toFixed(2)}, ${point.longitude.toFixed(2)}</span>`,
      )
      .addTo(detections);
  }

  heatLayer.setOptions(
    fire.sensor === "modis"
      ? { radius: 28, blur: 22 }
      : fire.sensor === "viirs"
        ? { radius: 12, blur: 10 }
        : { radius: 20, blur: 18 },
  );
  heatLayer.setLatLngs(points);
}

function useCurrentBounds() {
  const bounds = map.getBounds();
  const center = bounds.getCenter();
  fire.addCustomArea({
    center: [center.lat, center.lng],
    zoom: map.getZoom(),
    bounds: [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()],
    seed: bounds.toBBoxString(),
  });
}

defineExpose({ useCurrentBounds });

onMounted(() => {
  map = L.map(mapElement.value, {
    center: fire.area.center,
    zoom: fire.area.zoom,
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true,
  });
  L.control.zoom({ position: "topright" }).addTo(map);
  const tileUrl =
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" +
    (cartoApiKey ? `?key=${encodeURIComponent(cartoApiKey)}` : "");
  L.tileLayer(tileUrl, {
    subdomains: "abcd",
    maxZoom: 12,
    minZoom: 2,
    attribution: "© OpenStreetMap contributors © CARTO",
  }).addTo(map);
  heatLayer = L.heatLayer([], {
    radius: 20,
    blur: 18,
    maxZoom: 8,
    gradient: { 0.25: "#5a0a0a", 0.5: "#d32f2f", 0.75: "#ff5500", 1: "#ff9900" },
  }).addTo(map);
  detections = L.layerGroup().addTo(map);
  glowLayer = L.layerGroup().addTo(map);
  drawDetections();
});

watch(
  () => fire.selectedArea,
  () => {
    if (map) map.setView(fire.area.center, fire.area.zoom);
  },
);

watch(
  () => [fire.sensor, fire.year, fire.displayedMonth, fire.alpha, fire.beta, fire.timeDelta],
  drawDetections,
);

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<template>
  <div ref="mapElement" class="map-canvas" role="img" aria-label="Map of synthetic fire detections" />
</template>
