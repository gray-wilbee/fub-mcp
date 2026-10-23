import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../dist/auth.js';

// Supply a fake environment key so loadConfig never reads the local key file.
const names=['FUB_API_KEY','FUB_MCP_ALLOW_WRITE','FUB_MCP_ALLOW_DELETE','FUB_MCP_ALLOW_WEBHOOKS','FUB_MCP_ALLOW_AUTOMATIONS','FUB_MCP_SYSTEM_NAME','FUB_MCP_SYSTEM_KEY','FUB_MCP_WEBHOOK_HOSTS'];
test('configuration is fail-closed and accepts MCPB boolean strings',()=>{
 const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try {
  names.forEach(n=>delete process.env[n]);process.env.FUB_API_KEY='synthetic-only';
  assert.equal(loadConfig().allowWrite,false);
  for(const v of ['','0','false','${user_config.allow_write}']){process.env.FUB_MCP_ALLOW_WRITE=v;assert.equal(loadConfig().allowWrite,false);}
  for(const v of ['1','true']){process.env.FUB_MCP_ALLOW_WRITE=v;assert.equal(loadConfig().allowWrite,true);}
  process.env.FUB_MCP_ALLOW_WRITE='yes';assert.throws(()=>loadConfig(),/must be/);
 } finally {for(const n of names){if(saved[n]===undefined)delete process.env[n];else process.env[n]=saved[n];}}
});
