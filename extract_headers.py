import json
import re

data = json.load(open('graphify-out/chunk2_content.json', encoding='utf-8'))
for k, v in data.items():
    filename = k.split('\\')[-1].replace('.md', '')
    frontmatter = re.search(r'^---\n(.*?)\n---', v, re.DOTALL)
    fm_dict = {}
    if frontmatter:
        for line in frontmatter.group(1).split('\n'):
            if ':' in line:
                key, val = line.split(':', 1)
                fm_dict[key.strip()] = val.strip()
    h1 = re.search(r'^#\s+(.*)', v, re.MULTILINE)
    h1 = h1.group(1) if h1 else ''
    headers = re.findall(r'^##\s+(.*)', v, re.MULTILINE)
    print(f'File: {filename}')
    print(f'Title: {fm_dict.get("title", "")}')
    print(f'Tags: {fm_dict.get("tags", "")}')
    print(f'H1: {h1}')
    print(f'H2s: {headers}\n')
