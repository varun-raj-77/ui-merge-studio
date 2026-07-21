export function createSelectionRuntimeSource(expectedBranch: string, studioOrigin: string) {
  return `
const VERSION = 1;
const ATTR = 'data-ums-boundary';
const branch = ${JSON.stringify(expectedBranch)};
const studioOrigin = ${JSON.stringify(studioOrigin)};
let enabled = false;
let hovered = null;
let selected = null;
let instanceCounter = 0;
const instances = new WeakMap();
const overlay = document.createElement('div');
Object.assign(overlay.style,{position:'fixed',pointerEvents:'none',zIndex:'2147483647',border:'2px solid #4f7cff',background:'rgba(79,124,255,.12)',display:'none'});
document.documentElement.appendChild(overlay);
const send=(type,payload)=>parent.postMessage({version:VERSION,type,payload},studioOrigin);
const refusal=(reason,evidence,ancestor=false)=>send('selection-error',{confidence:'refused',reason,evidence,supportedAncestorAvailable:ancestor});
function decode(element){
  const raw=element.getAttribute(ATTR); if(!raw)return null;
  try { const meta=JSON.parse(raw); if(!meta||meta.branch!==branch||typeof meta.boundaryId!=='string'||typeof meta.repositoryRelativePath!=='string'||!Number.isInteger(meta.line)||!Number.isInteger(meta.column)) return null;
    let instanceId=instances.get(element); if(!instanceId){instanceId=meta.boundaryId+'-'+(++instanceCounter);instances.set(element,instanceId)}
    return {...meta,instanceId};
  } catch { return null; }
}
function boundariesFrom(target){const result=[];let node=target instanceof Element?target:null;while(node){const identity=decode(node);if(identity)result.push({element:node,identity});node=node.parentElement}return result}
function paint(entry){if(!entry){overlay.style.display='none';return}const r=entry.element.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});}
document.addEventListener('pointermove',event=>{if(!enabled)return;const entries=boundariesFrom(event.target);hovered=entries[0]||null;paint(hovered);send('boundary-hovered',hovered?.identity??null)},true);
document.addEventListener('click',event=>{if(!enabled)return;event.preventDefault();event.stopPropagation();const entries=boundariesFrom(event.target);if(!entries.length){refusal('No eligible project-owned React boundary','The target and its DOM ancestors contain no valid instrumentation metadata.',false);return}selected={entries,index:0};paint(entries[0]);send('boundary-selected',{identity:entries[0].identity,ancestors:entries.slice(1).map(x=>x.identity)})},true);
addEventListener('message',event=>{if(event.source!==parent||event.origin!==studioOrigin||!event.data||event.data.version!==VERSION)return;const type=event.data.type;
 if(type==='enable-selection'){enabled=true;send('selection-mode-enabled')}
 else if(type==='disable-selection'){enabled=false;hovered=null;paint(null);send('selection-mode-disabled')}
 else if(type==='clear-selection'){selected=null;paint(null)}
 else if(type==='select-ancestor'){if(!selected){refusal('No selected boundary','Select a supported boundary before navigating ancestors.',false);return}const index=event.data.payload?.index;if(!Number.isInteger(index)||index<0||index>=selected.entries.length){refusal('Ancestor is unavailable','The requested ancestor index is outside the current boundary chain.',selected.entries.length>1);return}selected.index=index;const entry=selected.entries[index];paint(entry);send('boundary-selected',{identity:entry.identity,ancestors:selected.entries.slice(index+1).map(x=>x.identity)})}
});
addEventListener('error',event=>send('runtime-error',{message:event.message||'Unknown preview runtime error'}));
send('preview-ready',{branch});
`;
}
