/* A seasonal quadrature of the existing climate generator, not observed weather.
 * Separate the evaluation period (days) from the origin–fixation clock (generations).
 */
(function(root){'use strict';
const node=typeof module!=='undefined'&&module.exports,C=node?require('./location-forcing'):root.EvolutionClimate;
function generate(input){
 const {location,date,wetness,co2=405,extreme='baseline',days=120,stressStart=45,stressDays=20,samples=6}=input;
 if(!Number.isInteger(days)||days<1||days>365)throw Error('Growing season must be 1–365 whole days.');
 if(![3,6,9].includes(samples))throw Error('Choose 3, 6 or 9 seasonal sampling blocks.');
 if(!Number.isInteger(stressStart)||!Number.isInteger(stressDays)||stressStart<0||stressDays<1||stressStart>=days||stressStart+stressDays>days)throw Error('The stress window must fit inside the growing season. Days are counted from zero.');
 const start=new Date(date+'T00:00:00Z');if(!Number.isFinite(+start)||start.toISOString().slice(0,10)!==date)throw Error('Choose a valid season start date.');
 // Include stress boundaries explicitly; a short heat/drought window cannot disappear between sample dates.
 const edges=new Set([0,days]);for(let i=1;i<samples;i++)edges.add(Math.round(days*i/samples));
 if(extreme!=='baseline'){edges.add(stressStart);edges.add(stressStart+stressDays);}
 const cuts=[...edges].sort((a,b)=>a-b),forcing=[],blocks=[];
 for(let i=0;i<cuts.length-1;i++){
  const from=cuts[i],to=cuts[i+1];if(to<=from)continue;
  const offset=Math.floor((from+to-1)/2),sampleDate=new Date(+start+offset*86400000).toISOString().slice(0,10),stressed=extreme!=='baseline'&&from>=stressStart&&to<=stressStart+stressDays;
  let day;try{day=C.generate({location,date:sampleDate,wetness,co2,extreme:stressed?extreme:'baseline',intervals:4});}catch(e){throw Error('Season block '+(i+1)+' ('+sampleDate+'): '+e.message);}
  const block={startDay:from,endDay:to,representativeDay:offset,date:sampleDate,stress:stressed?extreme:'baseline',wetness:day.origin.effectiveWetness};blocks.push(block);
  for(const row of day.forcing)forcing.push({...row,hours:row.hours*(to-from),seasonBlock:i,representativeDate:sampleDate});
 }
 return{forcing,origin:{source:'illustrative-seasonal-quadrature',location,date,endDate:new Date(+start+(days-1)*86400000).toISOString().slice(0,10),seasonDays:days,samples,blocks,stressStart,stressDays,extreme,wetness,co2,intervals:4,timeBasis:'local solar time',fitnessNormalization:'Mean daily physiological performance; totals are integrated over the season.',note:'Piecewise midpoint sampling with exact duration and stress boundaries. Compare sampling densities. Climate and prescribed soil wetness repeat every generation. No age-dependent plant growth, seed production, evolving flowering time, rainfall-driven soil balance or warming across generations is inferred.'}};
}
const api={generate};if(node)module.exports=api;else root.EvolutionSeason=api;
})(globalThis);
