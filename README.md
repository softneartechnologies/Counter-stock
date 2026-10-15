# Counterstock Inventory (front-end prototype)

Static site: `index.html` is the whole app. No build step.

## Deploy to Vercel
    cd counterstock-vercel
    npx vercel login        # first time only
    npx vercel deploy --prod

When asked: "Link to existing project?" -> No. Project name -> counterstock-inventory.
"Override settings?" -> No (framework: Other, no build command, output = project root).

Data is stored in each visitor's browser (localStorage). A shared backend is needed before real use.

## Source
`src/` holds the editable sources (CSS, JS modules, seed data built from the vendor files).
`index.html` is the built single-file app that Vercel serves.
