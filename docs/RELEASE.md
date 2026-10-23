# Release 0.3.0: maintainer checks and npm handoff

**npm publication is a separate maintainer action**, after reviewing and merging
the GitHub candidate. A draft PR or a passing
mock test run is not a stable release. Nothing in these instructions changes an
installed instance or grants its agent write access.

## What changes for users

The default is **View information**. To enable ordinary create/update operations,
turn on **View and update records** in Claude Desktop's extension settings, or add
`FUB_MCP_ALLOW_WRITE=1` to the MCP server environment, then restart it. To return to
viewing, turn it off or use `0`. Deletes, webhook administration and direct workflow
triggers remain separate advanced opt-ins. See [migration notes](../CHANGELOG.md).
Tell existing users about this default change before they update.

## Review and merge first

1. Review the GitHub PR, code, tests, dependency lock and documentation. Confirm the
   base repository is `gray-wilbee/fub-mcp` and record the final merged commit SHA.
   Resolve any checks that failed or did not run; do not equate an absent CI run
   with a passing one.
2. Freshly test extension installation on Mac and Windows with disposable credentials
   entered privately, including the access-mode toggle and restart. Do not use a
   production owner key for packaging tests. The current offline tests do not certify
   host GUI compatibility or every FUB operation.
3. Review the vendored FUB OpenAPI redistribution terms and bundled third-party
   license notices. The root MIT license is included in both distribution formats;
   it does not grant rights in third-party descriptions by itself.
4. Verify the repository's private security reporting channel, release permissions,
   publisher authentication and supported-version policy. Do not invent a contact
   address or expose credentials in an issue. Account settings require owner action.

## Clean build, one job at a time

Use a new directory so local development changes and installed credentials remain
untouched. Replace `MERGED_COMMIT_SHA` with the actual reviewed merge commit, not a
moving branch or an unmerged candidate. Use a supported Node runtime; Node 24 LTS
is recommended. Package metadata accepts Node 22.16+, 24 and 26. Python 3 is needed
only to build the desktop ZIP bundle.

```sh
git clone https://github.com/gray-wilbee/fub-mcp.git fub-mcp-release
cd fub-mcp-release
git checkout --detach MERGED_COMMIT_SHA
git status --short
npm ci --ignore-scripts
npm test
npm run check:release
npm audit
npm pack --dry-run --ignore-scripts
npm pack --ignore-scripts
```

Do not provide CRM keys to the build shell. Tests use fake keys and mocked fetch,
including stdio integration tests; they do not contact FUB. The legacy smoke test
now refuses live access. Run commands sequentially and close unneeded applications if memory pressure persists.

Inspect the generated tarball before publication:

```sh
tar -tzf fub-mcp-0.3.0.tgz
shasum -a 256 fub-mcp-0.3.0.tgz
npm view fub-mcp@0.3.0 version
```

The final command is an availability check: an E404 for this version means it is
not already published; a successful result means stop and choose a new version
rather than attempting to overwrite it. Confirm your npm account/package ownership
with `npm whoami` in your own terminal. Never paste tokens or authentication codes
into chat. Review every tarball path: it should contain dist, skills, setup guides,
docs, GPT resources, README, LICENSE, PRIVACY, CHANGELOG, SECURITY and package metadata;
no `.env`, logs, keys, real CRM data or private review inputs.

**Only the owner, after those checks, runs:**

```sh
npm publish ./fub-mcp-0.3.0.tgz --access public
npm view fub-mcp@0.3.0 version dist.integrity dist.tarball
```

Do not rebuild between inspecting and publishing the tarball. Record the commit,
Node/npm versions and SHA-256 with the release. Verify a clean installation of the
published version with fake credentials and a mock before recommending upgrades.

## Desktop bundle

```sh
npm run build:mcpb
shasum -a 256 -c fub-mcp-0.3.0.mcpb.sha256
unzip -l fub-mcp-0.3.0.mcpb
```

The script creates a temporary staging directory, installs the locked production
dependencies with lifecycle scripts off, copies LICENSE/docs, and packs an unsigned
ZIP using Python's standard library. It does not fetch a mutable packaging CLI.
The chosen upstream MCPB CLI currently introduces unpatched build-time advisories;
it is not a project dependency. Node-module license files are preserved. Paths are
sorted and timestamps fixed, but cross-machine compression/toolchain differences
can affect the final checksum. Verify the archive itself, not only its source tree.

Once the GUI checks pass, publish a GitHub release from the reviewed tag/commit and
attach the versioned `.mcpb` and checksum file. This guide does not perform that
publication. Keep the README download name aligned with uploaded artifacts. State
that bundles are unsigned until a real signing/provenance process is in place.

## Ongoing checks and boundaries

Scan reachable history, branches/tags and distributable archives with maintained
secret-scanning tools; redact output. The prior limited source-history pattern scan
is not full coverage of forks, caches or old release assets. Revoke exposed secrets
before coordinating cleanup. Review dependencies regularly and evaluate reachability,
not just advisory severity labels. Pin CI actions and use minimal read-only test
permissions with no production credentials.

The current server remains stdio-only. Remote hosting needs a separate reviewed
HTTP/authentication/authorization implementation and tenant isolation tests. Do not
advertise a working hosted URL, universal cloud compatibility or complete prompt-
injection protection in release notes, websites or videos.
