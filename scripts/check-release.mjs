import assert from 'node:assert/strict';
import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('mcpb/manifest.json','utf8'));
const source=fs.readFileSync('src/index.ts','utf8');
assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
assert.equal(manifest.version,pkg.version);assert.ok(source.includes(`name: "fub-mcp", version: "${pkg.version}"`));
assert.equal(manifest.server.type,'node');assert.equal(manifest.server.entry_point,'dist/index.js');
for(const [key,env] of [['allow_write','FUB_MCP_ALLOW_WRITE'],['allow_delete','FUB_MCP_ALLOW_DELETE'],['allow_webhooks','FUB_MCP_ALLOW_WEBHOOKS'],['allow_automations','FUB_MCP_ALLOW_AUTOMATIONS']]){
 assert.equal(manifest.user_config[key].type,'boolean');assert.equal(manifest.user_config[key].default,false);
 assert.equal(manifest.server.mcp_config.env[env],'${user_config.'+key+'}');
}
for(const key of ['api_key','system_key'])assert.equal(manifest.user_config[key].sensitive,true);
for(const file of ['LICENSE','README.md','PRIVACY.md','CHANGELOG.md','SECURITY.md','docs/INSTALLATION.md','docs/SECURITY-GUIDE.md','docs/DIGITALOCEAN.md','docs/RELEASE.md'])assert.ok(fs.existsSync(file),file);
for(const name of Object.keys(pkg.dependencies))assert.equal(lock.packages[`node_modules/${name}`].version,pkg.dependencies[name]);
console.log(`Release ${pkg.version}: versions, entrypoint, safe UI defaults, secret fields and required docs verified.`);
