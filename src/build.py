import json
seed=open('seed_final.json').read()
css=open('app.css').read()
js='\n'.join(open(f).read() for f in ['js1_core.js','js2_shell.js','js3_views.js','js4_stock.js','js5_more.js','js6_admin.js','js7_actions.js'])
html=f'''<title>Counterstock Inventory</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
{css}
</style>
<div id="app"></div><div id="modal"></div>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<script>const SEED={seed};</script>
<script>
{js}
</script>
'''
open('counterstock.html','w').write(html)
# standalone version (full document) for opening directly in a browser, where printing/downloads work
open('counterstock_standalone.html','w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+html.replace('<div id="app">','</head><body><div id="app">')+'</body></html>')
print(len(html))
