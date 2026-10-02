/* Foko Lab steady-state numerical core.
 * Pure numerical functions only: no DOM, storage, plotting, or network access.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FokoSteadyCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULTS = Object.freeze({
    tolerance: 1e-9,
    maxIterations: 80,
    damping: 1,
    minimumDamping: 2 ** -12,
    finiteDifferenceScale: 1e-6,
    stepTolerance: 1e-12,
  });

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function assertFiniteVector(vector, name) {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new TypeError(`${name} must be a non-empty numeric array.`);
    }
    vector.forEach(function (value, index) {
      if (!isFiniteNumber(value)) throw new TypeError(`${name}[${index}] must be finite.`);
    });
  }

  function norm2(vector) {
    assertFiniteVector(vector, 'vector');
    return Math.hypot.apply(Math, vector);
  }

  function maxAbs(vector) {
    return Math.max.apply(Math, vector.map(Math.abs));
  }

  function evaluateResidual(residual, x) {
    const value = residual(x.slice());
    if (!Array.isArray(value) || value.length !== x.length) {
      throw new Error(`Residual dimension ${Array.isArray(value) ? value.length : 'invalid'} does not match ${x.length} unknowns.`);
    }
    if (value.some(function (entry) { return !isFiniteNumber(entry); })) {
      throw new Error('Residual evaluation produced a non-finite value.');
    }
    return value;
  }

  function finiteDifferenceJacobian(residual, x, options) {
    assertFiniteVector(x, 'x');
    const scale = isFiniteNumber(options && options.scale) && options.scale > 0
      ? options.scale
      : DEFAULTS.finiteDifferenceScale;
    const n = x.length;
    const matrix = Array.from({ length: n }, function () { return Array(n).fill(0); });
    for (let column = 0; column < n; column += 1) {
      const h = Math.max(1e-8, Math.abs(x[column]) * scale, scale);
      const plus = x.slice();
      const minus = x.slice();
      plus[column] += h;
      minus[column] -= h;
      const fPlus = evaluateResidual(residual, plus);
      const fMinus = evaluateResidual(residual, minus);
      for (let row = 0; row < n; row += 1) {
        matrix[row][column] = (fPlus[row] - fMinus[row]) / (2 * h);
      }
    }
    return matrix;
  }

  function solveLinear(matrix, rightHandSide) {
    if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(rightHandSide)) {
      throw new TypeError('Linear system requires a square matrix and right-hand side.');
    }
    const n = matrix.length;
    if (rightHandSide.length !== n || matrix.some(function (row) { return !Array.isArray(row) || row.length !== n; })) {
      throw new Error('Linear system dimensions are inconsistent.');
    }
    const augmented = matrix.map(function (row, index) {
      const values = row.concat(rightHandSide[index]);
      if (values.some(function (value) { return !isFiniteNumber(value); })) {
        throw new Error('Linear system contains a non-finite value.');
      }
      return values;
    });
    let minPivot = Infinity;
    let maxPivot = 0;
    for (let pivotColumn = 0; pivotColumn < n; pivotColumn += 1) {
      let pivotRow = pivotColumn;
      for (let row = pivotColumn + 1; row < n; row += 1) {
        if (Math.abs(augmented[row][pivotColumn]) > Math.abs(augmented[pivotRow][pivotColumn])) pivotRow = row;
      }
      const pivotMagnitude = Math.abs(augmented[pivotRow][pivotColumn]);
      if (pivotMagnitude < 1e-14) {
        const error = new Error('Jacobian is numerically singular near the current iterate.');
        error.code = 'SINGULAR_JACOBIAN';
        throw error;
      }
      minPivot = Math.min(minPivot, pivotMagnitude);
      maxPivot = Math.max(maxPivot, pivotMagnitude);
      if (pivotRow !== pivotColumn) {
        const temporary = augmented[pivotColumn];
        augmented[pivotColumn] = augmented[pivotRow];
        augmented[pivotRow] = temporary;
      }
      for (let row = pivotColumn + 1; row < n; row += 1) {
        const factor = augmented[row][pivotColumn] / augmented[pivotColumn][pivotColumn];
        for (let column = pivotColumn; column <= n; column += 1) {
          augmented[row][column] -= factor * augmented[pivotColumn][column];
        }
      }
    }
    const solution = Array(n).fill(0);
    for (let row = n - 1; row >= 0; row -= 1) {
      let value = augmented[row][n];
      for (let column = row + 1; column < n; column += 1) value -= augmented[row][column] * solution[column];
      solution[row] = value / augmented[row][row];
    }
    return {
      solution,
      pivotRatio: minPivot > 0 ? maxPivot / minPivot : Infinity,
    };
  }

  function normaliseOptions(options) {
    const input = options || {};
    const output = {
      tolerance: input.tolerance == null ? DEFAULTS.tolerance : Number(input.tolerance),
      maxIterations: input.maxIterations == null ? DEFAULTS.maxIterations : Number(input.maxIterations),
      damping: input.damping == null ? DEFAULTS.damping : Number(input.damping),
      minimumDamping: input.minimumDamping == null ? DEFAULTS.minimumDamping : Number(input.minimumDamping),
      finiteDifferenceScale: input.finiteDifferenceScale == null ? DEFAULTS.finiteDifferenceScale : Number(input.finiteDifferenceScale),
      stepTolerance: input.stepTolerance == null ? DEFAULTS.stepTolerance : Number(input.stepTolerance),
    };
    if (!(output.tolerance > 0)) throw new RangeError('tolerance must be positive.');
    if (!(Number.isInteger(output.maxIterations) && output.maxIterations >= 1 && output.maxIterations <= 10000)) {
      throw new RangeError('maxIterations must be an integer between 1 and 10000.');
    }
    if (!(output.damping > 0 && output.damping <= 1)) throw new RangeError('damping must be in (0, 1].');
    if (!(output.minimumDamping > 0 && output.minimumDamping <= output.damping)) {
      throw new RangeError('minimumDamping must be positive and no larger than damping.');
    }
    if (!(output.finiteDifferenceScale > 0)) throw new RangeError('finiteDifferenceScale must be positive.');
    if (!(output.stepTolerance > 0)) throw new RangeError('stepTolerance must be positive.');
    return output;
  }

  function solveNewton(config) {
    if (!config || typeof config.residual !== 'function') throw new TypeError('solveNewton requires a residual function.');
    assertFiniteVector(config.x0, 'x0');
    const settings = normaliseOptions(config);
    const start = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const history = [];
    let x = config.x0.slice();
    let residualVector;
    let residualNorm = Infinity;
    let jacobian = [];
    let pivotRatio = NaN;
    let status = 'failed';
    let terminationReason = 'max_iterations';
    let message = 'Maximum iteration count reached before convergence.';

    for (let iteration = 0; iteration <= settings.maxIterations; iteration += 1) {
      try {
        residualVector = evaluateResidual(config.residual, x);
      } catch (error) {
        terminationReason = 'invalid_residual';
        message = error.message;
        break;
      }
      residualNorm = norm2(residualVector);
      if (residualNorm <= settings.tolerance) {
        status = 'converged';
        terminationReason = 'residual_tolerance';
        message = 'Residual norm reached the requested tolerance.';
        history.push({ iteration, residualNorm, stepNorm: 0, damping: 0 });
        break;
      }
      if (iteration === settings.maxIterations) break;

      try {
        jacobian = finiteDifferenceJacobian(config.residual, x, { scale: settings.finiteDifferenceScale });
        const linear = solveLinear(jacobian, residualVector.map(function (value) { return -value; }));
        pivotRatio = linear.pivotRatio;
        const fullStep = linear.solution;
        const fullStepNorm = norm2(fullStep);
        if (fullStepNorm <= settings.stepTolerance * Math.max(1, maxAbs(x))) {
          terminationReason = 'step_stagnation';
          message = 'Newton step became too small while the residual remained above tolerance.';
          history.push({ iteration, residualNorm, stepNorm: fullStepNorm, damping: 0 });
          break;
        }

        let alpha = settings.damping;
        let accepted = false;
        let acceptedX = x;
        let acceptedNorm = residualNorm;
        while (alpha >= settings.minimumDamping) {
          const candidate = x.map(function (value, index) { return value + alpha * fullStep[index]; });
          try {
            const candidateResidual = evaluateResidual(config.residual, candidate);
            const candidateNorm = norm2(candidateResidual);
            if (candidateNorm < residualNorm) {
              accepted = true;
              acceptedX = candidate;
              acceptedNorm = candidateNorm;
              break;
            }
          } catch (_) {
            // Reduce the line-search step after an invalid candidate evaluation.
          }
          alpha *= 0.5;
        }
        history.push({ iteration, residualNorm, stepNorm: fullStepNorm, damping: accepted ? alpha : 0 });
        if (!accepted) {
          terminationReason = 'line_search_failed';
          message = 'Backtracking could not find a residual-decreasing Newton step.';
          break;
        }
        x = acceptedX;
        residualNorm = acceptedNorm;
      } catch (error) {
        terminationReason = error.code === 'SINGULAR_JACOBIAN' ? 'singular_jacobian' : 'linear_solve_failed';
        message = error.message;
        break;
      }
    }

    try {
      residualVector = evaluateResidual(config.residual, x);
      residualNorm = norm2(residualVector);
      jacobian = finiteDifferenceJacobian(config.residual, x, { scale: settings.finiteDifferenceScale });
    } catch (_) {
      residualVector = Array(x.length).fill(NaN);
      residualNorm = Infinity;
      jacobian = [];
    }
    if (residualNorm <= settings.tolerance && status !== 'converged') {
      status = 'converged';
      terminationReason = 'residual_tolerance';
      message = 'Residual norm reached the requested tolerance.';
    }
    const end = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    return {
      status,
      converged: status === 'converged',
      terminationReason,
      message,
      x,
      residual: residualVector,
      residualNorm,
      iterations: history.length ? history[history.length - 1].iteration : 0,
      history,
      jacobian,
      pivotRatio,
      runtimeMs: Math.max(0, end - start),
      settings,
    };
  }

  function determinant2(matrix) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }

  function classifyDynamicStability(jacobian, tolerance) {
    const eps = tolerance == null ? 1e-10 : Math.abs(Number(tolerance));
    if (!Array.isArray(jacobian) || jacobian.length === 0) {
      return { status: 'not-computed', label: 'not computed', reason: 'No Jacobian is available.' };
    }
    const n = jacobian.length;
    if (jacobian.some(function (row) { return !Array.isArray(row) || row.length !== n; })) {
      throw new Error('Jacobian must be square.');
    }
    if (n === 1) {
      const eigenvalue = jacobian[0][0];
      const label = eigenvalue < -eps ? 'stable' : eigenvalue > eps ? 'unstable' : 'marginal/undetermined';
      return {
        status: 'computed',
        label,
        eigenvalues: [{ real: eigenvalue, imag: 0 }],
        maxRealPart: eigenvalue,
        trace: eigenvalue,
        determinant: eigenvalue,
        reason: 'Exact scalar Jacobian eigenvalue.',
      };
    }
    if (n === 2) {
      const trace = jacobian[0][0] + jacobian[1][1];
      const determinant = determinant2(jacobian);
      const discriminant = trace * trace - 4 * determinant;
      let eigenvalues;
      if (discriminant >= 0) {
        const root = Math.sqrt(discriminant);
        eigenvalues = [
          { real: (trace + root) / 2, imag: 0 },
          { real: (trace - root) / 2, imag: 0 },
        ];
      } else {
        const imaginary = Math.sqrt(-discriminant) / 2;
        eigenvalues = [
          { real: trace / 2, imag: imaginary },
          { real: trace / 2, imag: -imaginary },
        ];
      }
      const maxRealPart = Math.max.apply(Math, eigenvalues.map(function (entry) { return entry.real; }));
      const minRealPart = Math.min.apply(Math, eigenvalues.map(function (entry) { return entry.real; }));
      const label = maxRealPart < -eps
        ? 'stable'
        : minRealPart > eps || maxRealPart > eps
          ? 'unstable'
          : 'marginal/undetermined';
      return {
        status: 'computed',
        label,
        eigenvalues,
        maxRealPart,
        trace,
        determinant,
        discriminant,
        reason: 'Exact analytic eigenspectrum for a 2×2 Jacobian.',
      };
    }
    return {
      status: 'not-computed',
      label: 'not computed',
      reason: 'The browser core does not claim a general non-symmetric eigenspectrum for systems larger than 2×2. Export to Python for validated stability analysis.',
      dimension: n,
    };
  }

  function distance(a, b) {
    return norm2(a.map(function (value, index) { return value - b[index]; }));
  }

  function uniqueConvergedSolutions(results, tolerance) {
    const eps = tolerance == null ? 1e-6 : Math.abs(Number(tolerance));
    const unique = [];
    results.forEach(function (result) {
      if (!result || !result.converged || !result.x.every(isFiniteNumber)) return;
      if (!unique.some(function (other) { return distance(result.x, other.x) <= eps * Math.max(1, norm2(result.x)); })) {
        unique.push(result);
      }
    });
    return unique;
  }

  function deterministicStarts(x0, scale) {
    assertFiniteVector(x0, 'x0');
    const amplitude = isFiniteNumber(scale) && scale > 0 ? scale : 1;
    const starts = [x0.slice()];
    for (let index = 0; index < x0.length; index += 1) {
      const delta = amplitude * Math.max(1, Math.abs(x0[index]));
      const plus = x0.slice();
      const minus = x0.slice();
      plus[index] += delta;
      minus[index] -= delta;
      starts.push(plus, minus);
    }
    const allPlus = x0.map(function (value) { return value + amplitude * Math.max(1, Math.abs(value)); });
    const allMinus = x0.map(function (value) { return value - amplitude * Math.max(1, Math.abs(value)); });
    starts.push(allPlus, allMinus);
    return starts;
  }

  function solveMultiStart(config) {
    if (!config || typeof config.residual !== 'function') throw new TypeError('solveMultiStart requires a residual function.');
    const starts = Array.isArray(config.starts) && config.starts.length
      ? config.starts
      : deterministicStarts(config.x0, config.startScale);
    const results = starts.map(function (start) {
      return solveNewton(Object.assign({}, config, { x0: start }));
    });
    return {
      starts: starts.map(function (start) { return start.slice(); }),
      results,
      uniqueSolutions: uniqueConvergedSolutions(results, config.rootTolerance),
    };
  }

  function classifyScanCandidates(rows, variableNames) {
    if (!Array.isArray(rows)) return [];
    const names = Array.isArray(variableNames) ? variableNames : [];
    return rows.map(function (row, index) {
      const candidates = [];
      const previous = rows[index - 1];
      if (previous && row.stability && previous.stability && row.stability.status === 'computed' && previous.stability.status === 'computed') {
        const a = previous.stability.maxRealPart;
        const b = row.stability.maxRealPart;
        if (isFiniteNumber(a) && isFiniteNumber(b) && a * b < 0) {
          candidates.push({ type: 'stability-crossing', confirmed: false, note: 'Sign change in the largest real eigenvalue between sampled parameter points.' });
        }
      }
      if (index > 1 && names.length) {
        names.forEach(function (name) {
          const a = rows[index - 2] && rows[index - 2].values && rows[index - 2].values[name];
          const b = previous && previous.values && previous.values[name];
          const c = row.values && row.values[name];
          const p0 = rows[index - 2] && rows[index - 2].parameter;
          const p1 = previous && previous.parameter;
          const p2 = row.parameter;
          if ([a, b, c, p0, p1, p2].every(isFiniteNumber) && p1 !== p0 && p2 !== p1) {
            const slope1 = (b - a) / (p1 - p0);
            const slope2 = (c - b) / (p2 - p1);
            if (slope1 * slope2 < 0) {
              candidates.push({ type: 'turning-point-grid-heuristic', variable: name, confirmed: false, note: 'Slope reversal on the sampled branch; not a pseudo-arclength fold calculation.' });
            }
          }
        });
      }
      return Object.assign({}, row, { candidates });
    });
  }

  function scanParameter(config) {
    if (!config || typeof config.residualForParameter !== 'function') {
      throw new TypeError('scanParameter requires residualForParameter(parameter).');
    }
    if (!Array.isArray(config.values) || config.values.length < 2 || config.values.some(function (value) { return !isFiniteNumber(value); })) {
      throw new TypeError('scanParameter values must contain at least two finite numbers.');
    }
    assertFiniteVector(config.x0, 'x0');
    let guess = config.x0.slice();
    const rows = [];
    config.values.forEach(function (parameter, index) {
      const residual = config.residualForParameter(parameter);
      const solution = solveNewton(Object.assign({}, config, { residual, x0: guess }));
      if (solution.converged) guess = solution.x.slice();
      const stability = config.dynamicInterpretation && solution.jacobian.length
        ? classifyDynamicStability(solution.jacobian)
        : { status: 'not-applicable', label: 'not applicable', reason: 'Dynamical interpretation is disabled.' };
      const values = {};
      (config.variableNames || []).forEach(function (name, variableIndex) { values[name] = solution.x[variableIndex]; });
      rows.push({
        index,
        parameter,
        values,
        converged: solution.converged,
        residualNorm: solution.residualNorm,
        iterations: solution.iterations,
        terminationReason: solution.terminationReason,
        stability,
        solution,
      });
      if (typeof config.onProgress === 'function') config.onProgress((index + 1) / config.values.length);
    });
    return classifyScanCandidates(rows, config.variableNames || []);
  }

  function linspace(minimum, maximum, count) {
    const start = Number(minimum);
    const end = Number(maximum);
    const n = Number(count);
    if (!isFiniteNumber(start) || !isFiniteNumber(end) || !(Number.isInteger(n) && n >= 2)) {
      throw new TypeError('linspace requires finite endpoints and an integer count of at least 2.');
    }
    return Array.from({ length: n }, function (_, index) {
      return start + (end - start) * index / (n - 1);
    });
  }

  return Object.freeze({
    DEFAULTS,
    norm2,
    finiteDifferenceJacobian,
    solveLinear,
    solveNewton,
    classifyDynamicStability,
    deterministicStarts,
    uniqueConvergedSolutions,
    solveMultiStart,
    classifyScanCandidates,
    scanParameter,
    linspace,
  });
}));
