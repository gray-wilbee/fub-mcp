import os from 'node:os';
os.homedir=()=>'/tmp/fub-mcp-tests-no-real-home';
globalThis.fetch=async(url,init)=>new Response(JSON.stringify({mocked:true,path:new URL(url).pathname,method:init.method,body:init.body?JSON.parse(init.body):null}));
