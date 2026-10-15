"""Builds index.html (served by Vercel) and counterstock.html (artifact preview) from src/."""
import os
D=os.path.dirname(os.path.abspath(__file__))
src=lambda f:open(os.path.join(D,'src',f),encoding='utf-8').read()
JS=['js1_core.js','js2_shell.js','js3_views.js','js4_stock.js','js5_more.js','js6_admin.js','js7_actions.js','js8_reports.js','js9_boot.js']
body=f'''<title>Counterstock Inventory</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<style>
{src('app.css')}
</style>
<div id="app"></div><div id="modal"></div>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<script>const SEED={src('seed_final.json')};</script>
<script>
{chr(10).join(src(f) for f in JS)}
</script>
'''
open(os.path.join(D,'counterstock.html'),'w',encoding='utf-8').write(body)
open(os.path.join(D,'index.html'),'w',encoding='utf-8').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+body.replace('<div id="app">','</head><body><div id="app">',1)+'</body></html>')
print('built',len(body))
