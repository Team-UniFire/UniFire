<template>
  <main class="content-page sources-page">
    <section class="page-intro">
      <h1>Solution &amp; data sources</h1>
      <p>How UniFire combines satellite fire observations into a usable seasonal activity baseline.</p>
    </section>

    <section class="card">
      <h2>What UniFire provides</h2>
      <p>
        Satellite fire records are split between MODIS (1 km, since 2000) and VIIRS (375 m, since
        2012). Their counts and FRP values cannot be compared directly, so managers cannot tell
        whether a season is unusual. UniFire harmonizes both into one FRP baseline for an area of
        interest and turns it into a burning activity calendar.
      </p>
      <ol>
        <li><b>Harmonized baseline:</b> footprint scaling (α), detection sensitivity (β) and overpass-time correction (Δt) bring both sensors onto one scale.</li>
        <li><b>Burning activity calendar:</b> a 12-month grid per area, colored against that month's 2000–2026 average, plus an annual anomaly timeline and time-lapse.</li>
        <li><b>Early-warning brief:</b> flags unusual conditions (σ from normal), names the critical burning window and the most unusual seasons.</li>
        <li><b>Any area of interest:</b> five preset regions, or any map view as a custom area. Export the series as CSV for GIS or reports.</li>
      </ol>
      <p><b>Users:</b> emergency responders and early-warning teams, land managers, and scientists.</p>
    </section>

    <p class="page-lead">Data sources intended for the production pipeline. All are free to access.</p>
    <div class="source-grid">
      <section class="card">
        <span class="tag">Active fire</span>
        <h2>NASA FIRMS API</h2>
        <p>Hotspots from MODIS Collection 6.1 (1 km) and VIIRS 375 m. Near-real-time and standard-processing archives are available.</p>
        <pre>https://firms.modaps.eosdis.nasa.gov/api/area/csv/
  MAP_KEY/VIIRS_SNPP_NRT/-74,-18,-48,5/1</pre>
        <p>Sources include <code>MODIS_NRT</code>, <code>MODIS_SP</code>, <code>VIIRS_SNPP_NRT</code>, <code>VIIRS_SNPP_SP</code>, and <code>VIIRS_NOAA20_NRT</code>. Area order is west, south, east, north; the final value is days of data.</p>
      </section>
      <section class="card">
        <span class="tag">Imagery</span>
        <h2>NASA GIBS WMTS</h2>
        <p>Daily satellite imagery tiles can be placed behind hotspots. No key is needed.</p>
        <pre>https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/
  MODIS_Terra_CorrectedReflectance_TrueColor/
  default/{time}/GoogleMapsCompatible_Level9/
  {z}/{y}/{x}.jpg</pre>
        <p>Add the layer as a <code>L.tileLayer</code> and set <code>{time}</code> to the scrubber date (YYYY-MM-DD).</p>
      </section>
      <section class="card">
        <span class="tag">Emissions</span>
        <h2>Copernicus GFAS</h2>
        <p>Gridded fire emissions derived from assimilated FRP from the Copernicus Atmosphere Monitoring Service; useful as an independent check on the harmonized baseline.</p>
        <p>Dataset: <em>CAMS global biomass burning emissions based on fire radiative power (GFAS)</em>, served by the Atmosphere Data Store.</p>
      </section>
    </div>

    <div class="source-grid">
      <section class="card">
        <h2>Get a FIRMS MAP_KEY (free)</h2>
        <ol>
          <li>Open <a href="https://firms.modaps.eosdis.nasa.gov/api/map_key/" target="_blank" rel="noopener noreferrer">firms.modaps.eosdis.nasa.gov/api/map_key</a>.</li>
          <li>Enter your email address and submit the form.</li>
          <li>Copy the key from the email into your requests in place of <code>MAP_KEY</code>.</li>
          <li>Keep requests under the limit of 5,000 transactions per 10 minutes.</li>
        </ol>
      </section>
      <section class="card">
        <h2>Get a NASA Earthdata token (free)</h2>
        <ol>
          <li>Register at <a href="https://urs.earthdata.nasa.gov" target="_blank" rel="noopener noreferrer">urs.earthdata.nasa.gov</a> and confirm your email.</li>
          <li>Sign in and open <b>Generate Token</b>.</li>
          <li>Create a token and send it in an <code>Authorization</code> header.</li>
          <li>Use it for LAADS DAAC archive downloads such as MCD14ML.</li>
        </ol>
      </section>
      <section class="card">
        <h2>Get a Copernicus ADS key (free)</h2>
        <ol>
          <li>Create an account at <a href="https://ads.atmosphere.copernicus.eu" target="_blank" rel="noopener noreferrer">ads.atmosphere.copernicus.eu</a>.</li>
          <li>Accept the GFAS licence on the dataset page.</li>
          <li>Copy your API key from your profile page.</li>
          <li>Use it with the <code>cdsapi</code> client.</li>
        </ol>
      </section>
    </div>

    <section class="card">
      <h2>Method and prototype status</h2>
      <p><b>This prototype runs on synthetic records</b> so it works without API keys; its figures are illustrative, not measurements. A production pipeline would:</p>
      <ol>
        <li>Fetch MODIS C6.1 and VIIRS (S-NPP, NOAA-20, NOAA-21) hotspots from FIRMS for the area, archives (SP) and near-real-time (NRT).</li>
        <li>Aggregate detections to monthly counts and total FRP; keep day and night detections.</li>
        <li>Fit α, β and the diurnal correction on the 2012-to-present overlap, where both sensors observe fires, then apply corrections to MODIS-only years.</li>
        <li>Build monthly climatology, anomaly scores (σ from the monthly mean) and critical windows from the harmonized series.</li>
      </ol>
      <p>Limits: FRP is not burned area; cloud, smoke and small agricultural fires affect detection; α, β and w are placeholders until fitted to real overlap data.</p>
    </section>
    <section class="card">
      <h2>Going live</h2>
      <pre>const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_SNPP_NRT/${bbox}/1`;
const response = await fetch(url);
if (!response.ok) throw new Error(`FIRMS request failed: ${response.status}`);
const rows = (await response.text()).trim().split("\n").slice(1).map((line) =&gt; line.split(","));
// Columns include latitude, longitude, FRP, acquisition date/time, and day/night.</pre>
    </section>
  </main>
</template>
