# Strip 6 unprotected META-INF entries + old signature blocks (MANIFEST/CERT.*)
# from an APK ZIP without modifying non-META-INF entries.

import zipfile
import sys
import os

if len(sys.argv) != 3:
    print("Usage: strip_meta.py <src.apk> <dst.apk>")
    sys.exit(2)

SRC = sys.argv[1]
DST = sys.argv[2]

EXCLUDE_SUFFIXES = ('.MF', '.SF', '.RSA', '.DSA', '.EC')
EXACT_EXCLUDES = {
    'META-INF/com/android/build/gradle/app-metadata.properties',
    'META-INF/version-control-info.textproto',
    'META-INF/services/kotlin.reflect.jvm.internal.impl.builtins.BuiltInsLoader',
    'META-INF/services/kotlin.reflect.jvm.internal.impl.resolve.ExternalOverridabilityCondition',
    'META-INF/services/kotlinx.coroutines.CoroutineExceptionHandler',
    'META-INF/services/kotlinx.coroutines.internal.MainDispatcherFactory',
}

with zipfile.ZipFile(SRC, 'r') as src:
    with zipfile.ZipFile(DST, 'w', zipfile.ZIP_DEFLATED) as dst:
        kept = 0
        removed = 0
        for info in src.infolist():
            name = info.filename
            exclude = False
            if name.startswith('META-INF/'):
                if name in EXACT_EXCLUDES:
                    exclude = True
                elif any(name.endswith(s) for s in EXCLUDE_SUFFIXES):
                    exclude = True
            if exclude:
                removed += 1
                continue
            dst.writestr(info, src.read(name))
            kept += 1

mb = os.path.getsize(DST) // (1024 * 1024)
print(f"strip_meta: kept={kept}, removed={removed}, size={mb}MB -> {DST}")
