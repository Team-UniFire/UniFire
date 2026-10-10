<script setup>
import { computed } from "vue";
import { MONTHS, useFireStore } from "../stores/fire";

const fire = useFireStore();
const years = Array.from({ length: 27 }, (_, index) => 2000 + index);
const maximum = computed(() => Math.max(...fire.annualSeries, 1));

function barStyle(value) {
  return {
    height: `${Math.max(2, (value / maximum.value) * 26)}px`,
    background: value > 0 ? "#ff5500" : "#34394a",
  };
}

function colorForRatio(ratio) {
  if (ratio < 0.8) return "#2e9e5b";
  if (ratio < 1.2) return "#c9a82a";
  if (ratio < 1.6) return "#ff5500";
  return "#d32f2f";
}

function calendarCell(month) {
  const value = fire.valueForSensor(fire.area.records[fire.year][month], fire.year);
  const average = fire.monthlyAverages[month];
  return {
    value,
    average,
    background: value > 0 && average > 0 ? `${colorForRatio(value / average)}cc` : "#262a38",
  };
}
</script>

<template>
  <section class="timeline glass" :class="{ expanded: fire.calendarExpanded }" aria-label="Timeline and seasonal calendar">
    <div class="timeline-row">
      <button
        class="play-button"
        type="button"
        :aria-label="fire.isPlaying ? 'Pause time-lapse' : 'Play time-lapse'"
        @click="fire.togglePlayback()"
      >
        {{ fire.isPlaying ? "Ⅱ" : "▶" }}
      </button>
      <div class="year-control">
        <div class="year-bars" aria-label="Annual fire activity">
          <button
            v-for="(value, index) in fire.annualSeries"
            :key="years[index]"
            type="button"
            class="year-bar"
            :class="{ selected: fire.year === years[index] }"
            :style="barStyle(value)"
            :aria-label="`Select ${years[index]}`"
            :title="`${years[index]} · ${Math.round(value).toLocaleString()} MW average`"
            @click="fire.setYear(years[index])"
          />
        </div>
        <input
          v-model.number="fire.year"
          type="range"
          min="2000"
          max="2026"
          aria-label="Year"
        />
      </div>
      <output class="selected-year mono">{{ fire.year }}</output>
      <label class="month-control">
        <span>Month <b class="mono">{{ MONTHS[fire.month] }}</b></span>
        <input
          :value="fire.month"
          type="range"
          min="0"
          max="11"
          aria-label="Month"
          @input="fire.setMonth($event.target.value)"
        />
      </label>
    </div>

    <div class="calendar-heading">
      <strong>Seasonal calendar</strong>
      <div class="legend" aria-label="Activity compared with monthly average">
        <span><i class="legend-below" />Below average</span>
        <span><i class="legend-normal" />Normal</span>
        <span><i class="legend-peak" />Peak</span>
        <span><i class="legend-anomaly" />Anomaly</span>
      </div>
      <button
        class="calendar-toggle"
        type="button"
        :aria-expanded="fire.calendarExpanded"
        @click="fire.calendarExpanded = !fire.calendarExpanded"
      >
        {{ fire.calendarExpanded ? "Collapse" : "Expand" }}
      </button>
    </div>

    <div class="calendar-grid">
      <button
        v-for="(name, month) in MONTHS"
        :key="name"
        type="button"
        class="calendar-cell"
        :class="{ selected: month === fire.month, preview: month === fire.previewMonth }"
        :style="{ background: calendarCell(month).background }"
        :title="`${name} ${fire.year}: ${calendarCell(month).value > 0 ? `${Math.round(calendarCell(month).value).toLocaleString()} MW (${((calendarCell(month).value / calendarCell(month).average) * 100).toFixed(0)}% of average)` : 'no data'}`"
        @click="fire.selectMonth(month)"
        @mouseenter="fire.previewMonth = month"
        @mouseleave="fire.previewMonth = null"
      >
        <small>{{ name }}</small>
        <em>{{ calendarCell(month).value > 0 ? (calendarCell(month).value / 1000).toFixed(1) : "n/a" }}</em>
      </button>
    </div>
    <p class="attribution">Map © OpenStreetMap contributors © CARTO. Fire data in this prototype is synthetic.</p>
  </section>
</template>
