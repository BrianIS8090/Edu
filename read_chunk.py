import sys
import json

with open('graphify-out/.chunk_2.txt', encoding='utf-8') as f:
    files = f.read().splitlines()

res = {}
for file in files:
    if not file: continue
    try:
        with open(file, encoding='utf-8') as f2:
            res[file] = f2.read()
    except Exception as e:
        res[file] = str(e)

with open('graphify-out/chunk2_content.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=2)
