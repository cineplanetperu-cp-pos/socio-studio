import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(path.join(root,name),'utf8');
const config=JSON.parse(read('firebase.json')),pkg=JSON.parse(read('package.json'));
assert.equal(config.hosting.public,'dist');
assert(!config.hosting.rewrites,'Esta aplicación no necesita reescrituras de rutas.');
assert.equal(config.firestore?.rules,'firestore.rules');assert.equal(config.firestore?.indexes,'firestore.indexes.json');assert(!config.database&&!config.functions,'No se utilizan Realtime Database ni Functions.');
assert(!pkg.dependencies,'El navegador carga el SDK web oficial; no hay dependencias de servidor.');assert(pkg.devDependencies?.firebase&&pkg.devDependencies?.['@firebase/rules-unit-testing']&&pkg.devDependencies?.['firebase-tools'],'Faltan herramientas de pruebas Firebase.');
const main=read('dist/index.html');const cloudConfig=JSON.parse(read('firebase.config.json'));const embedded=main.match(/const CLOUD_CONFIG=([^]*?);\n\/\* FIREBASE_CONFIG_END/);assert(embedded,'Falta configuración incorporada');assert.deepEqual(JSON.parse(embedded[1]),cloudConfig,'Ejecuta npm run build para incorporar la configuración actual.');assert.equal(cloudConfig.mode,'firebase');if(process.argv.includes('--release')){const bridge=vm.runInThisContext(read('src/firebase-core.js')+';SocioFirebase');try{bridge.validateConfig(cloudConfig)}catch(error){console.error('Publicación Firebase pendiente: '+error.message);process.exit(1)}if(existsSync(path.join(root,'.firebaserc'))){const aliases=JSON.parse(read('.firebaserc'));assert.equal(aliases.projects?.default,cloudConfig.firebase.projectId,'El alias default no coincide con el proyecto del código.')}console.log('Configuración Firebase de publicación: completa.')}else console.log(cloudConfig.firebase?.projectId?'Configuración Firebase presente; usa check:release antes de publicar.':'Entrega sin proyecto real: acceso en nube pendiente de configuración.');
assert(main.includes(read('src/firebase-core.js'))&&main.includes(read('src/firebase-ui.js')),'Ejecuta npm run build para incorporar el código de sincronización actual.');
assert.equal(main,read('dist/socio-cineplanet.html'),'Ejecuta npm run build para sincronizar la copia HTML.');
let scripts=0;
for(const name of ['index.html','socio-cineplanet.html','descargar.html','guia-firebase.html','404.html']){
 const html=read('dist/'+name),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 // Only inspect static markup; strings that generate forms are handled by the logic checks.
 const staticIds=[...html.split('<script>')[0].matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(staticIds).size,staticIds.length,'IDs estáticos duplicados en '+name);
 for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){new vm.Script(match[1],{filename:name});scripts++}
 assert(/<html lang="es/.test(html),'Idioma ausente en '+name);
 for(const match of html.split('<script>')[0].matchAll(/(?:href|src)="([^"#]+)"/g)){
  const url=match[1];if(/^(?:https?:|data:|mailto:)/.test(url)||url==='/'||url==='./')continue;
  const target=path.resolve(root,'dist',url.split(/[?#]/)[0]);assert(target.startsWith(path.join(root,'dist')+path.sep),'Ruta fuera de dist: '+url);assert(existsSync(target),'Archivo faltante: '+url);
 }
}
new vm.Script(read('dist/sw.js'),{filename:'sw.js'});
const manifest=JSON.parse(read('dist/manifest.webmanifest'));
for(const icon of manifest.icons)assert(existsSync(path.join(root,'dist',icon.src)));
for(const forbidden of ['POS / Caja','recordSale(','display.html','/workspace/'])assert(!main.includes(forbidden),'Referencia obsoleta: '+forbidden);
assert(!main.includes('firebase-adminsdk'),'No incluyas credenciales de servicio en el navegador.');
assert(main.includes("const KEY='socio-studio.v2'"),'Se alteró la clave de los registros existentes.');
assert(main.includes("const ADMIN_KEY='socio-studio.admin.v1'"),'Se alteró la clave del perfil existente.');
console.log('Configuración Hosting, '+scripts+' scripts HTML, service worker, enlaces y archivos portables: correctos.');
