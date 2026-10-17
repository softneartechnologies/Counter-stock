/* ============ Import existing (opening) stock — one file for all shops ============ */
const OPEN_COLS=[
 ['store','Yes','Shop name exactly as in the system. Leave empty to import into the shop you are working in.','Douglas St'],
 ['sku','','Your code or the vendor\'s code. Used to match products. Leave empty and the system makes one.','107082022456'],
 ['product_name','Yes','Full product name','Replacement Battery For iPhone 13 (AmpSentrix Basic Extended)'],
 ['category','Yes','Screens, Batteries, Back Glass, Small Parts, Cases, Cables & Chargers, Audio & Accessories, Devices','Batteries'],
 ['brand','','','AmpSentrix'],['model','','Phone the item fits (or the phone model for Devices)','iPhone 13'],['vendor','','Who you bought it from. Write "Bought from customer" for used phones.','Parts Supplier'],
 ['mpn','','Manufacturer part number','77-92605'],['upc','','Barcode on the retail box, if any',''],['imei','','Only for phones','356789012345678'],
 ['unit_cost','Yes','Base price you paid for one','19.09'],['sell_price','','Leave empty for supplier items (base price + mark-up). Fill in for used phones or special prices.',''],
 ['qty_on_hand','Yes','How many are on the shelf in that shop right now','3'],['min_stock','','Low-stock alert when the shop has this many or fewer','1']];
const openTemplateCSV=()=>OPEN_COLS.map(c=>c[0]).join(',')+'\n'+[
 'Douglas St,107082022456,"Replacement Battery For iPhone 13 (AmpSentrix Basic Extended)",Batteries,AmpSentrix,iPhone 13,Parts Supplier,,,,19.09,,3,1',
 'Douglas St,107182116868,"LCD Assembly For iPhone 17 Pro Max (Aftermarket: AQ7 / Incell) (120HZ)",Screens,,iPhone 17 Pro Max,Parts Supplier,,,,43.38,,2,1',
 'Hillside Ave,15-11388,"iPhone 17e/16e/15/14/13 Otterbox Commuter Series Case - Black",Cases,OtterBox,iPhone 15,Hitfar,77-92605,,,29.17,,4,1',
 'Hillside Ave,120-10588,"Commuter Case w/Magnets Galaxy S26+ Black",Cases,OtterBox,Galaxy S26+,Cesium Telecom,7799801,,,26.40,,2,1',
 'Park Royal,,"Used iPhone 13 128GB — Grade B",Devices,Apple,iPhone 13,Bought from customer,,,356789012345678,300.00,449.99,1,0'].join('\n')+'\n';
const OSYN={store:['store','shop','location'],sku:['sku','vendor_sku','product sku','item code','code'],product_name:['product_name','name','product','description','product description','item description'],category:['category'],brand:['brand'],model:['model','fits'],vendor:['vendor','supplier'],mpn:['mpn'],upc:['upc','barcode'],imei:['imei','serial'],unit_cost:['unit_cost','cost','base price','unit price'],sell_price:['sell_price','price','retail','selling price'],qty_on_hand:['qty_on_hand','qty','quantity','on hand','stock'],min_stock:['min_stock','threshold','min']};
function startOpening(text,fileName){const rows=parseCSV(text);if(rows.length<2){toast('That file has no data rows.');return}
 const h=rows[0].map(x=>x.trim().toLowerCase());const ix={};for(const k in OSYN){ix[k]=-1;for(const s of OSYN[k]){const i=h.indexOf(s);if(i>=0){ix[k]=i;break}}}
 const g=(r,k)=>ix[k]>=0?String(r[ix[k]]??'').trim().replace(/^'/,''):'';const stByName=n=>S.stores.find(s=>s.name.toLowerCase()===n.toLowerCase());
 const lines=rows.slice(1).map((r,n)=>{const errs=[];const sn=g(r,'store');const st=sn?stByName(sn):(curStore()!=='all'?ST(curStore()):null);if(!st)errs.push(sn?`Unknown store "${sn}"`:'Store missing');
  const name=g(r,'product_name');const sku=g(r,'sku');const match=(sku&&findByCode(sku))||(g(r,'upc')&&findByCode(g(r,'upc')))||(g(r,'imei')&&S.products.find(p=>p.imei===g(r,'imei')))||(!sku&&!g(r,'imei')&&name&&S.products.find(p=>p.name.toLowerCase()===name.toLowerCase()))||null;
  if(!name&&!match)errs.push('Product name missing');const q=g(r,'qty_on_hand');const qty_=parseInt(q);if(q===''||isNaN(qty_)||qty_<0)errs.push('Quantity missing');
  const cost=parseFloat(g(r,'unit_cost'));if(!match&&isNaN(cost))errs.push('Unit cost missing');let cat=g(r,'category');const cm=CATS.find(c=>c.toLowerCase()===cat.toLowerCase());cat=cm||(match?match.category:guessCat(name));
  return{n:n+2,sid:st&&st.id,name:name||(match&&match.name),sku,cat,brand:g(r,'brand'),model:g(r,'model'),vendor:g(r,'vendor'),mpn:g(r,'mpn'),upc:g(r,'upc'),imei:g(r,'imei'),cost:isNaN(cost)?(match?match.cost:0):r2(cost),price:g(r,'sell_price')===''?null:r2(parseFloat(g(r,'sell_price'))),qty:qty_,min:g(r,'min_stock'),match:match&&match.id,errs}}).filter(l=>l.name||l.errs.length<3);
 UI.open={fileName,lines,mode:'set'};UI.view='opening';render()}
VIEWS.opening=()=>{const O=UI.open;const head=`<div class="page-h"><div><h1>Import existing stock</h1><p>Load the stock that is already on your shelves, for every shop, from one CSV file. Use this once when you start, or after a full count. For new deliveries from a vendor, use <a href="#" data-act="go" data-v="receive">Receive stock</a> instead.</p></div><button class="btn" data-act="go" data-v="receive">Back to Receive stock</button></div>`;
 if(!O)return head+`<div class="cols"><div class="card card-b stack"><h2>Upload your stock file</h2><label class="field"><span>CSV file</span><input class="in" type="file" id="openFile" accept=".csv,text/csv" data-on="openFile"></label>
  <ol class="small" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Copy or download the template on the right.</li><li>Open it in Excel or Google Sheets. Add one row per product <b>per shop</b>.</li><li>Save as <b>CSV</b> and upload it here.</li><li>Check the preview, then press Import.</li></ol></div>
  <div class="card"><div class="card-h"><h2>Stock file template</h2><div class="row"><button class="btn sm" data-act="copyOpenTpl">${ic('copy')} Copy template</button>${FRAMED?'':`<button class="btn sm" data-act="dlOpenTpl">Download .csv</button>`}</div></div><div class="tbl-wrap" style="max-height:420px"><table class="tbl"><thead><tr><th>Column</th><th>Req.</th><th>What goes in it</th></tr></thead><tbody>${OPEN_COLS.map(c=>`<tr><td class="mono small">${c[0]}</td><td>${c[1]?pill('Yes','acc'):''}</td><td class="small">${esc(c[2])}${c[3]?`<div class="muted mono">e.g. ${esc(c[3])}</div>`:''}</td></tr>`).join('')}</tbody></table></div></div></div>`;
 const ok=O.lines.filter(l=>!l.errs.length),bad=O.lines.filter(l=>l.errs.length);const byStore=groupSum(ok,l=>l.sid,l=>l.qty);
 return head+`<div class="kpis">${kpi('Rows ready',ok.length,esc(O.fileName))}${kpi('New products',ok.filter(l=>!l.match).length,'created on import')}${kpi('Units',ok.reduce((a,l)=>a+l.qty,0),byStore.map(([s,v])=>esc(ST(s).name)+' '+v).join(' · '))}${kpi('Rows with problems',bad.length,bad.length?'fix in the file and upload again, or import the rest':'none')}</div>
 <div class="filters"><span class="small muted">For products already in the system:</span><div class="seg"><button class="${O.mode==='set'?'on':''}" data-act="openMode" data-v="set">Replace quantity with the file</button><button class="${O.mode==='add'?'on':''}" data-act="openMode" data-v="add">Add file quantity to current stock</button></div></div>
 <div class="card"><div class="tbl-wrap" style="max-height:60vh"><table class="tbl"><thead><tr><th>Row</th><th>Store</th><th>Product</th><th>Category</th>${isMgr()?'<th class="right">Base price</th>':''}<th class="right">Sell price</th><th class="right">Now</th><th class="right">After import</th></tr></thead><tbody>
 ${O.lines.map(l=>{const now=l.sid&&l.match?qty(l.sid,l.match):0;const after=O.mode==='add'?now+(l.qty||0):l.qty;const price=l.price??(l.match?P(l.match).price:sellPrice(l.cost));
  return `<tr${l.errs.length?' style="background:var(--danger-soft)"':''}><td class="num small muted">${l.n}</td><td>${l.sid?esc(ST(l.sid).name):'—'}</td><td class="wrap">${l.match?pill('Existing','ok'):pill('New','info')} ${esc(l.name||'')}${l.errs.length?`<div class="small diff-neg">${l.errs.map(esc).join(' · ')}</div>`:`<div class="small mono muted">${esc(l.sku||'code made on import')}${l.imei?' · IMEI '+esc(l.imei):''}</div>`}</td><td>${esc(l.cat)}</td>${isMgr()?`<td class="right num">${money(l.cost)}</td>`:''}<td class="right num">${money(price)}</td><td class="right num">${now}</td><td class="right num"><b>${l.errs.length?'—':after}</b></td></tr>`}).join('')}</tbody></table></div></div>
 <div class="card card-b row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="openCancel">Cancel</button><button class="btn pri lg" data-act="openApply" ${ok.length?'':'disabled'}>Import ${ok.length} row${ok.length===1?'':'s'}</button></div>`};
ACCESS.super.push('opening');ACCESS.admin.push('opening');
ON.openFile=e=>{const f=e.files[0];if(!f)return;const r=new FileReader();r.onload=()=>startOpening(r.result,f.name);r.readAsText(f)};
ACT.openMode=e=>{UI.open.mode=e.dataset.v;render()};ACT.openCancel=()=>{UI.open=null;render()};
ACT.copyOpenTpl=()=>copyText(openTemplateCSV(),'Stock file template');
ACT.dlOpenTpl=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([openTemplateCSV()],{type:'text/csv'}));a.download='counterstock_existing_stock_template.csv';a.click()};
ACT.openImport=()=>{UI.open=null;go('opening')};
ACT.openApply=()=>{const O=UI.open;let created=0,units=0;const per={};
 for(const l of O.lines.filter(l=>!l.errs.length)){let p=l.match&&P(l.match);
  if(!p){const n=800000+S.products.length+Math.floor(Math.random()*9e4);const used=/bought from customer/i.test(l.vendor);
   p={id:uid('p'),ean:ean13(n),vendorSku:l.sku||('OS-'+n),upc:l.upc,mpn:l.mpn,name:l.name,category:l.cat,brand:l.brand,model:l.model,vendor:l.vendor||'Opening stock',cost:l.cost,price:l.price??sellPrice(l.cost),manualPrice:l.price!=null||used,threshold:l.min!==''&&!isNaN(+l.min)?+l.min:null,imei:l.imei||undefined,createdAt:Date.now()};S.products.push(p);created++}
  else if(l.price!=null&&l.price!==p.price){p.price=l.price;p.manualPrice=true}
  const now=qty(l.sid,p.id);const target=O.mode==='add'?now+l.qty:l.qty;addStock(l.sid,p.id,target-now);units+=l.qty;per[l.sid]=(per[l.sid]||0)+1;
  log('ADJUST',`Opening stock import (${O.fileName}): ${p.name} ${now} → ${target}`,{pid:p.id,storeId:l.sid})}
 log('IMPORT',`Imported existing stock from ${O.fileName}: ${Object.values(per).reduce((a,b)=>a+b,0)} rows, ${created} new products, ${units} units (${Object.entries(per).map(([s,n])=>ST(s).name+' '+n).join(', ')})`,{storeId:'all'});
 UI.open=null;save();UI.view='products';render();toast(`Imported. ${created} new products, ${units} units.`)};
