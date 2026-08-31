import json

with open('src/data/exercises.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

fixes = {
    '0260': '蚕式卷曲',
    '3292': '升降机',
    '3303': '水平旗帜',
    '0466': '吉龙达胸引体',
    '0467': '大猩猩引体',
    '3419': '地面L支撑',
    '3147': '骨盆倾斜',
    '0777': '施法者',
    '1362': '狮式伸展',
    '3314': '分腿马尔他支撑',
}

fixed = 0
for ex in data:
    exid = ex['id']
    if exid in fixes:
        old = ex.get('name_zh', '')
        ex['name_zh'] = fixes[exid]
        print(f"{exid}: {old} -> {ex['name_zh']}")
        fixed += 1

with open('src/data/exercises.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Fixed {fixed} entries")

missing = []
for e in data:
    nz = e.get('name_zh', '')
    if not nz or not any('\u4e00' <= c <= '\u9fff' for c in nz):
        missing.append(e)

print(f"Remaining missing: {len(missing)}")
for m in missing:
    print(f"  {m['id']}: {m['name']} -> zh:{m.get('name_zh', 'NONE')}")
