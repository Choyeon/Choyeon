"""Verify Library filter logic end-to-end with real data."""
import json

with open('src/data/exercises.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
exercises = data if isinstance(data, list) else data.get('exercises', [])

def filter_exercises(exs, bodyPart=None, equipment=None, search=None):
    result = exs
    if bodyPart:
        result = [e for e in result if e.get('body_part') == bodyPart]
    if equipment:
        result = [e for e in result if e.get('equipment') == equipment]
    if search and search.strip():
        q = search.lower().strip()
        result = [e for e in result if q in e.get('name','').lower() or q in e.get('target','').lower()]
    return result

tests = [
    ("skierg machine only", None, "skierg machine", None),
    ("sled machine only", None, "sled machine", None),
    ("roller only", None, "roller", None),
    ("bosu ball only", None, "bosu ball", None),
    ("cardio only", "cardio", None, None),
    ("chest only", "chest", None, None),
    ("cardio + skierg machine", "cardio", "skierg machine", None),
    ("chest + dumbbell", "chest", "dumbbell", None),
    ("back + cable", "back", "cable", None),
]

print(f'Total exercises: {len(exercises)}\n')
for label, bp, eq, q in tests:
    result = filter_exercises(exercises, bp, eq, q)
    print(f'  {label}: {len(result)} results')
    if result:
        e = result[0]
        print(f'    → {e.get("name")} (bp={e.get("body_part")}, eq={e.get("equipment")})')
