"""Repair native Python exports without changing optimization algorithms.
The generated functions address every decision variable by vector index;
constraint functions never reference bindings local to the objective.
"""
from pathlib import Path
import hashlib

FUNCTION = r'''  function exportPython() {
    compileProblem(); // Validate the exact current draft using the native parser.
    const cfg = configuration();
    const model = cfg.model;
    const names = model.variables.map(v => v.name);
    const functions = {
      sin:'_np.sin', cos:'_np.cos', tan:'_np.tan', asin:'_np.arcsin',
      acos:'_np.arccos', atan:'_np.arctan', atan2:'_np.arctan2',
      exp:'_np.exp', sqrt:'_np.sqrt', abs:'_np.abs', floor:'_np.floor',
      ceil:'_np.ceil', tanh:'_np.tanh', sinh:'_np.sinh', cosh:'_np.cosh',
      min:'min', max:'max', pow:'pow'
    };
    function py(node) {
      if (node.isParenthesisNode) return '(' + py(node.content) + ')';
      if (node.isConstantNode) {
        const value = Number(node.value);
        if (typeof node.value !== 'number' || !Number.isFinite(value)) throw Error('Python export requires finite numeric constants.');
        return String(value);
      }
      if (node.isSymbolNode) {
        const i = names.indexOf(node.name);
        if (i >= 0) return '_v[' + i + ']';
        if (node.name === 'pi') return '_np.pi';
        if (node.name === 'e') return '_np.e';
        throw Error('Unsupported export symbol: ' + node.name);
      }
      if (node.isOperatorNode) {
        const args = node.args.map(py);
        if (args.length === 1 && ['+', '-'].includes(node.op)) return '(' + node.op + args[0] + ')';
        if (args.length === 2 && ['+', '-', '*', '/', '^'].includes(node.op)) return '(' + args[0] + ' ' + (node.op === '^' ? '**' : node.op) + ' ' + args[1] + ')';
        throw Error('Python export does not support operator ' + node.op + '.');
      }
      if (node.isFunctionNode) {
        const name = node.fn.name, args = node.args.map(py);
        if (name === 'log' && args.length === 1) return '_np.log(' + args[0] + ')';
        if (name === 'log' && args.length === 2) return '(_np.log(' + args[0] + ')/_np.log(' + args[1] + '))';
        if (!Object.prototype.hasOwnProperty.call(functions, name)) throw Error('No faithful Python translation for ' + name + '. Export the model JSON instead.');
        if (['min', 'max'].includes(name)) return functions[name] + '([' + args.join(', ') + '])';
        return functions[name] + '(' + args.join(', ') + ')';
      }
      throw Error('Unsupported Python-export syntax: ' + node.type);
    }
    const expression = text => py(root.math.parse(text));
    const objective = expression(model.objective);
    const inequalities = model.inequalities.map(expression);
    const equalities = model.equalities.map(expression);
    const payload = JSON.stringify(JSON.stringify({model, settings:cfg.settings, example:cfg.example}));
    const lines = [
      '"""Independent SciPy solve of the exported FokoLab input configuration.',
      'Not a replay of the browser algorithm or a global-optimality certificate.',
      'Source convention: g(x) <= 0, h(x) == 0. SciPy inequalities use -g(x) >= 0.',
      '"""',
      'import json as _json', 'import numpy as _np', 'from scipy.optimize import minimize as _minimize',
      '_configuration = _json.loads(' + payload + ')',
      'def raw_objective(_v):', '    return ' + objective,
      'def objective(_v):', '    return ' + (model.sense === 'maximize' ? '-' : '') + 'raw_objective(_v)'
    ];
    const constraints = [];
    inequalities.forEach((expr,i) => {
      lines.push('def inequality_' + i + '(_v):', '    return -(' + expr + ')');
      constraints.push("{'type': 'ineq', 'fun': inequality_" + i + '}');
    });
    equalities.forEach((expr,i) => {
      lines.push('def equality_' + i + '(_v):', '    return ' + expr);
      constraints.push("{'type': 'eq', 'fun': equality_" + i + '}');
    });
    const bounds = model.variables.map(v => '(' + v.lower + ', ' + v.upper + ')').join(', ');
    lines.push(
      'x0 = _np.array(' + JSON.stringify(model.variables.map(v=>v.start)) + ', dtype=float)',
      'bounds = [' + bounds + ']',
      'constraints = [' + constraints.join(', ') + ']',
      'def solve():',
      "    return _minimize(objective, x0, method='SLSQP', bounds=bounds, constraints=constraints, options={'ftol': " + cfg.settings.feasibilityTolerance + ", 'maxiter': " + cfg.settings.maxIterations + ", 'disp': False})",
      "if __name__ == '__main__':",
      '    result = solve()',
      "    deficits = [max(0.0, -float(c['fun'](result.x))) if c['type'] == 'ineq' else abs(float(c['fun'](result.x))) for c in constraints]",
      '    deficits += [max(0.0, low-float(value), float(value)-high) for value,(low,high) in zip(result.x,bounds)]',
      '    violation = max(deficits, default=0.0)',
      '    raw = float(raw_objective(result.x))',
      "    print(_json.dumps({'success': bool(result.success), 'message': str(result.message), 'x': result.x.tolist(), 'reported_objective': raw if _np.isfinite(raw) else None, 'max_constraint_violation': violation, 'feasible': bool(_np.isfinite(raw) and violation <= " + cfg.settings.feasibilityTolerance + "), 'configuration': _configuration}, indent=2, allow_nan=False))"
    );
    download('fokolab-optimization-validation.py', lines.join('\n') + '\n', 'text/x-python');
  }

'''

def apply(root):
    root = Path(root)
    reports=[]
    for prefix in ['site', 'docs']:
        p=root/prefix/'src/v72/optimization-workspace.js'
        if not p.exists():continue
        text=p.read_text()
        start=text.index('  function exportPython() {')
        end=text.index('  function exportPlot(',start)
        before=hashlib.sha256(p.read_bytes()).hexdigest()
        text=text[:start]+FUNCTION+text[end:]
        p.write_text(text)
        reports.append({'path':str(p.relative_to(root)),'before':before,'after':hashlib.sha256(p.read_bytes()).hexdigest()})
    return reports

if __name__ == '__main__':
    import json,sys
    print(json.dumps(apply(sys.argv[1] if len(sys.argv)>1 else '.'),indent=2))
