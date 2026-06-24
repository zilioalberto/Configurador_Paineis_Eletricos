import json, collections, sys

iss = []
seen = set()
for f in ['issues1.json', 'issues2.json']:
    for i in json.load(open(f))['issues']:
        k = i['key']
        if k in seen:
            continue
        seen.add(k)
        iss.append(i)

print('unique:', len(iss))
byrule = collections.defaultdict(list)
for i in iss:
    byrule[i['rule']].append(i)

mode = sys.argv[1] if len(sys.argv) > 1 else 'rules'

if mode == 'rules':
    for r in sorted(byrule, key=lambda x: -len(byrule[x])):
        ex = byrule[r][0]
        msg = ex['message'][:95]
        print(f'{r} ({len(byrule[r])}): {msg}')
elif mode == 'rule':
    target = sys.argv[2]
    for i in byrule.get(target, []):
        comp = i['component'].split(':')[-1]
        print(f"{comp}:{i.get('line')} | {i['message'][:100]}")
