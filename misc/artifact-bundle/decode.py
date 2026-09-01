import json, base64, gzip, re, sys, os

src = open('/home/goswami/.claude/projects/-home-goswami-Documents-GitHub-seltiv-slms/616d9870-7dbb-4b09-9fdb-5b85eb7fa6d5/tool-results/artifact-c229a301-1788254275-290a.html', encoding='utf-8').read()

def grab(t):
    m = re.search(r'<script type="__bundler/%s">(.*?)</script>' % re.escape(t), src, re.S)
    return m.group(1) if m else None

manifest = json.loads(grab('manifest'))
template = json.loads(grab('template'))
page_order = json.loads(grab('page_order') or '[]')
ext = json.loads(grab('ext_resources') or '[]')

outdir = '/tmp/claude-1000/-home-goswami-Documents-GitHub-seltiv-slms/616d9870-7dbb-4b09-9fdb-5b85eb7fa6d5/scratchpad/extracted'
os.makedirs(outdir, exist_ok=True)

print("page_order:", page_order)
print("ext_resources:", json.dumps(ext, indent=2)[:3000])
print("=== manifest entries ===")
assets = {}
for uuid, entry in manifest.items():
    raw = base64.b64decode(entry['data'])
    if entry.get('compressed'):
        raw = gzip.decompress(raw)
    assets[uuid] = raw
    print(uuid, entry['mime'], len(raw))

# map ext id -> uuid
id2uuid = {e['id']: e['uuid'] for e in ext}

open(os.path.join(outdir,'_template.html'),'w',encoding='utf-8').write(template)

# dump each asset with a guessed name
for e in ext:
    uuid = e['uuid']
    name = e.get('originalPath') or e.get('path') or e.get('id') or uuid
    name = name.replace('/', '__')
    data = assets.get(uuid, b'')
    with open(os.path.join(outdir, name), 'wb') as f:
        f.write(data)
    print("wrote", name, len(data))

# also dump any assets not in ext
for uuid, data in assets.items():
    p = os.path.join(outdir, 'asset_%s' % uuid)
    if not os.path.exists(p):
        with open(p,'wb') as f: f.write(data)
