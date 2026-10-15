# Counterstock Inventory (front-end prototype)

Multi-store inventory, register, returns/store credit, repairs and reporting for Sparktech Hub.

`index.html` is the whole app (static, no build step on Vercel).

## Editing
Sources live in `src/` (CSS, JS modules, seed data built from the vendor files).
After editing, rebuild with:

    python3 build.py

This regenerates `index.html` (served by Vercel) and `counterstock.html` (preview build).

## Deploy
Import this repo in Vercel → Framework preset "Other", no build command, output = root.
Every push to `main` redeploys.

Data is stored per browser (localStorage) until the backend is connected.
