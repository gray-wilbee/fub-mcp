import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function withClient(env,run){
 const transport=new StdioClientTransport({command:process.execPath,args:['--import',new URL('./mock-preload.mjs',import.meta.url).href,process.env.FUB_TEST_ENTRY ?? fileURLToPath(new URL('../dist/index.js',import.meta.url))],env:{FUB_API_KEY:'synthetic-test-key',FUB_MCP_SYSTEM_KEY:'',FUB_MCP_ALLOW_WRITE:'0',FUB_MCP_ALLOW_DELETE:'0',FUB_MCP_ALLOW_WEBHOOKS:'0',FUB_MCP_ALLOW_AUTOMATIONS:'0',...env},stderr:'pipe'});
 const client=new Client({name:'offline-tests',version:'1.0.0'});
 let stderr='';transport.stderr?.on('data',b=>stderr+=b);
 try {await client.connect(transport);await run(client);assert.ok(!stderr.includes('synthetic-test-key'));}
 finally {await client.close();}
}
test('stdio default mode rejects direct writes, reads still work',()=>withClient({},async client=>{
 const {tools}=await client.listTools();assert.equal(tools.length,70);
 assert.ok(tools.every(t=>t.annotations.readOnlyHint));
 const read=await client.callTool({name:'get_person',arguments:{id:1}});assert.equal(JSON.parse(read.content[0].text).mocked,true);
 const write=await client.callTool({name:'create_note',arguments:{personId:1,body:'test',confirm:true}});assert.equal(write.isError,true);
}));
test('stdio boolean opt-in enables ordinary updates, rejects invalid args and sensitive calls',()=>withClient({FUB_MCP_ALLOW_WRITE:'true'},async client=>{
 const {tools}=await client.listTools();assert.ok(tools.some(t=>t.name==='create_note'));assert.ok(!tools.some(t=>t.name==='create_webhook'));
 const valid=await client.callTool({name:'create_note',arguments:{personId:1,body:'synthetic',confirm:true}});assert.equal(JSON.parse(valid.content[0].text).body.body,'synthetic');
 for(const [name,args] of [['create_note',{}],['get_person',{id:'..'}],['create_webhook',{url:'https://x.example',event:'peopleCreated',confirm:true}],['delete_person',{id:1,confirm:true}]])
  assert.equal((await client.callTool({name,arguments:args})).isError,true);
}));
test('stdio advanced opt-ins and delete confirmation work without changing defaults',()=>withClient({FUB_MCP_ALLOW_WRITE:'1',FUB_MCP_ALLOW_DELETE:'1',FUB_MCP_ALLOW_WEBHOOKS:'1',FUB_MCP_WEBHOOK_HOSTS:'receiver.example'},async client=>{
 const del=await client.callTool({name:'delete_person',arguments:{id:1,confirm:true}});assert.equal(JSON.parse(del.content[0].text).method,'DELETE');
 const no=await client.callTool({name:'delete_person',arguments:{id:1}});assert.equal(no.isError,true);
 const hook=await client.callTool({name:'create_webhook',arguments:{url:'https://receiver.example/hook',event:'peopleCreated',confirm:true}});assert.equal(JSON.parse(hook.content[0].text).mocked,true);
}));
