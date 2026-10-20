// Protocol only; no selection popup or product UI before Gate-BE.
if(location.origin==='http://localhost:5173'){
 const marker='englishvocab-bridge-v1';
 window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==location.origin||!event.data||event.data.marker!==marker)return;
  const {requestId,type}=event.data;
  if(typeof requestId!=='string'||requestId.length>128||!['queue-transfer','queue-ack','snapshot-update'].includes(type))return;
  const message=type==='queue-transfer'?{type}:type==='snapshot-update'?{type,snapshot:event.data.snapshot}:{type,transferId:event.data.transferId,captureIds:event.data.captureIds};
  void chrome.runtime.sendMessage(message).then(result=>window.postMessage({marker:marker+'-response',requestId,result},location.origin)).catch(()=>window.postMessage({marker:marker+'-response',requestId,result:{ok:false,error:'Extension unavailable'}},location.origin));
 });
}
