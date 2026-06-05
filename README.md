# SkyAtlas

SkyAtlas is a Next.js + TypeScript MVP that estimates the current sky color for any selected point on the map. It supports place search, browser geolocation, MapLibre map interaction, RGB/HEX display, solar elevation, air mass, sky score, a 24-hour color timeline, and city/grid sky points that change by zoom level.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Production parity:

```bash
npm run build
npm start
```

`npm start` uses `next start -p ${PORT:-3000}`, so it works with Railway's `PORT` environment variable and falls back to `3000` locally.

## Railway Deployment

1. Push this repository to GitHub.
2. In Railway, choose **New Project**.
3. Select **Deploy from GitHub repo**.
4. Choose the SkyAtlas repository.
5. Set **Build Command** to `npm run build`.
6. Set **Start Command** to `npm start`.
7. Do not set a fixed `PORT`; Railway injects it automatically.
8. After deployment, open the generated Railway URL and confirm the map, search, and sky color card load.

This project is designed for Railway's Node builder and does not require a Dockerfile.

## Environment Variables

Required by Railway:

- `PORT`: automatically provided by Railway. Do not hard-code it.

Optional:

- `NEXT_PUBLIC_APP_URL`: public app URL, used in the Nominatim User-Agent. Example: `https://your-app.up.railway.app`.
- `NOMINATIM_EMAIL`: optional contact email included in the Nominatim User-Agent.

No environment variable is needed for the MVP sky model. Atmosphere values use the static provider in `lib/atmosphereProvider.ts`.

## Custom Domain Notes

Add the custom domain in Railway first, then create the DNS record Railway shows you. In most cases this is a CNAME from your host, such as `sky.example.com`, to the Railway target. Do not point DNS directly at an IP address because Railway endpoints can change.

If you use a custom domain, update `NEXT_PUBLIC_APP_URL` to the custom HTTPS URL so external API requests identify the deployed app correctly.

## API

- `GET /api/geocode?q=Sendai`: searches OpenStreetMap Nominatim and falls back to bundled major cities if the external API fails.
- `GET /api/sky?lat=38.2682&lon=140.8694`: returns the current estimated sky color, RGB, HEX, solar elevation, air mass, and sky score.
- `GET /api/sky-grid?bbox=minLon,minLat,maxLon,maxLat&zoom=5`: returns sky points for the current map bounds. Lower zooms use major cities; higher zooms use grid points.
- `GET /api/timeline?lat=38.2682&lon=140.8694`: returns 24 hourly sky colors.

External APIs are only called at runtime. The build does not fetch Nominatim or any weather service.

## Sky Color Model

The MVP model lives in `lib/skyColor.ts`.

- Higher solar elevation produces brighter blue.
- Low solar elevation shifts toward red and orange.
- Night shifts toward navy and near-black.
- Higher AOD and humidity make the color whiter and hazier.
- AOD defaults to `0.08`; humidity defaults to `0.5`.

## Future Extensions

`lib/atmosphereProvider.ts` defines an `AtmosphereProvider` interface so richer data sources can be added without rewriting the UI or API routes.

Planned provider options:

- Open-Meteo Provider for humidity and cloud context.
- NASA Provider for aerosol and atmospheric products.
- AERONET Provider for station-based aerosol observations.
