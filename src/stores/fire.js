import { defineStore } from "pinia";

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const AOIS = {
  amazon: {
    name: "Amazon Basin",
    center: [-8, -62],
    zoom: 5,
    bounds: [-16, -72, 2, -50],
    scale: 230000,
    trend: -0.004,
    seasonality: [0.15, 0.1, 0.08, 0.1, 0.15, 0.3, 0.55, 1, 1.15, 0.9, 0.35, 0.2],
    anomalies: { 2005: 1.7, 2007: 1.4, 2010: 1.9, 2015: 1.5, 2019: 1.5, 2020: 1.35, 2024: 2 },
  },
  africa: {
    name: "Sub-Saharan Africa",
    center: [-4, 24],
    zoom: 4,
    bounds: [-20, -8, 12, 40],
    scale: 320000,
    trend: 0,
    seasonality: [0.8, 0.6, 0.4, 0.3, 0.3, 0.6, 0.95, 1, 0.85, 0.55, 0.6, 0.85],
    anomalies: { 2003: 1.2, 2010: 1.25, 2016: 1.3, 2021: 0.8 },
  },
  wna: {
    name: "Western North America",
    center: [44, -117],
    zoom: 5,
    bounds: [32, -125, 52, -104],
    scale: 90000,
    trend: 0.012,
    seasonality: [0.02, 0.02, 0.03, 0.05, 0.08, 0.2, 0.65, 1, 0.8, 0.35, 0.08, 0.03],
    anomalies: { 2002: 1.4, 2008: 1.3, 2012: 1.5, 2015: 1.7, 2017: 1.6, 2018: 1.9, 2020: 2.4, 2021: 2.1, 2022: 1.2 },
  },
  seaus: {
    name: "Southeast Australia",
    center: [-36.5, 147],
    zoom: 6,
    bounds: [-39, 140, -33, 153],
    scale: 38000,
    trend: 0,
    seasonality: [0.9, 0.7, 0.35, 0.1, 0.05, 0.03, 0.02, 0.04, 0.06, 0.15, 0.35, 0.7],
    anomalies: { 2003: 1.8, 2006: 1.6, 2009: 2.6, 2013: 1.5, 2019: 2, 2020: 3.2 },
  },
  siberia: {
    name: "Boreal Siberia",
    center: [62, 105],
    zoom: 3,
    bounds: [52, 80, 70, 140],
    scale: 120000,
    trend: 0.004,
    seasonality: [0, 0, 0.02, 0.12, 0.45, 0.7, 1, 0.85, 0.3, 0.04, 0, 0],
    anomalies: { 2003: 2, 2012: 1.6, 2015: 1.5, 2019: 2.4, 2020: 1.9, 2021: 2.6, 2022: 1.1 },
  },
};

function average(values) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function seededRandom(seed) {
  let value = seed | 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function gaussian(random) {
  return Math.sqrt(-2 * Math.log(random() + 1e-9)) * Math.cos(6.2831853 * random());
}

export function generateEvents(area, areaKey, record, year, month) {
  if (record.unavailable) return [];
  const random = seededRandom(hash(`${areaKey}${year}-${month}`));
  const hubRandom = seededRandom(hash(`${areaKey}hubs`));
  const [south, west, north, east] = area.bounds;
  const hubs = Array.from({ length: 7 }, (_, index) => ({
    latitude: south + (north - south) * (0.12 + 0.76 * hubRandom()),
    longitude: west + (east - west) * (0.12 + 0.76 * hubRandom()),
    spread: 0.05 + 0.07 * hubRandom(),
    weight: 0.3 + 0.7 * Math.abs(Math.sin(month * 0.7 + index * 1.9)),
  }));
  const totalWeight = hubs.reduce((total, hub) => total + hub.weight, 0);
  const count = Math.round(30 + 280 * Math.min(1, record.total / (area.scale * 1.6)));

  return Array.from({ length: count }, () => {
    let weight = random() * totalWeight;
    let hub = hubs[0];
    for (const candidate of hubs) {
      weight -= candidate.weight;
      if (weight <= 0) {
        hub = candidate;
        break;
      }
    }
    return {
      latitude: Math.min(north, Math.max(south, hub.latitude + gaussian(random) * (north - south) * hub.spread)),
      longitude: Math.min(east, Math.max(west, hub.longitude + gaussian(random) * (east - west) * hub.spread)),
      frp: 3.5 * Math.exp(0.9 * gaussian(random)),
      variation: random(),
    };
  });
}

function generateRecords(key, area) {
  const random = seededRandom(hash(key + (area.seed || "")));
  const peak = Math.max(...area.seasonality);
  area.records = {};

  for (let year = 2000; year <= 2026; year += 1) {
    const yearFactor =
      (area.anomalies[year] || 1) *
      Math.exp(0.18 * gaussian(random)) *
      (1 + area.trend * (year - 2000));
    area.records[year] = [];

    for (let month = 0; month < 12; month += 1) {
      if (year === 2026 && month >= 9) {
        area.records[year].push({ unavailable: true, total: 0, modis: 0, viirs: 0, modisCount: 0, viirsCount: 0 });
        continue;
      }

      const seasonFactor = 1 - area.seasonality[month] / peak;
      const total = area.scale * (area.seasonality[month] + 0.03) * yearFactor * Math.exp(0.12 * gaussian(random));
      const modis = total * (0.86 - 0.2 * seasonFactor) * (1 + 0.04 * gaussian(random));
      const viirs =
        year >= 2012
          ? total * (1.04 + 0.12 * seasonFactor) * (1 + 0.04 * gaussian(random))
          : 0;

      area.records[year].push({
        total,
        modis,
        viirs,
        modisCount: Math.round(modis / 42),
        viirsCount: Math.round(viirs / 11),
      });
    }
  }
}

Object.entries(AOIS).forEach(([key, area]) => generateRecords(key, area));

function diurnalFactor(hour) {
  return 0.25 + 0.75 * Math.exp(-((hour - 14) ** 2) / 18);
}

export function formatFrp(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} GW` : `${Math.round(value)} MW`;
}

export const useFireStore = defineStore("fire", {
  state: () => ({
    areas: AOIS,
    selectedArea: "amazon",
    sensor: "all",
    year: 2024,
    month: 7,
    previewMonth: null,
    alpha: 1,
    beta: 1,
    timeDelta: 0,
    isPlaying: false,
    calendarExpanded: false,
    briefOpen: false,
  }),
  getters: {
    area: (state) => state.areas[state.selectedArea],
    displayedMonth: (state) => state.previewMonth ?? state.month,
    currentRecord() {
      return this.area.records[this.year][this.displayedMonth];
    },
    timeCorrection: (state) =>
      diurnalFactor(13.6) / diurnalFactor(13.6 + state.timeDelta),
    harmonized: (state) => (record, year) => {
      if (record.unavailable) return 0;
      const correction = diurnalFactor(13.6) / diurnalFactor(13.6 + state.timeDelta);
      return year < 2012
        ? record.modis * 1.282 * state.alpha * correction
        : (0.4 * record.modis * 1.282 * state.alpha +
            0.6 * record.viirs * 0.893 * state.beta) *
            correction;
    },
    valueForSensor() {
      return (record, year, sensor = this.sensor) =>
        sensor === "modis"
          ? record.modis
          : sensor === "viirs"
            ? record.viirs
            : this.harmonized(record, year);
    },
    telemetry() {
      const record = this.currentRecord;
      const sensorCount =
        (this.sensor !== "viirs" ? 1 + (this.year >= 2002 ? 1 : 0) : 0) +
        (this.sensor !== "modis"
          ? Number(this.year >= 2012) + Number(this.year >= 2018) + Number(this.year >= 2023)
          : 0);
      const raw = this.year >= 2012 ? (record.modis + record.viirs) / 2 : record.modis;
      const delta = record.unavailable
        ? 0
        : ((this.harmonized(record, this.year) - raw) / raw) * 100;
      return {
        sensorCount,
        frp: record.unavailable ? "n/a" : formatFrp(this.valueForSensor(record, this.year)),
        delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
      };
    },
    monthlyAverages() {
      return Array.from({ length: 12 }, (_, month) => {
        const values = [];
        for (let year = 2000; year <= 2026; year += 1) {
          const record = this.area.records[year][month];
          const value = this.valueForSensor(record, year);
          if (value > 0) values.push(value);
        }
        return average(values);
      });
    },
    annualSeries() {
      return Array.from({ length: 27 }, (_, index) => {
        const year = 2000 + index;
        const records = this.area.records[year].filter((record) => !record.unavailable);
        return average(records.map((record) => this.valueForSensor(record, year)));
      });
    },
    brief() {
      const monthly = this.monthlyAverages.map((mean, month) => {
        const values = [];
        for (let year = 2000; year <= 2026; year += 1) {
          const record = this.area.records[year][month];
          const value = this.valueForSensor(record, year);
          if (value > 0) values.push(value);
        }
        const deviation = Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
        return { mean, deviation, values };
      });
      const peakMonths = monthly
        .map((item, month) => [item.mean, month])
        .sort((first, second) => second[0] - first[0])
        .slice(0, 3)
        .map(([, month]) => month)
        .sort((first, second) => first - second);
      const item = monthly[this.month];
      const value = this.valueForSensor(this.area.records[this.year][this.month], this.year);
      const anomaly = value > 0 && item.deviation ? (value - item.mean) / item.deviation : 0;
      const percentile = item.values.length && value > 0
        ? Math.round((item.values.filter((entry) => entry <= value).length / item.values.length) * 100)
        : 0;
      const seasons = [];
      for (let year = 2000; year <= 2026; year += 1) {
        const ratios = this.area.records[year]
          .map((record, month) => {
            const recordValue = this.valueForSensor(record, year);
            return recordValue > 0 && monthly[month].mean
              ? recordValue / monthly[month].mean
              : null;
          })
          .filter((ratio) => ratio !== null);
        if (ratios.length) seasons.push({ year, ratio: average(ratios) });
      }
      seasons.sort((first, second) => second.ratio - first.ratio);

      return {
        anomaly,
        percentile,
        value,
        peakMonths: peakMonths.map((month) => MONTHS[month]),
        unusualSeasons: seasons.slice(0, 3),
        status: value <= 0
          ? { label: "No data", color: "#4a5064" }
          : anomaly >= 2
            ? { label: "Extreme", color: "#d32f2f" }
            : anomaly >= 1
              ? { label: "Elevated", color: "#ff5500" }
              : anomaly <= -1
                ? { label: "Below normal", color: "#2e9e5b" }
                : { label: "Normal", color: "#c9a82a" },
      };
    },
  },
  actions: {
    setArea(key) {
      if (this.areas[key]) this.selectedArea = key;
    },
    addCustomArea({ center, zoom, bounds, seed }) {
      let closest = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const [key, area] of Object.entries(this.areas)) {
        if (key === "custom") continue;
        const distance = Math.hypot(area.center[0] - center[0], area.center[1] - center[1]);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = area;
        }
      }
      const areaRatio = Math.min(
        2,
        Math.max(
          0.05,
          ((bounds[2] - bounds[0]) * (bounds[3] - bounds[1])) /
            ((closest.bounds[2] - closest.bounds[0]) * (closest.bounds[3] - closest.bounds[1])),
        ),
      );
      this.areas.custom = {
        name: "Custom area (map view)",
        center,
        zoom,
        bounds,
        scale: closest.scale * areaRatio,
        trend: closest.trend,
        seasonality: closest.seasonality,
        anomalies: closest.anomalies,
        seed,
      };
      generateRecords("custom", this.areas.custom);
      this.selectedArea = "custom";
    },
    selectMonth(month) {
      this.month = month;
      this.previewMonth = null;
    },
    setYear(year) {
      this.year = Number(year);
    },
    setMonth(month) {
      this.month = Number(month);
      this.previewMonth = null;
    },
    setSensor(sensor) {
      this.sensor = sensor;
    },
    setCalibration(key, value) {
      this[key] = Number(value);
    },
    togglePlayback() {
      this.isPlaying = !this.isPlaying;
    },
    advancePlayback() {
      this.previewMonth = null;
      this.month += 1;
      if (this.month > 11) {
        this.month = 0;
        this.year = this.year >= 2026 ? 2000 : this.year + 1;
      }
    },
  },
});
