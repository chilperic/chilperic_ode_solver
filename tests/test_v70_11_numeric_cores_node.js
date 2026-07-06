const stats = require('../src/core/statistics.js');
const la = require('../src/core/linalg.js');
function close(a,b,eps=1e-6){ if(Math.abs(a-b)>eps) throw new Error(`${a} != ${b}`); }
const table = stats.parseTable('x,y\n1,2\n2,4\n3,6', 'x,y', 'drop');
if(table.names[0] !== 'x' || table.cols.length !== 2) throw new Error('parseTable failed');
close(stats.ols([1,2,3],[2,4,6]).slope, 2);
if(stats.outliersIQR([1,2,3,100]).outliers[0] !== 100) throw new Error('outlier failed');
const A = [[4,1,0],[1,3,1],[0,1,2]];
close(la.determinant(A), 18);
const sol = la.solve(A,[1,2,3]);
if(sol.length !== 3) throw new Error('solve length failed');
const inv = la.inverse([[2,0],[0,4]]);
close(inv[0][0], .5); close(inv[1][1], .25);
const ls = la.leastSquares([[1,1],[1,2],[1,3]],[2,4,6]);
close(ls[0], 0); close(ls[1], 2);
console.log('v70.11 numeric cores: ok');
