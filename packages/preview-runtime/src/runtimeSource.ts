import type { PreviewCapabilities, PreviewIdentity } from '../../shared/src/bridge';

export interface SelectionRuntimeOptions {
  identity: PreviewIdentity;
  studioOrigin: string;
  capabilities: PreviewCapabilities;
}

export function createSelectionRuntimeSource(options: SelectionRuntimeOptions) {
  return `
const VERSION = 2;
const ATTR = 'data-ums-boundary';
const identity = ${JSON.stringify(options.identity)};
const studioOrigin = ${JSON.stringify(options.studioOrigin)};
const capabilities = ${JSON.stringify(options.capabilities)};
let enabled = false;
let hovered = null;
let selected = null;
let instanceCounter = 0;
let lastContextFingerprint = '';
const instances = new WeakMap();
const overlay = document.createElement('div');
Object.assign(overlay.style,{position:'fixed',pointerEvents:'none',zIndex:'2147483647',border:'3px solid #FF6B3D',background:'rgba(255,107,61,.12)',boxShadow:'0 0 0 3px rgba(255,107,61,.2)',display:'none'});
document.documentElement.appendChild(overlay);
const send=(type,payload)=>parent.postMessage({version:VERSION,preview:identity,type,payload},studioOrigin);
const refusal=(reason,evidence,ancestor=false)=>send('selection-error',{confidence:'refused',reason,evidence,supportedAncestorAvailable:ancestor});
function sameIdentity(value){return value&&value.previewId===identity.previewId&&value.sessionId===identity.sessionId&&value.generation===identity.generation&&value.branch===identity.branch}
function validContext(value){return value&&typeof value.route==='string'&&(value.entity===null||(value.entity&&typeof value.entity.type==='string'&&typeof value.entity.id==='string'))}
function validViewport(value){return value&&(value.preset==='desktop'||value.preset==='tablet'||value.preset==='mobile')&&Number.isInteger(value.width)&&value.width>0&&Number.isInteger(value.height)&&value.height>0}
function context(){
  const contract=capabilities.routeSync?.contract;
  let id=null;
  if(contract==='ticket-query-v1')id=new URLSearchParams(location.search).get('ticket');
  else if(contract==='ticket-path-v1'){const match=location.pathname.match(/^\\/tickets\\/([^/]+)$/);id=match?decodeURIComponent(match[1]):null}
  return {route:location.pathname,entity:id?{type:'ticket',id}:null};
}
function emitNavigation(){
  const current=context();const fingerprint=JSON.stringify(current);if(fingerprint===lastContextFingerprint)return;
  lastContextFingerprint=fingerprint;send('navigation-changed',{operationId:null,context:current});
  setTimeout(()=>{if(selected&&!selected.entries[selected.index]?.element.isConnected){selected=null;paint(null);send('selection-cleared',{reason:'The selected source boundary is no longer present after navigation.'})}},0);
}
const nativePush=history.pushState.bind(history);const nativeReplace=history.replaceState.bind(history);
history.pushState=(...args)=>{nativePush(...args);emitNavigation()};history.replaceState=(...args)=>{nativeReplace(...args);emitNavigation()};
addEventListener('popstate',emitNavigation);
function decode(element){
  const raw=element.getAttribute(ATTR);if(!raw)return null;
  try {const meta=JSON.parse(raw);if(!meta||meta.branch!==identity.branch||typeof meta.boundaryId!=='string'||typeof meta.repositoryRelativePath!=='string'||!Number.isInteger(meta.line)||!Number.isInteger(meta.column))return null;
    let instanceId=instances.get(element);if(!instanceId){instanceId=meta.boundaryId+'-'+identity.sessionId.slice(0,8)+'-'+(++instanceCounter);instances.set(element,instanceId)}
    return {...meta,instanceId,previewId:identity.previewId,sessionId:identity.sessionId,generation:identity.generation};
  } catch {return null}
}
function boundariesFrom(target){const result=[];let node=target instanceof Element?target:null;while(node){const source=decode(node);if(source)result.push({element:node,identity:source});node=node.parentElement}return result}
function paint(entry){if(!entry){overlay.style.display='none';return}const r=entry.element.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})}
function applyContext(payload){
  const requested=payload.context;const entity=requested.entity;
  if(entity&&entity.type!=='ticket'){send('sync-refused',{dimension:'fixture-context',reason:'This adapter can only represent ticket entities.'});return}
  const contract=capabilities.routeSync?.contract;if(!contract){send('sync-refused',{dimension:'route',reason:'This preview did not declare a supported route contract.'});return}
  const url=new URL(location.href);
  if(contract==='ticket-query-v1'){url.pathname='/tickets';url.search='';if(entity)url.searchParams.set('ticket',entity.id)}
  else if(contract==='ticket-path-v1'){url.pathname=entity?'/tickets/'+encodeURIComponent(entity.id):'/tickets';url.search=''}
  else {send('sync-refused',{dimension:'route',reason:'The declared route contract is not implemented by this fixture adapter.'});return}
  nativeReplace({},'',url);lastContextFingerprint=JSON.stringify(context());dispatchEvent(new PopStateEvent('popstate'));
  send('preview-state',{operationId:payload.operationId,context:context()});
}
document.addEventListener('pointermove',event=>{if(!enabled)return;const entries=boundariesFrom(event.target);hovered=entries[0]||null;paint(hovered);send('boundary-hovered',hovered?.identity??null)},true);
document.addEventListener('click',event=>{if(!enabled)return;event.preventDefault();event.stopPropagation();const entries=boundariesFrom(event.target);if(!entries.length){refusal('No eligible project-owned React boundary','The target and its DOM ancestors contain no valid instrumentation metadata.',false);return}selected={entries,index:0};paint(entries[0]);send('boundary-selected',{identity:entries[0].identity,ancestors:entries.slice(1).map(x=>x.identity)})},true);
addEventListener('message',event=>{if(event.source!==parent||event.origin!==studioOrigin||!event.data||event.data.version!==VERSION||!sameIdentity(event.data.preview))return;const type=event.data.type;
 if(type==='enable-selection'&&event.data.payload===undefined){enabled=true;send('selection-mode-enabled')}
 else if(type==='disable-selection'&&event.data.payload===undefined){enabled=false;hovered=null;paint(null);send('selection-mode-disabled')}
 else if(type==='clear-selection'&&event.data.payload===undefined){selected=null;hovered=null;paint(null);send('selection-cleared',{reason:'Selection cleared by the user.'})}
 else if(type==='select-ancestor'){if(!selected){refusal('No selected boundary','Select a supported boundary before navigating ancestors.',false);return}const index=event.data.payload?.index;if(!Number.isInteger(index)||index<0||index>=selected.entries.length){refusal('Ancestor is unavailable','The requested ancestor index is outside the current boundary chain.',selected.entries.length>1);return}selected.index=index;const entry=selected.entries[index];paint(entry);send('boundary-selected',{identity:entry.identity,ancestors:selected.entries.slice(index+1).map(x=>x.identity)})}
 else if(type==='sync-context'&&event.data.payload&&typeof event.data.payload.operationId==='string'&&typeof event.data.payload.sourcePreviewId==='string'&&validContext(event.data.payload.context))applyContext(event.data.payload)
 else if(type==='sync-viewport'&&event.data.payload&&typeof event.data.payload.operationId==='string'&&validViewport(event.data.payload.viewport))send('viewport-changed',{operationId:event.data.payload.operationId,viewport:event.data.payload.viewport})
});
addEventListener('error',event=>send('runtime-error',{message:event.message||'Unknown preview runtime error'}));
const initialContext=context();lastContextFingerprint=JSON.stringify(initialContext);send('preview-ready',{capabilities,context:initialContext});
`;
}
