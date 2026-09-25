/** Small arithmetic language. No eval, Function, assignments, property access or I/O. */
const FUNCTIONS = Object.freeze({sin:Math.sin,cos:Math.cos,tan:Math.tan,exp:Math.exp,log:Math.log,sqrt:Math.sqrt,abs:Math.abs,tanh:Math.tanh,min:Math.min,max:Math.max,pow:Math.pow});
const CONSTANTS = Object.freeze({pi:Math.PI,e:Math.E});
export function parse(source){
  if(typeof source!=='string'||source.length>4096) throw Error('An expression must be text, at most 4096 characters.');
  const tokens=[];let i=0;
  while(i<source.length){
    const s=source.slice(i);if(/^\s/.test(s)){i++;continue;}
    const m=s.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^[A-Za-z][A-Za-z0-9_]*|^\*\*|^[+\-*/^(),]/);
    if(!m)throw Error(`Unsupported expression character at position ${i+1}. Use arithmetic, not JavaScript.`);
    tokens.push(m[0]==='**'?'^':m[0]);i+=m[0].length;
    if(tokens.length>1000)throw Error('Expression has too many terms.');
  }
  let pos=0,depth=0;
  function expr(min=0){
    if(++depth>64)throw Error('Expression nesting exceeds 64 levels.');
    let a,t=tokens[pos++];
    if(t==='+'||t==='-')a={op:t==='+'?'pos':'neg',a:expr(30)};
    else if(t==='('){a=expr();if(tokens[pos++]!==')')throw Error('Missing closing parenthesis.');}
    else if(t&&/^\d|^\./.test(t)){a={op:'num',v:Number(t)};if(!Number.isFinite(a.v))throw Error('Non-finite literal.');}
    else if(t&&/^[A-Za-z]/.test(t)){
      if(tokens[pos]==='('){
        if(!Object.hasOwn(FUNCTIONS,t))throw Error(`Unknown function: ${t}.`);pos++;const args=[];
        if(tokens[pos]!==')'){do{args.push(expr());if(tokens[pos]!==',')break;pos++;}while(true);}
        if(tokens[pos++]!==')')throw Error('Missing closing function parenthesis.');
        const arity=['min','max','pow'].includes(t)?2:1;if(args.length!==arity)throw Error(`${t} requires ${arity} argument(s).`);
        a={op:'fn',name:t,args};
      }else a={op:'var',name:t};
    }else throw Error('Expected a number, variable, function or parenthesis.');
    while(pos<tokens.length){const op=tokens[pos],prec={'+':10,'-':10,'*':20,'/':20,'^':40}[op];if(prec===undefined||prec<min)break;pos++;a={op,a,b:expr(op==='^'?prec:prec+1)};}
    depth--;return a;
  }
  const ast=expr();if(pos!==tokens.length)throw Error(`Unexpected token: ${tokens[pos]}.`);return ast;
}
export function evaluate(ast,env={}){
  const ev=n=>{
    switch(n.op){case'num':return n.v;case'var':{if(Object.hasOwn(env,n.name))return env[n.name];if(Object.hasOwn(CONSTANTS,n.name))return CONSTANTS[n.name];throw Error(`Undefined variable: ${n.name}.`);}
      case'neg':return-ev(n.a);case'pos':return ev(n.a);case'+':return ev(n.a)+ev(n.b);case'-':return ev(n.a)-ev(n.b);case'*':return ev(n.a)*ev(n.b);case'/':return ev(n.a)/ev(n.b);case'^':return ev(n.a)**ev(n.b);case'fn':return FUNCTIONS[n.name](...n.args.map(ev));default:throw Error('Invalid expression tree.');}
  };const v=ev(ast);if(!Number.isFinite(v))throw Error('Expression produced a non-finite value. Check denominators, logarithm domains and exponential growth.');return v;
}
export function compile(source){const ast=parse(source);return env=>evaluate(ast,env);}
export function names(ast){let s=new Set;function visit(n){if(n.op==='var')s.add(n.name);if(n.a)visit(n.a);if(n.b)visit(n.b);n.args?.forEach(visit);}visit(ast);return[...s].filter(x=>!Object.hasOwn(CONSTANTS,x));}
const num=v=>({op:'num',v}),bin=(op,a,b)=>({op,a,b}),fn=(name,a)=>({op:'fn',name,args:[a]});
export function derivative(n,x){
 const d=a=>derivative(a,x),b=bin;
 switch(n.op){case'num':return num(0);case'var':return num(n.name===x?1:0);case'neg':return{op:'neg',a:d(n.a)};case'pos':return d(n.a);case'+':case'-':return b(n.op,d(n.a),d(n.b));case'*':return b('+',b('*',d(n.a),n.b),b('*',n.a,d(n.b)));case'/':return b('/',b('-',b('*',d(n.a),n.b),b('*',n.a,d(n.b))),b('^',n.b,num(2)));case'^':if(n.b.op==='num')return b('*',b('*',n.b,b('^',n.a,num(n.b.v-1))),d(n.a));return b('*',n,b('+',b('*',d(n.b),fn('log',n.a)),b('*',n.b,b('/',d(n.a),n.a))));case'fn':{const a=n.args[0],da=d(a);const outer={sin:()=>fn('cos',a),cos:()=>({op:'neg',a:fn('sin',a)}),exp:()=>fn('exp',a),log:()=>b('/',num(1),a),sqrt:()=>b('/',num(1),b('*',num(2),fn('sqrt',a))),tanh:()=>b('-',num(1),b('^',fn('tanh',a),num(2))),tan:()=>b('/',num(1),b('^',fn('cos',a),num(2)))}[n.name];if(!outer)throw Error(`Symbolic derivative of ${n.name} is not supported; use a smooth expression.`);return b('*',outer(),da);}}
 throw Error('Unsupported symbolic node.');
}
export function simplify(n){
 if(n.a)n={...n,a:simplify(n.a)};if(n.b)n={...n,b:simplify(n.b)};if(n.args)n={...n,args:n.args.map(simplify)};
 const z=a=>a?.op==='num'&&a.v===0,o=a=>a?.op==='num'&&a.v===1;
 if(n.op==='*'&&(z(n.a)||z(n.b)))return num(0);if(n.op==='*'&&o(n.a))return n.b;if(n.op==='*'&&o(n.b))return n.a;
 if(n.op==='+'&&z(n.a))return n.b;if(['+','-'].includes(n.op)&&z(n.b))return n.a;
 if(n.op==='^'&&o(n.b))return n.a;if(n.op==='^'&&z(n.b))return num(1);
 if(n.op==='/'&&o(n.b))return n.a;
 if(names(n).length===0){try{return num(evaluate(n));}catch{}}
 return n;
}
export function format(n,python=false){
 if(n.op==='num')return String(n.v);if(n.op==='var')return python&&n.name==='pi'?'math.pi':python&&n.name==='e'?'math.e':n.name;
 if(n.op==='neg'||n.op==='pos')return`(${n.op==='neg'?'-':'+'}${format(n.a,python)})`;
 if(n.op==='fn'){const name=python&&!['min','max','abs','pow'].includes(n.name)?'math.'+n.name:n.name;return`${name}(${n.args.map(x=>format(x,python)).join(', ')})`;}
 return`(${format(n.a,python)} ${python&&n.op==='^'?'**':n.op} ${format(n.b,python)})`;
}
export function validateModel(m){
 if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Model must be a JSON object.');
 if(!Array.isArray(m.variables)||m.variables.length<1||m.variables.length>12)throw Error('Use between 1 and 12 state variables.');
 const reserved=new Set([...Object.keys(FUNCTIONS),...Object.keys(CONSTANTS),'t','__proto__','constructor','prototype']);
 const valid=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(s)&&!reserved.has(s);
 if(!m.variables.every(valid)||new Set(m.variables).size!==m.variables.length)throw Error('State names must be unique identifiers, not reserved function names.');
 if(!Array.isArray(m.initial)||m.initial.length!==m.variables.length||!m.initial.every(Number.isFinite))throw Error('Initial values must be finite and match the state variables.');
 if(!Array.isArray(m.equations)||m.equations.length!==m.variables.length)throw Error('Provide one derivative expression per state.');
 const p=m.parameters??{};if(typeof p!=='object'||Array.isArray(p)||p===null||Object.keys(p).length>40)throw Error('Parameters must be a numeric object with at most 40 entries.');
 if(Object.keys(p).some(k=>!valid(k)||m.variables.includes(k))||!Object.values(p).every(Number.isFinite))throw Error('Parameters must have valid, distinct names and finite numeric values.');
 const asts=m.equations.map(parse),allowed=new Set([...m.variables,...Object.keys(p),'t']);
 for(const ast of asts)for(const name of names(ast))if(!allowed.has(name))throw Error(`Unknown symbol ${name} in model equations.`);
 if(m.units!==undefined&&(!Array.isArray(m.units)||m.units.length!==m.variables.length||!m.units.every(u=>typeof u==='string'&&u.length<=100)))throw Error('Provide one unit string per state (at most 100 characters each).');
 const clean={id:String(m.id??'custom').slice(0,80),name:String(m.name??'User model').slice(0,100),variables:[...m.variables],initial:[...m.initial],equations:[...m.equations],parameters:{...p},timeUnit:String(m.timeUnit??'model time').slice(0,40),units:Array.isArray(m.units)?m.units.map(String):m.variables.map(()=> 'model units'),nonnegative:!!m.nonnegative,description:String(m.description??'User-specified explicit ODE.').slice(0,1000),limitations:String(m.limitations??'Scientific validity and parameter interpretation have not been established by syntax validation.').slice(0,1000),references:Array.isArray(m.references)?m.references.filter(x=>typeof x==='string').slice(0,20):[]};
 return{model:clean,rhs:(t,y)=>{const env={...p,t};m.variables.forEach((v,i)=>env[v]=y[i]);return asts.map(a=>evaluate(a,env));}};
}
