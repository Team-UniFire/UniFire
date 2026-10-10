# UniFire

UniFire is a Vue 3 prototype for exploring harmonized satellite fire activity. The current dataset and map detections are deterministic synthetic examples; they are not live NASA measurements.

## Development

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`, then preview it with `npm run preview`.

## Optional basemap key

The CARTO Voyager basemap may work without a key depending on your access and usage. If CARTO
provided you a key, copy `.env.example` to `.env.local` and set `VITE_CARTO_API_KEY` there:

```dotenv
VITE_CARTO_API_KEY=your_carto_key
```

Restart the Vite dev server after changing the env file. Vite exposes `VITE_` variables in the
browser bundle, so treat this as a public, restricted map key: configure its allowed origins and
usage limits with CARTO. Never put a private/server-side secret in a `VITE_` variable.

## Structure

- `src/router/` defines the map, sensor-calibration, and data-sources routes.
- `src/stores/fire.js` contains the Pinia state, synthetic records, harmonization model, and derived summaries.
- `src/components/` contains the shared header, map, controls, brief, and timeline UI.
- `src/views/` contains the route-level map, calibration, and source-information screens.

FIRMS and other production data integrations are documented in the Sources route. Do not put API keys in browser code; production API access should be mediated by a server-side service.
