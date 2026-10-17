/* ============ Counterstock — core ============ */
const KEY='counterstock.v3';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(n<0?'−':'')+'$'+Math.abs(+n||0).toFixed(2);
const r2=n=>Math.round((+n||0)*100)/100;
let _seq=0; const uid=p=>p+(Date.now().toString(36).slice(-5))+(++_seq).toString(36)+Math.random().toString(36).slice(2,5);
const DAY=864e5;
const fmtDT=t=>new Date(t).toLocaleString('en-CA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const fmtD=t=>t?new Date(t).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'}):'—';
const isoD=t=>new Date(t).toISOString().slice(0,10);
const FRAMED=(()=>{try{return window.self!==window.top}catch(e){return true}})();
const ROLE_NAME={super:'Super Admin',admin:'Store Admin',staff:'Staff',tech:'Senior Technician'};
const CATS=['Screens','Batteries','Back Glass','Small Parts','Cases','Cables & Chargers','Audio & Accessories','Devices'];
const DAMAGE=['Screen / display','Battery','Charging port','Back glass','Camera','Speaker / mic','Water damage','No power / board','Software','Other'];
const REPAIR_FLOW=[
  ['intake','Received in shop'],['dispatch','Dispatched for repair'],['tech','With technician'],
  ['fixed','Fixed'],['notfix','Not repairable'],['returned','Back in shop'],['collected','Collected by customer']];
const REPAIR_LABEL=Object.fromEntries(REPAIR_FLOW);
const LOG_TYPES={SALE:'Scan out / sale',RECEIVE:'Stock received',IMPORT:'CSV upload',ADJUST:'Stock adjustment',PRODUCT:'Product change',
  RETURN:'Customer return',CREDIT:'Store credit',REPAIR:'Repair',TRANSFER:'Store exchange',SHIFT:'Shift & cash',USER:'Users & stores',LABEL:'Labels printed',ALERT:'Inventory alert'};

/* ---- seeded random for demo data ---- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---- EAN-13 for in-store items: prefix 2xx is reserved for internal use, so labels never clash with retail UPCs ---- */
function ean13(n){const base=('200'+String(n).padStart(9,'0')).slice(0,12);let s=0;for(let i=0;i<12;i++)s+=(+base[i])*(i%2?3:1);return base+((10-s%10)%10)}
function sellPrice(cost,cat){const m={Screens:2.1,Batteries:2.6,'Back Glass':3,'Small Parts':3.5,Cases:1.75,'Cables & Chargers':2.6,'Audio & Accessories':1.7,Devices:1.18}[cat]||2;let p=cost*m;p=p<10?Math.ceil(p)-0.01:Math.ceil(p/5)*5-0.01;return r2(Math.max(p,4.99))}

let S=null;
function load(){try{const raw=localStorage.getItem(KEY);if(raw){S=JSON.parse(raw);if(S&&S.v===3)return}}catch(e){}S=seed();save(true)}
function save(skipAlerts){if(!skipAlerts)syncAlerts();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ---- lookups ---- */
const P=id=>S.products.find(p=>p.id===id);
const U=id=>S.users.find(u=>u.id===id)||{name:'System',role:'staff'};
const ST=id=>S.stores.find(s=>s.id===id)||{name:'All stores',id:'all'};
const C=id=>S.customers.find(c=>c.id===id);
const me=()=>U(S.session.userId);
const curStore=()=>S.session.storeId;
const qty=(sid,pid)=>(S.stock[sid]&&S.stock[sid][pid])||0;
const tracked=(sid,pid)=>S.stock[sid]&&pid in S.stock[sid];
function addStock(sid,pid,d){S.stock[sid]=S.stock[sid]||{};S.stock[sid][pid]=(S.stock[sid][pid]||0)+d}
const totalQty=pid=>S.stores.reduce((a,s)=>a+qty(s.id,pid),0);
function findByCode(code){code=String(code||'').trim().replace(/^'/,'');if(!code)return null;const lc=code.toLowerCase();
  return S.products.find(p=>p.ean===code||p.vendorSku===code||(p.upc&&p.upc===code)||(p.mpn&&p.mpn.toLowerCase()===lc))||null}
function log(type,msg,o={}){S.log.unshift({id:uid('L'),at:o.at||Date.now(),type,msg,by:o.by||(S.session&&S.session.userId)||'sys',storeId:o.storeId??curStore(),pid:o.pid||null,ref:o.ref||null})}
const threshold=p=>p.threshold??(S.settings.catThreshold[p.category]??2);

/* ---- inventory alerts (derived; raised/cleared events go to the activity log) ---- */
function computeAlerts(sid){const out=[];if(!sid||sid==='all')return S.stores.flatMap(s=>computeAlerts(s.id));
  const st=S.stock[sid]||{};
  for(const pid in st){const p=P(pid);if(!p)continue;const q=st[pid],t=threshold(p);if(q<=t)out.push({key:'p:'+pid,kind:'product',sid,pid,p,q,t,cat:p.category})}
  const byCat={};for(const pid in st){const p=P(pid);if(p)byCat[p.category]=(byCat[p.category]||0)+st[pid]}
  for(const cat in S.settings.catMin){const min=S.settings.catMin[cat];if(!min)continue;const q=byCat[cat]||0;if(q<min)out.push({key:'c:'+cat,kind:'category',sid,cat,q,t:min})}
  return out}
function syncAlerts(){S.alertState=S.alertState||{};for(const s of S.stores){const prev=S.alertState[s.id]||{};const now={};
  for(const a of computeAlerts(s.id)){now[a.key]=prev[a.key]||Date.now();if(!prev[a.key])log('ALERT',`Low stock: ${a.kind==='product'?a.p.name:'category '+a.cat} — ${a.q} left (alert at ${a.kind==='product'?'≤ '+a.t:'< '+a.t})`,{storeId:s.id,pid:a.pid,by:'sys'})}
  for(const k in prev)if(!now[k]){const pid=k.startsWith('p:')?k.slice(2):null;const p=pid&&P(pid);log('ALERT',`Alert cleared: ${p?p.name:'category '+k.slice(2)} back above threshold (now ${p?qty(s.id,pid):''})`.replace(' (now )',''),{storeId:s.id,pid,by:'sys'})}
  S.alertState[s.id]=now}}

/* ---- shifts ---- */
const openShift=(uid_=S.session&&S.session.userId)=>S.shifts.find(x=>x.userId===uid_&&!x.closeAt);
function shiftCash(sh){let cash=0,card=0,refunds=0;for(const s of S.sales)if(s.shiftId===sh.id){cash+=s.pay.cash;card+=s.pay.card}
  for(const r of S.returns)if(r.shiftId===sh.id&&r.collected){cash+=r.collected.cash||0;card+=r.collected.card||0}
  return{cash:r2(cash),card:r2(card)}}

/* ============ demo seed (built from the vendor files the client shared) ============ */
function seed(){
  const R=rng(20261016), now=Date.now(), ri=(a,b)=>a+Math.floor(R()*(b-a+1)), pick=a=>a[Math.floor(R()*a.length)];
  const D={v:3,stores:[
    {id:'s1',name:'Douglas St',address:'1150 Douglas St, Unit 219, Victoria BC V8W 3M9',phone:'778-869-4006'},
    {id:'s2',name:'Hillside Ave',address:'1644 Hillside Ave, Unit 124A, Victoria BC V8T 2C5',phone:'778-858-6588'},
    {id:'s3',name:'Victoria North',address:'Victoria BC V8P 1A4',phone:''},
    {id:'s4',name:'Park Royal',address:'2002 Park Royal South, West Vancouver BC V7T 2W4',phone:'236-833-1038'}],
   users:[
    {id:'u0',name:'Owner',role:'super',storeId:null,email:'owner@example.com',active:true},
    {id:'u1',name:'Priya Sharma',role:'admin',storeId:'s1',email:'priya@example.com',active:true,rate:24},
    {id:'u2',name:'Daniel Wong',role:'admin',storeId:'s2',email:'daniel@example.com',active:true,rate:24},
    {id:'u3',name:'Aman Gill',role:'staff',storeId:'s1',email:'aman@example.com',active:true,rate:19},
    {id:'u4',name:'Sofia Reyes',role:'staff',storeId:'s2',email:'sofia@example.com',active:true,rate:19},
    {id:'u5',name:'Tom Becker',role:'staff',storeId:'s4',email:'tom@example.com',active:true,rate:18.5},
    {id:'u6',name:'Kiran Dhillon',role:'staff',storeId:'s3',email:'kiran@example.com',active:true,rate:18.5},
    {id:'u7',name:'Ravi Patel',role:'tech',storeId:null,email:'ravi@example.com',active:true}],
   products:[],stock:{s1:{},s2:{},s3:{},s4:{}},batches:[],sales:[],customers:[],credits:[],returns:[],repairs:[],transfers:[],shifts:[],log:[],
   settings:{catThreshold:{Screens:0,Batteries:0,'Back Glass':0,'Small Parts':0,Cases:0,'Cables & Chargers':2,'Audio & Accessories':0,Devices:0},
             catMin:{Screens:6,Batteries:6,'Back Glass':0,'Small Parts':0,Cases:20,'Cables & Chargers':10,'Audio & Accessories':0,Devices:2},labelSize:'50x25',labelMode:'both',markup:40,markupType:'pct',discType:'pct',discMax:10,blindClose:true},expenses:[],empCredits:[],counts:[],
   seq:{receipt:1040,repair:310,sale:5200,transfer:12},session:null,alertState:{}};
  S=D; const L=(type,msg,o)=>log(type,msg,o);
  let n=1;
  for(const x of SEED.products){D.products.push({id:'p'+n,ean:ean13(n),vendorSku:x.vendorSku,upc:x.upc||'',mpn:x.mpn||'',name:x.name,category:x.category,brand:x.brand||'',model:x.model||'',vendor:x.vendor,cost:x.cost,price:sellPrice(x.cost,x.category),threshold:null,createdAt:now-40*DAY});n++}
  const devices=[['iPhone 17 Pro Max 256GB — Cosmic Orange (sample)',1420],['iPhone 17 Pro 256GB — Deep Blue (sample)',1290],['iPhone 17 256GB — Black (sample)',995],['Samsung Galaxy S25 Ultra 256GB (sample)',1250],['Google Pixel 10 Pro 128GB (sample)',1080]];
  for(const [nm,c] of devices){D.products.push({id:'p'+n,ean:ean13(n),vendorSku:'DEV-'+n,upc:'',mpn:'',name:nm,category:'Devices',brand:nm.split(' ')[0],model:nm.split(' (')[0].replace(/ \d+GB.*$/,''),vendor:'Sample data',cost:c,price:sellPrice(c,'Devices'),threshold:null,createdAt:now-30*DAY});n++}
  const bySku=Object.fromEntries(D.products.map(p=>[p.vendorSku,p]));
  const storeFor=b=>{if(b.vendor==='Hitfar')return b.ref==='91252'?'s2':'s1';if(b.vendor==='Cesium Telecom')return 's2';return /V8P/.test(b.zip||'')?'s3':'s1'};
  const recv=['u3','u4','u1','u6','u2'];
  SEED.batches.forEach((b,i)=>{const sid=storeFor(b);const at=new Date(b.date).getTime()+DAY*1+ri(9,17)*36e5;const by=sid==='s2'?pick(['u4','u2']):sid==='s3'?'u6':pick(['u3','u1']);
    const lines=b.lines.map(l=>{const p=bySku[l.vendorSku];let rec=l.qty;let reason='';
      if(b.ref==='401613355'&&l.vendorSku==='107085008839'){rec=7;reason='Short shipped'}
      if(b.ref==='91252'&&p&&/Symmetry Clear w\/MagSafe \+\s*Camera Control Case - Clear/.test(p.name)&&/18 Pro Max/.test(p.name)){rec=2;reason='Damaged in transit'}
      return{pid:p.id,ordered:l.qty,received:rec,cost:l.cost,reason}});
    const B={id:'b'+(i+1),storeId:sid,vendor:b.vendor,ref:b.ref,date:b.date,tracking:b.tracking||'',file:b.vendor==='Parts Supplier (web export)'?'Orders_2026-10-13.csv':'Template upload ('+b.vendor+')',by,at,lines,shipping:b.shipping||0,tax:b.tax||0};
    D.batches.push(B);
    for(const l of lines)addStock(sid,l.pid,l.received);
    L('IMPORT',`Uploaded ${B.file} — ${b.vendor} order ${b.ref}: ${lines.length} lines, ${lines.reduce((a,l)=>a+l.ordered,0)} units ordered`,{at,by,storeId:sid,ref:B.id});
    for(const l of lines){if(l.received!==l.ordered)L('ADJUST',`Receiving adjustment on ${b.vendor} ${b.ref}: ordered ${l.ordered}, received ${l.received} (${l.reason}) — ${P(l.pid).name}`,{at:at+6e4,by,storeId:sid,pid:l.pid,ref:B.id})}
  });
  // spread some stock to other stores so cross-store search has something to find
  for(const p of D.products){for(const s of D.stores){if(R()<.28&&!tracked(s.id,p.id))addStock(s.id,p.id,ri(1,4))}}
  for(const p of D.products.filter(p=>p.category==='Devices')){D.stock.s1[p.id]=0;D.stock.s2[p.id]=ri(1,3);D.stock.s4[p.id]=ri(0,2);D.stock.s3[p.id]=ri(0,1)}
  D.stock.s2[D.products.find(p=>/17 Pro Max 256/.test(p.name)).id]=2;
  // customers
  D.customers=[
    {id:'c1',name:'Jordan Lee',email:'jordan.lee@example.com',phone:'250-555-0142',nid:'BC-DL 7719042',credit:0,createdAt:now-12*DAY},
    {id:'c2',name:'Mei Chen',email:'mei.chen@example.com',phone:'250-555-0188',nid:'BC-DL 6623110',credit:0,createdAt:now-6*DAY},
    {id:'c3',name:'Lucas Martin',email:'lucas.m@example.com',phone:'604-555-0119',nid:'PP GA448812',credit:0,createdAt:now-3*DAY}];
  // 60 days of sales history so reports have real shape (weekday rhythm, busy afternoons)
  const staffBy={s1:['u3','u1'],s2:['u4','u2'],s3:['u6'],s4:['u5']};const storeBase={s1:17,s2:15,s3:12,s4:12};
  const HOURS=[10,11,11,12,12,12,13,13,14,14,15,15,16,16,16,17,17,18,19,20];
  const notes={'2s1':['Paid $40 cash to courier for urgent screen delivery (receipt in drawer)',-40],'9s2':['$20 for cleaning supplies from the dollar store',-20],'16s4':['Short $5 — likely wrong change given',-5],'23s1':['Customer paid $10 extra for case, refunded next day',10]};
  for(let d=100;d>=0;d--){const day=new Date(now-d*DAY);day.setHours(0,0,0,0);const dow=day.getDay();const wk=dow===6?1.4:dow===5?1.2:dow===0?0.65:1;
   for(const s of D.stores){const u=staffBy[s.id][d%staffBy[s.id].length];const open=day.getTime()+9.5*36e5;if(open>now)continue;
    const sh=d>0?{id:uid('SH'),userId:u,storeId:s.id,openAt:open,opening:25,closeAt:null,expected:0,declared:0,note:''}:null;if(sh)D.shifts.push(sh);
    const ids=Object.keys(D.stock[s.id]);const k=Math.round(storeBase[s.id]*wk*(0.55+R()*0.9));
    for(let j=0;j<k;j++){const at=day.getTime()+pick(HOURS)*36e5+ri(0,59)*6e4;if(at>now-5*6e4)continue;
      const n=R()<.72?1:R()<.7?2:3;const items=[];for(let m=0;m<n;m++){const pid=pick(ids);const p=P(pid);if(!p||(p.category==='Devices'&&R()<.9))continue;const ex=items.find(i=>i.pid===pid);if(ex)ex.qty++;else items.push({pid,qty:1,price:p.price})}
      if(!items.length)continue;const tot=r2(items.reduce((a,i)=>a+i.qty*i.price,0));const cash=R()<.42;
      const sale={id:'S'+(++D.seq.sale),storeId:s.id,at,by:u,shiftId:sh?sh.id:null,items,total:tot,pay:{cash:cash?tot:0,card:cash?0:tot,credit:0},customerId:null};D.sales.push(sale);
      if(d<=2)L('SALE',`Scanned out ${items.map(i=>i.qty+' × '+P(i.pid).name).join(', ')} — ${money(tot)} (${cash?'Cash':'Card'})`,{at,by:u,storeId:s.id,pid:items[0].pid,ref:sale.id})}
    if(sh&&R()<.22){const t=pick([['Courier for urgent parts',ri(15,45)],['Cleaning supplies',ri(8,25)],['Coffee & water for shop',ri(10,22)],['Screen protectors from local supplier',ri(20,60)],['Parking for parts pickup',ri(6,14)]]);D.expenses.push({id:uid('E'),storeId:s.id,at:open+ri(2,7)*36e5,by:u,type:'expense',cat:'Shop supplies',amount:t[1],method:'cash',note:t[0],shiftId:sh.id})}
    if(sh){const c=shiftCash(sh);sh.closeAt=open+9.5*36e5;sh.counted=r2(sh.opening+c.cash);sh.expected=r2(sh.opening+c.cash);sh.cashCollected=c.cash;sh.declared=c.cash;const nt=notes[d+s.id];
      if(nt){sh.declared=r2(Math.max(0,c.cash+nt[1]));sh.note=nt[0]}sh.counted=r2(sh.opening+sh.declared);
      if(d<=3){L('SHIFT',`${U(u).name} opened shift with ${money(sh.opening)} opening balance`,{at:open,by:u,storeId:s.id});L('SHIFT',`${U(u).name} closed shift — cash deposit ${money(sh.declared)}${sh.note?` (system ${money(c.cash)}; note: ${sh.note})`:''}`,{at:sh.closeAt,by:u,storeId:s.id})}}}}
  D.customers.push(
    {id:'c4',name:'Priyanka Rao',email:'priyanka.r@example.com',phone:'250-555-0193',nid:'BC-DL 5512870',credit:0,createdAt:now-50*DAY},
    {id:'c5',name:'Ethan Brooks',email:'ethan.b@example.com',phone:'250-555-0127',nid:'BCSC 9918273',credit:0,createdAt:now-44*DAY},
    {id:'c6',name:'Amira Haddad',email:'amira.h@example.com',phone:'604-555-0175',nid:'PP HB220931',credit:0,createdAt:now-30*DAY},
    {id:'c7',name:'Noah Fischer',email:'noah.f@example.com',phone:'250-555-0166',nid:'BC-DL 3301456',credit:0,createdAt:now-21*DAY});
  // returns spread over the period; some credit later used on a sale
  for(let i=0;i<9;i++){const sid=pick(['s1','s2','s3','s4']);const cid=pick(['c4','c5','c6','c7','c1','c3']);const ids=Object.keys(D.stock[sid]).filter(pid=>P(pid).category!=='Devices');const p=P(pick(ids));const at=now-ri(4,55)*DAY+ri(11,18)*36e5;const by=staffBy[sid][0];
    const good=R()<.6;const r={id:uid('R'),receipt:'CR-'+(++D.seq.receipt),storeId:sid,at,by,customerId:cid,items:[{pid:p.id,value:p.price,condition:good?'resell':'faulty',restock:good,note:good?'Changed mind / wrong model':'Not working'}],exch:[],adjust:0,adjustNote:'',net:p.price,collected:null};
    D.returns.push(r);D.credits.push({id:uid('CL'),customerId:cid,at,storeId:sid,by,type:'return',amount:p.price,ref:r.receipt,note:'Returned '+p.name});
    L('RETURN',`Return ${r.receipt}: ${p.name} — ${money(p.price)} store credit${good?', item restocked':', faulty'}`,{at,by,storeId:sid,pid:p.id,ref:r.receipt});
    if(i%2===0){const at2=at+ri(2,6)*DAY;if(at2<now){const q=D.products.find(x=>x.category==='Cases'&&x.price>=p.price*0.6)||p;const use=Math.min(p.price,q.price);const sale={id:'S'+(++D.seq.sale),storeId:sid,at:at2,by,shiftId:null,items:[{pid:q.id,qty:1,price:q.price}],total:q.price,pay:{cash:0,card:r2(q.price-use),credit:use},customerId:cid};D.sales.push(sale);
      D.credits.push({id:uid('CL'),customerId:cid,at:at2,storeId:sid,by,type:'redeem',amount:-use,ref:sale.id,note:'Used on sale '+sale.id})}}}
  // the return + exchange example from the brief: bought for $500, took a $200 item, keeps $300 credit
  const dev=D.products.find(p=>/Galaxy S25 Ultra 256/.test(p.name));
  const caseP=D.products.find(p=>/S25 Ultra Otterbox Commuter Series Case - Black/.test(p.name))||D.products.find(p=>p.category==='Cases');
  const ret={id:uid('R'),receipt:'CR-'+(++D.seq.receipt),storeId:'s2',at:now-2*DAY+3e6,by:'u4',customerId:'c2',items:[{pid:dev.id,value:500,condition:'faulty',restock:false,note:'Purchased at $500; screen flicker'}],exch:[{pid:caseP.id,price:200}],adjust:0,adjustNote:'',net:300,collected:null};
  D.returns.push(ret);
  D.credits.push({id:uid('CL'),customerId:'c2',at:ret.at,storeId:'s2',by:'u4',type:'return',amount:500,ref:ret.receipt,note:'Returned '+dev.name});
  D.credits.push({id:uid('CL'),customerId:'c2',at:ret.at+1,storeId:'s2',by:'u4',type:'exchange',amount:-200,ref:ret.receipt,note:'Took item in exchange (agreed price $200)'});
  L('RETURN',`Return ${ret.receipt} for Mei Chen: ${dev.name} valued $500.00, exchanged for item at $200.00 — $300.00 left as store credit`,{at:ret.at,by:'u4',storeId:'s2',pid:dev.id,ref:ret.receipt});
  const ret2={id:uid('R'),receipt:'CR-'+(++D.seq.receipt),storeId:'s1',at:now-5*DAY,by:'u3',customerId:'c1',items:[{pid:D.products[3].id,value:D.products[3].price,condition:'resell',restock:true,note:'Wrong model bought'}],exch:[],adjust:0,adjustNote:'',net:D.products[3].price,collected:null};
  D.returns.push(ret2);addStock('s1',D.products[3].id,1);
  D.credits.push({id:uid('CL'),customerId:'c1',at:ret2.at,storeId:'s1',by:'u3',type:'return',amount:ret2.net,ref:ret2.receipt,note:'Returned '+D.products[3].name});
  L('RETURN',`Return ${ret2.receipt} for Jordan Lee: ${D.products[3].name} — ${money(ret2.net)} store credit, item restocked`,{at:ret2.at,by:'u3',storeId:'s1',pid:D.products[3].id,ref:ret2.receipt});
  for(const c of D.customers)c.credit=r2(D.credits.filter(x=>x.customerId===c.id).reduce((a,x)=>a+x.amount,0));
  // repairs across the pipeline
  const rp=(sid,cust,phone,device,dmg,desc,status,ago,extra={})=>{const id='RP-'+(++D.seq.repair);const at=now-ago*DAY;const by=staffBy[sid][0];
    const r={id,storeId:sid,customer:cust,phone,device,imei:String(35)+ri(1e6,9e6)+ri(1e6,9e6),damage:dmg,desc,status:'intake',createdAt:at,by,expected:null,tech:'u7',complexity:'',repairCost:null,shipCost:null,techNotes:'',history:[{at,by,status:'intake',note:'Checked in at counter'}],...extra};
    const flow=['intake','dispatch','tech',(status==='notfix'||extra.bad)?'notfix':'fixed','returned','collected'];const stop=flow.indexOf(status);
    for(let i=1;i<=stop;i++){const t=at+i*DAY*.7;const st=flow[i];r.history.push({at:t,by:['tech','fixed','notfix'].includes(st)?'u7':by,status:st,note:st==='dispatch'?'Cannot be repaired in shop — board level':''});r.status=st;if(st==='dispatch')r.expected=isoD(at+4*DAY)}
    D.repairs.push(r);L('REPAIR',`${id} ${device}: ${REPAIR_LABEL[r.status]}`,{at:r.history.at(-1).at,by:r.history.at(-1).by,storeId:sid,ref:id});return r};
  rp('s1','Ana Duarte','250-555-0170','iPhone 15 Pro',['No power / board'],'No power after drop. Not taking charge.','dispatch',1,{});
  rp('s2','Sam Okafor','250-555-0133','Samsung Galaxy S24 Ultra',['Screen / display','Water damage'],'Green lines on display after water exposure.','dispatch',2,{});
  rp('s4','Chris Novak','604-555-0161','iPhone 14 Pro Max',['Camera'],'Rear camera shakes / buzzes.','tech',3,{complexity:'Complex',repairCost:85,shipCost:12,techNotes:'OIS module replacement, needs parts'});
  rp('s3','Hana Ito','250-555-0109','Google Pixel 8 Pro',['Charging port'],'Charges only at an angle.','fixed',5,{complexity:'Moderate',repairCost:45,shipCost:12,techNotes:'Port replaced, tested 30 min'});
  rp('s1','Victor Hale','250-555-0124','iPhone 12',['No power / board'],'Board short after liquid damage.','notfix',8,{complexity:'Complex',repairCost:0,shipCost:12,techNotes:'CPU area corroded, not repairable'});
  rp('s2','Leah Brooks','250-555-0156','iPhone 13 Pro',['Speaker / mic'],'No sound on calls.','collected',12,{complexity:'Simple',repairCost:30,shipCost:12,techNotes:'Earpiece flex reseated + cleaned'});
  const devs=['iPhone 13','iPhone 14 Pro','Samsung Galaxy S23','iPhone 12 Pro Max','Google Pixel 7','iPhone 15','Samsung Galaxy A54','iPhone 11','Motorola G Power','iPhone 14'];
  for(let i=0;i<14;i++){const sid=pick(['s1','s2','s3','s4']);const bad=R()<.2;const dm=pick([['Screen / display'],['Battery'],['Charging port'],['No power / board'],['Back glass'],['Camera'],['Water damage','No power / board'],['Speaker / mic']]);
    rp(sid,pick(['Kai Morgan','Lena Ortiz','Raj Mehta','Zoe Carter','Omar Siddiqui','Grace Liu','Ben Walsh','Sara Kim']),'250-555-01'+ri(10,99),pick(devs),dm,'Customer reports: '+dm.join(', ').toLowerCase()+'.','collected',ri(10,58),{bad,complexity:pick(['Simple','Moderate','Complex']),repairCost:bad?0:ri(3,12)*10,shipCost:12,techNotes:bad?'Board damage beyond repair':'Repaired and tested'})}
  // a pending store exchange (iPhone 17 Pro Max missing at Douglas St, available at Hillside)
  const ip=D.products.find(p=>/17 Pro Max 256/.test(p.name));
  D.transfers.push({id:'TR-'+(++D.seq.transfer),from:'s2',to:'s1',items:[{pid:ip.id,qty:1}],status:'requested',by:'u3',at:now-3*36e5,note:'Customer waiting — wants it today',history:[{at:now-3*36e5,by:'u3',status:'requested'}]});
  L('TRANSFER',`TR-${D.seq.transfer} requested 1 × ${ip.name} from Hillside Ave`,{at:now-3*36e5,by:'u3',storeId:'s1',pid:ip.id});
  seedOps(D,R,ri,pick,now,staffBy,L);
  D.log.sort((a,b)=>b.at-a.at);
  S=D; S.session=null; syncAlerts();
  for(const s of D.stores){for(const k in S.alertState[s.id])S.alertState[s.id][k]=now-DAY}
  S.log=S.log.filter(l=>!(l.type==='ALERT'&&l.at>now-6e4)); // keep seed log tidy
  return S}
