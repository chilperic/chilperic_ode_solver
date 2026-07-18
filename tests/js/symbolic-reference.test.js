'use strict';
const S = require('../../src/core/symbolic-reference.js');
let checks = 0, fails = 0;
function truthy(value, message) { checks += 1; if (!value) { fails += 1; console.error('FAIL:', message); } }
function equal(got, want, message) { checks += 1; if (got !== want) { fails += 1; console.error('FAIL:', message, 'got=', got, 'want=', want); } }
function close(got, want, tolerance, message) { checks += 1; if (!Number.isFinite(got) || Math.abs(got - want) > tolerance) { fails += 1; console.error('FAIL:', message, 'got=', got, 'want=', want); } }
function throws(fn, message) { checks += 1; try { fn(); fails += 1; console.error('FAIL no throw:', message); } catch (_) {} }

const parsed = S.parse('r*x*(1-x/K)');
equal(S.toString(parsed), 'r * x * (1 - x / K)', 'parser preserves explicit structure');
close(S.evaluate(parsed, { r: 2, x: 1, K: 10 }), 1.8, 1e-12, 'numeric evaluation');
truthy(S.collectSymbols(parsed).join(',') === 'K,r,x', 'free symbols');
truthy(S.operationCount(parsed) === 4, 'operation count');

throws(() => S.parse('2x'), 'implicit multiplication rejected');
throws(() => S.parse('foo(x)'), 'unsupported function rejected');
throws(() => S.parse('x @ y'), 'unexpected character rejected');
throws(() => S.parse('(x+1'), 'unclosed parenthesis rejected');
throws(() => S.evaluate(S.parse('x+y'), { x: 1 }), 'missing scope rejected');
throws(() => S.evaluate(S.parse('log(x)'), { x: -1 }), 'non-finite function domain rejected');

close(S.evaluate(S.parse('sin(pi/2)'), {}), 1, 1e-12, 'pi constant and sin');
close(S.evaluate(S.parse('exp(1)'), {}), Math.E, 1e-12, 'exp');
close(S.evaluate(S.parse('sqrt(9)'), {}), 3, 1e-12, 'sqrt');
close(S.evaluate(S.parse('tan(0)'), {}), 0, 1e-12, 'tan');

const dPolynomial = S.differentiate(S.parse('x^3+2*x'), 'x');
close(S.evaluate(dPolynomial, { x: 2 }), 14, 1e-10, 'polynomial derivative');
const dProduct = S.differentiate(S.parse('sin(x)*exp(x)'), 'x');
close(S.evaluate(dProduct, { x: 0.4 }), Math.exp(0.4) * (Math.sin(0.4) + Math.cos(0.4)), 1e-10, 'product and chain rule');
const dQuotient = S.differentiate(S.parse('x/(1+x)'), 'x');
close(S.evaluate(dQuotient, { x: 2 }), 1/9, 1e-10, 'quotient rule');
const dGeneralPower = S.differentiate(S.parse('x^x'), 'x');
close(S.evaluate(dGeneralPower, { x: 2 }), 4 * (Math.log(2) + 1), 1e-9, 'general power rule');
const dSqrt = S.differentiate(S.parse('sqrt(x)'), 'x');
close(S.evaluate(dSqrt, { x: 4 }), 0.25, 1e-12, 'sqrt derivative');
const dLog = S.differentiate(S.parse('log(x)'), 'x');
close(S.evaluate(dLog, { x: 4 }), 0.25, 1e-12, 'log derivative');

const simplified = S.simplify(S.parse('0+x*1+2*3'));
equal(S.toString(simplified), 'x + 6', 'conservative simplification');
equal(S.toString(S.simplify(S.parse('x/x'))), 'x / x', 'domain-changing cancellation avoided');
equal(S.toString(S.simplify(S.parse('-(-x)'))), 'x', 'double negative');

const expressions = S.parseExpressions("x' = v\nv' = -omega^2*x");
truthy(expressions.length === 2, 'system parser');
const J = S.jacobian(expressions, ['x', 'v']);
equal(S.toString(J[0][0]), '0', 'Jacobian 00');
equal(S.toString(J[0][1]), '1', 'Jacobian 01');
equal(S.toString(J[1][0]), '-(omega ^ 2)', 'Jacobian 10');
equal(S.toString(J[1][1]), '0', 'Jacobian 11');
const Jn = S.evaluateJacobian(J, { x: 1, v: 0, omega: 2 });
close(Jn[1][0], -4, 1e-12, 'numeric Jacobian');
truthy(S.formatJacobianLatex(J).includes('\\begin{bmatrix}'), 'Jacobian LaTeX');

const roots = S.findRoots1D(S.parse('x*(1-x)*(x-0.35)'), 'x', {}, -0.2, 1.2, { samples: 600, tolerance: 1e-10 });
truthy(roots.length === 3, 'three simple roots detected');
close(roots[0].value, 0, 1e-6, 'first root');
close(roots[1].value, 0.35, 1e-6, 'middle root');
close(roots[2].value, 1, 1e-6, 'last root');
truthy(roots.every(row => row.residual < 1e-8), 'root residuals');
const noRoots = S.findRoots1D(S.parse('x^2+1'), 'x', {}, -3, 3, { samples: 200 });
truthy(noRoots.length === 0, 'no false sign-change roots');

const sample = S.sampleExpression(S.parse('1/x'), 'x', {}, -1, 1, 5);
truthy(sample.x.length === 5 && sample.y.length === 5, 'expression sampling shape');
truthy(sample.y[2] === null, 'domain gap retained as null');
throws(() => S.linspace(1, 1, 20), 'invalid range rejected');
throws(() => S.linspace(0, 1, 1), 'too few samples rejected');

const scope = S.parseScope('x=1\nr=2; K=10');
close(scope.x, 1, 0, 'scope x');
close(scope.r, 2, 0, 'scope r');
close(scope.K, 10, 0, 'scope K');
throws(() => S.parseScope('x:1'), 'invalid scope syntax rejected');
throws(() => S.parseScope('x=NaN'), 'non-finite scope rejected');

const analysis = S.analyze([S.parse('r*x*(1-x/K)')], ['x'], 0, 'x', { x: 1, r: 1, K: 10 });
truthy(analysis.simplified.length === 1, 'analysis simplified output');
truthy(analysis.jacobian.length === 1 && analysis.jacobian[0].length === 1, 'analysis Jacobian shape');
close(analysis.evaluation[0], 0.9, 1e-12, 'analysis evaluation');
close(analysis.jacobianNumeric[0][0], 0.8, 1e-10, 'analysis numeric derivative');

truthy(S.toLatex(S.parse('x/(1+x)')).includes('\\frac'), 'fraction LaTeX');
truthy(S.toLatex(S.parse('sqrt(x)')).includes('\\sqrt'), 'sqrt LaTeX');
truthy(S.toLatex(S.parse('sin(x)')).includes('\\sin'), 'sin LaTeX');
equal(S.latexIdentifier('sigma'), '\\sigma', 'Greek identifier LaTeX');
equal(S.latexIdentifier('V_max'), 'V_{\\mathrm{max}}', 'subscript identifier LaTeX');
truthy(S.toLatex(S.parse('sigma*x_1')).includes('\\sigma'), 'symbols use semantic Greek LaTeX');
truthy(S.toLatex(S.parse('sigma*x_1')).includes('x_{1}'), 'symbols use semantic subscript LaTeX');

const script = S.generateSympyScript({ variables: ['x'], parameters: ['r', 'K'], expressions: [S.parse('r*x*(1-x/K)')], scope: { x: 1, r: 1, K: 10 } });
truthy(script.includes('import sympy as sp'), 'SymPy import');
truthy(script.includes('F.jacobian(variables)'), 'SymPy Jacobian export');
truthy(script.includes('sp.solve'), 'exact solving clearly left as optional external route');
truthy(script.includes('sp.integrate'), 'integration clearly left as optional external route');
truthy(script.includes('v72.48.0'), 'export release identity');

console.log((checks - fails) + '/' + checks + ' symbolic reference checks passed');
if (fails) process.exit(1);
