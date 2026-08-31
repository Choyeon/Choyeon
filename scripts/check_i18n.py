import re
import os
import json

# Walk and collect all source files
def walk_files(base, exts):
    result = []
    for root, dirs, files in os.walk(base):
        # skip node_modules
        if 'node_modules' in root or '__pycache__' in root:
            continue
        for f in files:
            if os.path.splitext(f)[1] in exts:
                result.append(os.path.join(root, f))
    return result

files = walk_files('app', {'.tsx', '.ts'}) + walk_files('src', {'.tsx', '.ts'})

# Extract t('key') and t("key") calls
t_pattern = re.compile(r"\bt\s*\(\s*['\"]([^'\"]+)['\"]")
used_keys = set()
for f in files:
    try:
        content = open(f, 'r', encoding='utf-8').read()
    except:
        continue
    for m in t_pattern.finditer(content):
        used_keys.add(m.group(1))

print(f"Found {len(used_keys)} unique t() calls across {len(files)} files")

# Now load zh.ts and en.ts via node require trick... 
# Actually let's just parse them as JS-like objects
def parse_translations(filepath):
    """Extract the exported object from zh.ts / en.ts"""
    content = open(filepath, 'r', encoding='utf-8').read()
    # Remove 'export const zh = ' and ' as const;'
    content = re.sub(r'^export const \w+\s*=\s*', '', content)
    content = re.sub(r'\s+as const\s*;?\s*$', '', content)
    # Convert JS object syntax to JSON-compatible
    # 1. Remove trailing commas before } or ]
    content = re.sub(r',\s*([}\]])', r'\1', content)
    # 2. Replace single quotes with double quotes for keys
    content = re.sub(r'\n(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', lambda m: '\n' + m.group(1) + '"' + m.group(2) + '":', content)
    # 3. Replace single-quoted string values with double-quoted (handling escaped quotes)
    def fix_singles(m):
        val = m.group(1)
        val = val.replace('\\', '\\\\').replace('"', '\\"')
        return '"' + val + '"'
    content = re.sub(r"'((?:[^'\\]|\\.)*)'", fix_singles, content)
    
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Parse error in {filepath}: {e}")
        return {}

def flatten(obj, prefix=''):
    out = set()
    for k, v in obj.items():
        full = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out |= flatten(v, full)
        else:
            out.add(full)
    return out

zh_obj = parse_translations('src/i18n/translations/zh.ts')
en_obj = parse_translations('src/i18n/translations/en.ts')

zh_keys = flatten(zh_obj)
en_keys = flatten(en_obj)

print(f"\nzh.ts has {len(zh_keys)} keys")
print(f"en.ts has {len(en_keys)} keys")

# Find missing keys
missing_zh = used_keys - zh_keys
missing_en = used_keys - en_keys

if missing_zh:
    print(f"\n=== MISSING IN zh.ts ({len(missing_zh)}) ===")
    for k in sorted(missing_zh):
        print(f"  {k}")

if missing_en:
    print(f"\n=== MISSING IN en.ts ({len(missing_en)}) ===")
    for k in sorted(missing_en):
        print(f"  {k}")

# Find unused keys (defined but never called)
unused_zh = zh_keys - used_keys
unused_en = en_keys - used_keys
if unused_zh:
    print(f"\n=== UNUSED IN zh.ts ({len(unused_zh)}) ===")
    for k in sorted(unused_zh):
        print(f"  {k}")

if not missing_zh and not missing_en:
    print("\n✅ All t() calls have translations in both zh.ts and en.ts!")
