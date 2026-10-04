#!/usr/bin/env python3
"""Reproduce an exported FokoLab scientific analysis independently in Python.
Requires Python 3.10+, numpy, scipy, matplotlib (pip install numpy scipy matplotlib).
No JavaScript kernel or network calls are used. The selected table and complete
source provenance are embedded below. Biological validation is not implied.
Analytic calculations use SciPy; Mulberry32 resampling matches the browser seeds.
"""
from __future__ import annotations
import json, math, pathlib
import numpy as np
from scipy import stats, linalg
import matplotlib.pyplot as plt
PAYLOAD = json.loads(__PAYLOAD_LITERAL__)

def finite(v):
    try: return float(v) if v is not None and v != '' and math.isfinite(float(v)) else None
    except (TypeError, ValueError): return None

def rng(seed):
    a = int(seed) & 0xffffffff
    while True:
        a = (a + 0x6D2B79F5) & 0xffffffff
        t = ((a ^ (a >> 15)) * (a | 1)) & 0xffffffff
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff
        yield ((t ^ (t >> 14)) & 0xffffffff) / 4294967296

def describe(y):
    return dict(n=len(y),mean=np.mean(y),median=np.median(y),sd=np.std(y,ddof=1) if len(y)>1 else None,
                q1=np.quantile(y,.25),q3=np.quantile(y,.75),min=np.min(y),max=np.max(y),
                mad=np.median(np.abs(y-np.median(y))))

def adjust(p,method):
    p=np.asarray(p,dtype=float);n=len(p);idx=np.argsort(p);a=np.empty(n)
    if method=='none': return p
    if method=='holm': a[idx]=np.minimum(1,np.maximum.accumulate(p[idx]*(n-np.arange(n))))
    else:a[idx]=np.minimum(1,np.minimum.accumulate((p[idx]*n/(np.arange(n)+1))[::-1])[::-1])
    return a

def welch(a,b,alpha):
    a,b=np.asarray(a),np.asarray(b);na,nb=len(a),len(b);assert na>=2 and nb>=2
    va,vb=np.var(a,ddof=1)/na,np.var(b,ddof=1)/nb;se=math.sqrt(va+vb);assert se>0
    df=(va+vb)**2/(va**2/(na-1)+vb**2/(nb-1));d=np.mean(a)-np.mean(b);q=stats.t.ppf(1-alpha/2,df)
    dof=na+nb-2;pooled=math.sqrt(((na-1)*np.var(a,ddof=1)+(nb-1)*np.var(b,ddof=1))/dof)
    from scipy.special import gammaln
    J=math.exp(gammaln(dof/2)-.5*math.log(dof/2)-gammaln((dof-1)/2))
    return dict(estimate=d,se=se,df=df,t=d/se,p=stats.ttest_ind(a,b,equal_var=False).pvalue,
                ci=[d-q*se,d+q*se],hedgesG=J*d/pooled,nA=na,nB=nb)

def main():
    opts=PAYLOAD['options'];columns=PAYLOAD['table']['columns'];rows=PAYLOAD['table']['rows'];m=opts['method']
    alpha=float(opts['alpha']);yi=int(opts['y']);xi=int(opts['x']);gi=int(opts['group']);ids=int(opts['id'])
    y=np.array([finite(r[yi]) for r in rows if finite(r[yi]) is not None]);result={};sample=None
    def groups(col=yi):
        gs={}
        for row in rows:
            if gi>=0 and row[gi] is not None and finite(row[col]) is not None: gs.setdefault(str(row[gi]),[]).append(finite(row[col]))
        return gs
    def aligned(indices):
        return np.array([[finite(row[c]) for c in indices] for row in rows if all(finite(row[c]) is not None for c in indices)])
    def pairs():
        a,b=opts['a'],opts['b'];ps={}
        for row in rows:
            if row[gi] not in (a,b):continue
            key=row[ids];assert key is not None
            group=ps.setdefault(key,{});assert row[gi] not in group,'Duplicate pair/condition'
            group[row[gi]]=finite(row[yi])
        values=[(v[a],v[b]) for v in ps.values() if v.get(a) is not None and v.get(b) is not None]
        return np.asarray(values).T
    if m=='describe':
        result=describe(y)
        if opts['independence'] and opts['design']=='independent' and len(y)>1 and np.std(y,ddof=1)>0:
            q=stats.t.ppf(1-alpha/2,len(y)-1);se=stats.sem(y)
            result['meanCI']=[np.mean(y)-q*se,np.mean(y)+q*se]
    elif m=='one':
        se=stats.sem(y);df=len(y)-1;assert se>0
        diff=np.mean(y)-opts['mu0'];q=stats.t.ppf(1-alpha/2,df)
        result=dict(estimate=diff,se=se,df=df,t=diff/se,p=stats.ttest_1samp(y,opts['mu0']).pvalue,ci=[diff-q*se,diff+q*se])
    elif m in ('welch','paired','permutation'):
        gs=groups();a,b=np.array(gs[opts['a']]),np.array(gs[opts['b']])
        if opts['design']=='paired':a,b=pairs()
        if m=='welch': result=welch(a,b,alpha)
        elif m=='paired':
            d=a-b;se=stats.sem(d);assert se>0;q=stats.t.ppf(1-alpha/2,len(d)-1)
            result=dict(estimate=np.mean(d),se=se,p=stats.ttest_rel(a,b).pvalue,ci=[np.mean(d)-q*se,np.mean(d)+q*se],dz=np.mean(d)/np.std(d,ddof=1),n=len(d))
        else:
            random=rng(opts['seed']);sample=[];observed=np.mean(a)-np.mean(b)
            for _ in range(opts['reps']):
                if opts['design']=='paired': v=np.mean([(u-v)*(-1 if next(random)<.5 else 1) for u,v in zip(a,b)])
                else:
                    data=list(a)+list(b)
                    for j in range(len(data)-1,0,-1):
                        k=int(next(random)*(j+1));data[j],data[k]=data[k],data[j]
                    v=np.mean(data[:len(a)])-np.mean(data[len(a):])
                sample.append(v)
            count=sum(abs(t)>=abs(observed)-1e-12 for t in sample);p=(count+1)/(len(sample)+1)
            result=dict(estimate=observed,p=p,mcSE=math.sqrt(p*(1-p)/(len(sample)+1)),reps=len(sample),seed=opts['seed'])
    elif m in ('welch-anova','kruskal'):
        gs=groups();names=list(gs);v=[np.array(gs[g]) for g in names];k=len(v);n=np.array(list(map(len,v)))
        if m=='welch-anova':
            var=np.array([np.var(a,ddof=1) for a in v]);assert np.all(var>0)
            w=n/var;means=np.array([np.mean(a) for a in v]);mu=np.sum(w*means)/np.sum(w);B=np.sum((1-w/np.sum(w))**2/(n-1));df1=k-1;df2=(k*k-1)/(3*B)
            F=(np.sum(w*(means-mu)**2)/df1)/(1+2*(k-2)*B/(k*k-1));contrasts=[]
            for i in range(k):
                for j in range(i+1,k):contrasts.append(dict(a=names[i],b=names[j],**welch(v[i],v[j],alpha)))
            for item,p in zip(contrasts,adjust([r['p'] for r in contrasts],opts['correction'])):item['pAdjusted']=p
            result=dict(F=F,df1=df1,df2=df2,p=stats.f.sf(F,df1,df2),comparisons=contrasts)
        else:
            H,p=stats.kruskal(*v);allv=np.concatenate(v);N=len(allv);rank=stats.rankdata(allv);means=[];offset=0
            for a in v:means.append(np.mean(rank[offset:offset+len(a)]));offset+=len(a)
            _,counts=np.unique(allv,return_counts=True);tie=np.sum(counts**3-counts);contrasts=[]
            for i in range(k):
                for j in range(i+1,k):
                    z=(means[i]-means[j])/math.sqrt((N*(N+1)/12-tie/(12*(N-1)))*(1/n[i]+1/n[j]));contrasts.append(dict(a=names[i],b=names[j],z=z,p=2*stats.norm.sf(abs(z))))
            for item,padj in zip(contrasts,adjust([r['p'] for r in contrasts],opts['correction'])):item['pAdjusted']=padj
            result=dict(H=H,p=p,comparisons=contrasts)
    elif m in ('bootstrap','block-bootstrap'):
        block=int(opts['block']) if m=='block-bootstrap' else 1
        if block>1:
            data=aligned([xi,yi]);assert len(data)==len(rows),'Missing series data';delta=np.diff(data[:,0]);assert np.all(delta>0) and np.allclose(delta,delta[0]);y=data[:,1]
        random=rng(opts['seed']);sample=[];fn=np.median if opts['statistic']=='median' and block==1 else np.mean
        for _ in range(opts['reps']):
            draw=[]
            while len(draw)<len(y):
                i=int(next(random)*(len(y)-block+1));draw.extend(y[i:i+block])
            sample.append(fn(draw[:len(y)]))
        result=dict(estimate=fn(y),se=np.std(sample,ddof=1),ci=np.quantile(sample,[alpha/2,1-alpha/2]),block=block,reps=len(sample),seed=opts['seed'])
    elif m=='correlation':
        data=aligned([xi,yi]);fn=stats.pearsonr if opts['correlation']=='pearson' else stats.spearmanr;r,p=fn(*data.T);result=dict(r=r,p=p,n=len(data))
        if opts['correlation']=='pearson' and len(data)>3 and abs(r)<1:
            q=stats.norm.ppf(1-alpha/2)/math.sqrt(len(data)-3)
            result['ci']=np.tanh([np.arctanh(r)-q,np.arctanh(r)+q])
    elif m=='regression':
        predictors=list(dict.fromkeys([xi]+opts.get('predictors',[])));predictors=[i for i in predictors if i!=yi]
        data=aligned([yi]+predictors);y=data[:,0];X=np.column_stack([np.ones(len(data)),data[:,1:]]);n,p=X.shape
        beta,_,rank,_=linalg.lstsq(X,y);assert rank==p
        pred=X@beta;resid=y-pred;df=n-p;mse=np.dot(resid,resid)/df;Q,R=linalg.qr(X,mode='economic');ri=linalg.solve_triangular(R,np.eye(p));inv=ri@ri.T;h=np.sum(Q*Q,axis=1)
        cov=inv*mse
        if opts['covariance']=='hc3':cov=inv@(X.T@((resid**2/(1-h)**2)[:,None]*X))@inv
        se=np.sqrt(np.maximum(0,np.diag(cov)));q=stats.t.ppf(1-alpha/2,df)
        result=dict(coefficients=beta,se=se,p=2*stats.t.sf(abs(beta/se),df),ci=np.column_stack([beta-q*se,beta+q*se]),r2=1-np.dot(resid,resid)/np.sum((y-y.mean())**2),residuals=resid,fitted=pred,covariance=opts['covariance'])
    elif m=='categorical':
        gs=list(dict.fromkeys(r[gi] for r in rows if r[gi] is not None));levels=list(dict.fromkeys(r[yi] for r in rows if r[yi] is not None));counts=np.zeros((len(gs),len(levels)),int)
        for r in rows:
            if r[gi] is not None and r[yi] is not None:counts[gs.index(r[gi]),levels.index(r[yi])]+=1
        chi,p,df,expected=stats.chi2_contingency(counts,correction=False);result=dict(counts=counts,chi2=chi,p=p,df=df,expected=expected)
        result['cramersV']=math.sqrt(chi/(np.sum(counts)*min(counts.shape[0]-1,counts.shape[1]-1)))
        if counts.shape==(2,2):
            result['fisherP']=stats.fisher_exact(counts).pvalue
            a,b,c,d=counts.ravel();z=stats.norm.ppf(1-alpha/2)
            def wilson(a,n):
                p=a/n;den=1+z*z/n;center=(p+z*z/(2*n))/den
                half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
                return dict(estimate=p,ci=[max(0,center-half),min(1,center+half)],n=n,successes=a)
            A,B=wilson(a,a+b),wilson(c,c+d);diff=A['estimate']-B['estimate']
            result['risks']=[A,B];result['riskDifference']=diff
            result['riskDifferenceCI']=[diff-math.hypot(A['estimate']-A['ci'][0],B['ci'][1]-B['estimate']),diff+math.hypot(A['ci'][1]-A['estimate'],B['estimate']-B['ci'][0])]
            raw=np.array([a,b,c,d],dtype=float);corrected=np.any(raw==0);v=raw+(.5 if corrected else 0)
            logOR=math.log(v[0]*v[3]/(v[1]*v[2]));se=math.sqrt(np.sum(1/v))
            result['oddsRatio']=float(a*d/(b*c)) if b*c>0 else None
            result['logOddsRatioCI']=np.exp([logOR-z*se,logOR+z*se])
            result['oddsRatioCICorrection']='Haldane-Anscombe +0.5 on all cells for interval only' if corrected else 'No continuity correction'
    elif m=='survival':
        ei=int(opts['event']);by={}
        for r in rows:
            if finite(r[yi]) is None or finite(r[ei]) is None:continue
            g=str(r[gi]) if gi>=0 else 'All units'
            if gi>=0 and r[gi] is None:continue
            assert finite(r[ei]) in (0,1) and finite(r[yi])>=0,'Invalid event/censor flag or negative time'
            by.setdefault(g,[]).append((finite(r[yi]),int(r[ei])))
        results=[]
        for name,v in by.items():
            t,e=np.asarray(v).T;assert np.all(np.isin(e,[0,1]));S=1.;green=0.;series=[]
            for time in np.unique(t):
                risk=np.sum(t>=time);d=np.sum((t==time)&(e==1));c=np.sum((t==time)&(e==0));S*=1-d/risk
                if 0<d<risk:green+=d/(risk*(risk-d))
                if S in (0,1):ci=[S,S]
                else:
                    se=math.sqrt(green)/abs(math.log(S));z=stats.norm.ppf(1-alpha/2);loglog=math.log(-math.log(S));ci=[math.exp(-math.exp(loglog+z*se)),math.exp(-math.exp(loglog-z*se))]
                series.append(dict(time=time,risk=risk,events=d,censored=c,survival=S,ci=ci))
            results.append(dict(name=name,n=len(t),rows=series))
        result=dict(groups=results)
        if len(by)==2:
            v1,v2=[np.asarray(v) for v in by.values()];t1,e1=v1.T;t2,e2=v2.T;O=E=V=0.
            times=np.unique(np.r_[t1[e1==1],t2[e2==1]])
            for time in times:
                n1=np.sum(t1>=time);n2=np.sum(t2>=time);n=n1+n2
                d1=np.sum((t1==time)&(e1==1));d2=np.sum((t2==time)&(e2==1));d=d1+d2
                O+=d1;E+=d*n1/n
                if n>1:V+=n1*n2*d*(n-d)/(n*n*(n-1))
            if V>0:chi=(O-E)**2/V;result['logrank']=dict(observed=O,expected=E,variance=V,chi2=chi,p=stats.chi2.sf(chi,1))
    elif m=='series':
        data=aligned([xi,yi]);assert len(data)==len(rows),'Missing trajectory states require an explicit window';x,y=data.T;delta=np.diff(x);assert np.all(delta>0)
        regular=np.allclose(delta,np.mean(delta),rtol=1e-6,atol=1e-6);yc=y-y.mean();acf=[]
        if regular and np.dot(yc,yc)>0:acf=[np.dot(yc[k:],yc[:len(y)-k])/np.dot(yc,yc) for k in range(min(opts['maxLag'],len(y)//3)+1)]
        result=dict(**describe(y),area=np.sum((y[1:]+y[:-1])*delta/2),regular=bool(regular),acf=acf)
    elif m=='replicates':
        by={}
        for r in rows:
            assert r[ids] is not None and finite(r[xi]) is not None and finite(r[yi]) is not None
            by.setdefault(str(r[ids]),[]).append((finite(r[xi]),finite(r[yi])))
        summaries=[]
        for key,v in by.items():
            data=np.asarray(sorted(v));x,y=data.T;assert np.all(np.diff(x)>0)
            f={'final':lambda:y[-1],'mean':lambda:y.mean(),'max':lambda:y.max(),'auc':lambda:np.sum((y[1:]+y[:-1])*np.diff(x)/2)}[opts['metric']]
            summaries.append(dict(id=key,start=x[0],end=x[-1],value=f()))
        assert len(set(s['end'] for s in summaries))==1
        if opts['metric']=='auc':assert len(set(s['start'] for s in summaries))==1
        values=np.array([s['value'] for s in summaries]);result=dict(runs=summaries,summary=describe(values))
        if opts['independence'] and len(values)>=3 and np.std(values,ddof=1)>0:
            q=stats.t.ppf(1-alpha/2,len(values)-1);se=stats.sem(values)
            result['interval']=[np.mean(values)-q*se,np.mean(values)+q*se]
    elif m=='endpoints':
        endpoints=list(dict.fromkeys([yi]+opts.get('predictors',[])));effects=[]
        for endpoint in endpoints:
            try:
                gs=groups(endpoint);effects.append(dict(endpoint=columns[endpoint],**welch(gs[opts['a']],gs[opts['b']],alpha)))
            except Exception as e:effects.append(dict(endpoint=columns[endpoint],error=str(e),p=None))
        adjusted=adjust([e['p'] if e['p'] is not None else 1 for e in effects],opts['correction'])
        for e,p in zip(effects,adjusted):
            if e['p'] is not None:e['pAdjusted']=p
        result=dict(effects=effects)
    elif m=='planning':
        d=opts['designEffect'];z=stats.norm.ppf(1-alpha/2);zp=stats.norm.ppf(opts['power']);result=dict(perGroup=math.ceil(2*(z+zp)**2/d**2),effect=d,alpha=alpha,target=opts['power'])
    else:raise ValueError('Unknown analysis method: '+m)
    def convert(x):
        if isinstance(x,dict):return {str(k):convert(v) for k,v in x.items()}
        if isinstance(x,(list,tuple,np.ndarray)):return [convert(v) for v in x]
        if isinstance(x,np.generic):return convert(x.item())
        if isinstance(x,float) and not math.isfinite(x):return None
        return x
    output=dict(method=m,result=convert(result),provenance=PAYLOAD.get('provenance'),options=opts,
                scope='Native Python reproduction; review sampling design before interpreting inference.')
    pathlib.Path('fokolab_python_result.json').write_text(json.dumps(output,indent=2,ensure_ascii=False))
    print(json.dumps(output,indent=2,ensure_ascii=False))
    fig,ax=plt.subplots(figsize=(7.5,4.6))
    if sample is not None:ax.hist(sample,bins=30);ax.set_xlabel('Resampled estimate');ax.set_ylabel('Count')
    elif m=='regression':ax.scatter(result['fitted'],result['residuals']);ax.axhline(0,linestyle='--');ax.set_xlabel('Fitted response');ax.set_ylabel('Residual')
    elif m=='survival':
        for g in result['groups']:ax.step([0]+[r['time'] for r in g['rows']],[1]+[r['survival'] for r in g['rows']],where='post',label=g['name'])
        ax.set_xlabel(columns[yi]);ax.set_ylabel('Event-free probability');ax.legend()
    elif len(y):ax.hist(y,bins='auto');ax.set_xlabel(columns[yi]);ax.set_ylabel('Count')
    ax.set_title('FokoLab · '+m);fig.tight_layout();fig.savefig('fokolab_python_figure.svg');fig.savefig('fokolab_python_figure.png',dpi=180)

if __name__=='__main__':main()
