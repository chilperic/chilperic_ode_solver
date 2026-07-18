/* Foko Lab limited symbolic core.
 * Pure parsing, algebraic transformation and numerical evaluation only.
 * No DOM, storage, plotting, network access or dynamic code evaluation.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FokoSymbolicReference = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FUNCTION_NAMES = new Set(['sin', 'cos', 'tan', 'exp', 'log', 'sqrt']);
  const CONSTANTS = Object.freeze({ pi: Math.PI, e: Math.E });
  const PRECEDENCE = Object.freeze({ '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, unary: 4, call: 5, atom: 6 });

  function number(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error('Numeric literal must be finite.');
    return Object.freeze({ type: 'number', value: numeric });
  }
  function symbol(name) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name))) throw new Error('Invalid symbol name: ' + name);
    return Object.freeze({ type: 'symbol', name: String(name) });
  }
  function unary(op, arg) { return Object.freeze({ type: 'unary', op, arg }); }
  function binary(op, left, right) { return Object.freeze({ type: 'binary', op, left, right }); }
  function call(name, arg) {
    if (!FUNCTION_NAMES.has(name)) throw new Error('Unsupported function: ' + name);
    return Object.freeze({ type: 'call', name, arg });
  }

  function tokenize(text) {
    const input = String(text == null ? '' : text);
    const tokens = [];
    let index = 0;
    while (index < input.length) {
      const rest = input.slice(index);
      const ws = /^\s+/.exec(rest);
      if (ws) { index += ws[0].length; continue; }
      const numeric = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
      if (numeric) {
        tokens.push({ type: 'number', value: Number(numeric[0]), raw: numeric[0], index });
        index += numeric[0].length;
        continue;
      }
      const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
      if (identifier) {
        tokens.push({ type: 'identifier', value: identifier[0], index });
        index += identifier[0].length;
        continue;
      }
      const ch = input[index];
      if ('+-*/^(),'.includes(ch)) {
        tokens.push({ type: ch, value: ch, index });
        index += 1;
        continue;
      }
      throw new Error('Unexpected character "' + ch + '" at position ' + index + '. Use explicit multiplication with * and supported functions only.');
    }
    tokens.push({ type: 'eof', value: '', index: input.length });
    return tokens;
  }

  function parse(text) {
    const tokens = tokenize(text);
    let position = 0;
    function peek(type) { return tokens[position].type === type; }
    function consume(type) {
      const token = tokens[position];
      if (type && token.type !== type) throw new Error('Expected ' + type + ' at position ' + token.index + ', found ' + token.type + '.');
      position += 1;
      return token;
    }
    function parsePrimary() {
      if (peek('number')) return number(consume('number').value);
      if (peek('identifier')) {
        const name = consume('identifier').value;
        if (peek('(')) {
          consume('(');
          const arg = parseAdditive();
          consume(')');
          return call(name, arg);
        }
        return symbol(name);
      }
      if (peek('(')) {
        consume('(');
        const expr = parseAdditive();
        consume(')');
        return expr;
      }
      const token = tokens[position];
      throw new Error('Expected a number, symbol or parenthesized expression at position ' + token.index + '.');
    }
    function parsePower() {
      let left = parsePrimary();
      if (peek('^')) {
        consume('^');
        left = binary('^', left, parseUnary());
      }
      return left;
    }
    function parseUnary() {
      if (peek('+')) { consume('+'); return parseUnary(); }
      if (peek('-')) { consume('-'); return unary('-', parseUnary()); }
      return parsePower();
    }
    function parseMultiplicative() {
      let left = parseUnary();
      while (peek('*') || peek('/')) {
        const op = consume().type;
        left = binary(op, left, parseUnary());
      }
      return left;
    }
    function parseAdditive() {
      let left = parseMultiplicative();
      while (peek('+') || peek('-')) {
        const op = consume().type;
        left = binary(op, left, parseMultiplicative());
      }
      return left;
    }
    const result = parseAdditive();
    if (!peek('eof')) {
      const token = tokens[position];
      throw new Error('Unexpected token at position ' + token.index + '. Explicit multiplication is required.');
    }
    return result;
  }

  function stripEquationLabel(line) {
    const raw = String(line == null ? '' : line).trim();
    if (!raw) return '';
    const equals = raw.indexOf('=');
    return equals >= 0 ? raw.slice(equals + 1).trim() : raw;
  }

  function parseExpressions(text) {
    const lines = String(text == null ? '' : text).split(/\n+/).map(stripEquationLabel).filter(Boolean);
    if (!lines.length) throw new Error('At least one expression is required.');
    return lines.map(parse);
  }

  function clone(ast) {
    if (!ast || typeof ast !== 'object') throw new Error('Invalid expression tree.');
    if (ast.type === 'number') return number(ast.value);
    if (ast.type === 'symbol') return symbol(ast.name);
    if (ast.type === 'unary') return unary(ast.op, clone(ast.arg));
    if (ast.type === 'binary') return binary(ast.op, clone(ast.left), clone(ast.right));
    if (ast.type === 'call') return call(ast.name, clone(ast.arg));
    throw new Error('Unknown expression node: ' + ast.type);
  }

  function isNumber(ast, value) { return ast && ast.type === 'number' && (value === undefined || ast.value === value); }
  function isZero(ast) { return isNumber(ast, 0); }
  function isOne(ast) { return isNumber(ast, 1); }
  function sameAst(a, b) { return toString(a) === toString(b); }

  function evaluate(ast, scope) {
    scope = scope || {};
    if (ast.type === 'number') return ast.value;
    if (ast.type === 'symbol') {
      if (Object.prototype.hasOwnProperty.call(scope, ast.name)) {
        const value = Number(scope[ast.name]);
        if (!Number.isFinite(value)) throw new Error('Scope value for ' + ast.name + ' must be finite.');
        return value;
      }
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, ast.name)) return CONSTANTS[ast.name];
      throw new Error('Missing numeric value for symbol ' + ast.name + '.');
    }
    if (ast.type === 'unary') return -evaluate(ast.arg, scope);
    if (ast.type === 'binary') {
      const left = evaluate(ast.left, scope);
      const right = evaluate(ast.right, scope);
      let value;
      if (ast.op === '+') value = left + right;
      else if (ast.op === '-') value = left - right;
      else if (ast.op === '*') value = left * right;
      else if (ast.op === '/') value = left / right;
      else if (ast.op === '^') value = Math.pow(left, right);
      else throw new Error('Unsupported operator: ' + ast.op);
      if (!Number.isFinite(value)) throw new Error('Expression evaluated to a non-finite value. Check the numerical scope and function domain.');
      return value;
    }
    if (ast.type === 'call') {
      const value = evaluate(ast.arg, scope);
      let result;
      if (ast.name === 'sin') result = Math.sin(value);
      else if (ast.name === 'cos') result = Math.cos(value);
      else if (ast.name === 'tan') result = Math.tan(value);
      else if (ast.name === 'exp') result = Math.exp(value);
      else if (ast.name === 'log') result = Math.log(value);
      else if (ast.name === 'sqrt') result = Math.sqrt(value);
      else throw new Error('Unsupported function: ' + ast.name);
      if (!Number.isFinite(result)) throw new Error(ast.name + ' is not finite at the supplied scope.');
      return result;
    }
    throw new Error('Unknown expression node: ' + ast.type);
  }

  function simplify(ast) {
    if (ast.type === 'number' || ast.type === 'symbol') return ast;
    if (ast.type === 'call') {
      const arg = simplify(ast.arg);
      if (isNumber(arg)) {
        try { return number(evaluate(call(ast.name, arg), {})); } catch (_) { return call(ast.name, arg); }
      }
      return call(ast.name, arg);
    }
    if (ast.type === 'unary') {
      const arg = simplify(ast.arg);
      if (isNumber(arg)) return number(-arg.value);
      if (arg.type === 'unary' && arg.op === '-') return simplify(arg.arg);
      return unary('-', arg);
    }
    const left = simplify(ast.left);
    const right = simplify(ast.right);
    if (isNumber(left) && isNumber(right)) {
      try { return number(evaluate(binary(ast.op, left, right), {})); } catch (_) { return binary(ast.op, left, right); }
    }
    if (ast.op === '+') {
      if (isZero(left)) return right;
      if (isZero(right)) return left;
    }
    if (ast.op === '-') {
      if (isZero(right)) return left;
      if (sameAst(left, right)) return number(0);
      if (isZero(left)) return simplify(unary('-', right));
    }
    if (ast.op === '*') {
      if (isZero(left) || isZero(right)) return number(0);
      if (isOne(left)) return right;
      if (isOne(right)) return left;
      if (isNumber(left, -1)) return simplify(unary('-', right));
      if (isNumber(right, -1)) return simplify(unary('-', left));
    }
    if (ast.op === '/') {
      if (isOne(right)) return left;
      /* Deliberately do not cancel x/x or 0/x: domain-changing cancellation can erase domain restrictions. */
    }
    if (ast.op === '^') {
      if (isZero(right)) return number(1);
      if (isOne(right)) return left;
      if (isOne(left)) return number(1);
      if (isZero(left) && isNumber(right) && right.value > 0) return number(0);
    }
    return binary(ast.op, left, right);
  }

  function differentiate(ast, variable) {
    const name = String(variable || '').trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('A valid differentiation variable is required.');
    let result;
    if (ast.type === 'number') result = number(0);
    else if (ast.type === 'symbol') result = number(ast.name === name ? 1 : 0);
    else if (ast.type === 'unary') result = unary('-', differentiate(ast.arg, name));
    else if (ast.type === 'binary') {
      const u = ast.left;
      const v = ast.right;
      const du = differentiate(u, name);
      const dv = differentiate(v, name);
      if (ast.op === '+') result = binary('+', du, dv);
      else if (ast.op === '-') result = binary('-', du, dv);
      else if (ast.op === '*') result = binary('+', binary('*', du, v), binary('*', u, dv));
      else if (ast.op === '/') result = binary('/', binary('-', binary('*', du, v), binary('*', u, dv)), binary('^', v, number(2)));
      else if (ast.op === '^') {
        if (isNumber(v)) result = binary('*', binary('*', number(v.value), binary('^', u, number(v.value - 1))), du);
        else result = binary('*', binary('^', u, v), binary('+', binary('*', dv, call('log', u)), binary('*', v, binary('/', du, u))));
      } else throw new Error('Unsupported operator: ' + ast.op);
    } else if (ast.type === 'call') {
      const darg = differentiate(ast.arg, name);
      if (ast.name === 'sin') result = binary('*', call('cos', ast.arg), darg);
      else if (ast.name === 'cos') result = binary('*', unary('-', call('sin', ast.arg)), darg);
      else if (ast.name === 'tan') result = binary('/', darg, binary('^', call('cos', ast.arg), number(2)));
      else if (ast.name === 'exp') result = binary('*', call('exp', ast.arg), darg);
      else if (ast.name === 'log') result = binary('/', darg, ast.arg);
      else if (ast.name === 'sqrt') result = binary('/', darg, binary('*', number(2), call('sqrt', ast.arg)));
      else throw new Error('Unsupported function: ' + ast.name);
    } else throw new Error('Unknown expression node: ' + ast.type);
    return simplify(result);
  }

  function precedence(ast) {
    if (ast.type === 'number' || ast.type === 'symbol') return PRECEDENCE.atom;
    if (ast.type === 'call') return PRECEDENCE.call;
    if (ast.type === 'unary') return PRECEDENCE.unary;
    return PRECEDENCE[ast.op];
  }

  function formatNumber(value) {
    if (Object.is(value, -0)) return '0';
    if (Number.isInteger(value)) return String(value);
    const abs = Math.abs(value);
    if ((abs > 0 && abs < 1e-6) || abs >= 1e8) return value.toExponential(8).replace(/\.0+e/, 'e').replace(/(\.\d*?)0+e/, '$1e');
    return Number(value.toPrecision(12)).toString();
  }

  function toString(ast, parentPrecedence, rightChild) {
    parentPrecedence = parentPrecedence == null ? 0 : parentPrecedence;
    let text;
    if (ast.type === 'number') text = formatNumber(ast.value);
    else if (ast.type === 'symbol') text = ast.name;
    else if (ast.type === 'call') text = ast.name + '(' + toString(ast.arg) + ')';
    else if (ast.type === 'unary') text = '-' + toString(ast.arg, PRECEDENCE.unary);
    else {
      const own = PRECEDENCE[ast.op];
      const left = toString(ast.left, own, false);
      const rightNeeds = ast.op === '-' || ast.op === '/' || ast.op === '^';
      const right = toString(ast.right, own + (rightNeeds ? 1 : 0), true);
      text = left + ' ' + ast.op + ' ' + right;
    }
    const ownPrecedence = precedence(ast);
    const needsParentheses = ownPrecedence < parentPrecedence || (rightChild && ast.type === 'binary' && ast.op === '^' && ownPrecedence === parentPrecedence);
    return needsParentheses ? '(' + text + ')' : text;
  }

  const GREEK_LATEX = Object.freeze({
    alpha:'\\alpha', beta:'\\beta', gamma:'\\gamma', delta:'\\delta', epsilon:'\\epsilon',
    zeta:'\\zeta', eta:'\\eta', theta:'\\theta', kappa:'\\kappa', lambda:'\\lambda',
    mu:'\\mu', nu:'\\nu', xi:'\\xi', pi:'\\pi', rho:'\\rho', sigma:'\\sigma',
    tau:'\\tau', phi:'\\phi', chi:'\\chi', psi:'\\psi', omega:'\\omega'
  });

  function latexIdentifier(name) {
    const raw = String(name == null ? '' : name);
    const pieces = raw.split('_');
    const head = pieces.shift() || '';
    function atom(value) {
      if (Object.prototype.hasOwnProperty.call(GREEK_LATEX, value)) return GREEK_LATEX[value];
      if (/^[A-Za-z]$/.test(value)) return value;
      if (/^[0-9]+$/.test(value)) return value;
      return '\\mathrm{' + value.replace(/([{}%&#$])/g, '\\$1') + '}';
    }
    const base = atom(head);
    if (!pieces.length) return base;
    return base + '_{' + pieces.map(atom).join('\\,') + '}';
  }

  function toLatex(ast, parentPrecedence) {
    parentPrecedence = parentPrecedence == null ? 0 : parentPrecedence;
    let text;
    if (ast.type === 'number') text = formatNumber(ast.value);
    else if (ast.type === 'symbol') text = latexIdentifier(ast.name);
    else if (ast.type === 'call') {
      const names = { sin: '\\sin', cos: '\\cos', tan: '\\tan', exp: '\\exp', log: '\\log', sqrt: '\\sqrt' };
      text = ast.name === 'sqrt' ? '\\sqrt{' + toLatex(ast.arg) + '}' : names[ast.name] + '\\left(' + toLatex(ast.arg) + '\\right)';
    } else if (ast.type === 'unary') text = '-' + toLatex(ast.arg, PRECEDENCE.unary);
    else if (ast.op === '/') text = '\\frac{' + toLatex(ast.left) + '}{' + toLatex(ast.right) + '}';
    else if (ast.op === '^') text = '{' + toLatex(ast.left, PRECEDENCE['^']) + '}^{' + toLatex(ast.right) + '}';
    else if (ast.op === '*') text = toLatex(ast.left, PRECEDENCE['*']) + ' \\cdot ' + toLatex(ast.right, PRECEDENCE['*']);
    else text = toLatex(ast.left, PRECEDENCE[ast.op]) + ' ' + ast.op + ' ' + toLatex(ast.right, PRECEDENCE[ast.op] + (ast.op === '-' ? 1 : 0));
    return precedence(ast) < parentPrecedence ? '\\left(' + text + '\\right)' : text;
  }

  function collectSymbols(ast, set) {
    set = set || new Set();
    if (ast.type === 'symbol' && !Object.prototype.hasOwnProperty.call(CONSTANTS, ast.name)) set.add(ast.name);
    else if (ast.type === 'unary') collectSymbols(ast.arg, set);
    else if (ast.type === 'binary') { collectSymbols(ast.left, set); collectSymbols(ast.right, set); }
    else if (ast.type === 'call') collectSymbols(ast.arg, set);
    return Array.from(set).sort();
  }

  function operationCount(ast) {
    if (ast.type === 'number' || ast.type === 'symbol') return 0;
    if (ast.type === 'unary' || ast.type === 'call') return 1 + operationCount(ast.arg);
    return 1 + operationCount(ast.left) + operationCount(ast.right);
  }

  function jacobian(expressions, variables) {
    if (!Array.isArray(expressions) || !expressions.length) throw new Error('Jacobian requires at least one expression.');
    if (!Array.isArray(variables) || !variables.length) throw new Error('Jacobian requires at least one variable.');
    return expressions.map(function (expr) { return variables.map(function (name) { return differentiate(expr, name); }); });
  }

  function evaluateJacobian(matrix, scope) {
    return matrix.map(function (row) { return row.map(function (expr) { return evaluate(expr, scope); }); });
  }

  function linspace(minimum, maximum, count) {
    const min = Number(minimum), max = Number(maximum), n = Number(count);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) throw new Error('Plot range must have finite max > min.');
    if (!Number.isInteger(n) || n < 2 || n > 5000) throw new Error('Sample count must be an integer from 2 to 5000.');
    return Array.from({ length: n }, function (_, i) { return min + (max - min) * i / (n - 1); });
  }

  function sampleExpression(ast, variable, scope, minimum, maximum, count) {
    const x = linspace(minimum, maximum, count);
    const y = x.map(function (value) {
      try { return evaluate(ast, Object.assign({}, scope || {}, { [variable]: value })); }
      catch (_) { return null; }
    });
    return { x, y };
  }

  function bisect(ast, variable, scope, a, b, tolerance, maxIterations) {
    let left = a, right = b;
    let fLeft = evaluate(ast, Object.assign({}, scope, { [variable]: left }));
    let fRight = evaluate(ast, Object.assign({}, scope, { [variable]: right }));
    if (Math.abs(fLeft) <= tolerance) return left;
    if (Math.abs(fRight) <= tolerance) return right;
    if (fLeft * fRight > 0) throw new Error('Bisection interval does not bracket a sign change.');
    for (let i = 0; i < maxIterations; i += 1) {
      const mid = (left + right) / 2;
      const fMid = evaluate(ast, Object.assign({}, scope, { [variable]: mid }));
      if (Math.abs(fMid) <= tolerance || Math.abs(right - left) <= tolerance) return mid;
      if (fLeft * fMid <= 0) { right = mid; fRight = fMid; }
      else { left = mid; fLeft = fMid; }
    }
    return (left + right) / 2;
  }

  function findRoots1D(ast, variable, scope, minimum, maximum, options) {
    options = options || {};
    const samples = Math.max(10, Math.min(5000, Number(options.samples || 300)));
    const tolerance = Math.max(1e-12, Number(options.tolerance || 1e-8));
    const grid = linspace(minimum, maximum, samples);
    const roots = [];
    function addRoot(value) {
      if (!Number.isFinite(value)) return;
      if (!roots.some(function (existing) { return Math.abs(existing - value) <= Math.max(tolerance * 10, 1e-7); })) roots.push(value);
    }
    let previous = null;
    grid.forEach(function (x) {
      let y;
      try { y = evaluate(ast, Object.assign({}, scope || {}, { [variable]: x })); }
      catch (_) { previous = null; return; }
      if (Math.abs(y) <= tolerance * 10) addRoot(x);
      if (previous && previous.y * y < 0) {
        try { addRoot(bisect(ast, variable, scope || {}, previous.x, x, tolerance, 100)); } catch (_) { /* discontinuity or domain failure */ }
      }
      previous = { x, y };
    });
    return roots.sort(function (a, b) { return a - b; }).map(function (value) {
      return { value, residual: Math.abs(evaluate(ast, Object.assign({}, scope || {}, { [variable]: value }))) };
    });
  }

  function parseScope(text) {
    const scope = {};
    String(text == null ? '' : text).split(/[\n,;]+/).map(function (line) { return line.trim(); }).filter(Boolean).forEach(function (entry) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(entry);
      if (!match) throw new Error('Invalid scope entry: ' + entry + '. Use name=value.');
      const value = Number(match[2]);
      if (!Number.isFinite(value)) throw new Error('Scope value for ' + match[1] + ' must be finite.');
      scope[match[1]] = value;
    });
    return scope;
  }

  function formatJacobianLatex(matrix) {
    return '\\begin{bmatrix}' + matrix.map(function (row) { return row.map(toLatex).join(' & '); }).join(' \\\\ ') + '\\end{bmatrix}';
  }

  function analyze(expressions, variables, selectedIndex, derivativeVariable, scope) {
    const selected = expressions[selectedIndex || 0];
    if (!selected) throw new Error('Selected expression index is out of range.');
    const simplified = expressions.map(simplify);
    const derivative = differentiate(selected, derivativeVariable || variables[0]);
    const J = jacobian(expressions, variables);
    const evaluation = simplified.map(function (expr) { return evaluate(expr, scope || {}); });
    return {
      expressions,
      simplified,
      derivative,
      jacobian: J,
      jacobianNumeric: evaluateJacobian(J, scope || {}),
      evaluation,
      symbols: Array.from(new Set(expressions.flatMap(function (expr) { return collectSymbols(expr); }))).sort(),
      operationCounts: expressions.map(operationCount),
    };
  }

  function generateSympyScript(config) {
    const variables = config.variables || [];
    const parameters = config.parameters || [];
    const expressions = config.expressions || [];
    const scope = config.scope || {};
    const symbolLine = variables.concat(parameters).map(function (name) { return name + " = sp.symbols('" + name + "', real=True)"; }).join('\n');
    const rhs = expressions.map(function (expr, index) { return 'f' + (index + 1) + ' = sp.sympify(' + JSON.stringify(toString(expr)) + ')'; }).join('\n');
    const matrix = '[' + expressions.map(function (_, index) { return 'f' + (index + 1); }).join(', ') + ']';
    const scopeLine = Object.keys(scope).length ? 'numeric_scope = {' + Object.entries(scope).map(function (entry) { return entry[0] + ': ' + formatNumber(entry[1]); }).join(', ') + '}' : 'numeric_scope = {}';
    return [
      '# Generated by Foko Lab v72.48.0 Symbolic Lab',
      '# Browser scope: parser, rule simplification, differentiation, Jacobian and numerical evaluation.',
      '# SymPy is the validation/extension route for exact solving, integration, factorization and general CAS work.',
      'import sympy as sp',
      '',
      symbolLine,
      '',
      rhs,
      'F = sp.Matrix(' + matrix + ')',
      'variables = sp.Matrix([' + variables.join(', ') + '])',
      scopeLine,
      '',
      "print('Simplified expressions:')",
      'for expr in F: sp.pprint(sp.simplify(expr))',
      "print('Jacobian:')",
      'sp.pprint(F.jacobian(variables))',
      "print('Numerical evaluation:')",
      'sp.pprint(F.subs(numeric_scope).evalf())',
      '',
      '# Optional exact or higher-scope operations:',
      '# sp.solve(list(F), list(variables), dict=True)',
      '# sp.factor(F[0])',
      '# sp.integrate(F[0], variables[0])',
      '# sp.dsolve(...)',
      '',
    ].join('\n');
  }

  return Object.freeze({
    FUNCTION_NAMES: Array.from(FUNCTION_NAMES),
    CONSTANTS,
    tokenize,
    parse,
    parseExpressions,
    parseScope,
    clone,
    evaluate,
    simplify,
    differentiate,
    toString,
    latexIdentifier,
    toLatex,
    collectSymbols,
    operationCount,
    jacobian,
    evaluateJacobian,
    formatJacobianLatex,
    linspace,
    sampleExpression,
    findRoots1D,
    analyze,
    generateSympyScript,
  });
}));
