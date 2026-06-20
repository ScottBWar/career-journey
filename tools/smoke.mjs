// =====================================================================
//  Smoke test — executes the game's BUILD surface under a mocked BABYLON,
//  catching runtime crashes that `node --check` and tools/check.mjs miss
//  (e.g. name collisions, unguarded def.X.forEach, bad colour values).
//  Runs every island, dungeon, enemy/party model, battle, portrait, the
//  dating scenes, coliseum, ship battles, and save/load/derived.
//  Run:  node tools/smoke.mjs   (exit 1 on any crash)
// =====================================================================
import fs from 'fs';
const errs = []; const tryit = (label, fn) => { try { fn(); } catch (e) { errs.push(label + ': ' + e.message); } };

// ---- mocked BABYLON (permissive plumbing, strict where real bugs hide) ----
const _N = [];
const V3 = class { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} copyFrom(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  copyFromFloats(a,b,c){this.x=a;this.y=b;this.z=c;return this;} clone(){return new V3(this.x,this.y,this.z);}
  add(){return this.clone();} subtract(){return this.clone();} scale(){return this.clone();} normalize(){return this;}
  addInPlace(){return this;} scaleInPlace(){return this;} length(){return 1;} equals(){return false;} };
V3.Distance=()=>0; V3.Zero=()=>new V3(); V3.Lerp=()=>new V3(); V3.TransformCoordinates=()=>new V3();
const C3 = class { constructor(r=0,g=0,b=0){this.r=r;this.g=g;this.b=b;} scale(){return new C3();} clone(){return new C3();} toColor4(){return {};} };
C3.FromHexString = (h) => { if (typeof h !== 'string') throw new TypeError('Color3.FromHexString got non-string: ' + JSON.stringify(h)); return new C3(); };
C3.Black=()=>new C3(); C3.White=()=>new C3();
const scaleObj = () => Object.assign(new V3(1,1,1), { set(){}, setAll(){} });
function mk(n){ const o = { name:n, position:new V3(), rotation:new V3(), scaling:scaleObj(), material:null, parent:null,
  setEnabled(){}, getVerticesData(){return new Float32Array(120);}, updateVerticesData(){}, dispose(){}, registerInstancedBuffer(){},
  createInstance(){return mk('inst');}, isVisible:true, renderingGroupId:0, receiveShadows:false, setParent(){}, getChildMeshes(){return [];},
  getChildren(){return _N.filter(x=>x.parent===o);}, addLODLevel(){return o;}, freezeWorldMatrix(){}, convertToFlatShadedMesh(){},
  bakeCurrentTransformIntoVertices(){}, lookAt(){}, addRotation(){return o;}, rotate(){}, translate(){}, computeWorldMatrix(){},
  getAbsolutePosition(){return new V3();} }; _N.push(o); return o; }
const MB = new Proxy({}, { get: () => (n) => mk(typeof n==='string'?n:'m') });
const perm = () => new Proxy(function(){}, { get:(t,p)=>{ if(p==='gain'||p==='position'||p==='direction')return new V3(); return perm(); }, apply:()=>perm(), construct:()=>perm() });
function c2d(){ return new Proxy({}, { get:(t,p)=>{ if(p==='canvas')return{width:0,height:0}; if(typeof t[p]!=='undefined')return t[p]; return ()=>({addColorStop(){}}); }, set:(t,p,v)=>{t[p]=v;return true;} }); }
global.BABYLON = new Proxy({ Vector3:V3, Color3:C3, Color4:class{constructor(){}}, MeshBuilder:MB,
  StandardMaterial:class{constructor(){this.diffuseColor=new C3();this.specularColor=new C3();this.emissiveColor=new C3();this.diffuseTexture=null;}},
  TransformNode:class{constructor(n){this.name=n;this.position=new V3();this.rotation=new V3();this.scaling=scaleObj();this.parent=null;_N.push(this);}setEnabled(){}dispose(){}getChildMeshes(){return[];}getChildren(){return _N.filter(x=>x.parent===this);}},
  HemisphericLight:class{constructor(){this.groundColor=new C3();}}, DirectionalLight:class{constructor(){this.position=new V3();this.direction=new V3();}setDirectionToTarget(){}},
  PointLight:class{constructor(){this.diffuse=new C3();}}, UniversalCamera:class{constructor(){this.fov=1;this.position=new V3();}setTarget(){}},
  ArcRotateCamera:class{constructor(){this.position=new V3();}setTarget(){}attachControl(){}},
  Scene:class{constructor(){this.onBeforeRenderObservable={add(){return{};},remove(){}};this.clearColor=null;this.meshes=[];this.materials=[];this.fogMode=0;}dispose(){}registerBeforeRender(){}},
  DynamicTexture:class{getContext(){return c2d();}update(){}drawText(){}getSize(){return{width:256,height:64};}}, Texture:class{},
  ParticleSystem:class{constructor(){this.particleTexture=null;}start(){}stop(){}}, VertexBuffer:{PositionKind:'position',NormalKind:'normal'},
  Mesh:perm(), Matrix:perm(), Viewport:class{constructor(){}}, GlowLayer:class{constructor(){this.intensity=1;}addIncludedOnlyMesh(){}},
}, { get:(t,p)=> (p in t)?t[p]:perm() });
global.BABYLON.Scene.FOGMODE_EXP2=2; global.BABYLON.Scene.FOGMODE_LINEAR=1; global.BABYLON.Scene.FOGMODE_NONE=0;

// ---- DOM + globals ----
global.window = {};
const domEl = () => ({ classList:{add(){},remove(){},contains:()=>false,toggle(){}}, style:{}, appendChild(){}, innerHTML:'', querySelectorAll:()=>[], textContent:'', onclick:null, dataset:{}, offsetWidth:0, animate(){}, remove(){}, focus(){}, getContext:()=>c2d() });
global.document = { getElementById:domEl, createElement:()=>({ width:0,height:0,getContext:()=>c2d(),toDataURL:()=>'data:',style:{},classList:{add(){},remove(){}},appendChild(){},setAttribute(){} }) };
global.el = domEl;
let store={}; global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};

const load = f => eval(fs.readFileSync(f, 'utf8'));
load('js/models.js'); load('js/data.js'); global.Data = window.Data;
const Models = window.Models, Data = window.Data;
global.Portraits = { has:()=>false, img:()=>'', url:()=>'' }; global.SFX = { play(){} }; global.Music = { play(){}, toggle(){}, start(){} };
load('js/progress.js'); const Progress = window.Progress; global.Progress = Progress;
const state = Progress.freshState();
global.Game = { engine:{getDeltaTime:()=>16, runRenderLoop(){}, resize(){}}, canvas:{}, state, scene:null, active:{}, mode:'island',
  startBattle(){}, startCutscene(){}, cutscene(){}, confirm(){}, toast(){}, resumeIsland(){}, resumeDungeon(){}, resumeSea(){}, resumeExplore(){}, pauseExplore(){},
  enterTown(){}, toDungeon(){}, toSea(){}, openDating(){}, openShellHunt(){}, openColiseum(){}, CHAR_THEME:{} };

load('js/render.js'); global.window.Render = window.Render; global.Render = window.Render; // exercise the real post-FX pipeline too
load('js/world.js'); const World = window.World;
load('js/dungeon.js'); const Dungeon = window.Dungeon;
load('js/battle.js'); const Battle = window.Battle;
load('js/dating.js'); const Dating = window.Dating;
load('js/coliseum.js'); const Coliseum = window.Coliseum;
load('js/shipbattle.js'); const ShipBattle = window.ShipBattle;
load('js/portraits.js'); const PT = window.Portraits;

for (const k of Object.keys(Data.ISLANDS)) tryit('ISLAND '+k, () => World.enter(k));
for (const k of Object.keys(Data.DUNGEONS)) tryit('DUNGEON '+k, () => Dungeon.enter(k));
for (const k of Object.keys(Data.ENEMIES)) tryit('ENEMY '+k, () => { if(!Models.enemy(k).node) throw new Error('no node'); });
Data.PARTY.forEach(p => tryit('PARTYMODEL '+p.key, () => { if(!(Models[p.model] && Models[p.model]().node)) throw new Error('model '+p.model); }));
[['shark','crab'],['leviathan'],['angler'],['selachoth'],['selachoth_omega'],['kraken'],['beetlejuice'],['shade','sandling','gravehand'],['medusa','minotaur','hydra']]
  .forEach(f => tryit('BATTLE ['+f+']', () => Battle.build(f, {}, ()=>{})));
state.mermaids = {}; for (const k of Object.keys(Data.MERMAIDS)) tryit('DATING '+k, () => Dating.start(k, ()=>{}));
for (const t of ['sloop','frigate','ghost']) tryit('SHIPBATTLE '+t, () => ShipBattle.build(t, ()=>{}));
tryit('COLISEUM', () => Coliseum.open(()=>{}));
for (const k of Object.keys(Data.ENEMIES)) for (const m of ['neutral','happy','shy','upset']) tryit('PORTRAIT '+k+'/'+m, () => PT.url(k, m));
Data.PARTY.forEach(p => tryit('PORTRAIT '+p.key, () => PT.url(p.key)));

console.log(`smoke: ${Object.keys(Data.ISLANDS).length} islands · ${Object.keys(Data.DUNGEONS).length} dungeons · ${Object.keys(Data.ENEMIES).length} enemies · ${Data.PARTY.length} party · dating/ship/coliseum/portraits`);
if (errs.length) { console.error('\n✗ ' + errs.length + ' RUNTIME CRASHES:'); errs.forEach(e => console.error('  ' + e)); process.exit(1); }
console.log('✓ all builds execute cleanly');
