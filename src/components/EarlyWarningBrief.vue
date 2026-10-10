<script setup>
import { MONTHS, useFireStore } from "../stores/fire";

const fire = useFireStore();
</script>

<template>
  <aside v-if="fire.briefOpen" class="brief-panel glass" aria-labelledby="brief-title">
    <h2 id="brief-title">Early-warning brief</h2>
    <p>
      <span class="level-badge" :style="{ backgroundColor: fire.brief.status.color }">
        {{ fire.brief.status.label }}
      </span>
      <span class="mono">{{ fire.area.name }}, {{ MONTHS[fire.month] }} {{ fire.year }}</span>
    </p>
    <p v-if="fire.brief.value > 0">
      Burning is
      <b class="mono">{{ fire.brief.anomaly >= 0 ? "+" : "" }}{{ fire.brief.anomaly.toFixed(1) }}σ</b>
      from the {{ MONTHS[fire.month] }} average, at the {{ fire.brief.percentile }}th percentile of
      {{ MONTHS[fire.month] }} records since 2000 ({{ fire.sensor === "all" ? "harmonized" : fire.sensor.toUpperCase() }} FRP).
    </p>
    <p v-else>No records for this month and sensor.</p>
    <p>
      Critical burning window: <b>{{ fire.brief.peakMonths.join(", ") }}</b>.
      Schedule monitoring, crews and burn permits around it.
    </p>
    <p>
      Most unusual seasons:
      <span v-for="(season, index) in fire.brief.unusualSeasons" :key="season.year">
        <b>{{ season.year }}</b> (×{{ season.ratio.toFixed(1) }} normal)<span v-if="index < fire.brief.unusualSeasons.length - 1">, </span>
      </span>.
    </p>
    <button class="mini-button" type="button" @click="$emit('export')">Export monthly series (CSV)</button>
  </aside>
</template>
