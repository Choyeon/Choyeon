# List only META-INF entries of a ZIP, tagged by SIG/OTHER.

import zipfile
import sys

if len(sys.argv) != 2:
    print("Usage: list_meta.py <file.apk>")
    sys.exit(2)

SIG_SUFFIXES = ('.MF', '.SF', '.RSA', '.DSA', '.EC')

with zipfile.ZipFile(sys.argv[1], 'r') as z:
    metas = sorted(n for n in z.namelist() if n.startswith('META-INF/'))
    print(f"META-INF entries: {len(metas)}")
    for m in metas:
        tag = 'SIG   ' if any(m.endswith(s) for s in SIG_SUFFIXES) else 'OTHER!'
        sz = z.getinfo(m).file_size
        print(f"  {tag}  {sz:8d}  {m}")
