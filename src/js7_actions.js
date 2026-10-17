/* ============ Actions ============ */
const val=id=>{const e=document.getElementById(id);return e?e.value:''};
function copyText(text,label){const fallback=()=>modal('Copy '+label,`<p class="small muted">Your browser blocked automatic copying. Select all (Ctrl/Cmd + A) and copy.</p><textarea class="in mono small" rows="12" id="copyArea">${esc(text)}</textarea>`,`<button class="btn pri" data-act="closeModal">Done</button>`);
 try{navigator.clipboard.writeText(text).then(()=>toast(label+' copied. Paste it into Excel or a new .csv file.'),fallback)}catch(e){fallback()}}
const csvCell=v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);
function addToCart(p){const sid=curStore();const l=UI.cart.find(x=>x.pid===p.id);if(l)l.qty++;else UI.cart.push({pid:p.id,qty:1,price:p.price,list:p.price});UI.lastHit=p.id;UI.scanErr=qty(sid,p.id)<=0?`${p.name} shows 0 in stock at ${ST(sid).name}. Check the shelf, or adjust stock if the count is wrong.`:''}
function pickCustomer(id,forWhat){if(forWhat==='ret'){UI.ret.custId=id}else if(forWhat==='pos'){UI.cartCust=id;UI.useCredit=C(id)&&C(id).credit>0}render()}

const ACT={
 go:e=>go(e.dataset.v), noop:()=>{}, closeModal, toggleNav:()=>{UI.navOpen=!UI.navOpen;render()},
 scrim:(e,ev)=>{if(ev.target===e)closeModal()},
 login:e=>{const u=U(e.dataset.u);S.session={userId:u.id,storeId:u.storeId||'all'};UI={...UI,view:null,cart:[],cartCust:null,lastHit:null,ret:null,imp:null,tab:{}};save();render();if(u.role==='staff'&&!openShift())shiftOpenModal(true)},
 logout:()=>{S.session=null;save();closeModal();render()},
 resetAsk:()=>modal('Reset demo data?','<p>This puts every product, sale, return, repair and log entry back to the starting sample. Anything you entered in this browser is removed.</p>','<button class="btn" data-act="closeModal">Keep my data</button><button class="btn dan" data-act="resetDo">Reset</button>'),
 resetDo:()=>{try{localStorage.removeItem(KEY)}catch(e){}S=seed();save(true);closeModal();UI.view=null;render();toast('Demo data reset.')},
 setStore:e=>{S.session.storeId=e.dataset.s;save();render()},
 startShift:()=>shiftOpenModal(false), skipShift:()=>closeModal(), endShift:()=>shiftCloseModal(),
 openShift:()=>{const v=parseFloat(val('opening'));if(isNaN(v)||v<0){toast('Enter the cash in the drawer, e.g. 25.00');return}const sh={id:uid('SH'),userId:me().id,storeId:curStore(),openAt:Date.now(),opening:r2(v),closeAt:null,declared:0,note:''};S.shifts.push(sh);log('SHIFT',`${me().name} opened shift with ${money(v)} opening balance`);save();closeModal();render();toast('Shift started. Opening balance '+money(v)+'.')},
 closeShift:()=>{const sh=openShift();const c=shiftCash(sh);const d=parseFloat(val('declared'));const note=val('shiftNote').trim();if(isNaN(d)){toast('Enter the cash deposit amount.');return}
  if(Math.abs(d-c.cash)>.004&&!note){toast('Add a note explaining why the deposit differs from '+money(c.cash)+'.');$('#shiftNote').focus();return}
  Object.assign(sh,{closeAt:Date.now(),cashCollected:c.cash,expected:r2(sh.opening+c.cash),declared:r2(d),note});
  log('SHIFT',`${me().name} closed shift — cash deposit ${money(d)}${Math.abs(d-c.cash)>.004?` (system ${money(c.cash)}; note: ${note})`:''}`);save();closeModal();render();toast('Shift closed. Deposit '+money(d)+' recorded.')},
 chip:e=>{const p=findByCode(e.dataset.code);if(p){addToCart(p);render()}},
 clearCart:()=>{UI.cart=[];UI.lastHit=null;UI.scanErr='';UI.cartCust=null;render()},
 cartQty:e=>{const l=UI.cart[+e.dataset.i];l.qty+=+e.dataset.d;if(l.qty<=0)UI.cart.splice(+e.dataset.i,1);render()},
 cartCust:e=>{UI.cartCust=e.dataset.c||null;UI.useCredit=false;render()},
 pickCust:e=>{closeModal();pickCustomer(e.dataset.c,e.dataset.for)},
 newCustomer:e=>customerForm(e.dataset.for),
 completeSale:()=>{const sid=curStore();if(!openShift()){toast('Start your shift first so the cash is counted.');shiftOpenModal(false);return}
  const short=UI.cart.find(l=>l.qty>qty(sid,l.pid));if(short){toast(`Only ${qty(sid,short.pid)} of "${P(short.pid).name}" in stock. Fix the quantity or adjust stock.`);return}
  const sub=r2(UI.cart.reduce((a,l)=>a+l.price*l.qty,0));const cust=UI.cartCust&&C(UI.cartCust);const credit=cust&&UI.useCredit?Math.min(cust.credit,sub):0;const due=r2(sub-credit);
  if(due>0&&!UI.payCash&&!UI.payCard){toast('Tick Cash deposit or Debit / card.');return}
  let cash=UI.payCash&&UI.payCard?r2(Math.min(due,Math.max(0,+(UI.cashPart??due/2)||0))):UI.payCash?due:0;const card=r2(due-cash);
  const sale={id:'S'+(++S.seq.sale),storeId:sid,at:Date.now(),by:me().id,shiftId:openShift().id,items:UI.cart.map(l=>({...l})),total:sub,pay:{cash,card,credit},customerId:cust?cust.id:null};
  S.sales.push(sale);for(const l of sale.items){addStock(sid,l.pid,-l.qty);log('SALE',`Scanned out ${l.qty} × ${P(l.pid).name} — ${money(l.price*l.qty)}${l.list&&l.price<l.list?` (discount ${money((l.list-l.price)*l.qty)} off ${money(l.list)})`:''} (${[cash?'Cash':'',card?'Card':'',credit?'Credit':''].filter(Boolean).join(' + ')}) · ${qty(sid,l.pid)} left`,{pid:l.pid,ref:sale.id})}
  if(credit){cust.credit=r2(cust.credit-credit);S.credits.push({id:uid('CL'),customerId:cust.id,at:Date.now(),storeId:sid,by:me().id,type:'redeem',amount:-credit,ref:sale.id,note:'Used on sale '+sale.id});log('CREDIT',`${cust.name} used ${money(credit)} store credit on ${sale.id} — balance ${money(cust.credit)}`,{ref:sale.id})}
  UI.cart=[];UI.cartCust=null;UI.useCredit=false;UI.payCash=UI.payCard=false;UI.cashPart=null;UI.lastHit=null;UI.scanErr='';save();render();showReceipt(saleReceiptData(sale))},
 saleReceipt:e=>showReceipt(saleReceiptData(S.sales.find(s=>s.id===e.dataset.s))),
 openProduct:e=>productDrawer(e.dataset.p), addProduct:()=>productForm(null), editProduct:e=>productForm(P(e.dataset.p)),
 labelsFor:e=>openLabels([{pid:e.dataset.p,copies:Math.max(1,qty(curStore(),e.dataset.p)||1)}],'product'),
 printSelected:()=>{const ids=Object.keys(UI.sel||{}).filter(k=>UI.sel[k]);if(ids.length)openLabels(ids.map(pid=>({pid,copies:1})),'selection')},
 doPrintLabels:()=>{const n=UI.lbl.items.reduce((a,i)=>a+(+i.copies||0),0);log('LABEL',`Printed ${n} labels: ${UI.lbl.items.map(i=>`${i.copies} × ${P(i.pid).name}`).join('; ').slice(0,300)}`,{pid:UI.lbl.items.length===1?UI.lbl.items[0].pid:null});save();window.print()},
 doPrint:()=>window.print(),
 adjustStock:e=>{const p=P(e.dataset.p),sid=curStore();modal('Adjust stock',`<p><b>${esc(p.name)}</b><br><span class="muted">${esc(ST(sid).name)} · system count <b>${qty(sid,p.id)}</b></span></p>
  <div class="grid g2"><label class="field"><span>Actual count on shelf</span><input class="in num" type="number" min="0" id="adjCount" value="${qty(sid,p.id)}" autofocus></label><label class="field"><span>Reason</span><select class="in" id="adjReason"><option>Stock-take count</option><option>Damaged / written off</option><option>Lost or stolen</option><option>Found extra unit</option><option>Used for in-shop repair</option><option>Other</option></select></label></div>
  <label class="field"><span>Note</span><input class="in" id="adjNote" placeholder="Optional detail"></label>`,`<button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="adjustDo" data-p="${p.id}">Save adjustment</button>`)},
 adjustDo:e=>{const p=P(e.dataset.p),sid=curStore();const n=parseInt(val('adjCount'));if(isNaN(n)||n<0){toast('Enter the counted quantity.');return}const was=qty(sid,p.id);if(n===was){closeModal();return}
  addStock(sid,p.id,n-was);log('ADJUST',`Stock adjusted ${was} → ${n} (${n-was>0?'+':''}${n-was}) · ${val('adjReason')}${val('adjNote')?': '+val('adjNote'):''} — ${p.name}`,{pid:p.id});save();closeModal();render();productDrawer(p.id);toast('Stock adjusted and logged.')},
 reqTransfer:e=>transferForm(e.dataset.p,e.dataset.from),
 submitForm:e=>{const f=document.getElementById(e.dataset.f);if(!f.reportValidity())return;FORM[f.dataset.form](f)},
 sampleImport:()=>startImport(SEED.sampleCsv,'Orders_2026-10-13.csv (Oct 9 orders)'),
 csvPaste:()=>{const t=val('csvPaste');if(t.trim())startImport(t,'Pasted CSV');else toast('Paste the CSV text first.')},
 copyTemplate:()=>copyText(templateCSV(),'CSV template'),
 dlTemplate:()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([templateCSV()],{type:'text/csv'}));a.download='counterstock_receiving_template.csv';a.click()},
 cancelImport:()=>{UI.imp=null;render()}, toReview:()=>buildReview(), backToMap:()=>{UI.imp.step='map';render()}, confirmImport:()=>confirmImport(),
 openBatch:e=>batchModal(e.dataset.b),
 batchLabels:e=>{const b=S.batches.find(x=>x.id===e.dataset.b);openLabels(b.lines.filter(l=>l.received>0).map(l=>({pid:l.pid,copies:l.received})),'batch')},
 lateArrival:e=>{const b=S.batches.find(x=>x.id===e.dataset.b),l=b.lines[+e.dataset.i];l.received++;addStock(b.storeId,l.pid,1);if(l.received===l.ordered)l.reason=(l.reason||'')+' — rest arrived later';
  log('ADJUST',`Late arrival on ${b.vendor} ${b.ref}: +1 ${P(l.pid).name} (now ${l.received} of ${l.ordered} received)`,{pid:l.pid,storeId:b.storeId,ref:b.id});save();render();batchModal(b.id);toast('Late unit added to stock and logged.')},
 tab:e=>{UI.tab[e.dataset.t]=e.dataset.v;render()},
 chipRet:e=>{const p=findByCode(e.dataset.code);if(p){UI.ret.items.push({pid:p.id,value:p.price,condition:'resell',note:''});render()}},
 retDel:e=>{UI.ret[e.dataset.l].splice(+e.dataset.i,1);render()},
 retCust:e=>{UI.ret.custId=e.dataset.c||null;render()},
 retReset:()=>{UI.ret=null;render()},
 confirmReturn:()=>{const sid=curStore(),R=UI.ret,k=retCalc();if(!R.items.length||!k.cust)return;
  if(R.items.some(i=>!(+i.value>=0))){toast('Enter a return value for each item.');return}
  if(k.pay>0&&!R.payCash&&!R.payCard){toast(`Tick how the customer pays the ${money(k.pay)} difference.`);return}
  if(k.pay>0&&R.payCash&&!openShift()){toast('Start your shift first so the cash is counted.');shiftOpenModal(false);return}
  const short=R.exch.find(i=>qty(sid,i.pid)<1);if(short){toast(`"${P(short.pid).name}" is not in stock here.`);return}
  const now=Date.now(),no='CR-'+(++S.seq.receipt),c=k.cust,by=me().id;
  if(k.net>0&&R.refundMethod==='cash'&&!openShift()){toast('Start your shift first: a cash refund comes out of the till.');shiftOpenModal(false);return}
  const rec={id:uid('R'),receipt:no,storeId:sid,at:now,by,shiftId:openShift()?openShift().id:null,customerId:c.id,items:R.items.map(i=>({...i,value:r2(+i.value),restock:i.condition==='resell'})),exch:R.exch.map(i=>({...i,price:r2(+i.price)})),adjust:k.adj,adjustNote:R.adjustNote,net:k.net,usedOld:k.useOld,collected:k.pay?{cash:R.payCash?k.pay:0,card:R.payCash?0:k.pay}:null};
  const L=(type,amount,note)=>{if(amount)S.credits.push({id:uid('CL'),customerId:c.id,at:now,storeId:sid,by,type,amount:r2(amount),ref:no,note})};
  L('return',k.rv,'Returned '+rec.items.map(i=>P(i.pid).name).join(', '));L('exchange',-k.ev,rec.exch.length?'Took '+rec.exch.map(i=>P(i.pid).name).join(', '):'');L('adjust',k.adj,R.adjustNote||'Adjustment');
  if(k.net<0){L('redeem',-k.useOld,'Existing credit used');L('payment',k.pay,`Customer paid difference by ${R.payCash?'cash':'card'}`)}
  const rm=k.net>0?(R.refundMethod||'credit'):'credit';rec.refundMethod=rm;
  if(rm!=='credit'){L('refund',-k.net,`Refunded ${money(k.net)} by ${rm==='cash'?'cash from till':'debit / card'}`);rec.refunded={method:rm,amount:k.net}}
  c.credit=r2(c.credit+(k.net>=0?(rm==='credit'?k.net:0):-k.useOld));rec.balanceAfter=c.credit;
  for(const i of rec.items){if(i.restock)addStock(sid,i.pid,1);log('RETURN',`${no}: ${c.name} returned ${P(i.pid).name} valued ${money(i.value)} — ${i.restock?'back in stock':'faulty, not restocked'}${i.note?' · '+i.note:''}`,{pid:i.pid,ref:no})}
  for(const i of rec.exch){addStock(sid,i.pid,-1);log('RETURN',`${no}: ${c.name} took ${P(i.pid).name} in exchange at ${money(i.price)} · ${qty(sid,i.pid)} left`,{pid:i.pid,ref:no})}
  log('CREDIT',`${no}: ${k.net>=0?(rm==='credit'?`${money(k.net)} store credit issued to`:`${money(k.net)} refunded (${rm}) to`):`${money(-k.net)} owed by`} ${c.name}${k.adj?` (adjustment ${money(k.adj)}${R.adjustNote?': '+R.adjustNote:''})`:''} — balance now ${money(c.credit)}`,{ref:no});
  S.returns.push(rec);UI.ret=null;save();render();showReceipt(returnReceiptData(rec))},
 retReceipt:e=>showReceipt(returnReceiptData(S.returns.find(r=>r.id===e.dataset.r))),
 openCustomer:e=>customerModal(e.dataset.c),
 creditAdjust:e=>{const c=C(e.dataset.c);modal('Adjust credit — '+esc(c.name),`<div class="small muted">Current balance ${money(c.credit)}</div><div class="grid g2"><label class="field"><span>Amount (+ add, − remove)</span><input class="in num" type="number" step="0.01" id="caAmt" autofocus></label><label class="field"><span>Reason *</span><input class="in" id="caNote" placeholder="e.g. Goodwill, refund paid in cash"></label></div>`,`<button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="creditAdjDo" data-c="${c.id}">Save</button>`)},
 creditAdjDo:e=>{const c=C(e.dataset.c),a=r2(parseFloat(val('caAmt'))),n=val('caNote').trim();if(!a||!n){toast('Enter an amount and a reason.');return}if(c.credit+a<0){toast('Balance cannot go below zero.');return}
  c.credit=r2(c.credit+a);S.credits.push({id:uid('CL'),customerId:c.id,at:Date.now(),storeId:curStore(),by:me().id,type:'adjust',amount:a,ref:'',note:n});log('CREDIT',`Credit adjusted for ${c.name}: ${a>0?'+':''}${money(a)} (${n}) — balance ${money(c.credit)}`);save();render();customerModal(c.id)},
 newRepair:()=>repairForm(), openRepair:e=>repairModal(e.dataset.r),
 repLabel:e=>{const r=S.repairs.find(x=>x.id===e.dataset.r);modal('Repair label '+r.id,`<div class="label-sheet printable"><div class="label" style="width:62mm;min-height:29mm"><div class="qr" data-qr="${r.id}|${esc(r.device)}"></div><div class="lt"><div class="lp">${r.id}</div><div class="ln">${esc(r.device)} · ${esc(r.customer)}</div><div class="lc">${esc(r.damage.join(', '))}</div><div class="lc">${esc(ST(r.storeId).name)} · in ${fmtD(r.createdAt)}${r.expected?' · due '+fmtD(r.expected):''}</div><div class="bc"><svg data-ean="${r.id}" data-fmt="CODE128" data-h="30" data-fs="10" data-w="1.3"></svg></div></div></div></div>${FRAMED?'<div class="note info small">Goes to the label printer in the installed system; the print dialog is blocked in this preview.</div>':''}`,`<button class="btn" data-act="closeModal">Close</button>${FRAMED?'':`<button class="btn pri" data-act="doPrint">${ic('print')} Print</button>`}`)},
 repStatus:e=>{const r=S.repairs.find(x=>x.id===e.dataset.r),s=e.dataset.s;let note='';if(s==='dispatch'){r.expected=val('rexp')||r.expected||isoD(Date.now()+4*DAY);note='Expected back '+fmtD(r.expected)}if(s==='collected')note='Handed back to customer';if(s==='returned')note='Received back from technician';
  r.status=s;r.history.push({at:Date.now(),by:me().id,status:s,note});log('REPAIR',`${r.id} ${r.device}: ${REPAIR_LABEL[s]}${note?' — '+note:''}`,{ref:r.id,storeId:r.storeId});save();render();repairModal(r.id);toast(r.id+': '+REPAIR_LABEL[s])},
 techSave:e=>{const r=S.repairs.find(x=>x.id===e.dataset.r);const before=r.status;const ns=val('t_status');const num=id=>val(id)===''?null:r2(parseFloat(val(id)));
  if(['fixed','notfix'].includes(ns)&&num('t_cost')==null){toast('Enter the cost of repair (0 if nothing is charged).');return}
  Object.assign(r,{complexity:val('t_cx'),expected:val('t_exp')||r.expected,repairCost:num('t_cost'),shipCost:num('t_ship'),techNotes:val('t_notes')});
  if(ns!==before){r.status=ns;r.history.push({at:Date.now(),by:me().id,status:ns,note:r.techNotes||''})}
  log('REPAIR',`${r.id} ${r.device}: ${ns!==before?REPAIR_LABEL[ns]+' · ':''}complexity ${r.complexity||'—'}, repair ${r.repairCost!=null?money(r.repairCost):'—'}, shipping ${r.shipCost!=null?money(r.shipCost):'—'}, delivery ${r.expected?fmtD(r.expected):'—'}`,{ref:r.id,storeId:r.storeId});save();render();repairModal(r.id);toast('Saved '+r.id)},
 collectShop:e=>{const l=S.repairs.filter(r=>r.storeId===e.dataset.s&&r.status==='dispatch');for(const r of l){r.status='tech';r.history.push({at:Date.now(),by:me().id,status:'tech',note:'Collected from shop'});log('REPAIR',`${r.id} ${r.device}: collected by ${me().name}`,{ref:r.id,storeId:r.storeId})}save();render();toast(`Collected ${l.length} job(s) from ${ST(e.dataset.s).name}.`)},
 deliverShop:e=>{const l=S.repairs.filter(r=>r.storeId===e.dataset.s&&['fixed','notfix'].includes(r.status));for(const r of l){r.status='returned';r.history.push({at:Date.now(),by:me().id,status:'returned',note:'Delivered back to shop'});log('REPAIR',`${r.id} ${r.device}: delivered back to shop by ${me().name}`,{ref:r.id,storeId:r.storeId})}save();render();toast(`Delivered ${l.length} job(s) to ${ST(e.dataset.s).name}.`)},
 trStep:e=>{const t=S.transfers.find(x=>x.id===e.dataset.t),s=e.dataset.s;const it=t.items[0];
  if(s==='shipped'){if(qty(t.from,it.pid)<it.qty){toast(`${ST(t.from).name} only has ${qty(t.from,it.pid)}.`);return}addStock(t.from,it.pid,-it.qty)}
  if(s==='received')addStock(t.to,it.pid,it.qty);
  t.status=s;t.history.push({at:Date.now(),by:me().id,status:s});const w={shipped:'dispatched',received:'received',declined:'declined'}[s];
  log('TRANSFER',`${t.id} ${w}: ${it.qty} × ${P(it.pid).name} (${ST(t.from).name} → ${ST(t.to).name})`,{pid:it.pid,storeId:s==='received'?t.to:t.from,ref:t.id});save();render();toast(`${t.id} ${w}.`)},
 copyLog:()=>{const rows=logFiltered();copyText(['when,type,what,employee,store',...rows.map(l=>[new Date(l.at).toISOString(),l.type,l.msg,U(l.by).name,ST(l.storeId).name].map(csvCell).join(','))].join('\n'),'Activity log')},
 storeForm:e=>storeForm(e.dataset.s), userForm:()=>userForm(),
 toggleUser:e=>{const u=U(e.dataset.u);u.active=!u.active;log('USER',`${u.active?'Enabled':'Disabled'} account for ${u.name}`,{storeId:u.storeId||'all'});save();render()},
 labelsDone:()=>{const n=UI.lbl.items.reduce((a,i)=>a+(+i.copies||0),0);if(n)log('LABEL',`Label sheet prepared: ${n} labels (${UI.lbl.items.length} products)`,{pid:UI.lbl.items.length===1?UI.lbl.items[0].pid:null});save();closeModal()}};
function saleReceiptData(s){return{title:'SALES RECEIPT',no:s.id,at:s.at,by:s.by,storeId:s.storeId,customer:s.customerId?C(s.customerId):null,lines:s.items.map(i=>({name:P(i.pid).name,left:`${i.qty} × ${money(i.price)}${i.list&&i.price<i.list?' (was '+money(i.list)+')':''}`,amt:money(i.qty*i.price)})),
 totals:[['Subtotal',money(s.total)],...(s.pay.credit?[['Store credit','−'+money(s.pay.credit)]]:[]),...(s.pay.cash?[['Paid cash',money(s.pay.cash)]]:[]),...(s.pay.card?[['Paid card',money(s.pay.card)]]:[]),['Total',money(s.total),true]],footer:'Thank you! Keep this receipt for returns.'}}

const ON={
 lblOpt:()=>{S.settings.labelMode=val('lblMode');S.settings.labelSize=val('lblSize');save(true);renderLabels()},
 lblCopies:e=>{UI.lbl.items[+e.dataset.ix].copies=Math.max(0,parseInt(e.value)||0);renderLabels()},
 declChange:e=>{const d=parseFloat(e.value),sys=+e.dataset.sys;const diff=r2(d-sys);$('#declDiff').innerHTML=!isNaN(d)&&Math.abs(diff)>.004?`<div class="note">${diff<0?`${money(-diff)} less than the system counted`:`${money(diff)} more than the system counted`}. A note is required.</div>`:'';$('#noteReq').textContent=Math.abs(diff)>.004?'(required)':'(optional)'},
 pickStore:e=>{S.session.storeId=e.value;save();render()},
 custSearch:e=>{const f=e.dataset.for||'pos';const m=custMatches(e.value);$('#custRes').innerHTML=m.length?`<div class="stack" style="gap:4px;margin-top:6px">${m.map(c=>`<button class="btn" style="justify-content:space-between;white-space:normal;text-align:left" data-act="pickCust" data-c="${c.id}" data-for="${f}"><span>${esc(c.name)} <span class="small muted">${esc(c.phone)}</span></span><span class="num">${money(c.credit)}</span></button>`).join('')}</div>`:e.value.length>2?'<div class="small muted" style="margin-top:6px">No match. Add them as a new customer.</div>':''},
 useCredit:e=>{UI.useCredit=e.checked;render()},
 payTick:()=>{UI.payCash=$('#payCash').checked;UI.payCard=$('#payCard').checked;render()},
 cashPart:e=>{UI.cashPart=parseFloat(e.value)||0;render()},
 prodSearch:e=>{UI.q=e.value;$('#prodResults').innerHTML=productRows()},
 prodFilter:e=>{UI[e.dataset.k]=e.value;$('#prodResults').innerHTML=productRows()},
 selOne:e=>{UI.sel=UI.sel||{};UI.sel[e.dataset.pid]=e.checked;render()},
 selAll:e=>{UI.sel=UI.sel||{};$$('.sel').forEach(c=>UI.sel[c.dataset.pid]=e.checked);render()},
 csvFile:e=>{const f=e.files[0];if(!f)return;const r=new FileReader();r.onload=()=>startImport(r.result,f.name);r.readAsText(f)},
 impField:e=>{UI.imp[e.dataset.k]=e.value},
 mapCol:e=>{UI.imp.map[e.dataset.k]=+e.value;render()},
 impLine:e=>{const l=UI.imp.lines[+e.dataset.i];const k=e.dataset.k;l[k]=k==='rec'?Math.max(0,parseInt(e.value)||0):e.value;if(k==='rec'&&l.rec===l.ord)l.reason='';render()},
 impPrint:e=>{UI.imp.printAfter=e.checked},
 catLevel:e=>{const v=Math.max(0,parseInt(e.value)||0);const k=e.dataset.k,c=e.dataset.c;const was=S.settings[k][c];if(was===v)return;S.settings[k][c]=v;log('PRODUCT',`${k==='catMin'?'Category minimum':'Default alert level'} for ${c} changed ${was} → ${v}`,{storeId:'all'});save();render()},
 retItem:e=>{const i=UI.ret.items[+e.dataset.i];i[e.dataset.k]=e.value;if(e.dataset.k!=='note')render()},
 retAdj:e=>{UI.ret.adjust=e.value;render()}, retAdjNote:e=>{UI.ret.adjustNote=e.value},
 useOld:e=>{UI.ret.useOld=e.checked;render()},
 retPay:e=>{const o=e.dataset.k==='payCash'?'payCard':'payCash';UI.ret[e.dataset.k]=e.checked;if(e.checked)UI.ret[o]=false;render()},
 exItem:e=>{UI.ret.exch[+e.dataset.i].price=e.value;render()},
 cq:e=>{UI.cq=e.value;render()}, repF:e=>{UI.repF=e.value;render()}, xq:e=>{UI.xq=e.value;render()},
 logF:e=>{UI.logF[e.dataset.k]=e.value;render()}};

const FORM={
 scanSell:f=>{const inp=$('#scanIn');const p=findByCode(inp.value);if(!p){UI.scanErr=`No product found for "${inp.value}". Check the label, or search it on the Products page.`;UI.lastHit=null}else addToCart(p);render()},
 scanReturn:()=>{const p=findByCode(val('retScan'));if(!p){toast('No product found for that code.');return}UI.ret.items.push({pid:p.id,value:p.price,condition:'resell',note:''});render()},
 scanExch:()=>{const p=findByCode(val('exScan'));if(!p){toast('No product found for that code.');return}UI.ret.exch.push({pid:p.id,price:p.price});render();setTimeout(()=>{const x=$('#exScan');x&&x.focus()},40)},
 findRepair:()=>{const q=val('repScan').trim().toUpperCase();const r=S.repairs.find(x=>x.id===q||x.id===('RP-'+q)||x.imei===q);if(r)repairModal(r.id);else toast('No repair with that ticket or IMEI.')},
 saveProduct:f=>{const g=k=>val('f_'+k).trim();const id=f.dataset.p;const data={name:g('name'),category:g('category'),brand:g('brand'),model:g('model'),vendor:g('vendor'),vendorSku:g('vendorSku'),mpn:g('mpn'),upc:g('upc'),cost:r2(parseFloat(g('cost'))||0)};
  const pr=parseFloat(g('price'));data.manualPrice=!isNaN(pr);data.price=isNaN(pr)?sellPrice(data.cost,data.category):r2(pr);const th=g('threshold');data.threshold=th===''?null:+th;
  const dup=S.products.find(p=>p.vendorSku===data.vendorSku&&p.id!==id);if(dup){toast(`Vendor SKU ${data.vendorSku} already belongs to "${dup.name}".`);return}
  if(id){const p=P(id);const ch=Object.keys(data).filter(k=>String(p[k]??'')!==String(data[k]??''));Object.assign(p,data);if(ch.length)log('PRODUCT',`Edited ${p.name}: ${ch.join(', ')} changed`,{pid:p.id});save();closeModal();render();productDrawer(id);return}
  const n=S.products.length+1+Math.floor(Math.random()*1e5);const p={id:uid('p'),ean:ean13(n),...data,createdAt:Date.now()};S.products.push(p);const q=Math.max(0,parseInt(val('f_qty'))||0);const sid=curStore();
  log('PRODUCT',`Added manually: ${p.name} (${p.vendor} ${p.vendorSku})`,{pid:p.id});
  if(sid!=='all'){addStock(sid,p.id,q);log('RECEIVE',`Received ${q} × ${p.name} (manual entry) — now ${qty(sid,p.id)} in store`,{pid:p.id})}
  const pr_=$('#f_print')&&$('#f_print').checked;save();closeModal();render();toast('Product added.');if(pr_&&q)openLabels([{pid:p.id,copies:q}],'manual')},
 saveCustomer:f=>{const c={id:uid('c'),name:val('c_name').trim(),email:val('c_email').trim(),phone:val('c_phone').trim(),nid:val('c_nid').trim(),credit:0,createdAt:Date.now()};
  const dup=S.customers.find(x=>x.email.toLowerCase()===c.email.toLowerCase()||x.phone.replace(/\D/g,'')===c.phone.replace(/\D/g,'')||x.nid.replace(/\s/g,'').toLowerCase()===c.nid.replace(/\s/g,'').toLowerCase());
  if(dup){toast(`${dup.name} already has that email, phone or ID. Using the existing record.`);closeModal();pickCustomer(dup.id,f.dataset.for);return}
  S.customers.push(c);log('CREDIT',`New customer ${c.name} (${c.phone})`);save();closeModal();if(f.dataset.for==='list'){render();customerModal(c.id)}else pickCustomer(c.id,f.dataset.for)},
 saveRepair:f=>{const dmg=$$('.rdmg').filter(x=>x.checked).map(x=>x.value);if(!dmg.length){toast('Tick at least one damaged part.');return}
  const id='RP-'+(++S.seq.repair),now=Date.now(),next=val('r_next');const r={id,storeId:curStore(),customer:val('r_customer').trim(),phone:val('r_phone').trim(),device:val('r_device').trim(),imei:val('r_imei').trim(),damage:dmg,desc:val('r_desc').trim(),status:'intake',createdAt:now,by:me().id,expected:val('r_expected')||null,tech:val('r_tech'),complexity:'',repairCost:null,shipCost:null,techNotes:'',history:[{at:now,by:me().id,status:'intake',note:'Checked in at counter'}]};
  if(next==='dispatch'){r.status='dispatch';r.history.push({at:now+1,by:me().id,status:'dispatch',note:'Expected back '+fmtD(r.expected)})}
  S.repairs.push(r);log('REPAIR',`${id} checked in: ${r.device} for ${r.customer} — ${dmg.join(', ')}${next==='dispatch'?` · dispatched to ${U(r.tech).name}, expected ${fmtD(r.expected)}`:''}`,{ref:id});save();closeModal();render();ACT.repLabel({dataset:{r:id}})},
 saveTransfer:f=>{const pid=f.dataset.p,from=f.dataset.from,q=parseInt(val('t_qty'))||0;if(q<1||q>qty(from,pid)){toast(`Enter between 1 and ${qty(from,pid)}.`);return}
  const t={id:'TR-'+(++S.seq.transfer),from,to:curStore(),items:[{pid,qty:q}],status:'requested',by:me().id,at:Date.now(),note:val('t_note'),history:[{at:Date.now(),by:me().id,status:'requested'}]};S.transfers.push(t);
  log('TRANSFER',`${t.id} requested ${q} × ${P(pid).name} from ${ST(from).name}`,{pid});save();closeModal();UI.view='exchange';render();toast(`Request ${t.id} sent to ${ST(from).name}.`)},
 saveUser:f=>{const sup=me().role==='super';const role=val('u_role');const u={id:uid('u'),name:val('u_name').trim(),email:val('u_email').trim(),role,storeId:role==='tech'?null:(sup?val('u_store'):me().storeId),active:true};S.users.push(u);log('USER',`Created ${ROLE_NAME[role]} account for ${u.name}${u.storeId?' at '+ST(u.storeId).name:''}`,{storeId:u.storeId||'all'});save();closeModal();render();toast(u.name+' added.')},
 saveStore:f=>{const id=f.dataset.s;const d={name:val('s_name').trim(),address:val('s_address').trim(),phone:val('s_phone').trim()};if(id){Object.assign(ST(id),d);log('USER',`Store details updated: ${d.name}`,{storeId:id})}else{const s={id:uid('s'),...d};S.stores.push(s);S.stock[s.id]={};S.alertState[s.id]={};log('USER',`New store created: ${d.name}`,{storeId:s.id})}save();closeModal();UI.tab.admin='stores';render()}};

/* ---- wiring ---- */
document.addEventListener('click',ev=>{const el=ev.target.closest('[data-act]');if(!el)return;if(el.tagName==='A')ev.preventDefault();const f=ACT[el.dataset.act];if(f)f(el,ev)});
const CHANGE_ONLY=['catLevel','lblCopies'];
const onEv=ev=>{const el=ev.target;const k=el.dataset&&el.dataset.on;if(!k)return;const isText=['text','search','email','tel','number','date'].includes(el.type)||el.tagName==='TEXTAREA';
 if(CHANGE_ONLY.includes(k)){if(ev.type!=='change')return}else if(isText?ev.type!=='input':ev.type!=='change')return;ON[k]&&ON[k](el,ev)};
document.addEventListener('input',onEv);document.addEventListener('change',onEv);
document.addEventListener('submit',ev=>{const f=ev.target;ev.preventDefault();if(f.dataset.form&&FORM[f.dataset.form])FORM[f.dataset.form](f)});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&$('#modal').innerHTML)closeModal()});
