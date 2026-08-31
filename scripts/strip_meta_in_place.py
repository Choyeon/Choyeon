#!/usr/bin/env python3
"""
Strip untrusted META-INF entries from an APK BYTE-BY-BYTE preserving
resources.arsc offsets, LFH ordering, and resource path resolutions.

Works:
  1. Walk every ZIP local file header.
  2. Skip entries whose name is in BAD_ENTRIES (META-INF sigs + untrusted).
  3. Copy payload bytes verbatim (keeps original compression/deflate tokens).
  4. Build new Central Directory in-memory with corrected LFH offsets.
  5. Write EOCD.

Avoids Python zipfile module which often rebuilds AAPT2 archives incorrectly.
"""
from __future__ import annotations
import os, struct, sys

SIG_LFH  = 0x04034b50  # local file header
SIG_DD   = 0x08074b50  # data descriptor
SIG_CD   = 0x02014b50  # central directory
SIG_EOCD = 0x06054b50  # end of central directory

BAD_ENTRIES = {
    "META-INF/com/android/build/gradle/app-metadata.properties",
    "META-INF/version-control-info.textproto",
    "META-INF/services/kotlin.reflect.jvm.internal.impl.builtins.BuiltInsLoader",
    "META-INF/services/kotlin.reflect.jvm.internal.impl.resolve.ExternalOverridabilityCondition",
    "META-INF/services/kotlinx.coroutines.CoroutineExceptionHandler",
    "META-INF/services/kotlinx.coroutines.internal.MainDispatcherFactory",
    "META-INF/MANIFEST.MF",
    "META-INF/CERT.SF",
    "META-INF/CERT.RSA",
    "META-INF/CHOYEON.SF",
    "META-INF/CHOYEON.RSA",
}


def strip(src_path: str, dst_path: str):
    removed = []
    kept = 0
    cd_bytes = bytearray()

    with open(src_path, "rb") as fi, open(dst_path, "wb") as fo:
        while True:
            lfh_start = fi.tell()
            head30 = fi.read(30)
            if len(head30) < 30:
                break
            sig = struct.unpack("<I", head30[:4])[0]
            if sig != SIG_LFH:
                # Past the LFH area (entered old CD / sign block).
                fi.seek(lfh_start)
                break
            (ver, flags, method, mtime, mdate, crc,
             csize, usize, nlen, elen) = struct.unpack(
                "<HHHHHIIIHH", head30[4:])
            name = fi.read(nlen)
            extra = fi.read(elen)
            dd_present = bool(flags & 0x08)

            if dd_present:
                # Read until data-descriptor signature; sizes in header may be 0.
                buffer = bytearray()
                while True:
                    chunk = fi.read(65536)
                    if not chunk:
                        raise RuntimeError(f"Truncated APK (no DD) for {name!r}")
                    buffer.extend(chunk)
                    idx = buffer.rfind(b"PK\x07\x08")
                    if idx != -1:
                        payload = bytes(buffer[:idx])
                        dd = bytes(buffer[idx:idx + 16])
                        overshoot = len(buffer) - (idx + 16)
                        if overshoot > 0:
                            fi.seek(fi.tell() - overshoot, 0)
                        # Parse DD: optional sig + crc32 + comp + uncomp
                        if dd[:4] == b"PK\x07\x08":
                            crc, csize, usize = struct.unpack("<III", dd[4:16])
                        else:
                            crc, csize, usize = struct.unpack("<III", dd[:12])
                        break
            else:
                payload = fi.read(csize)

            name_str = name.decode("utf-8", errors="replace")
            if name_str in BAD_ENTRIES:
                removed.append(name_str)
                continue

            # --- WRITE LFH + PAYLOAD with DD flag cleared, sizes filled ---
            new_lfh_off = fo.tell()
            fo.write(struct.pack("<I", SIG_LFH))
            fo.write(struct.pack("<HHHHHIIIHH",
                ver, flags & ~0x08, method, mtime, mdate,
                crc, csize, usize, nlen, elen))
            fo.write(name)
            fo.write(extra)
            fo.write(payload)

            # --- CD entry mirror ---
            cde = bytearray()
            cde += struct.pack("<I", SIG_CD)
            # CD fixed header = version_made_by(2) + version_needed(2) +
            # flags(2) + method(2) + mtime(2) + mdate(2) + crc(4) +
            # comp_size(4) + uncomp_size(4) + name_len(2) + extra_len(2) +
            # comment_len(2) + disk_start(2) + internal_attrs(2) +
            # external_attrs(4) + local_header_offset(4) = 46 bytes
            cde += struct.pack("<HHHHH",
                0,               # version made by
                ver, flags & ~0x08, method, mtime)
            cde += struct.pack("<H", mdate)
            cde += struct.pack("<IIIHHH",
                crc, csize, usize, nlen, elen, 0)   # comment_len = 0
            cde += struct.pack("<HHII",
                0, 0,                                 # disk_start, internal_attrs
                (0o100644 << 16) & 0xFFFFFFFF,
                new_lfh_off & 0xFFFFFFFF)
            cde += name
            cde += extra
            cd_bytes.extend(cde)
            kept += 1

        # Write new CD + EOCD at file end (old CD / v2 signature block are
        # intentionally abandoned — apksigner will add a fresh v2 block).
        cd_start = fo.tell()
        fo.write(bytes(cd_bytes))
        cd_len = len(cd_bytes)
        eocd = bytearray()
        eocd += struct.pack("<I", SIG_EOCD)
        eocd += struct.pack("<HHHHIIH",
            0, 0, kept, kept, cd_len, cd_start, 0)
        fo.write(bytes(eocd))

    return kept, removed


def main():
    if len(sys.argv) < 3:
        print("usage: strip_meta_in_place.py <src.apk> <dst.apk>", file=sys.stderr)
        sys.exit(1)
    kept, removed = strip(sys.argv[1], sys.argv[2])
    print(f"kept: {kept}   removed: {len(removed)}")
    for r in removed:
        print(f"  - {r}")
    src_sz = os.path.getsize(sys.argv[1]) // 1024
    dst_sz = os.path.getsize(sys.argv[2]) // 1024
    print(f"size: {src_sz} KB -> {dst_sz} KB")


if __name__ == "__main__":
    main()
