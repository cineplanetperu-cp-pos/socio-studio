
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

const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const elements=new Map(),local=new Map();let localWrites=0,prints=0;
function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,open:false,checked:false,dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false},focus(){}});return elements.get(id)}
const source=fs.readFileSync(path.join(__dirname,'..','dist/index.html'),'utf8'),script=isolatedAppScript(source);
const sandbox={console,Date,Intl,JSON,Number,String,Object,Array,Math,RegExp,Set,Map,Promise,Error,TextEncoder,Uint8Array,structuredClone,crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout(){},document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>({textContent:source.split('<style>')[1].split('</style>')[0]}),addEventListener(){}},window:{addEventListener(){},print(){prints++}},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>{localWrites++;local.set(k,v)}},navigator:{onLine:true},matchMedia:()=>({matches:false})};
vm.createContext(sandbox);vm.runInContext(script,sandbox);const run=c=>vm.runInContext(c,sandbox);let checks=0;function check(c){assert.equal(run(c),true,c);checks++}const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
check("isCloudMode()&&!adminUnlocked&&$('authformhost').innerHTML.includes('Configuración inicial pendiente')");check("!$('authformhost').innerHTML.includes('Crear administrador')&&Object.keys(data.members).length===0");
check("(()=>{try{SocioFirebase.validateConfig(CLOUD_CONFIG)}catch{return true}return false})()");
run("startLocalMigration();adminUnlocked=true;commit(d=>{d.members['11111111']=normalizeMember({dni:'11111111',nombre:'Ana Local',email:'',tel:'',puntos:10,ajuste:0,catManual:'',alta:'',visitas:{}})})");check("!isCloudMode()&&JSON.parse(localStorage.getItem(KEY)).members['11111111'].nombre==='Ana Local'");
const localState=local.get(run('KEY')),writesBeforeCloud=localWrites;
run("operatingMode='firebase';cloud.user={uid:'admin-a',email:'admin@example.com',emailVerified:true};cloud.repo={load:async()=>({revision:0,generation:'',state:null}),save:()=>new Promise(resolve=>globalThis.finishSave=resolve)};cloud.ready=true;cloud.online=true;cloud.revision=0;cloud.latestRevision=0;cloud.session=10;adminUnlocked=true;adminAccount={name:'Admin',email:'admin@example.com'};data=emptyData();ensureWorkspace(data);realData=data;cloud.sdk={signOut:async()=>{globalThis.logoutCalled=true}};cloud.auth={};globalThis.logoutCalled=false;globalThis.sendingCount=0");
check("commit(d=>{d.members['22222222']=normalizeMember({dni:'22222222',nombre:'Ana Cloud',email:'',tel:'',puntos:20,ajuste:0,catManual:'',alta:'',visitas:{}})},'Guardado confirmado')");check("cloud.pending&&data.members['22222222'].puntos===20&&$('cloudbar').textContent!==null");check("!commit(d=>d.members['22222222'].puntos=90)");run("prepareCashPrint(sampleCashReceipt())");check("$('cashprint').innerHTML===''");run("appAction('cash-print');logoutAdmin()");check('cloud.pending&&!logoutCalled');assert.equal(prints,0);checks++;
run("finishSave({revision:1,generation:'op-1'})");await flush();check("!cloud.pending&&cloud.revision===1&&$('toast').textContent==='Guardado confirmado'");assert.equal(localWrites,writesBeforeCloud);assert.equal(local.get(run('KEY')),localState);checks+=2;
// A stale modal cannot overwrite a newer remote state.
run("showModal('Editar','<form></form>');cloud.revision=2");check("!commit(d=>d.members['22222222'].nombre='Obsoleto')&&data.members['22222222'].nombre==='Ana Cloud'");run("$('modal').close();cloud.revision=1");
// A failed conditional save reloads the latest state and retains a downloadable recovery snapshot.
run("globalThis.remote=structuredClone(data);remote.members['22222222'].nombre='Cambio desde otro equipo';cloud.repo={save:async()=>{const e=Error('Conflicto');e.code='socio/conflict';throw e},load:async()=>({revision:2,generation:'other-operation',state:remote})}");check("commit(d=>d.members['22222222'].nombre='Mi cambio sin confirmar')");await flush();check("!cloud.pending&&cloud.revision===2&&data.members['22222222'].nombre==='Cambio desde otro equipo'");check("cloud.failed.state.members['22222222'].nombre==='Mi cambio sin confirmar'&&cloud.failed.uid==='admin-a'");
run("download=(name,text)=>{globalThis.recovered={name,text}};cloudRecoveryDownload()");check("recovered.name.startsWith('operacion-sin-confirmar-')&&JSON.parse(recovered.text).recovery.operationId===cloud.failed.operationId");
// If the server applied the operation but its response was lost, confirm by operation ID.
run("cloud.repo={save:async(state,base,id)=>{globalThis.ambiguous={state,base,id};throw Error('Conexión interrumpida')},load:async()=>({revision:3,generation:ambiguous.id,state:ambiguous.state})}");check("commit(d=>d.members['22222222'].nombre='Cambio confirmado por ID')");await flush();check("!cloud.pending&&!cloud.failed&&cloud.revision===3&&data.members['22222222'].nombre==='Cambio confirmado por ID'");
run('cloud.online=false');check("!commit(d=>d.members['22222222'].nombre='Sin conexión')&&data.members['22222222'].nombre==='Cambio confirmado por ID'");run('cloud.online=true');
// Remote refresh preserves an open form, then rejects its stale submission.
run("globalThis.newRemote=structuredClone(data);newRemote.members['22222222'].nombre='Actualización remota';cloud.repo={load:async()=>({revision:4,generation:'remote-four',state:newRemote})};showModal('Editar socio','<form></form>');$('draftfield').value='Texto sin enviar'");await run('refreshCloud()');check("$('modal').open&&$('draftfield').value==='Texto sin enviar'&&cloud.revision===4");check("!commit(d=>d.members['22222222'].nombre='Formulario anterior')");run("$('modal').close()");
// Cloud profile and password recovery use Firebase functions, not local password records.
run("cloud.sdk={EmailAuthProvider:{credential:(email,password)=>({email,password})},reauthenticateWithCredential:async()=>{},updatePassword:async(user,password)=>{globalThis.newPassword=password},sendPasswordResetEmail:async(auth,email)=>{globalThis.resetEmail=email},signOut:async()=>{}};cloud.repo={saveProfile:async name=>{globalThis.savedProfile=name}};adminProfileModal();$('cloudprofilename').value='Ana Compartida';$('cloudprofilecurrent').value='Current-12345';$('cloudprofilenew').value='New-password-123';$('cloudprofileconfirm').value='New-password-123'");await element('cloudprofileform').onsubmit({preventDefault(){}});check("savedProfile==='Ana Compartida'&&adminAccount.name==='Ana Compartida'&&newPassword==='New-password-123'");
run("showCloudAuth(true);$('cloudemail').value='admin@example.com'");await element('cloudloginform').onsubmit({preventDefault(){}});check("resetEmail==='admin@example.com'&&$('cloudloginerror').textContent.includes('Si el correo')");
// Account verification and allowlist checks gate every shared-state load.
run("globalThis.originalFactory=SocioFirebase.createRepository;globalThis.repoLoads=0;globalThis.stopCount=0;globalThis.allowed=true;globalThis.fakeRepository={access:async()=>{if(!allowed){const e=Error('No autorizado');e.code='socio/access-denied';throw e}return {active:true,role:'admin'}},load:async()=>{repoLoads++;return {revision:4,generation:'loaded',state:newRemote}},watch:(callback)=>{globalThis.headCallback=callback;return()=>stopCount++},watchAccess:(callback)=>{globalThis.accessCallback=callback;return()=>stopCount++},watchProfile:(callback)=>{globalThis.profileCallback=callback;return()=>stopCount++}};SocioFirebase.createRepository=()=>fakeRepository");
await run("handleCloudUser({uid:'pending',email:'pending@example.com',emailVerified:false})");check("repoLoads===0&&!adminUnlocked&&$('authtitle').textContent==='Verifica tu correo.'");
run('allowed=false');await run("handleCloudUser({uid:'unknown',email:'unknown@example.com',emailVerified:true})");check("repoLoads===0&&!adminUnlocked&&Object.keys(data.members).length===0");
run('allowed=true');await run("handleCloudUser({uid:'admin-a',email:'admin@example.com',emailVerified:true})");check("repoLoads===1&&adminUnlocked&&cloud.ready&&data.members['22222222'].nombre==='Actualización remota'");run("profileCallback({name:'Nombre desde segundo equipo'})");check("$('adminname').textContent==='Nombre desde segundo equipo'");
run("accessCallback({active:false,role:'admin'})");check("!adminUnlocked&&!cloud.ready&&$('appworkspace').hidden&&Object.keys(data.members).length===0&&stopCount===3");
run('cloud.pending=true');await run('handleCloudUser(null)');check('!cloud.pending&&cloud.revision===0');check("!adminUnlocked&&Object.keys(data.members).length===0&&$('authformhost').innerHTML.includes('cloudloginform')");assert.equal(local.get(run('KEY')),localState);checks++;
// Explicit migration access is still possible; cloud records never overwrite the old local source.
run('startLocalMigration()');check("data.members['11111111'].nombre==='Ana Local'&&!data.members['22222222']&&!isCloudMode()");
console.log(checks+' cloud UI checks passed: configuration gating, migration isolation, acknowledged writes, conflicts, stale forms, uncertain outcomes, authorized profiles and revocation.');
})().catch(error=>{console.error(error);process.exitCode=1});
