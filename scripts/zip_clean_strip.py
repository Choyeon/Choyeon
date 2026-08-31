import sys, os
from zipfile import ZipFile, ZipInfo, ZIP_STORED, ZIP_DEFLATED, is_zipfile
src = sys.argv[1]
dst = sys.argv[2]
skip = set(sys.argv[3:])
print(f"  Reading: {src}")
if not is_zipfile(src):
    print(f"FATAL: Not a zip: {src}"); sys.exit(1)
total = 0; skipped = 0; stored = 0; deflated = 0
with ZipFile(src, 'r') as zin:
    with ZipFile(dst, 'w') as zout:
        for info in zin.infolist():
            total += 1
            if info.filename in skip or info.filename.endswith('/') and info.file_size == 0:
                if info.filename in skip:
                    skipped += 1
                    print(f"    SKIP: {info.filename}")
                continue
            data = zin.read(info.filename)
            new_info = ZipInfo(info.filename, info.date_time)
            new_info.compress_type = info.compress_type
            new_info.external_attr = info.external_attr
            new_info.create_system = info.create_system
            # Strip problematic flags that survive across copies
            zout.writestr(new_info, data,
                compress_type=ZIP_STORED if info.compress_type == ZIP_STORED else ZIP_DEFLATED)
            if info.compress_type == ZIP_STORED: stored += 1
            else: deflated += 1
print(f"  Done. total={total} entries, skipped={skipped}, stored={stored}, deflated={deflated}")
print(f"  Wrote: {dst} ({os.path.getsize(dst)//1024//1024} MB)")
