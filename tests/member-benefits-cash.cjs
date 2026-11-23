
// Run the simulated browser with an isolated, unconfigured Firebase fixture.
// Never boot the real Firebase project while testing local records.
function isolatedAppScript(html) {
  const script = html.split('<script>')[1].split('</script>')[0];
  const configBlock = /\/\* FIREBASE_CONFIG_START \*\/[\s\S]*?\/\* FIREBASE_CONFIG_END \*\//;
  if (!configBlock.test(script)) throw Error('Missing Firebase configuration block in test fixture.');
  return script.replace(configBlock, () => [
    '/* FIREBASE_CONFIG_START */',
    'const CLOUD_CONFIG = {mode: "firebase", workspaceId: "cineplanet-peru", firebase: null};',
    '/* FIREBASE_CONFIG_END */'
  ].join('\n'));
}

const path=require('node:path');const appFile=path.join(__dirname,'..','dist','index.html');
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elements=new Map(),store=new Map();
function element(id){if(!elements.has(id))elements.set(id,{value:id==='visitmovie'?'film-orbita':id==='visitcomplex'?'Cineplanet Cusco':'',innerHTML:'',textContent:'',hidden:false,disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},addEventListener(){},showModal(){this.open=true},close(){this.open=false},focus(){},scrollIntoView(){}});return elements.get(id)}
const sandbox={console,Intl,Date,Number,String,Object,Array,Math,JSON,RegExp,Map,Set,Error,structuredClone,setTimeout:()=>0,clearTimeout(){},TextEncoder,Uint8Array,crypto:require('node:crypto').webcrypto,document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>element('query'),addEventListener(){}},window:{addEventListener(){},print(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},matchMedia:()=>({matches:false})};
const script=isolatedAppScript(fs.readFileSync(appFile,'utf8'));vm.createContext(sandbox);vm.runInContext(script,sandbox);vm.runInContext('startLocalMigration()',sandbox);vm.runInContext('adminUnlocked=true',sandbox);let checks=0;
function check(code){assert.equal(vm.runInContext(code,sandbox),true,code);checks++}
check('Object.keys(data.members).length===0');check('!locked');check("validDate(today())");check("!validDate('2026-02-30')");check("!validDate('2099-01-01')");
vm.runInContext(`globalThis.sample={dni:'01234567',nombre:'Ana Pérez',email:'ana@example.com',tel:'',puntos:10,ajuste:0,catManual:'',alta:today(),visitas:{}}`,sandbox);
check("normalizeMember(sample).dni==='01234567'");check("(()=>{try{normalizeMember({...sample,dni:'123'})}catch{return true}return false})()");check("(()=>{try{normalizeMember({...sample,puntos:-1})}catch{return true}return false})()");check("(()=>{try{normalizeMember({...sample,puntos:1.5})}catch{return true}return false})()");
check("automatic({...sample,ajuste:15})[0]==='Clásico'");check("automatic({...sample,ajuste:16})[0]==='Plata'");check("automatic({...sample,ajuste:30})[0]==='Oro'");check("automatic({...sample,ajuste:60})[0]==='Black'");check("category({...sample,catManual:'Black'})[0]==='Black'");check("visits({...sample,visitas:{[today()]:2,'2020-01-01':2},ajuste:-1})===1");check("visits({...sample,ajuste:-3})===0");check("visits({...sample,visitas:{[startDate()]:1}})===1");
check("parseCSV('DNI,Nombre\\r\\n01234567,\"Ana, Pérez\"')[1][1]==='Ana, Pérez'");check("parseCSV('DNI;Nombre;Correo\\n01234567;\"Ana\\nPérez\";ana@example.com')[1][1]==='Ana\\nPérez'");check("parseCSV('DNI\\tNombre\\n01234567\\tAna')[1][0]==='01234567'");check("parseCSV('\\ufeffDNI,Nombre\\n01234567,\"Ana \"\"A\"\"\"')[1][1]==='Ana \"A\"'");
check("(()=>{try{parseCSV('DNI,Nombre\\n01234567,\"Ana')}catch{return true}return false})()");
check("Object.keys(importCSV('DNI,Nombre\\n01234567,Ana').members).length===1");check("importCSV('DNI,Nombre\\n123,Ana').issues.length===1");check("importCSV('DNI,Nombre\\n01234567,Ana\\n01234567,Ana').duplicates===1");check("Object.keys(importCSV('NIF;Nombre;Correo;Teléfono\\n01234567;Ana;ana@example.com;999999999').members).length===1");
check("commit(d=>{d.members[sample.dni]=sample},'test')");check("JSON.parse(localStorage.getItem(KEY)).members['01234567'].puntos===10");
vm.runInContext("selected='01234567';pointsModal()",sandbox);element('amount').value='11';element('operation').value='-1';element('reason').value='Canje';element('pointsform').onsubmit({preventDefault(){}});check("data.members['01234567'].puntos===10");
element('amount').value='4';element('pointsform').onsubmit({preventDefault(){}});check("data.members['01234567'].puntos===6");check("data.events.length===1");
check("importCSV('DNI,Nombre\\n01234567,Ana').duplicates===1");
check("(()=>{const old=data.members['01234567'].puntos;locked=true;const ok=commit(d=>d.members['01234567'].puntos=999);locked=false;return !ok&&data.members['01234567'].puntos===old})()");
check("(()=>{const old=data.members['01234567'].puntos;const ok=commit(d=>d.members['01234567'].puntos=-1);return !ok&&data.members['01234567'].puntos===old})()");
vm.runInContext('demoToggle()',sandbox);check('demo&&Object.keys(data.members).length===7');check("JSON.parse(localStorage.getItem(KEY)).members['01234567'].puntos===6");vm.runInContext("selected='90000001';detailTab='visitas';render();detailTab='movimientos';render();detailTab='ajustes';render();setView('actividad');setView('guia');demoToggle()",sandbox);check("!demo&&data.members['01234567'].puntos===6");
check("(()=>{const p=importJSON(JSON.stringify({schemaVersion:2,members:{'90000000':{...sample,dni:'90000000'}},events:[]}));return Object.keys(p.members).length===1})()");check("(()=>{try{importJSON('{}')}catch{return true}return false})()");
check("esc('<img onerror=alert(1)>').includes('&lt;')");check("csvCell('=1+1').startsWith(\"\\\"'\")");
// Native submit flow, future dates, daily maximum and removal.
sandbox.FormData=class{get(){return sandbox.visitType}};
vm.runInContext("selected='01234567';visitModal()",sandbox);element('visitdate').value=vm.runInContext('today()',sandbox);sandbox.visitType='1';element('visitform').onsubmit({preventDefault(){}});check("data.members['01234567'].visitas[today()]===1");
vm.runInContext('visitModal()',sandbox);element('visitform').onsubmit({preventDefault(){}});check("data.members['01234567'].visitas[today()]===1");sandbox.visitType='2';element('visitform').onsubmit({preventDefault(){}});check("data.members['01234567'].visitas[today()]===2&&Object.keys(data.members['01234567'].visitas).length===1");
vm.runInContext('visitModal()',sandbox);element('visitdate').value='2099-01-01';element('visitform').onsubmit({preventDefault(){}});check("!data.members['01234567'].visitas['2099-01-01']");
vm.runInContext('deleteModal(today())',sandbox);element('reason').value='Error de registro';element('deleteform').onsubmit({preventDefault(){}});check("Object.keys(data.members['01234567'].visitas).length===0");
vm.runInContext("memberModal();$('dni').value='12345678';$('nombre').value='María López';$('email').value='';$('tel').value='';$('memberform').onsubmit({preventDefault(){}})",sandbox);check("data.members['12345678'].nombre==='María López'");
check("importCSV('dni,nombre,email,telefono,categoria,visitas,puntos\\n87654321,Ana,,,Plata,20,500').members['87654321'].ajuste===20");
check("importCSV('dni,nombre,visitas\\n87654321,Ana,20').notice.includes('permanentes')");
check("(()=>{download=(n,text)=>globalThis.savedCSV=text;exportCSV();data=emptyData();const p=importCSV(savedCSV);return Object.keys(p.members).length===2&&p.members['01234567'].puntos===6})()");
// Structured member ledger: migrate, correct and remove without changing point/visit rules.
vm.runInContext("globalThis.memberId='12345678';globalThis.legacySample={dni:memberId,nombre:'María del Carmen López',email:'maria@example.com',tel:'',alta:'',puntos:120,ajuste:2,catManual:'Plata',visitas:{[today()]:1,'2020-01-01':2}};globalThis.migratedMember=normalizeMember(legacySample)",sandbox);
check("migratedMember.movimientos.length===5&&migratedMember.ledgerVersion===1");
check("migratedMember.puntos===120&&migratedMember.ajuste===2&&migratedMember.catManual==='Plata'&&visits(migratedMember)===3");
check("migratedMember.movimientos.filter(m=>m.type==='visit').every(m=>m.movie===''&&m.complex==='')");
check("migratedMember.movimientos.find(m=>m.type==='points').date===''&&migratedMember.movimientos.every(m=>m.legacy)");
check("(()=>{const s=structuredClone(migratedMember);s.puntos++;try{normalizeMember(s)}catch{return true}return false})()");
check("(()=>{try{normalizeMember({...legacySample,ledgerVersion:1})}catch{return true}return false})()");
check("(()=>{const s=structuredClone(migratedMember);s.movimientos.push({...s.movimientos.find(m=>m.type==='visit'),id:'duplicate-date'});try{ledgerProjection(s.movimientos)}catch{return true}return false})()");
check("(()=>{try{normalizeMovement({...migratedMember.movimientos[0],date:0})}catch{return true}return false})()");
vm.runInContext("data=emptyData();data.members[memberId]=normalizeMember({...legacySample,puntos:0,ajuste:0,catManual:'',visitas:{}});realData=data;selected=memberId;detailTab='movimientos';memberMovementLimit=60;render();globalThis.fullMovieTitle='El extraordinario viaje de una familia a través del universo: la historia completa de un nuevo comienzo';globalThis.yesterday=(()=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)})();",sandbox);
vm.runInContext("W().movies.push({...W().movies[0],id:'test-catalog-long',title:fullMovieTitle},{...W().movies[0],id:'test-catalog-other',title:'Otra historia completa'},{...W().movies[0],id:'test-catalog-ui',title:'Película elegida desde el formulario'})",sandbox);
check("saveVisitMovement(memberId,{date:today(),complex:'Cineplanet Cusco',movie:fullMovieTitle,value:1})");
check("data.members[memberId].movimientos.length===1&&data.members[memberId].visitas[today()]===1&&data.members[memberId].puntos===0");
vm.runInContext("globalThis.firstVisitId=data.members[memberId].movimientos[0].id",sandbox);
check("saveVisitMovement(memberId,{date:today(),complex:'Cineplanet Cusco',movie:fullMovieTitle,value:2})");
check("data.members[memberId].movimientos.length===1&&data.members[memberId].movimientos[0].id===firstVisitId&&visits(data.members[memberId])===2");
check("(()=>{try{saveVisitMovement(memberId,{date:today(),complex:'Cineplanet Cusco',movie:fullMovieTitle,value:1})}catch{return data.members[memberId].movimientos.length===1}return false})()");
check("saveVisitMovement(memberId,{date:yesterday,complex:'Cineplanet San Miguel',movie:'Otra historia completa',value:1})");
check("visits(data.members[memberId])===3&&Object.keys(data.members[memberId].visitas).length===2");
check("(()=>{try{updateMemberMovement(memberId,firstVisitId,{date:yesterday})}catch{return visits(data.members[memberId])===3}return false})()");
check("updateMemberMovement(memberId,firstVisitId,{movie:fullMovieTitle+' (versión extendida)',detail:fullMovieTitle+' (versión extendida)',complex:'Cineplanet Arequipa',visits:1})");
check("visits(data.members[memberId])===2&&data.members[memberId].movimientos.length===2");
check("$('detailtab').innerHTML.includes(fullMovieTitle+' (versión extendida)')&&$('detailtab').innerHTML.includes('Cineplanet Arequipa')");
check("!$('detail').innerHTML.includes('tab-visitas')&&$('detail').innerHTML.includes('Datos y ajustes')");
check("addMemberMovement(memberId,{type:'points',date:today(),complex:'Cineplanet Cusco',detail:'Puntos manuales por promoción',visits:0,points:50})");
vm.runInContext("globalThis.creditId=data.members[memberId].movimientos.find(m=>m.type==='points').id",sandbox);
check("addMemberMovement(memberId,{type:'points',date:today(),complex:'Cineplanet Cusco',detail:'Canje manual de puntos',visits:0,points:-10})");
check("data.members[memberId].puntos===40");
check("addMemberMovement(memberId,{type:'visits',date:today(),complex:'Cineplanet Cusco',detail:'Visitas manuales por regularización',visits:4,points:0})");
check("visits(data.members[memberId])===6&&data.members[memberId].ajuste===4");
check("addMemberMovement(memberId,{type:'category',date:today(),complex:'',detail:'Categoría por revisión manual',category:'Black',visits:0,points:0})");
vm.runInContext("globalThis.categoryId=data.members[memberId].movimientos.find(m=>m.type==='category').id",sandbox);
check("category(data.members[memberId])[0]==='Black'");
check("updateMemberMovement(memberId,categoryId,{category:'Oro',detail:'Categoría corregida por revisión'})");
check("category(data.members[memberId])[0]==='Oro'");
check("removeMemberMovement(memberId,categoryId,'Categoría automática nuevamente')");
check("category(data.members[memberId])[0]==='Clásico'&&data.members[memberId].catManual===''");
check("updateMemberMovement(memberId,creditId,{points:80,detail:'Puntos manuales corregidos'})");
check("data.members[memberId].puntos===70");
vm.runInContext("globalThis.debitId=data.members[memberId].movimientos.find(m=>m.type==='points'&&m.points<0).id",sandbox);
check("removeMemberMovement(memberId,debitId,'Canje registrado por error')");
check("data.members[memberId].puntos===80");
check("addMemberMovement(memberId,{type:'points',date:today(),complex:'',detail:'Nuevo canje manual',visits:0,points:-20})");
check("(()=>{const before=JSON.stringify(data);try{removeMemberMovement(memberId,creditId,'Quitar abono anterior')}catch{return data.members[memberId].puntos===60&&JSON.stringify(data)===before}return false})()");
check("(()=>{const before=JSON.stringify(data);try{updateMemberMovement(memberId,creditId,{points:10})}catch{return data.members[memberId].puntos===60&&JSON.stringify(data)===before}return false})()");
vm.runInContext("globalThis.secondVisitId=data.members[memberId].movimientos.find(m=>m.type==='visit'&&m.date===yesterday).id;globalThis.manualVisitId=data.members[memberId].movimientos.find(m=>m.type==='visits').id",sandbox);
check("removeMemberMovement(memberId,secondVisitId,'Visita registrada por error')");
check("visits(data.members[memberId])===5&&Object.keys(data.members[memberId].visitas).length===1");
check("removeMemberMovement(memberId,manualVisitId,'Ajuste de visitas no corresponde')");
check("visits(data.members[memberId])===1&&data.members[memberId].ajuste===0");
// Native edit dialog corrects metadata and amount in the same movement.
vm.runInContext("editMovementModal(memberId,creditId);$('movementdate').value=today();$('movementcomplex').value='Cineplanet Cusco';$('movementdetail').value='Puntos manuales editados desde la tabla';$('movementsign').value='1';$('movementquantity').value='90';$('editmovementform').onsubmit({preventDefault(){}})",sandbox);
check("data.members[memberId].puntos===70&&data.members[memberId].movimientos.find(m=>m.id===creditId).points===90");
sandbox.visitType='1';
vm.runInContext("visitModal();$('visitdate').value=yesterday;$('visitcomplex').value='Cineplanet Trujillo';$('visitmovie').value='test-catalog-ui';$('visitform').onsubmit({preventDefault(){}})",sandbox);
check("data.members[memberId].movimientos.some(m=>m.movie==='Película elegida desde el formulario'&&m.complex==='Cineplanet Trujillo')");
vm.runInContext("adjustModal();$('adjustdate').value=today();$('adjustcomplex').value='Cineplanet Cusco';$('adjustment').value='5';$('manualcat').value='Plata';$('reason').value='Ajuste total y categoría por regularización';$('adjustform').onsubmit({preventDefault(){}})",sandbox);
check("data.members[memberId].ajuste===5&&data.members[memberId].catManual==='Plata'&&visits(data.members[memberId])===7");
check("data.members[memberId].movimientos.at(-1).type==='category'&&data.members[memberId].movimientos.at(-2).type==='visits'");
vm.runInContext("$('movementsearch').value=fullMovieTitle;$('movementtypefilter').value='';renderGeneralMovements()",sandbox);
check("$('generalmovements').innerHTML.includes(fullMovieTitle)&&$('generalmovements').innerHTML.includes('María del Carmen López')&&$('generalmovements').innerHTML.includes('Cineplanet Arequipa')");
vm.runInContext("$('movementsearch').value='';$('movementtypefilter').value='points';renderGeneralMovements()",sandbox);
check("$('generalmovements').innerHTML.includes('Puntos manuales editados desde la tabla')&&!$('generalmovements').innerHTML.includes(fullMovieTitle)");
check("data.events.some(e=>e.text.startsWith('Movimiento eliminado'))&&data.events.every(e=>e.text.length<=500)");
// Edits to old unknown metadata never invent historical dates or films.
check("normalizeMember(legacySample).movimientos.find(m=>m.type==='points').date===''");
check("(()=>{const bad=normalizeMember(legacySample);bad.movimientos[0].points++;try{normalizeMember(bad)}catch{return true}return false})()");
check("(()=>{try{addMemberMovement(memberId,{type:'visit',date:'2099-01-01',complex:'Cusco',movie:'Película',detail:'Película',visits:1,points:0})}catch{return true}return false})()");
check("(()=>{try{addMemberMovement(memberId,{type:'points',date:today(),complex:'',detail:'Puntos fraccionarios',visits:0,points:1.5})}catch{return true}return false})()");
// CSV/JSON must preserve complete movie titles, complexes, movement IDs and all balances.
vm.runInContext("globalThis.memberBeforeRoundtrip=structuredClone(data.members[memberId]);globalThis.memberBackup=JSON.stringify(data);exportCSV();globalThis.memberCSV=savedCSV;data=emptyData();globalThis.memberCSVResult=importCSV(memberCSV)",sandbox);
check("memberCSV.includes('movimientos_json')&&memberCSVResult.members[memberId].movimientos.length===memberBeforeRoundtrip.movimientos.length");
check("memberCSVResult.members[memberId].puntos===70&&memberCSVResult.members[memberId].ajuste===5&&memberCSVResult.members[memberId].movimientos.some(m=>m.id===firstVisitId&&m.movie.includes(fullMovieTitle)&&m.complex==='Cineplanet Arequipa')");
check("importJSON(memberBackup).members[memberId].movimientos.length===memberBeforeRoundtrip.movimientos.length");
vm.runInContext("data=JSON.parse(memberBackup);realData=data;selected=memberId;detailTab='movimientos';$('movementtypefilter').value='';render()",sandbox);
check("normalizeMember(data.members[memberId]).puntos===70&&JSON.parse(localStorage.getItem(KEY)).members[memberId].ledgerVersion===1");
check("$('detailtab').innerHTML.includes('data-movement-edit')&&$('detailtab').innerHTML.includes('data-movement-delete')");
const memberReloadElements=new Map(),memberReloadDoc={...sandbox.document,getElementById:id=>{if(!memberReloadElements.has(id))memberReloadElements.set(id,{...element(id),value:''});return memberReloadElements.get(id)}};
const memberReload={...sandbox,document:memberReloadDoc};vm.createContext(memberReload);vm.runInContext(script,memberReload);vm.runInContext('startLocalMigration()',memberReload);vm.runInContext('adminUnlocked=true',memberReload);
assert.equal(vm.runInContext("data.members['12345678'].puntos===70&&data.members['12345678'].movimientos.some(m=>m.movie.includes('El extraordinario viaje')&&m.complex==='Cineplanet Arequipa')&&!locked",memberReload),true);checks++;

vm.runInContext("data=emptyData();ensureWorkspace(data);data.members['11111111']=normalizeMember({dni:'11111111',nombre:'Socio Black Prueba',email:'',tel:'',alta:'',puntos:50,ajuste:60,catManual:'',visitas:{}});data.members['22222222']=normalizeMember({dni:'22222222',nombre:'Socio Clásico Prueba',email:'',tel:'',alta:'',puntos:10,ajuste:0,catManual:'',visitas:{}});realData=data;selected='11111111';benefitMember=selected;view='socios';render();globalThis.offerFor=(id,date=today(),dni='11111111')=>benefitOffers(dni,date).find(o=>o.id===id);globalThis.inputFor=(o,patch={})=>({id:uid(),dni:'11111111',source:o.source,offerId:o.id,bucket:o.bucket,date:today(),quantity:1,complex:'Cineplanet Cusco',authorizedBy:'Supervisora',operator:'Operador',note:'Validación manual de condiciones',reference:'REF-01',...patch})",sandbox);
check("category(data.members['11111111'])[0]==='Black'&&category(data.members['22222222'])[0]==='Clásico'");
check("offerFor('black-monthly').available===1&&offerFor('black-monthly').unitPoints===0");
check("!offerFor('black-calendar')&&!offerFor('black-welcome')");
check("!benefitOffers('22222222').some(o=>o.id==='black-monthly')");
vm.runInContext("globalThis.monthlyInput=inputFor(offerFor('black-monthly'));globalThis.monthlyRedemption=registerRedemption(monthlyInput)",sandbox);
check("monthlyRedemption.quantity===1&&monthlyRedemption.totalPoints===0&&W().redemptions.length===1");
check("offerFor('black-monthly').available===0&&data.members['11111111'].puntos===50&&visits(data.members['11111111'])===60");
check("(()=>{try{registerRedemption({...monthlyInput,id:uid()})}catch{return W().redemptions.length===1}return false})()");
check("(()=>{try{registerRedemption(monthlyInput)}catch{return W().redemptions.length===1}return false})()");
check("cancelRedemption(monthlyRedemption.id,'Registro por error','Supervisora')");
check("offerFor('black-monthly').available===1&&W().redemptions[0].status==='canceled'");
check("(()=>{try{cancelRedemption(monthlyRedemption.id,'Otra anulación','Supervisora')}catch{return data.members['11111111'].puntos===50}return false})()");
vm.runInContext("globalThis.paidOffer=offerFor('entrada-socio-higher');globalThis.pointsRedemption=registerRedemption(inputFor(paidOffer,{quantity:2}))",sandbox);
check("data.members['11111111'].puntos===40&&pointsRedemption.totalPoints===10");
check("data.members['11111111'].movimientos.some(m=>m.id===pointsRedemption.pointMovementId&&m.points===-10&&m.redemptionId===pointsRedemption.id)");
check("(()=>{try{updateMemberMovement('11111111',pointsRedemption.pointMovementId,{points:-1})}catch{return data.members['11111111'].puntos===40}return false})()");
check("(()=>{try{removeMemberMovement('11111111',pointsRedemption.pointMovementId,'Quitar cargo')}catch{return data.members['11111111'].puntos===40}return false})()");
check("cancelRedemption(pointsRedemption.id,'Canje no entregado','Supervisora')");
check("data.members['11111111'].puntos===50&&data.members['11111111'].movimientos.some(m=>m.redemptionId===pointsRedemption.id&&m.redemptionRole==='refund'&&m.points===10)");
check("(()=>{const before=JSON.stringify(data);try{registerRedemption(inputFor(offerFor('entrada-socio-higher'),{quantity:20}))}catch{return before===JSON.stringify(data)}return false})()");
vm.runInContext("globalThis.costSnapshotRedemption=registerRedemption(inputFor(offerFor('entrada-socio-higher')));workspaceCommit(w=>w.benefits.find(r=>r.id==='entrada-socio-higher').pointCost=10)",sandbox);
check("data.members['11111111'].puntos===45&&costSnapshotRedemption.unitPoints===5");
check("cancelRedemption(costSnapshotRedemption.id,'Anulación después de cambiar regla','Supervisora')");
check("data.members['11111111'].puntos===50");
vm.runInContext("globalThis.manualGrantId=uid();createGrant({id:manualGrantId,dni:'22222222',title:'Calendario de campaña autorizado',quantity:1,pointCost:0,from:today(),until:addDays(today(),10),reason:'Entrega extraordinaria autorizada',authorizedBy:'Jefatura',operator:'Operador'});globalThis.manualOffer=benefitOffers('22222222').find(o=>o.id===manualGrantId);globalThis.manualRedemption=registerRedemption(inputFor(manualOffer,{dni:'22222222'}))",sandbox);
check("manualRedemption.source==='grant'&&manualRedemption.title==='Calendario de campaña autorizado'");
check("benefitOffers('22222222').find(o=>o.id===manualGrantId).available===0");
check("(()=>{const ok=workspaceCommit(w=>w.grants.find(g=>g.id===manualGrantId).status='canceled');return !ok&&W().grants.find(g=>g.id===manualGrantId).status==='active'})()");
check("cancelRedemption(manualRedemption.id,'Entrega reprogramada','Jefatura')");
check("benefitOffers('22222222').find(o=>o.id===manualGrantId).available===1");
check("workspaceCommit(w=>w.grants.find(g=>g.id===manualGrantId).status='canceled')");
check("!benefitOffers('22222222').some(o=>o.id===manualGrantId)");
// Periods are distinct and quota survives category changes within the same calendar month.
vm.runInContext("globalThis.monthDate=back=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(15);d.setUTCMonth(d.getUTCMonth()-back);return d.toISOString().slice(0,10)};globalThis.month1=monthDate(1);globalThis.month2=monthDate(2);globalThis.past1=registerRedemption(inputFor(offerFor('black-monthly',month1),{date:month1}));globalThis.past2=registerRedemption(inputFor(offerFor('black-monthly',month2),{date:month2}));",sandbox);
check("past1.bucket!==past2.bucket&&past1.totalPoints===0&&past2.totalPoints===0");
vm.runInContext("globalThis.currentGift=registerRedemption(inputFor(offerFor('black-monthly')));addMemberMovement('11111111',{type:'visits',date:today(),complex:'',detail:'Categoría de prueba reducida',visits:-60,points:0})",sandbox);
check("!benefitOffers('11111111').some(o=>o.id==='black-monthly')");
vm.runInContext("addMemberMovement('11111111',{type:'visits',date:today(),complex:'',detail:'Categoría restaurada de prueba',visits:60,points:0})",sandbox);
check("offerFor('black-monthly').available===0");
check("periodOffers(W().benefits.find(r=>r.id==='black-monthly'),'2026-03-01').length===2");
check("!benefitOffers('11111111').some(o=>o.id==='black-january')");
// Manual cash control does not require incoming funds: it records activity performed elsewhere.
vm.runInContext("globalThis.cashInput=(patch={})=>({id:uid(),kind:'out',amount:15000,occurredAt:new Date().toISOString(),complex:'Cineplanet Cusco',register:'Odoo Caja 2',reason:'Retiro para tesorería',operator:'Operador',authorizedBy:'Supervisora',reference:'ODOO-REF-001',...patch});globalThis.cashOut=registerCash(cashInput());globalThis.cashIn=registerCash(cashInput({kind:'in',amount:5000,reason:'Reposición de sencillo'}))",sandbox);
check("W().cashMovements.length===2&&cashOut.kind==='out'&&cashIn.kind==='in'");
check("W().cashMovements.filter(r=>r.status==='active').reduce((n,r)=>n+(r.kind==='in'?r.amount:-r.amount),0)===-10000");
check("cashOut.number!==cashIn.number&&cashOut.receipt.paper==='80'");
check("(()=>{try{registerCash({...cashInput(),id:cashOut.id})}catch{return W().cashMovements.length===2}return false})()");
check("(()=>{try{registerCash(cashInput({amount:0}))}catch{return true}return false})()");
check("(()=>{try{registerCash(cashInput({authorizedBy:''}))}catch{return true}return false})()");
check("(()=>{try{registerCash(cashInput({occurredAt:new Date(Date.now()+86400000).toISOString()}))}catch{return true}return false})()");
check("cashTicketMarkup(cashOut).includes('Supervisora')&&cashTicketMarkup(cashOut).includes('Retiro para tesorería')&&cashTicketMarkup(cashOut).includes('SIN VALIDEZ TRIBUTARIA')");
check("workspaceCommit(w=>{w.receipt.footer='Nuevo pie del comprobante';w.receipt.paper='58'})");
check("cashOut.receipt.paper==='80'&&cashOut.receipt.footer!=='Nuevo pie del comprobante'");
vm.runInContext("globalThis.cashNew=registerCash(cashInput({amount:7500,reason:'Comprobante nuevo <script>no ejecutar</script>'}))",sandbox);
check("cashNew.receipt.paper==='58'&&cashNew.receipt.footer==='Nuevo pie del comprobante'");
check("cashTicketMarkup(cashNew).includes('&lt;script&gt;no ejecutar&lt;/script&gt;')&&!cashTicketMarkup(cashNew).includes('<script>no ejecutar')");
check("cancelCash(cashNew.id,'Importe registrado por error','Jefatura')");
check("cashTicketMarkup(W().cashMovements.find(r=>r.id===cashNew.id)).includes('ANULADO')");
check("(()=>{try{cancelCash(cashNew.id,'Otra anulación','Jefatura')}catch{return true}return false})()");
// Native form produces an immutable, printable cash record with authorization.
vm.runInContext("cashControlModal('out');$('transferkind').value='out';$('transferamount').value='12,50';$('transferwhen').value=peruDateTime();$('transfercomplex').value='Cineplanet Cusco';$('transferregister').value='Odoo Caja 3';$('transferreason').value='Retiro de prueba';$('transferoperator').value='Responsable Prueba';$('transferauthorizer').value='Jefatura Prueba';$('transferreference').value='REC-123';$('cashcontrolform').onsubmit({preventDefault(){}})",sandbox);
check("lastCashRecord.amount===1250&&lastCashRecord.authorizedBy==='Jefatura Prueba'&&$('cashprint').dataset.paper==='58'");
check("$('cashprint').innerHTML.includes('Responsable Prueba')&&W().cashMovements.length===4");
// Movie catalog is registration-only and old visit references continue working.
assert(!script.includes('recordSale(')&&!script.includes('cashDraft')&&!script.includes('PAYMENT_LABELS')&&!script.includes('renderPos'));checks++;
assert(!script.includes('P.movies')&&!script.includes('display.html'));checks++;
vm.runInContext("movieModal();$('movietitle').value='Película para registrar';$('moviegenre').value='Drama';$('movieduration').value='110';$('movierating').value='APT';$('movieart').value='sea';$('movieactive').value='1';$('movieform').onsubmit({preventDefault(){}})",sandbox);
check("activeMemberMovies().some(m=>m.title==='Película para registrar')");
// Full backup validates relations and restores benefits, point ledger and cash receipts together.
vm.runInContext("globalThis.fullSnapshot=JSON.stringify(data);globalThis.fullValidated=validateFullBackup(JSON.parse(fullSnapshot))",sandbox);
check("fullValidated.workspace.redemptions.length===W().redemptions.length&&fullValidated.members['11111111'].puntos===50");
check("(()=>{const broken=JSON.parse(fullSnapshot);broken.workspace.redemptions.find(r=>r.totalPoints>0).totalPoints++;try{validateFullBackup(broken)}catch{return true}return false})()");
check("(()=>{const broken=JSON.parse(fullSnapshot);delete broken.members['11111111'];try{validateFullBackup(broken)}catch{return true}return false})()");
check("(()=>{const broken=JSON.parse(fullSnapshot);broken.workspace.cashMovements[0].amount=-1;try{validateFullBackup(broken)}catch{return true}return false})()");
check("JSON.parse(localStorage.getItem(KEY)).workspace.cashMovements.length===4");
// Legacy migration reads only the old movie catalog and ticket configuration; no POS is retained.
store.set('socio-studio.pos.v1',JSON.stringify({movies:[{id:'legacy-film',title:'Cartelera conservada',genre:'Drama',duration:100,rating:'APT',art:'sea',active:true,price:999}],settings:{cinema:'Cine anterior',receipt:{brand:'Marca anterior',legalName:'',ruc:'',address:'',phone:'',cashier:'CP',header:'Cabecera conservada',footer:'Pie propio conservado',paper:'58'}},sales:[{id:'old-sale'}]}));
check("legacyWorkspace().movies[0].title==='Cartelera conservada'&&legacyWorkspace().receipt.footer==='Pie propio conservado'");
check("!('price' in legacyWorkspace().movies[0])&&legacyWorkspace().cashMovements.length===0&&!('sales' in legacyWorkspace())");
check("localStorage.getItem('socio-studio.pos.v1').includes('old-sale')");
// A complete new runtime loads members and all three requested workspace modules.
const managementReloadElements=new Map(),managementReloadDoc={...sandbox.document,getElementById:id=>{if(!managementReloadElements.has(id))managementReloadElements.set(id,{...element(id),value:''});return managementReloadElements.get(id)}};
const managementReload={...sandbox,document:managementReloadDoc};vm.createContext(managementReload);vm.runInContext(script,managementReload);vm.runInContext('startLocalMigration()',managementReload);
assert.equal(vm.runInContext("!locked&&data.members['11111111'].puntos===50&&W().cashMovements.length===4&&W().redemptions.length>0&&W().movies.some(m=>m.title==='Película para registrar')",managementReload),true);checks++;

// Exercise live form handlers for cash, manual benefits, ticket configuration and full restoration.
vm.runInContext("benefitMember='22222222';setView('beneficios');grantModal();$('granttitle').value='Beneficio libre de prueba';$('grantquantity').value='2';$('grantpoints').value='1';$('grantfrom').value=today();$('grantuntil').value=addDays(today(),10);$('grantreason').value='Asignación manual por excepción';$('grantoperator').value='Operador';$('grantauthorizer').value='Jefatura';$('grantform').onsubmit({preventDefault(){}})",sandbox);
check("W().grants.some(g=>g.title==='Beneficio libre de prueba'&&g.pointCost===1)");
vm.runInContext("globalThis.uiGrant=W().grants.find(g=>g.title==='Beneficio libre de prueba');redemptionModal('grant',uiGrant.id,uiGrant.id);$('redeemdate').value=today();$('redeemquantity').value='1';$('redeemcomplex').value='Cineplanet Cusco';$('redeemoperator').value='Operador';$('redeemauthorizer').value='Jefatura';$('redeemnote').value='Entregado manualmente';$('redeemreference').value='CANJE-UI';$('redeemmovie').value='';$('redeemconfirmed').checked=true;$('redeemform').onsubmit({preventDefault(){}})",sandbox);
check("data.members['22222222'].puntos===9&&W().redemptions.some(r=>r.reference==='CANJE-UI')");
vm.runInContext("settingsTab='ticket';setView('config');$('ticketbrand').value='Control Cine Cusco';$('ticketlegal').value='Empresa de ejemplo';$('ticketruc').value='20123456789';$('ticketphone').value='123456';$('ticketaddress').value='Cusco';$('ticketheader').value='RETIROS AUTORIZADOS';$('ticketfooter').value='Conservar para arqueo';$('ticketpaper').value='58';$('ticketsignatures').checked=true;$('ticketsettingsform').onsubmit({preventDefault(){}})",sandbox);
check("W().receipt.brand==='Control Cine Cusco'&&W().receipt.footer==='Conservar para arqueo'&&W().receipt.paper==='58'");
check("W().cashMovements[0].receipt.brand!=='Control Cine Cusco'");
vm.runInContext("settingsTab='general';renderSettings();$('organization').value='Mi organización';$('defaultcomplex').value='Cineplanet Cusco';$('externalregister').value='Odoo Caja 7';$('defaultoperator').value='Responsable Local';$('generalsettingsform').onsubmit({preventDefault(){}})",sandbox);
check("W().settings.externalRegister==='Odoo Caja 7'&&W().receipt.footer==='Conservar para arqueo'");
vm.runInContext("globalThis.cashToCancel=W().cashMovements.find(r=>r.status==='active').id;cancelRecordModal('cash',cashToCancel);$('cancelreason').value='Prueba de anulación desde formulario';$('cancelauthorizer').value='Jefatura';$('cancelrecordform').onsubmit({preventDefault(){}})",sandbox);
check("W().cashMovements.find(r=>r.id===cashToCancel).status==='canceled'");
// Complete restore cannot silently omit redemptions, refunds or tickets.
sandbox.managementBackup=vm.runInContext('JSON.stringify(data)',sandbox);
(async()=>{
 vm.runInContext('restoreAllModal()',sandbox);
 await element('fullbackupfile').onchange({target:{files:[{size:sandbox.managementBackup.length,text:async()=>sandbox.managementBackup}]}});
 check("!$('fullbackupconfirm').disabled&&$('fullbackuppreview').innerHTML.includes('movimientos de efectivo')");
 vm.runInContext("workspaceCommit(w=>{w.settings.organization='CAMBIO TEMPORAL'});$('fullbackupconfirm').onclick()",sandbox);
 check("W().settings.organization==='Mi organización'&&W().receipt.brand==='Control Cine Cusco'&&W().cashMovements.length===4&&W().grants.some(g=>g.title==='Beneficio libre de prueba')");
 // Demo operations never enter the real store and all workspace modules return intact.
 vm.runInContext("globalThis.beforeNewDemo=JSON.stringify(data);globalThis.beforeNewDemoStore=localStorage.getItem(KEY);demoToggle();registerCash(cashInput({id:uid(),reason:'Solo demo'}))",sandbox);
 check("demo&&W().cashMovements.length===1&&localStorage.getItem(KEY)===beforeNewDemoStore");
 vm.runInContext('demoToggle()',sandbox);
 check("!demo&&JSON.stringify(data)===beforeNewDemo");
 // The printable HTML contains only a single movement, no application code or other records.
 const cssText=fs.readFileSync(appFile,'utf8').split('<style>')[1].split('</style>')[0];
 sandbox.document.querySelector=selector=>selector==='style'?{textContent:cssText}:element('query');
 check("cashTicketDocument(W().cashMovements[0]).includes('transferreceipt')&&!cashTicketDocument(W().cashMovements[0]).includes('<script>')");
 const sourceHTML=fs.readFileSync(appFile,'utf8');
 for(const forbidden of ['POS / Caja','cashDraft','recordSale(','paymentModal(','checkoutmethods','PAYMENT_LABELS','display.html','sourceopen'])assert(!sourceHTML.includes(forbidden),forbidden);
 checks++;
 console.log(checks+' checks passed: member compatibility, benefit entitlements and point refunds, manual grants, cash/thermal receipts, full backup, demo isolation and POS removal.');
})().catch(e=>{console.error(e);process.exitCode=1});
