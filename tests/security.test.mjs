import assert from 'node:assert/strict';
import test from 'node:test';
import { buildToolDefs, executeTool, toMcpSchema } from '../dist/tools.js';
import { fubRequest, retryDelay } from '../dist/http.js';
import { Ajv } from 'ajv';

const cfg={apiKey:'synthetic-key',systemName:'mock',systemKey:'synthetic-system',allowWrite:true,allowDelete:true,allowWebhooks:true,allowAutomations:true,webhookHosts:['receiver.example']};
const all=buildToolDefs(cfg), by=Object.fromEntries(all.map(t=>[t.name,t]));
let calls=[], response=()=>new Response('{}');
globalThis.fetch=async (url,init)=>{calls.push({url,...init});return response(url,init);};
function reset(){ calls=[];response=()=>new Response('{}'); }
const view={...cfg,allowWrite:false};

test('all tool schemas compile; default read-only hides every non-GET',()=>{
 const ajv=new Ajv({strict:false,validateFormats:false});
 for(const t of all) ajv.compile(toMcpSchema(t).inputSchema);
 assert.equal(all.length,157);
 assert.equal(buildToolDefs(view).length,70);
 assert.ok(buildToolDefs(view).every(t=>t.method==='GET'));
});
test('read-only execution denies ALL write tools even with confirm and sensitive flags',async()=>{
 reset();
 for(const t of all.filter(t=>t.method!=='GET')) await assert.rejects(executeTool(view,t,{confirm:true}),/View information/);
 assert.equal(calls.length,0);
});
test('ordinary write opt-in keeps workflow, webhook and delete opt-ins independent',async()=>{
 reset(); const ordinary={...cfg,allowDelete:false,allowWebhooks:false,allowAutomations:false};
 assert.ok(buildToolDefs(ordinary).some(t=>t.name==='create_note'));
 for(const name of ['create_webhook','create_event','create_automations_person','create_action_plans_person','delete_person']) {
  assert.ok(!buildToolDefs(ordinary).some(t=>t.name===name));
  await assert.rejects(executeTool(ordinary,by[name],{confirm:true}),/require/);
 }
 assert.equal(calls.length,0);
});
test('ordinary write remains usable, requires strict confirmation and preserves body',async()=>{
 reset(); const args={personId:1,body:'synthetic note'};
 for(const confirm of [undefined,false,'true',1]) await assert.rejects(executeTool(cfg,by.create_note,{...args,confirm}));
 await executeTool(cfg,by.create_note,{...args,confirm:true});
 assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].body),args);
});
test('sensitive workflow opt-in plus confirmation allows explicitly selected workflow',async()=>{
 reset();await executeTool(cfg,by.create_automations_person,{automationId:2,personId:1,confirm:true});
 assert.equal(calls.length,1);
});
test('webhooks require exact HTTPS hostname, no credential URLs or IP destinations',async()=>{
 reset();
 for(const url of ['https://other.example/h','http://receiver.example/h','https://u:p@receiver.example/h','https://receiver.example:444/h','https://receiver.example/h#f','https://receiver.example.evil/h','https://127.0.0.1/h'])
  await assert.rejects(executeTool(cfg,by.create_webhook,{url,event:'peopleCreated',confirm:true}));
 assert.equal(calls.length,0);
 await executeTool(cfg,by.create_webhook,{url:'https://receiver.example/h',event:'peopleCreated',confirm:true});
 assert.equal(calls.length,1);
});
test('missing body, types, enum, unknown fields, ranges rejected before fetch',async()=>{
 reset();
 for(const args of [{confirm:true},{url:'https://receiver.example',event:'wrong',confirm:true},{url:5,event:'peopleCreated',confirm:true}]) await assert.rejects(executeTool(cfg,by.create_webhook,args));
 for(const args of [{limit:101},{limit:0},{limit:{}},{limit:'3'},{unrecognized:1}]) await assert.rejects(executeTool(cfg,by.list_people,args));
 assert.equal(calls.length,0);
});
test('path IDs reject dot segments, URL delimiters and unsafe numbers; numeric strings accepted',async()=>{
 reset();
 for(const id of ['..','.','../1','%2e%2e','1/2','https://bad.example',0,-1,1.5,Number.MAX_SAFE_INTEGER+1]) await assert.rejects(executeTool(cfg,by.get_person,{id}));
 await executeTool(cfg,by.get_person,{id:'42'});assert.equal(new URL(calls[0].url).pathname,'/v1/people/42');
 assert.equal(calls.length,1);
});
test('extra fields cannot collide or smuggle unknown fields; documented custom values work',async()=>{
 reset();
 for(const extraBody of [{firstName:'override'},{stage:'Trash'},{confirm:true},{url:'https://bad.example'},JSON.parse('{"__proto__":{"stage":"Trash"}}'),{customName:{a:1}}])
  await assert.rejects(executeTool(cfg,by.update_person,{id:1,confirm:true,extraBody}));
 await assert.rejects(executeTool(cfg,by.update_person,{id:1,confirm:true,extraQuery:{mergeTags:false}}));
 await executeTool(cfg,by.update_person,{id:1,confirm:true,extraBody:{customBirthday:'2026-01-01',collaborators:[2,3]}});
 assert.equal(calls.length,1);assert.equal(JSON.parse(calls[0].body).customBirthday,'2026-01-01');
});
test('input byte/depth/element budgets and nested required field types enforced',async()=>{
 reset();await assert.rejects(executeTool(cfg,by.create_note,{personId:1,body:'x'.repeat(270000),confirm:true}),/256 KiB/);
 await assert.rejects(executeTool(cfg,by.update_person,{id:1,confirm:true,phones:[{value:123}]}));
 let nested={};for(let i=0;i<25;i++)nested={a:nested};
 await assert.rejects(executeTool(cfg,by.update_person,{id:1,confirm:true,extraBody:nested}),/complex/);
 assert.equal(calls.length,0);
});
test('HTTP defense in depth: read mode, paths, redirect policy and signal',async()=>{
 reset();await assert.rejects(fubRequest(view,{method:'POST',path:'/notes'}),/blocks writes/);
 for(const path of ['/people/..','/people/%2e%2e','//evil','/people/1?x=1','/people/1%2f2']) await assert.rejects(fubRequest(cfg,{method:'GET',path}),/Invalid/);
 await fubRequest(cfg,{method:'GET',path:'/me'});
 assert.equal(calls.length,1);assert.equal(calls[0].redirect,'error');assert.ok(calls[0].signal instanceof AbortSignal);
});
test('write 429/500 and transport failures never retry; upstream errors redacted',async()=>{
 for(const status of [429,500,400]) {
  reset();response=()=>new Response(JSON.stringify({errorMessage:'synthetic-secret'}),{status});
  await assert.rejects(fubRequest(cfg,{method:'POST',path:'/notes',body:{}}),e=>!e.message.includes('synthetic-secret'));
  assert.equal(calls.length,1);
 }
 reset();response=()=>{throw new Error('Authorization synthetic-secret')};
 await assert.rejects(fubRequest(cfg,{method:'POST',path:'/notes'}),e=>/unknown/.test(e.message)&&!e.message.includes('synthetic-secret'));
 assert.equal(calls.length,1);
});
test('GET 429 bounded retries, Retry-After seconds/date parsing, long wait not shortened',async()=>{
 reset();response=()=>new Response('{}',{status:429,headers:{'Retry-After':'0'}});
 await assert.rejects(fubRequest(cfg,{method:'GET',path:'/me'}),/429/);assert.equal(calls.length,3);
 assert.equal(retryDelay('-1'),0);assert.equal(retryDelay('2'),2000);assert.equal(retryDelay('Thu, 01 Jan 1970 00:00:02 GMT',0),2000);
 reset();response=()=>new Response('{}',{status:429,headers:{'Retry-After':'120'}});
 await assert.rejects(fubRequest(cfg,{method:'GET',path:'/me'}),/429/);assert.equal(calls.length,1);
});
test('large streamed response and content-length rejected, 204 works, invalid JSON redacted',async()=>{
 for(const headers of [{},{'content-length':'3000000'}]) {
  reset();response=()=>new Response('x'.repeat(2100000),{headers});
  await assert.rejects(fubRequest(cfg,{method:'GET',path:'/me'}),/2 MiB/);
 }
 reset();response=()=>new Response(null,{status:204});assert.deepEqual((await fubRequest(cfg,{method:'GET',path:'/me'})).data,{});
 response=()=>new Response('synthetic-secret');await assert.rejects(fubRequest(cfg,{method:'GET',path:'/me'}),/invalid JSON/);
});
test('cancellation is forwarded and reports uncertain writes without replay',async()=>{
 reset();response=(_u,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
 const control=new AbortController();const p=fubRequest(cfg,{method:'POST',path:'/notes',signal:control.signal});control.abort();
 await assert.rejects(p,/outcome may be unknown/);assert.equal(calls.length,1);
});
test('concurrency is bounded and released on failure',async()=>{
 reset();const controllers=Array.from({length:4},()=>new AbortController());
 response=(_u,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
 const pending=controllers.map(c=>fubRequest(cfg,{method:'GET',path:'/me',signal:c.signal}).catch(()=>{}));
 await assert.rejects(fubRequest(cfg,{method:'GET',path:'/me'}),/concurrent/);
 controllers.forEach(c=>c.abort());await Promise.all(pending);
 response=()=>new Response('{}');await fubRequest(cfg,{method:'GET',path:'/me'});
});
test('total deadline signal is installed and aborts a hanging request',async()=>{
 reset();const control=new AbortController();const original=AbortSignal.timeout;
 let budget;
 try {
  AbortSignal.timeout=ms=>{budget=ms;return control.signal};
  response=(_u,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
  const pending=fubRequest(cfg,{method:'GET',path:'/me'});control.abort();
  await assert.rejects(pending,/timed out/);assert.equal(budget,30000);assert.equal(calls.length,1);
 } finally {AbortSignal.timeout=original;}
});

test('webhook host allowlist cannot permit bracketed IPv6 or trailing-dot localhost',async()=>{
 reset();
 for(const host of ['[::1]','[2001:db8::1]','localhost.']) {
  await assert.rejects(executeTool({...cfg,webhookHosts:[host]},by.create_webhook,{url:`https://${host}/hook`,event:'peopleCreated',confirm:true}),/destination/);
 }
 assert.equal(calls.length,0);
});
