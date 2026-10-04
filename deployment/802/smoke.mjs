import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as S from '../../site/src/analysis-studio/statistics.mjs';
import {compute} from '../../site/src/analysis-studio/compute.mjs';
import {METHODS,VIEWS} from '../../site/src/analysis-studio/methods.mjs';
import {DEMOS} from '../../site/src/analysis-studio/demos.mjs';
import {availability,plot} from '../../site/src/analysis-studio/plots.mjs';
const samples={describe:'harvest',one:'harvest',welch:'harvest',paired:'paired','welch-anova':'harvest',kruskal:'harvest',permutation:'paired',bootstrap:'bootstrap',correlation:'regression',regression:'regression',categorical:'categorical',survival:'survival',series:'ar1','block-bootstrap':'ar1',replicates:'replicates',endpoints:'harvest',planning:'harvest'};
const outputs=[];let figures=0;const views=new Set();
for(const spec of METHODS){const demo=DEMOS.find(d=>d.id===samples[spec.id]).make(),table=S.parseCSV(demo.data);const options={design:'independent',independence:true,justification:'Synthetic demonstration with explicitly declared sampling design.',y:2,x:-1,group:-1,id:-1,event:-1,alpha:.05,mu0:0,reps:199,seed:42,correction:'holm',statistic:'mean',covariance:'hc3',correlation:'pearson',maxLag:20,block:5,metric:'final',designEffect:.5,power:.8,missing:'exclude',predictors:[],stationary:false,...demo.options,method:spec.id};
 if(spec.id==='block-bootstrap'){options.independence=true;options.stationary=true;}
 if(spec.id==='regression')options.predictors=[2];
 if(spec.id==='endpoints')options.predictors=[3];
 const g=options.group>=0?[...new Set(table.rows.map(r=>r[options.group]))]:[];options.a=g[0]||'';options.b=g[1]||'';
 const request={table,options,provenance:demo.provenance};const analysis=compute(request);assert.equal(analysis.method,spec.id);assert(analysis.audit.analyzedUnits>0);
 for(const view of VIEWS)if(!availability(analysis,view.id)){const fig=plot(analysis,view.id);assert(fig.data.length>0);figures++;views.add(view.id);}
 outputs.push({request,analysis});
}
assert.equal(outputs.length,17);assert.equal(views.size,30);
assert.throws(()=>S.oneSample([2,2,2]),/variance/i);assert.throws(()=>S.regress([[1,2],[2,4],[3,6],[4,8],[5,10]],[2,4,5,8,11]),/rank|collinear/i);
assert.throws(()=>S.matchPairs([['x','A',1],['x','A',2],['x','B',3]],1,0,'A','B',2),/Duplicate/);
const unknown=structuredClone(outputs[1].request);unknown.options.design='unknown';assert.throws(()=>compute(unknown),/appropriate/);
const noIndependent=structuredClone(outputs[2].request);noIndependent.options.independence=false;assert.throws(()=>compute(noIndependent),/independent/);
const gaps=S.parseCSV('time,y\n0,1\n1,\n2,3');assert.equal(gaps.rows[1][1],null);
const dir='evidence/deployment-80.2';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/cases.json',JSON.stringify(outputs));
fs.writeFileSync(dir+'/node.json',JSON.stringify({methods:outputs.length,figures,distinctViews:views.size,guards:6,version:S.VERSION,node:process.version},null,2));
console.log('NODE_OK',outputs.length,'methods,',figures,'compatible figures,',views.size,'distinct views, 6 guards.');
