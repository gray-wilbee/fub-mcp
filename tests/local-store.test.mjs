import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'fub-key-test-'));
const original=os.homedir;os.homedir=()=>temporary;
const {writeLocalApiKey,LOCAL_ENV_FILE,LOCAL_STORE_DIR}=await import('../dist/local-store.js');
os.homedir=original;
test('credential save is private, rejects multiline values and does not follow file symlinks',()=>{
 try {
  writeLocalApiKey('synthetic-one');
  if(process.platform!=='win32'){
   assert.equal(fs.statSync(LOCAL_ENV_FILE).mode&0o777,0o600);
   assert.equal(fs.statSync(LOCAL_STORE_DIR).mode&0o777,0o700);
  }
  assert.throws(()=>writeLocalApiKey('synthetic\nOTHER=value'),/single line/);
  const target=path.join(temporary,'unrelated');fs.writeFileSync(target,'unchanged');
  fs.unlinkSync(LOCAL_ENV_FILE);fs.symlinkSync(target,LOCAL_ENV_FILE);
  writeLocalApiKey('synthetic-two');assert.equal(fs.readFileSync(target,'utf8'),'unchanged');
  assert.equal(fs.lstatSync(LOCAL_ENV_FILE).isSymbolicLink(),false);
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
