import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
import {initializeApp,deleteApp} from 'firebase/app';
import * as authSdk from 'firebase/auth';
const projectId='demo-socio-studio';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Ejecuta npm run test:rules; estas pruebas solo usan emuladores.');
const bridge=vm.runInThisContext(readFileSync('src/firebase-core.js','utf8')+';SocioFirebase');
const env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync('firestore.rules','utf8')}});let checks=0;
const admin='admin-a',second='admin-b',workspace='cineplanet-peru';
const verified={email:'admin@example.com',email_verified:true},unverified={email:'pending@example.com',email_verified:false};
const dbA=env.authenticatedContext(admin,verified).firestore(),dbB=env.authenticatedContext(second,{...verified,email:'second@example.com'}).firestore(),dbUnknown=env.authenticatedContext('stranger',verified).firestore(),dbUnverified=env.authenticatedContext('pending',unverified).firestore(),dbAnon=env.unauthenticatedContext().firestore();
async function allow(operation){await assertSucceeds(operation);checks++}async function deny(operation){await assertFails(operation);checks++}function check(value){assert(value);checks++}
const h=db=>sdk.doc(db,'workspaces',workspace,'state','head');
try{
await env.clearFirestore();
await env.withSecurityRulesDisabled(async context=>{for(const id of [admin,second,'pending'])await sdk.setDoc(sdk.doc(context.firestore(),'workspaces',workspace,'access',id),{role:'admin',active:true})});
for(const db of [dbAnon,dbUnknown,dbUnverified])await deny(sdk.getDocFromServer(h(db)));
await deny(sdk.setDoc(sdk.doc(dbUnknown,'workspaces',workspace,'access','stranger'),{role:'admin',active:true}));
await deny(sdk.setDoc(sdk.doc(dbA,'workspaces',workspace,'access','other'),{role:'admin',active:true}));
await deny(sdk.getDocs(sdk.collection(dbA,'workspaces',workspace,'access')));
await deny(sdk.getDocFromServer(sdk.doc(dbA,'workspaces','another-workspace','state','head')));
const repoA=bridge.createRepository(sdk,dbA,workspace,admin),repoB=bridge.createRepository(sdk,dbB,workspace,second);
await repoA.access();checks++;check((await repoA.load()).revision===0);
const initial={schemaVersion:2,members:{'11111111':{nombre:'Ana 🎬',visits:1,points:10}},events:[],workspace:{redemptions:[],cashMovements:[]}};
const first=await repoA.save(initial,0,'operation-first-123');check(first.revision===1);
check(JSON.stringify((await repoB.load()).state)===JSON.stringify(initial));
check((await repoA.save(initial,0,'operation-first-123')).revision===1);
const stateA=structuredClone(initial),stateB=structuredClone(initial);stateA.members['11111111'].points=5;stateA.workspace.redemptions.push({id:'canje-a',pointCost:5});stateB.members['11111111'].visits=2;
const race=await Promise.allSettled([repoA.save(stateA,1,'operation-race-a-123'),repoB.save(stateB,1,'operation-race-b-123')]);console.log('Concurrent transaction outcomes:',race.map(r=>r.status==='fulfilled'?{status:r.status,revision:r.value.revision}:{status:r.status,code:r.reason.code,message:r.reason.message}));check(race.filter(r=>r.status==='fulfilled').length===1&&race.filter(r=>r.status==='rejected'&&r.reason.code==='socio/conflict').length===1);
const winner=await repoA.load();check(winner.revision===2);check(JSON.stringify(winner.state)===JSON.stringify(stateA)||JSON.stringify(winner.state)===JSON.stringify(stateB));
await assert.rejects(()=>repoA.save(initial,0,'stale-operation-123'),e=>e.code==='socio/conflict');checks++;
await allow(repoA.saveProfile('Ana Actualizada'));check((await sdk.getDocFromServer(sdk.doc(dbA,'workspaces',workspace,'profiles',admin))).data().name==='Ana Actualizada');
await deny(sdk.setDoc(sdk.doc(dbA,'workspaces',workspace,'profiles',second),{name:'Intrusión',updatedAt:sdk.serverTimestamp()}));
await deny(sdk.setDoc(sdk.doc(dbA,'workspaces',workspace,'profiles',admin),{name:'Ana',role:'owner',updatedAt:sdk.serverTimestamp()}));
await deny(sdk.setDoc(sdk.doc(dbA,'workspaces',workspace,'blocks','b0'),{generation:'invalid-generation',index:0,payload:'{}'}));
const beforeHead=(await sdk.getDocFromServer(h(dbA))).data();await deny(sdk.updateDoc(h(dbA),{revision:1000,updatedAt:sdk.serverTimestamp(),updatedBy:admin}));
const large={message:'a'.repeat(47980)+'🎬'+'漢字'.repeat(80000),...initial};const savedLarge=await repoA.save(large,2,'large-unicode-operation');const loadedLarge=await repoB.load();check(JSON.stringify(loadedLarge.state)===JSON.stringify(large));check((await sdk.getDocFromServer(h(dbA))).data().chunkCount>1);
await repoA.save(initial,savedLarge.revision,'shrink-operation-123');check((await sdk.getDocs(sdk.collection(dbA,'workspaces',workspace,'blocks'))).size===1);
await assert.rejects(()=>repoA.save({text:'x'.repeat(7*1024*1024)},4,'oversize-operation-123'),/4 MB/);checks++;
const unicode={text:'a'.repeat(47990)+'🎬'.repeat(40000)};const packed=bridge.pack(unicode);check(JSON.stringify(bridge.unpack({schemaVersion:1,revision:1,generation:'unicode',chunkCount:packed.chunks.length,bytes:packed.bytes},packed.chunks.map((payload,index)=>({generation:'unicode',index,payload}))))===JSON.stringify(unicode));
// Auth Emulator: actual email/password sign-in from two apps, verification and reset.
const app1=initializeApp({projectId,apiKey:'fake-emulator-key',authDomain:projectId+'.firebaseapp.com'},'auth-test-a'),app2=initializeApp({projectId,apiKey:'fake-emulator-key',authDomain:projectId+'.firebaseapp.com'},'auth-test-b');
const auth1=authSdk.getAuth(app1),auth2=authSdk.getAuth(app2);authSdk.connectAuthEmulator(auth1,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});authSdk.connectAuthEmulator(auth2,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});
const email='cloud-admin@example.com',password='Prueba-1234567',created=await authSdk.createUserWithEmailAndPassword(auth1,email,password);check(!created.user.emailVerified);await authSdk.sendEmailVerification(created.user);
const listCodes=async()=>{const response=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/emulator/v1/projects/'+projectId+'/oobCodes');return (await response.json()).oobCodes};
let codes=await listCodes(),verifyCode=codes.find(c=>c.email===email&&c.requestType==='VERIFY_EMAIL');check(!!verifyCode);await authSdk.applyActionCode(auth1,verifyCode.oobCode);await authSdk.reload(created.user);check(created.user.emailVerified);
const signed2=await authSdk.signInWithEmailAndPassword(auth2,email,password);check(signed2.user.uid===created.user.uid);
// End-to-end: two actual Firebase Auth apps access the same protected Firestore state.
await authSdk.getIdToken(created.user,true);
await env.withSecurityRulesDisabled(context=>sdk.setDoc(sdk.doc(context.firestore(),'workspaces',workspace,'access',created.user.uid),{role:'admin',active:true}));
const [firestoreHost,firestorePort]=process.env.FIRESTORE_EMULATOR_HOST.split(':');const actualDb1=sdk.getFirestore(app1),actualDb2=sdk.getFirestore(app2);sdk.connectFirestoreEmulator(actualDb1,firestoreHost,Number(firestorePort));sdk.connectFirestoreEmulator(actualDb2,firestoreHost,Number(firestorePort));
const actualRepo1=bridge.createRepository(sdk,actualDb1,workspace,created.user.uid),actualRepo2=bridge.createRepository(sdk,actualDb2,workspace,created.user.uid);await actualRepo1.access();await actualRepo2.access();checks+=2;
let stopWatch;const observed=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('La segunda sesión no recibió la actualización')),10000);stopWatch=actualRepo2.watch(head=>{if(head.revision===5&&!head.fromCache){clearTimeout(timeout);resolve()}},reject)});
const shared=structuredClone(initial);shared.members['11111111'].visits=3;await actualRepo1.save(shared,4,'actual-auth-shared-state');await observed;stopWatch();check((await actualRepo2.load()).state.members['11111111'].visits===3);
await authSdk.reauthenticateWithCredential(created.user,authSdk.EmailAuthProvider.credential(email,password));await authSdk.updatePassword(created.user,'Cambio-1234567');await authSdk.signOut(auth2);await authSdk.signInWithEmailAndPassword(auth2,email,'Cambio-1234567');checks++;
await authSdk.sendPasswordResetEmail(auth2,email);codes=await listCodes();const reset=codes.filter(c=>c.email===email&&c.requestType==='PASSWORD_RESET').at(-1);check(!!reset);await authSdk.confirmPasswordReset(auth2,reset.oobCode,'Recuperada-1234567');await authSdk.signOut(auth2);await authSdk.signInWithEmailAndPassword(auth2,email,'Recuperada-1234567');checks++;
await authSdk.signOut(auth1);await authSdk.signOut(auth2);await deleteApp(app1);await deleteApp(app2);
// Removing the allowlist blocks future reads and writes even for a valid account.
await env.withSecurityRulesDisabled(context=>sdk.updateDoc(sdk.doc(context.firestore(),'workspaces',workspace,'access',admin),{active:false}));
await deny(sdk.getDocFromServer(h(dbA)));await deny(repoA.save(initial,4,'revoked-operation-123'));
console.log(checks+' Firebase emulator checks passed: access rules, verified accounts, profile isolation, transactional two-client conflicts, Unicode chunks, Auth email/password, verification and reset.');
}finally{await env.cleanup()}
