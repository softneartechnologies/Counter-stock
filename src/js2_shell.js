/* ============ UI plumbing ============ */
const ICON={
 home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 scan:'<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 9v6M10 9v6M13 9v6M16 9v6"/>',
 box:'<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/>',
 inbox:'<path d="M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5"/>',
 list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
 undo:'<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
 user:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/>',
 tool:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
 swap:'<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
 cash:'<path d="M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4"/>',
 clock:'<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2"/>',
 store:'<path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>',
 book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16"/>',
 truck:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', print:'<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', copy:'<path d="M9 9h11v11H9zM5 15H4V4h11v1"/>'};
const ic=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]||''}</svg>`;
const tip=t=>`<span class="qi" tabindex="0" data-tip="${esc(t)}">?</span>`;
const howto=(title,steps,open)=>`<details class="howto" ${open?'open':''}><summary>${esc(title)}</summary><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol></details>`;
const pill=(t,k='')=>`<span class="pill ${k}">${esc(t)}</span>`;
let UI={view:null,navOpen:false,q:'',cat:'',vendor:'',stockF:'',logF:{type:'',store:'',user:'',q:''},tab:{},cart:[],cartCust:null,lastHit:null,ret:null,imp:null,repF:'open'};
let toastT;function toast(m){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}
function modal(title,body,foot='',cls=''){const el=$('#modal');el.innerHTML=`<div class="scrim ${cls.includes('drawer')?'drawer':''}" data-act="scrim"><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h2>${title}</h2><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${ic('x')}</button></div><div class="modal-b">${body}</div>${foot?`<div class="modal-f">${foot}</div>`:''}</div></div>`;afterPaint(el)}
function closeModal(){$('#modal').innerHTML=''}
function afterPaint(root=document){drawCodes(root);const f=$('[autofocus]',root);if(f&&!f.disabled)setTimeout(()=>f.focus(),30)}

/* ---- barcodes / QR ---- */
function drawCodes(root){$$('svg[data-ean]',root).forEach(s=>{try{JsBarcode(s,s.dataset.ean,{format:s.dataset.fmt||'EAN13',displayValue:s.dataset.text!=='0',fontSize:+(s.dataset.fs||14),height:+(s.dataset.h||50),margin:2,width:+(s.dataset.w||1.6),background:'#ffffff',lineColor:'#000000',font:'IBM Plex Mono'})}catch(e){s.outerHTML=`<span class="mono">${esc(s.dataset.ean)}</span>`}});
  $$('[data-qr]',root).forEach(d=>{try{const q=qrcode(0,'M');q.addData(d.dataset.qr);q.make();d.innerHTML=q.createSvgTag({cellSize:3,margin:1,scalable:true})}catch(e){d.textContent=''}})}
const qrPayload=p=>`${p.ean}|${p.vendorSku}|${p.name.slice(0,40)}`;
function labelHTML(p,mode,size){const bc=mode!=='qr',qr=mode!=='barcode';
  return `<div class="label ${size==='38x25'?'sm':''}">${qr?`<div class="qr" data-qr="${esc(qrPayload(p))}"></div>`:''}<div class="lt"><div class="ln">${esc(p.name)}</div><div class="row" style="gap:4px;justify-content:space-between"><span class="lp">${money(p.price)}</span><span class="lc">${esc(p.vendorSku)}</span></div>${bc?`<div class="bc"><svg data-ean="${p.ean}" data-h="38" data-fs="13" data-w="1.4"></svg></div>`:`<div class="lc">${p.ean}</div>`}</div></div>`}
function openLabels(items,source){ // items: [{pid,copies}]
  UI.lbl={items:items.filter(i=>P(i.pid)),source};renderLabels()}
function renderLabels(){const L=UI.lbl,mode=S.settings.labelMode,size=S.settings.labelSize;const total=L.items.reduce((a,i)=>a+(+i.copies||0),0);
  const sheet=L.items.flatMap(i=>Array.from({length:Math.min(+i.copies||0,60)},()=>labelHTML(P(i.pid),mode,size))).join('');
  modal('Print labels',`
   <div class="grid g3">
    <label class="field"><span>Code type ${tip('Barcode (EAN-13) works with every USB scanner. QR also opens on a phone camera. "Both" is the safest default for shelves.')}</span><select class="in" id="lblMode" data-on="lblOpt">${[['both','Barcode + QR'],['barcode','Barcode only'],['qr','QR only']].map(([v,t])=>`<option value="${v}" ${v===mode?'selected':''}>${t}</option>`).join('')}</select></label>
    <label class="field"><span>Label size ${tip('Match the roll loaded in the label printer. 50×25 mm fits most thermal printers (Zebra, Dymo, Brother).')}</span><select class="in" id="lblSize" data-on="lblOpt"><option value="50x25" ${size==='50x25'?'selected':''}>50 × 25 mm</option><option value="38x25" ${size==='38x25'?'selected':''}>38 × 25 mm</option></select></label>
    <div class="field"><span>Total labels</span><div class="kpi" style="padding:6px 10px"><span class="num" style="font-weight:700;font-size:18px">${total}</span></div></div>
   </div>
   <div class="tbl-wrap" style="max-height:180px"><table class="tbl"><thead><tr><th>Product</th><th class="right">Copies ${tip('Defaults to the quantity received, so every unit gets its own label.')}</th></tr></thead><tbody>
   ${L.items.map((i,ix)=>`<tr><td>${esc(P(i.pid).name)}</td><td class="right"><input class="in num" style="width:70px" type="number" min="0" max="500" id="lc${ix}" value="${i.copies}" data-on="lblCopies" data-ix="${ix}"></td></tr>`).join('')}</tbody></table></div>
   <div class="label-sheet printable" id="lblSheet">${sheet||'<div class="empty">Set copies above to preview labels.</div>'}</div>
   ${FRAMED?`<div class="note info">This preview runs inside a viewer that blocks the print dialog. In the installed system (or when you open the downloaded HTML file directly in Chrome/Edge), <b>Print labels</b> sends this sheet to the label printer.</div>`:''}`,
   `<button class="btn" data-act="closeModal">Close</button>${FRAMED?`<button class="btn pri" data-act="labelsDone">Done</button>`:`<button class="btn pri" data-act="doPrintLabels">${ic('print')} Print ${total} label${total===1?'':'s'}</button>`}`,'wide')}

/* ---- receipt ---- */
function receiptHTML(o){return `<div class="receipt printable"><h4>${esc(ST(o.storeId).name.toUpperCase())}</h4><div class="c">${esc(ST(o.storeId).address)}</div><div class="c">${esc(ST(o.storeId).phone||'')}</div><hr>
 <div class="c"><b>${esc(o.title)}</b></div><div class="r"><span>${esc(o.no)}</span><span>${fmtDT(o.at)}</span></div><div>Served by: ${esc(U(o.by).name)}</div>${o.customer?`<div>Customer: ${esc(o.customer.name)}</div><div>${esc(o.customer.phone||'')} ${o.customer.email?'· '+esc(o.customer.email):''}</div>`:''}<hr>
 ${o.lines.map(l=>`<div>${esc(l.name)}</div><div class="r"><span>${esc(l.left||'')}</span><span>${l.amt}</span></div>`).join('')}<hr>
 ${o.totals.map(([k,v,b])=>`<div class="r" ${b?'style="font-weight:700;font-size:13px"':''}><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}
 ${o.footer?`<hr><div class="c">${o.footer}</div>`:''}<div class="c" style="margin-top:8px"><svg data-ean="${esc(o.no)}" data-fmt="CODE128" data-h="34" data-fs="11" data-w="1.3"></svg></div></div>`}
function showReceipt(o){modal(o.title,receiptHTML(o)+(FRAMED?`<div class="note info small">Receipt printing goes to the counter printer in the installed system. The print dialog is blocked inside this preview.</div>`:''),`<button class="btn" data-act="closeModal">Done</button>${FRAMED?'':`<button class="btn pri" data-act="doPrint">${ic('print')} Print receipt</button>`}`)}

/* ---- navigation ---- */
const NAV=[
 ['',[['home','Home','grid'],['dash','Dashboard','chart']]],
 ['Sell',[['pos','Register','scan'],['returns','Returns & exchange','undo'],['customers','Customers & credit','user']]],
 ['Inventory',[['products','Products & labels','box'],['receive','Receive stock','inbox'],['alerts','Low stock alerts','bell'],['exchange','Store exchange','swap'],['batches','Receiving history','truck']]],
 ['Service',[['repairs','Repairs','tool'],['tech','Technician panel','tool']]],
 ['Records',[['shifts','Shifts & cash','cash'],['log','Activity log','list']]],
 ['Settings',[['admin','Stores & users','store'],['guide','Help & daily guide','book']]]];
const ACCESS={super:['dash','home','pos','returns','customers','products','receive','alerts','exchange','batches','repairs','shifts','log','admin','guide'],
 admin:['dash','home','pos','returns','customers','products','receive','alerts','exchange','batches','repairs','shifts','log','admin','guide'],
 staff:['home','pos','returns','customers','products','receive','alerts','exchange','batches','repairs','shifts','log','guide'],
 tech:['tech','guide']};
const can=v=>ACCESS[me().role].includes(v);
const isMgr=()=>['super','admin'].includes(me().role);
function go(v){UI.view=v;UI.navOpen=false;render();window.scrollTo(0,0)}
const initials=n=>n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();

function render(){const app=$('#app');
  if(!S.session){app.innerHTML=loginView();drawCodes(app);return}
  if(!can(UI.view))UI.view=ACCESS[me().role][0];
  const u=me(),sid=curStore();const alertN=computeAlerts(sid).length;const sh=openShift();
  const pendingTr=S.transfers.filter(t=>t.status==='requested'&&(sid==='all'||t.from===sid)).length;
  const navCount={alerts:alertN,exchange:pendingTr,tech:S.repairs.filter(r=>r.status==='dispatch').length};
  app.innerHTML=`<div class="shell ${UI.navOpen?'nav-open':''}">
  <aside class="side" aria-label="Main menu"><div class="brand"><div class="brand-mark"><i></i></div><div><b>Counterstock</b><small>Sparktech Hub</small></div></div>
   <nav class="nav">${NAV.map(([h,items])=>{const vis=items.filter(i=>can(i[0]));if(!vis.length)return'';return (h?`<div class="nav-h">${h}</div>`:'')+vis.map(([id,t,icn])=>`<button class="${UI.view===id?'on':''}" data-act="go" data-v="${id}">${ic(icn)}<span>${t}</span>${navCount[id]?`<span class="cnt">${navCount[id]}</span>`:''}</button>`).join('')}).join('')}</nav>
   <div class="side-foot"><div class="avatar">${esc(initials(u.name))}</div><div class="who"><b>${esc(u.name)}</b>${ROLE_NAME[u.role]}${u.storeId?' · '+esc(ST(u.storeId).name):''}<br><button data-act="logout">Switch user</button></div></div></aside>
  <div class="main"><header class="top">
   <button class="btn sm menu-btn" data-act="toggleNav" aria-label="Open menu">${ic('menu')}</button>
   ${u.role==='super'?`<label class="store-chip">${ic('store')}<select class="in" style="width:auto;font-weight:700" id="storePick" data-on="pickStore" aria-label="Store"><option value="all" ${sid==='all'?'selected':''}>All stores</option>${S.stores.map(s=>`<option value="${s.id}" ${sid===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>`:u.role==='tech'?`<span class="store-chip">${ic('truck')} All shops</span>`:`<span class="store-chip">${ic('store')} ${esc(ST(sid).name)}</span>`}
   ${u.role!=='tech'?`<div class="gsearch">${ic('search')}<input class="in" id="gq" placeholder="Search products, customers, repairs…" autocomplete="off" data-on="gsearch" aria-label="Search everything"><div class="gres" id="gres" hidden></div></div>`:''}
   <span class="grow"></span>
   ${u.role!=='tech'&&sid!=='all'?(sh?`<span class="pill ok tip-b" data-tip="${isMgr()?`Opening balance ${money(sh.opening)}. Cash taken so far: ${money(shiftCash(sh).cash)}.`:`Clocked in at ${new Date(sh.openAt).toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'})}`}"><span class="dot"></span>Shift open</span><button class="btn sm" data-act="endShift">End shift</button>`:`<button class="btn sm pri" data-act="startShift">Start shift</button>`):''}
   ${u.role!=='tech'?`<button class="btn sm ghost tip-b tip-l" data-act="go" data-v="alerts" data-tip="Products at or below their alert level" aria-label="Low stock alerts">${ic('bell')} <span class="num">${alertN}</span></button>`:''}
  </header><main class="content" id="view">${VIEWS[UI.view]()}</main></div></div>`;
  drawCodes(app)}

function needStore(){return `<div class="card card-b stack"><h2>Which store are you working in?</h2><p class="muted" style="margin:0">This screen works on one store's till and stock.</p><div class="tiles" style="margin:0">${S.stores.map(s=>`<button class="tile" data-act="setStore" data-s="${s.id}"><div class="ti">${ic('store')}</div><div><b>${esc(s.name)}</b><br><span>${esc(s.address)}</span></div></button>`).join('')}</div></div>`}

/* ---- login + shift ---- */
function loginView(){const groups=[['super','Owner'],['admin','Store admins'],['staff','Staff'],['tech','Technician']];
 return `<div class="login"><div class="login-side"><div class="brand-mark"><i></i></div><h1>Counterstock</h1><p>Sales, stock, returns and repairs for all ${S.stores.length} Sparktech Hub stores in one place.</p><ul><li>Scan to sell, cash or card</li><li>Upload deliveries and print labels</li><li>Store credit that follows the customer</li><li>Reports by date, store and staff</li></ul></div>
 <div class="login-main"><h2 style="font-size:22px">Who's signing in?</h2><p class="muted" style="margin:4px 0 18px">Tap your name. This prototype skips the PIN; the real system asks for one.</p>
 ${groups.map(([r,h])=>`<h3 style="margin:18px 0 10px" class="muted">${h}</h3><div class="acct">${S.users.filter(u=>u.role===r&&u.active).map(u=>`<button data-act="login" data-u="${u.id}"><span class="avatar">${esc(initials(u.name))}</span><span><b>${esc(u.name)}</b><span class="small muted">${ROLE_NAME[u.role]}${u.storeId?' · '+esc(ST(u.storeId).name):''}</span></span></button>`).join('')}</div>`).join('')}
 <div class="note info small" style="margin-top:24px">Products and vendor orders come from the supplier files you shared. Staff, customers, sales and repairs are sample data. Everything is saved in this browser only. <button class="btn sm ghost" data-act="resetAsk">Reset demo data</button></div></div></div>`}
function shiftOpenModal(force){const last=S.shifts.filter(x=>x.storeId===curStore()&&x.closeAt).sort((a,b)=>b.closeAt-a.closeAt)[0];
 modal('Start your shift',`<p>Count the cash in the drawer before you serve the first customer and enter it below. This is your <b>opening balance</b>; the system adds every cash sale to it during your shift.</p>
 <label class="field"><span>Opening balance (cash in drawer) ${tip('Float left in the till for change. Usually the same every day, e.g. $25.')}</span><input class="in num" id="opening" type="number" step="0.01" min="0" value="${last?Math.min(25,last.declared).toFixed(2):'25.00'}" autofocus></label>
 <div class="small muted">Store: <b>${esc(ST(curStore()).name)}</b> · ${new Date().toLocaleString('en-CA')}</div>`,
 `${force?'<button class="btn" data-act="skipShift">Not now</button>':'<button class="btn" data-act="closeModal">Cancel</button>'}<button class="btn pri" data-act="openShift">Start shift</button>`)}
function shiftCloseModal(){const sh=openShift();if(!sh)return;const c=shiftCash(sh);
 modal('End shift — cash deposit',`<div class="grid g3"><div class="kpi"><div class="k">Opening balance</div><div class="v">${money(sh.opening)}</div></div><div class="kpi"><div class="k">Cash collected</div><div class="v">${money(c.cash)}</div><div class="s">from scan-outs this shift</div></div><div class="kpi"><div class="k">Card</div><div class="v">${money(c.card)}</div><div class="s">for reference</div></div></div>
 <div class="note info">Drawer should hold <b>${money(sh.opening+c.cash)}</b> (opening + cash collected). Leave the opening float in the drawer and hand over the cash deposit.</div>
 <label class="field"><span>Cash deposit handed over ${tip('Filled in from the system. Change it if cash was spent during the day, e.g. $100 paid for a courier, and explain why in the note.')}</span><input class="in num" id="declared" type="number" step="0.01" value="${c.cash.toFixed(2)}" data-on="declChange" data-sys="${c.cash}" autofocus></label>
 <div id="declDiff"></div>
 <label class="field"><span>Note <span id="noteReq" class="muted">(optional)</span></span><textarea class="in" id="shiftNote" placeholder="e.g. Gave $100 to Daniel for courier / supplies"></textarea></label>`,
 `<button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="closeShift">End shift</button>`)}
