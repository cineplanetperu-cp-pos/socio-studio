
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
const elements=new Map(),store=new Map(),listeners={};
function element(id){if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,checked:false,files:[],dataset:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},addEventListener(){},showModal(){this.open=true},close(){this.open=false},focus(){},scrollIntoView(){}});return elements.get(id)}
const html=fs.readFileSync(appFile,'utf8'),script=isolatedAppScript(html);
let imageSize={width:800,height:200};const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',jpg='data:image/jpeg;base64,/9j/2w==';
const sandbox={console,Intl,Date,Number,String,Object,Array,Math,JSON,RegExp,Map,Set,Error,Promise,Uint8Array,TextEncoder,structuredClone,setTimeout:()=>0,clearTimeout(){},crypto:require('node:crypto').webcrypto,document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>({textContent:html.split('<style>')[1].split('</style>')[0]}),addEventListener(){},createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=>png})},window:{addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)},print(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},matchMedia:()=>({matches:false}),URL:{createObjectURL:()=>'',revokeObjectURL(){}},Image:class{set src(value){this.naturalWidth=imageSize.width;this.naturalHeight=imageSize.height;this.onload()}},png,jpg};
vm.createContext(sandbox);vm.runInContext(script,sandbox);vm.runInContext('startLocalMigration()',sandbox);let checks=0;const run=c=>vm.runInContext(c,sandbox);function check(c){assert.equal(run(c),true,c);checks++}
async function rejects(code,pattern){await assert.rejects(()=>run(code),pattern);checks++}
(async()=>{
check("!adminUnlocked&&!$('authscreen').hidden&&$('appworkspace').hidden");check("!commit(d=>d.events.push({}))&&data.events.length===0");check("!adminAccount&&$('authformhost').innerHTML.includes('Crear administrador')");
await rejects("createAdmin({name:'Ana',username:'ana',email:'',password:'123',confirmation:'123'})",/contraseña/);
await rejects("createAdmin({name:'Ana',username:'a',email:'',password:'mi-clave-segura-1',confirmation:'mi-clave-segura-1'})",/usuario/);
const recovery=await run("createAdmin({name:'Ana Pérez',username:'ANA.ADMIN',email:'ana@example.com',password:'mi-clave-segura-1',confirmation:'mi-clave-segura-1'})");sandbox.recovery=recovery;
check("adminAccount.username==='ana.admin'&&adminAccount.name==='Ana Pérez'&&!adminUnlocked");check("!localStorage.getItem(ADMIN_KEY).includes('mi-clave-segura-1')&&!localStorage.getItem(ADMIN_KEY).includes(recovery)&&adminAccount.hash.length===64");
await rejects("createAdmin({name:'Otro',username:'otro',password:'mi-clave-segura-2',confirmation:'mi-clave-segura-2'})",/existe/);
await rejects("loginAdmin('ana.admin','incorrecta')",/incorrectos/);check('!adminUnlocked&&adminAccount.failedAttempts===1');
await run("loginAdmin('ANA.ADMIN','mi-clave-segura-1')");check("adminUnlocked&&$('authscreen').hidden&&!$('appworkspace').hidden&&$('adminname').textContent==='Ana Pérez'");
run("showRecoveryCode(recovery,true)");check("$('authformhost').innerHTML.includes(recovery)&&$('authformhost').innerHTML.includes('recoverysaved')");
run("adminProfileModal()");check("$('modalbody').innerHTML.includes('Nombre completo')&&$('modalbody').innerHTML.includes('Cerrar sesión')");
await rejects("updateAdminProfile({name:'Ana Nueva',username:'ana.admin',email:'ana@example.com',current:'mal',password:'',confirmation:''})",/incorrecta/);
await run("updateAdminProfile({name:'Ana Nueva',username:'ana.nueva',email:'otra@example.com',current:'mi-clave-segura-1',password:'mi-clave-nueva-2',confirmation:'mi-clave-nueva-2'})");check("adminAccount.username==='ana.nueva'&&adminAccount.name==='Ana Nueva'");
run('logoutAdmin()');check("!adminUnlocked&&$('appworkspace').hidden&&$('cashprint').innerHTML===''");await rejects("loginAdmin('ana.nueva','mi-clave-segura-1')",/incorrectos/);await run("loginAdmin('ana.nueva','mi-clave-nueva-2')");
run('logoutAdmin()');await rejects("recoverAdmin({username:'ana.nueva',recovery:'bad',password:'mi-clave-repuesta-3',confirmation:'mi-clave-repuesta-3'})",/incorrectos/);
await run("recoverAdmin({username:'ana.nueva',recovery,password:'mi-clave-repuesta-3',confirmation:'mi-clave-repuesta-3'})");await run("loginAdmin('ana.nueva','mi-clave-repuesta-3')");check('adminUnlocked');
for(let i=0;i<5;i++)await rejects("loginAdmin('ana.nueva','errada')",/incorrectos/);check('adminAccount.lockUntil>Date.now()');await rejects("loginAdmin('ana.nueva','mi-clave-repuesta-3')",/Espera/);run('persistAdmin({...adminAccount,lockUntil:0,failedAttempts:0})');await run("loginAdmin('ana.nueva','mi-clave-repuesta-3')");
check('defaultComplexes().length===44&&W().complexes.length===44');check("activeComplexes().some(c=>c.name==='Cineplanet Cusco')&&activeComplexes().some(c=>c.name==='Cineplanet La Molina Cenco')");
check("(()=>{const old=defaultWorkspace();delete old.complexes;delete old.ticketImages;return normalizeWorkspace(old).complexes.length===44&&Object.keys(normalizeWorkspace(old).ticketImages).length===0})()");
check("saveComplex({id:'custom-test',name:'Sede de prueba',active:true})");check("activeComplexes().some(c=>c.name==='Sede de prueba')&&complexField('test','Complejo').includes('Sede de prueba')");
check("(()=>{try{saveComplex({id:'duplicated',name:'SÉDE DE PRUEBA',active:true})}catch{return true}return false})()");
run("workspaceCommit(w=>w.settings.defaultComplex='Sede de prueba')");check("preferredComplex()==='Sede de prueba'");check("saveComplex({id:'custom-test',name:'Nueva sede',active:true})&&W().settings.defaultComplex==='Nueva sede'");check("saveComplex({id:'custom-test',name:'Nueva sede',active:false})&&W().settings.defaultComplex===''&&!complexField('new','Complejo').includes('Nueva sede')");
check("complexField('edit','Complejo','Nueva sede',false,true).includes('registro anterior')");
run("settingsTab='general';renderSettings()");check("$('configcontent').innerHTML.includes('ticketlogofile')&&$('configcontent').innerHTML.includes('<select id=\"defaultcomplex\"')");
run("settingsTab='complexes';renderSettings()");check("$('configcontent').innerHTML.includes('6 de noviembre de 2026')&&$('configcontent').innerHTML.includes('Cineplanet Cusco')");
run("settingsTab='ticket';renderSettings()");check("$('configcontent').innerHTML.includes('ticketlogofile')&&$('ticketpreview').innerHTML.includes('transferreceipt')");
check("validTicketImage(png)===png");check("(()=>{try{validTicketImage('data:image/svg+xml;base64,AAAA')}catch{return true}return false})()");
check("(()=>{try{validTicketImage('https://example.com/logo.png')}catch{return true}return false})()");
const optimized=await run("optimizeTicketImage({type:'image/png',size:1000})");assert.equal(optimized,png);checks++;
imageSize={width:200,height:800};await rejects("optimizeTicketImage({type:'image/png',size:1000})",/horizontal/);imageSize={width:800,height:200};await rejects("optimizeTicketImage({type:'image/svg+xml',size:1000})",/PNG/);await rejects("optimizeTicketImage({type:'image/png',size:6000000})",/5 MB/);
check('saveTicketLogo(png)');run("globalThis.firstLogo=W().receipt.logoId");check("W().ticketImages[firstLogo]===png&&Object.keys(W().ticketImages).length===1");check("saveTicketLogo(png)&&W().receipt.logoId===firstLogo&&Object.keys(W().ticketImages).length===1");
check("normalizeReceipt({...defaultReceipt(),logoWidthPct:40}).logoWidthPct===40");
check("(()=>{const old=defaultReceipt();delete old.logoWidthPct;return normalizeReceipt(old).logoWidthPct===100})()");
for(const width of [0,9,101,NaN,40.5,'40'])check("(()=>{try{normalizeReceipt({...defaultReceipt(),logoWidthPct:"+(Number.isNaN(width)?'NaN':JSON.stringify(width))+"})}catch{return true}return false})()");
run("workspaceCommit(w=>w.receipt.logoWidthPct=40);settingsTab='ticket';renderSettings();$('ticketlogosize').value='25';$('ticketsettingsform').oninput()");
check("$('ticketpreview').innerHTML.includes('width:25%')&&$('ticketlogosizevalue').textContent==='25 %'&&W().receipt.logoWidthPct===40");
run("globalThis.cashLogo=registerCash({id:uid(),kind:'out',amount:12000,occurredAt:new Date().toISOString(),complex:'Cineplanet Cusco',register:'ODOO-01',reason:'Retiro de prueba',operator:'Ana',authorizedBy:'Luis',reference:''})");
check("cashLogo.receipt.logoWidthPct===40&&cashLogo.receipt.logoId===firstLogo&&cashTicketMarkup(cashLogo).includes(png)");check("saveTicketLogo(jpg)&&W().receipt.logoId!==firstLogo&&Object.keys(W().ticketImages).length===2");check("cashTicketMarkup(cashLogo).includes(png)&&!cashTicketMarkup(cashLogo).includes(jpg)");check("saveTicketLogo('')&&W().receipt.logoId===''&&W().ticketImages[firstLogo]===png&&Object.keys(W().ticketImages).length===1");
run("workspaceCommit(w=>w.receipt.logoWidthPct=20)");
check("cashTicketMarkup(cashLogo).includes('width:40%')&&W().receipt.logoWidthPct===20");
check("cashTicketDocument(cashLogo).includes('width:40%')&&cashTicketDocument({...cashLogo,receipt:{...cashLogo.receipt,paper:'58'}}).includes('width:40%')");
check("(()=>{const restored=validateFullBackup(JSON.parse(JSON.stringify(data)));return restored.workspace.receipt.logoWidthPct===20&&restored.workspace.cashMovements[0].receipt.logoWidthPct===40})()");
check("cashTicketDocument(cashLogo).includes(png)&&!cashTicketDocument(cashLogo).includes('<script>')");
check("(()=>{const restored=validateFullBackup(JSON.parse(JSON.stringify(data)));return restored.workspace.ticketImages[firstLogo]===png&&restored.workspace.complexes.length===45})()");check("!JSON.stringify(data).includes(adminAccount.hash)&&!JSON.stringify(data).includes(adminAccount.recoveryHash)");
check("(()=>{const bad=structuredClone(data);delete bad.workspace.ticketImages[firstLogo];try{validateFullBackup(bad)}catch{return true}return false})()");
run('globalThis.realBefore=JSON.stringify(data);demoToggle();saveTicketLogo(jpg);demoToggle()');check("JSON.stringify(data)===realBefore&&W().ticketImages[firstLogo]===png");
run("prepareCashPrint(cashLogo)");check("$('cashprint').innerHTML.includes(png)&&$('cashprint').dataset.paper==='80'");
// Signing out and reloading never clears membership/cash data, and a new page starts locked.
const originalData=store.get(run('KEY'));run('logoutAdmin();bootAdmin()');check("!adminUnlocked&&adminAccount.username==='ana.nueva'&&W().cashMovements.length===1");assert.equal(store.get(run('KEY')),originalData);checks++;
console.log(checks+' checks passed: admin setup/login/logout/recovery and password changes, 44-complex catalog/migration, image validation, immutable receipt logos, backup roundtrip and demo isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
