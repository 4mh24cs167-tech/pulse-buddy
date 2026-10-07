# Pulse Buddy (Windows desktop app)
## Run it now
1. Install Node.js (nodejs.org). In this folder: `npm install` then `npm start`.
## Build the installer
`npm run dist` → installer appears in `dist/Pulse-Buddy-Setup.exe`.
## Put it on Vercel
Upload the `site` folder to Vercel (Root Directory = `site`). Host the .exe on GitHub Releases
(push to GitHub, tag `v1.0.0`; the included workflow builds and attaches it) and put your repo name in site/index.html.
