import {compute} from './compute.mjs';
self.onmessage=e=>{const {id,request}=e.data;try{self.postMessage({id,result:compute(request)});}catch(error){self.postMessage({id,error:error.message});}};
