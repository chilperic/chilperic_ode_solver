/* Foko Lab v72.25 evidence report card. */
(function(root){
  'use strict';
  function stable(value){
    if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
    return JSON.stringify(value);
  }
  async function sha256Hex(text){
    if(root.crypto&&root.crypto.subtle){const data=new TextEncoder().encode(text);const digest=await root.crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');}
    if(typeof require==='function'){return require('crypto').createHash('sha256').update(text).digest('hex');}
    let h=2166136261;for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return `fnv1a-${(h>>>0).toString(16).padStart(8,'0')}`;
  }
  function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(value){if(typeof value==='number')return Number.isFinite(value)?Number(value.toPrecision(7)).toString():'—';if(Array.isArray(value))return value.map(fmt).join('; ');if(value&&typeof value==='object')return stable(value);return String(value??'—');}
  function limitations(data){
    const out=['The equations and parameter values are user-supplied; numerical execution does not establish model correctness or biological validity.','Local numerical diagnostics do not prove global accuracy, uniqueness, structural identifiability, causal interpretation or external validity.'];
    const d=data.result&&data.result.diagnostics||{};
    if(!data.result||!data.result.verification)out.push('Independent agreement with another solver was not established for this run.');
    else if(data.result.verification.comparison.verdict!=='agreement')out.push('Independent SciPy verification did not confirm agreement at the requested numerical scale.');
    if(d.stiffnessAssessment==='not available')out.push('Local Jacobian stiffness evidence was unavailable.');
    else out.push('The local Jacobian timescale indicator is heuristic and is not a stiffness certificate.');
    if(!data.conservation)out.push('No problem-specific conservation law was supplied and tested.');
    if(data.model&&['rk4','rk5','heun','euler'].includes(String(data.model.method||'').toLowerCase()))out.push('The selected fixed-step explicit method has no embedded local-error estimate.');
    return out;
  }
  async function build(data){
    if(!data||!data.model||!data.result)throw new Error('A computed model result is required for a report card.');
    const modelFingerprint=await sha256Hex(stable(data.model));
    const runFingerprint=await sha256Hex(stable({model:data.model,diagnostics:data.result.diagnostics,verification:data.result.verification||null}));
    const equations=(data.model.vars||[]).map((name,i)=>`<tr><th>d${esc(name)}/dt</th><td><code>${esc((data.model.eqs||[])[i]||'')}</code></td></tr>`).join('');
    const params=Object.entries(data.model.params||{}).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(fmt(Array.isArray(v)?v[0]:v))}</td></tr>`).join('');
    const diagnostics=Object.entries(data.result.diagnostics||{}).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(fmt(v))}</td></tr>`).join('');
    const verification=data.result.verification;
    const verifyHtml=verification?`<p class="verdict ${esc(verification.comparison.verdict)}"><strong>${esc(verification.comparison.label)}</strong></p><table><tbody><tr><th>Reference</th><td>${esc(verification.reference.engine)} · ${esc(verification.reference.method)} · SciPy ${esc(verification.reference.scipyVersion)}</td></tr><tr><th>Maximum scaled deviation</th><td>${esc(fmt(verification.comparison.maxScaledDeviation))}</td></tr><tr><th>Location</th><td>${esc(verification.comparison.stateName)} at t=${esc(fmt(verification.comparison.time))}</td></tr></tbody></table>`:'<p>Not performed.</p>';
    const notEstablished=limitations(data).map(item=>`<li>${esc(item)}</li>`).join('');
    const generated=esc(data.generatedAt||new Date().toISOString());
    return {modelFingerprint,runFingerprint,html:`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foko Lab model report card</title><style>body{font:15px/1.55 system-ui,sans-serif;max-width:980px;margin:32px auto;padding:0 24px;color:#172033}h1{font-size:2rem}h2{margin-top:2rem;border-bottom:1px solid #ccd6e0;padding-bottom:.35rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d7e0e8;padding:.55rem;text-align:left;vertical-align:top}th{width:28%;background:#f5f8fa}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.meta div{border:1px solid #d7e0e8;padding:.7rem}.verdict{padding:.8rem;border-left:5px solid #5f6b7a;background:#f5f8fa}.agreement{border-color:#16865b}.caution{border-color:#b7791f}.disagreement{border-color:#c23b3b}code{white-space:pre-wrap}button{padding:.7rem 1rem}@media print{button{display:none}body{margin:0;max-width:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><h1>Foko Lab model report card</h1><p>This report records numerical evidence and explicit limits. It is not a scientific certificate.</p><div class="meta"><div><strong>Platform version</strong><br>${esc(data.version||'unknown')}</div><div><strong>Generated</strong><br>${generated}</div><div><strong>Model SHA-256</strong><br><code>${esc(modelFingerprint)}</code></div><div><strong>Run SHA-256</strong><br><code>${esc(runFingerprint)}</code></div></div><h2>Model</h2><table><tbody>${equations}</tbody></table><h3>Parameters</h3><table><tbody>${params||'<tr><td>No parameters declared.</td></tr>'}</tbody></table><h2>Numerical evidence</h2><table><tbody>${diagnostics}</tbody></table><h2>Independent verification</h2>${verifyHtml}<h2>What this run does not establish</h2><ul>${notEstablished}</ul><h2>Provenance</h2><table><tbody><tr><th>Engine</th><td>${esc(data.result.provenance&&data.result.provenance.engine||'FokoODECore')}</td></tr><tr><th>Reported points</th><td>${esc((data.result.T||[]).length)}</td></tr><tr><th>Configuration</th><td><code>${esc(stable(data.model))}</code></td></tr></tbody></table></body></html>`};
  }
  const api={stable,sha256Hex,limitations,build};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FokoModelReportCard=api;
})(typeof self!=='undefined'?self:globalThis);
