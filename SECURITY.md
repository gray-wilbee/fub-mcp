# Security policy

This project is maintained as an unofficial community integration, not a certified
security product. Use the latest reviewed release and follow
[deployment and credential guidance](docs/SECURITY-GUIDE.md).

Do not put keys, CRM data, exploit payloads or private customer information in a
public GitHub issue. Use GitHub's private **Report a vulnerability** option if it is
enabled for this repository. If it is unavailable, open only a minimal issue asking
the maintainer to establish a private reporting channel; omit sensitive details.
No private contact address or response-time commitment is assumed here.

If a key is exposed, revoke/replace it through authorized FUB administration before
coordinating cleanup. Removing a file or commit does not revoke a credential.

Version 0.3.0 introduces explicit access modes and runtime input/request controls.
Earlier versions allow ordinary writes by default. The project has no authenticated
remote HTTP service; do not expose an anonymous stdio bridge. Access modes constrain
MCP calls, not an agent's independent shell access or other connectors.
