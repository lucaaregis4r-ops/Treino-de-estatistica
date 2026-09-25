"""Reproducible standard-library baseline; run from repository root.
Source: StatsBomb Open Data, men's World Cup 2022 (competition 43, season 106).
Coordinate orientation is provider attacking direction. Never uses provider xG.
"""
import concurrent.futures, hashlib, json, math, pathlib, urllib.request
COMMIT = '4b73468fc5b0f1950f9f66fada70ad3a4f9327cb'
BASE = f'https://raw.githubusercontent.com/hudl/open-data/{COMMIT}/'
OUT = pathlib.Path('reference/football-models')
CACHE = pathlib.Path('tmp/football-corpus')
OUT.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)
def fetch(path):
    target = CACHE / path.replace('/', '_')
    if not target.exists():
        with urllib.request.urlopen(BASE + path, timeout=90) as response:
            data = response.read()
        target.write_bytes(data)
    return target.read_bytes()
def features(loc):
    dx, dy = (120-loc[0])*105/120, (loc[1]-40)*68/80
    distance = math.hypot(dx, dy)
    angle = math.atan2(7.32*dx, dx*dx+dy*dy-(7.32/2)**2)
    return [1., distance/30, angle]
def sigmoid(x): return 1/(1+math.exp(-max(-40,min(40,x))))
def cell(loc): return min(7,max(0,int(loc[1]/10)))*12 + min(11,max(0,int(loc[0]/10)))
match_bytes=fetch('data/matches/43/106.json')
ids=sorted(m['match_id'] for m in json.loads(match_bytes))
validation=set(ids[::5]); rows=[]; counts=[0]*96; shots=[0]*96; goals=[0]*96; moves=[[0]*96 for _ in range(96)]; manifests=[]
def read(mid):
    raw=fetch(f'data/events/{mid}.json')
    return mid,raw
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for mid,raw in pool.map(read,ids):
        manifests.append({'matchId':mid,'sha256':hashlib.sha256(raw).hexdigest(),'split':'validation' if mid in validation else 'train'})
        for e in json.loads(raw):
            loc=e.get('location'); kind=e['type']['name']
            if e.get('period',9)>2 or not loc or kind not in ['Shot','Pass','Carry']: continue
            if kind=='Shot':
                rows.append((mid,features(loc),int(e['shot']['outcome']['name']=='Goal')))
            if mid in validation: continue
            i=cell(loc); counts[i]+=1
            if kind=='Shot': shots[i]+=1; goals[i]+=int(e['shot']['outcome']['name']=='Goal')
            else:
                info=e[kind.lower()]; end=info.get('end_location')
                if end and (kind=='Carry' or 'outcome' not in info): moves[i][cell(end)]+=1
        print('read',mid,flush=True)
train=[r for r in rows if r[0] not in validation]; valid=[r for r in rows if r[0] in validation]
w=[0.,0.,0.]
for iteration in range(4500):
    gradients=[0.,0.,0.]
    for _,x,y in train:
        error=sigmoid(sum(a*b for a,b in zip(w,x)))-y
        for j in range(3): gradients[j]+=error*x[j]
    for j in range(3): w[j]-=.12*(gradients[j]/len(train)+(0 if j==0 else .0001*w[j]))
def metrics(data,weights=None,constant=None):
    preds=[sigmoid(sum(a*b for a,b in zip(weights,x))) if weights else constant for _,x,_ in data]
    return {'n':len(data),'goals':sum(r[2] for r in data),'brier':sum((p-r[2])**2 for p,r in zip(preds,data))/len(data),'logLoss':-sum(r[2]*math.log(max(p,1e-12))+(1-r[2])*math.log(max(1-p,1e-12)) for p,r in zip(preds,data))/len(data),'calibration':[{'lower':i/10,'n':sum(i/10<=p<(i+1)/10 for p in preds),'predicted':sum(p for p in preds if i/10<=p<(i+1)/10)/max(1,sum(i/10<=p<(i+1)/10 for p in preds)),'observed':sum(r[2] for p,r in zip(preds,data) if i/10<=p<(i+1)/10)/max(1,sum(i/10<=p<(i+1)/10 for p in preds))} for i in range(10)]}
values=[0.]*96
for iteration in range(1000):
    new=[(goals[i]+sum(n*values[j] for j,n in enumerate(moves[i])))/counts[i] if counts[i] else 0 for i in range(96)]
    residual=max(abs(a-b) for a,b in zip(new,values));values=new
    if residual<1e-10: break
source={'name':'StatsBomb Open Data','repository':'https://github.com/hudl/open-data','commit':COMMIT,'competition':43,'season':106,'license':'https://github.com/hudl/open-data/blob/'+COMMIT+'/LICENSE.pdf','attribution':'Data provided by StatsBomb. https://statsbomb.com/media-pack/','matches':manifests,'matchListSha256':hashlib.sha256(match_bytes).hexdigest()}
xg={'id':'local-distance-angle','version':'1.0.0','pitchMeters':[105,68],'features':['intercept','distanceMeters/30','openingAngleRadians'],'coefficients':w,'training':metrics(train,w),'validation':metrics(valid,w),'frequencyBaseline':metrics(valid,constant=sum(r[2] for r in train)/len(train)),'source':source,'policy':'Periods 1-2; all located shots including penalties; no imputation; orientation required; trained on 2022 men World Cup, unvalidated for other populations.'}
xt_valid=[r for r in valid]
xt={'id':'local-xt-12x8','version':'1.0.0','width':12,'height':8,'values':values,'counts':counts,'iterations':iteration+1,'bellmanResidual':residual,'source':source,'validation':{'heldOutMatches':len(validation),'heldOutShots':len(xt_valid),'method':'Held-out next-action goal Brier score; see evaluation generated below'},'policy':'Pass/carry starts and shots; incomplete passes terminate with zero reward during training. Rate only completed passes and carries maintaining control; no dribble or loss attribution. No smoothing; unsupported cells excluded.'}
# Evaluate held-out one-step reward (goal on next sampled action), not long-horizon calibration.
err=0; n=0
for mid in sorted(validation):
    for e in json.loads(fetch(f'data/events/{mid}.json')):
        if e.get('period',9)>2 or not e.get('location') or e['type']['name'] not in ['Pass','Carry','Shot']: continue
        i=cell(e['location']); pred=goals[i]/counts[i] if counts[i] else 0
        y=int(e['type']['name']=='Shot' and e['shot']['outcome']['name']=='Goal');err+=(pred-y)**2;n+=1
xt['validation'].update({'nextActionN':n,'nextActionGoalBrier':err/n,'limitation':'Validates immediate reward frequency only; long-horizon xT calibration remains unverified.'})
(OUT/'xg.json').write_text(json.dumps(xg,indent=2)+'\n');(OUT/'xt.json').write_text(json.dumps(xt,indent=2)+'\n')
print(json.dumps({'train':len(train),'validation':len(valid),'xg':xg['validation'],'baseline':xg['frequencyBaseline'],'xt':xt['validation']},indent=2),flush=True)
