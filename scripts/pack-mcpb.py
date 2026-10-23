"""Pack an unsigned MCPB ZIP from the controlled staging tree; no network access."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

stage = Path(sys.argv[1])
manifest = json.loads((stage / 'manifest.json').read_text())
output = Path(f"fub-mcp-{manifest['version']}.mcpb")
files = sorted(p for p in stage.rglob('*') if p.is_file() and not p.is_symlink())
assert (stage / 'LICENSE') in files
assert (stage / manifest['server']['entry_point']) in files
for p in files:
    assert p.name != '.env' and p.suffix not in ('.key', '.pem', '.log'), f'Unexpected sensitive file: {p.name}'
# Sorted paths and fixed timestamps make archives reproducible on the same toolchain.
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for p in files:
        info = zipfile.ZipInfo(p.relative_to(stage).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, p.read_bytes())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert 'LICENSE' in names and 'docs/SECURITY-GUIDE.md' in names
checksum = hashlib.sha256(output.read_bytes()).hexdigest()
Path(str(output) + '.sha256').write_text(f'{checksum}  {output.name}\n')
print(f'Created unsigned {output} ({len(files)} files); wrote SHA-256 checksum.')
