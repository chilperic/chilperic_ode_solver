import {analyse} from './decision-core.mjs';
onmessage=e=>{try{postMessage({result:analyse(e.data.input,e.data.reference)});}catch(error){postMessage({error:error.message});}};
