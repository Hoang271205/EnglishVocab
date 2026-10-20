import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkGate} from '../scripts/check-gate.mjs';
test('gate requires passing status and every BE dependency; valid completed gate can open',()=>{
 const fixture={userAcceptance:{backend:false},gates:{'GATE-BE':{status:'Blocked',verification:'Not tested'}},tasks:[{id:'BE-01',status:'In progress',verification:'Not tested',dependencies:[]},{id:'GATE-BE',status:'Blocked',verification:'Not tested',dependencies:['BE-01']}]};
 assert.ok(checkGate(fixture).length>0);
 fixture.gates['GATE-BE']={status:'Pass',verification:'Pass'};assert.ok(checkGate(fixture).length>0);
 fixture.tasks[0]!.status='Done';fixture.tasks[0]!.verification='Pass';assert.ok(checkGate(fixture).length>0);fixture.userAcceptance.backend=true;assert.deepEqual(checkGate(fixture),[]);
 fixture.tasks[1]!.dependencies.push('missing');assert.ok(checkGate(fixture).length>0);
});
