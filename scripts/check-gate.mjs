import {fileURLToPath} from 'node:url';
import {readFileSync,realpathSync} from 'node:fs';
export function checkGate(backlog, gateId='GATE-BE') {
 const gate=backlog.gates[gateId], task=backlog.tasks.find(t=>t.id===gateId);
 const errors=[];
 if(!gate||!task)return ['Unknown gate'];
 if(gateId==='GATE-BE'&&backlog.userAcceptance?.backend!==true)errors.push('Waiting for user backend acceptance before frontend');
 if(gate.status!=='Pass'||gate.verification!=='Pass')errors.push('Gate has not passed');
 for(const id of task.dependencies){const t=backlog.tasks.find(t=>t.id===id);if(!t||t.status!=='Done'||t.verification!=='Pass')errors.push(id+' is not accepted');}
 return errors;
}
if(process.argv[1] && fileURLToPath(import.meta.url)===realpathSync(process.argv[1])){
 const data=JSON.parse(readFileSync(new URL('../tasks.json',import.meta.url),'utf8'));
 const errors=checkGate(data,process.argv[2]||'GATE-BE');
 if(errors.length){console.error('BLOCKED: '+errors.join('; '));process.exitCode=1;}else console.log('PASS');
}
