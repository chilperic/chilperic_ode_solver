/* Foko Lab v72.5 curve-fitting numerical core.
 * Pure numerical functions: no DOM, storage, or plotting dependencies.
 */
(function (root) {
  'use strict';

  const FokoKit = root.FokoKit || (typeof require === 'function' ? require('../fokokit.js') : null);

  function mean(values) {
    return values.reduce(function (sum, value) { return sum + value; }, 0) / (values.length || 1);
  }

  function variance(values) {
    if (values.length < 2) return NaN;
    const center = mean(values);
    return values.reduce(function (sum, value) { return sum + (value - center) ** 2; }, 0) / (values.length - 1);
  }

  function sd(values) {
    return Math.sqrt(variance(values));
  }

  function quantile(values, probability) {
    const sorted = values.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; });
    if (!sorted.length) return NaN;
    const position = (sorted.length - 1) * probability;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const fraction = position - lower;
    return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
  }

  function normalInv(probability) {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28073155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const low = 0.02425;
    const high = 1 - low;
    let q;
    let r;
    if (probability <= 0) return -Infinity;
    if (probability >= 1) return Infinity;
    if (probability < low) {
      q = Math.sqrt(-2 * Math.log(probability));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (probability <= high) {
      q = probability - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  function requireSameLength(left, right, name) {
    if (FokoKit && typeof FokoKit.requireSameLength === 'function') return FokoKit.requireSameLength(left, right, name);
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      throw new Error(`${name}: arrays must have the same length.`);
    }
    return [left, right];
  }

  function requirePairs(pairs, name) {
    if (!Array.isArray(pairs) || !pairs.length || !pairs.every(function (pair) {
      return Array.isArray(pair) && pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]);
    })) {
      throw new Error(`${name}: expected a non-empty list of finite [x, y] pairs.`);
    }
  }

  function parsePairs(text) {
    return String(text || '')
      .trim()
      .split(/\r?\n+/)
      .map(function (row) { return row.trim().split(/[\s,;]+/).map(Number); })
      .filter(function (row) { return row.length >= 2 && Number.isFinite(row[0]) && Number.isFinite(row[1]); })
      .map(function (row) { return [row[0], row[1]]; });
  }

  function transpose(matrix) {
    if (!matrix.length) return [];
    return matrix[0].map(function (_, column) { return matrix.map(function (row) { return row[column]; }); });
  }

  function dot(left, right) {
    return left.reduce(function (sum, value, index) { return sum + value * (right[index] || 0); }, 0);
  }

  function matmul(left, right) {
    const rightTranspose = transpose(right);
    return left.map(function (row) {
      return rightTranspose.map(function (column) { return dot(row, column); });
    });
  }

  function matvec(matrix, vector) {
    return matrix.map(function (row) { return dot(row, vector); });
  }

  function solve(matrix, vector) {
    const size = matrix.length;
    if (!size || vector.length !== size || matrix.some(function (row) { return row.length !== size; })) {
      throw new Error('solve: expected a square matrix and matching vector.');
    }
    const augmented = matrix.map(function (row, index) { return row.slice().concat([vector[index]]); });
    for (let column = 0; column < size; column += 1) {
      let pivotRow = column;
      for (let row = column + 1; row < size; row += 1) {
        if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) pivotRow = row;
      }
      if (Math.abs(augmented[pivotRow][column]) < 1e-14) throw new Error('Linear system is singular or numerically rank deficient.');
      [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
      const pivot = augmented[column][column];
      for (let j = column; j <= size; j += 1) augmented[column][j] /= pivot;
      for (let row = 0; row < size; row += 1) {
        if (row === column) continue;
        const factor = augmented[row][column];
        for (let j = column; j <= size; j += 1) augmented[row][j] -= factor * augmented[column][j];
      }
    }
    return augmented.map(function (row) { return row[size]; });
  }

  function inverse(matrix) {
    const size = matrix.length;
    const columns = Array.from({ length: size }, function (_, index) {
      return solve(matrix, Array.from({ length: size }, function (__, row) { return row === index ? 1 : 0; }));
    });
    return Array.from({ length: size }, function (_, row) { return columns.map(function (column) { return column[row]; }); });
  }

  function modelInfo(model) {
    const key = model === 'michaelis-menten' ? 'michaelis' : model;
    const models = {
      linear: {
        id: 'linear', names: ['intercept', 'slope'], equation: 'y = b0 + b1 x', linear: true,
        predict: function (x, p) { return p[0] + p[1] * x; },
      },
      quadratic: {
        id: 'quadratic', names: ['intercept', 'x', 'x^2'], equation: 'y = b0 + b1 x + b2 x²', linear: true,
        predict: function (x, p) { return p[0] + p[1] * x + p[2] * x * x; },
      },
      cubic: {
        id: 'cubic', names: ['intercept', 'x', 'x^2', 'x^3'], equation: 'y = b0 + b1 x + b2 x² + b3 x³', linear: true,
        predict: function (x, p) { return p[0] + p[1] * x + p[2] * x * x + p[3] * x * x * x; },
      },
      exponential: {
        id: 'exponential', names: ['a', 'b'], equation: 'y = a exp(bx)', linear: false,
        predict: function (x, p) { return p[0] * Math.exp(p[1] * x); },
      },
      logistic: {
        id: 'logistic', names: ['K', 'r', 'x0'], equation: 'y = K / (1 + exp(-r(x-x0)))', linear: false,
        predict: function (x, p) { return p[0] / (1 + Math.exp(-p[1] * (x - p[2]))); },
      },
      michaelis: {
        id: 'michaelis', names: ['Vmax', 'Km'], equation: 'y = Vmax x / (Km + x)', linear: false,
        predict: function (x, p) { return p[0] * x / (p[1] + x); },
      },
    };
    if (!models[key]) throw new Error(`Unknown fitting model: ${model}.`);
    return models[key];
  }

  function predictModel(model, x, parameters) {
    return modelInfo(model).predict(x, parameters);
  }

  function design(x, degree) {
    return x.map(function (value) {
      return Array.from({ length: degree + 1 }, function (_, power) { return value ** power; });
    });
  }

  function normaliseWeights(length, options) {
    const opts = options || {};
    if (opts.sigmas != null) {
      if (!Array.isArray(opts.sigmas) || opts.sigmas.length !== length) throw new Error('Sigma values must match the number of observations.');
      const sigmas = opts.sigmas.map(Number);
      if (!sigmas.every(function (value) { return Number.isFinite(value) && value > 0; })) throw new Error('Every sigma value must be finite and strictly positive.');
      return {
        weights: sigmas.map(function (value) { return 1 / (value * value); }),
        sigmas,
        mode: 'known-sigma',
        absoluteSigma: true,
      };
    }
    if (opts.weights != null) {
      if (!Array.isArray(opts.weights) || opts.weights.length !== length) throw new Error('Weights must match the number of observations.');
      const weights = opts.weights.map(Number);
      if (!weights.every(function (value) { return Number.isFinite(value) && value > 0; })) throw new Error('Every weight must be finite and strictly positive.');
      return { weights, sigmas: null, mode: 'relative-weight', absoluteSigma: false };
    }
    return { weights: Array.from({ length }, function () { return 1; }), sigmas: null, mode: 'ordinary', absoluteSigma: false };
  }

  function weightedNormalMatrix(jacobian, weights) {
    const weighted = jacobian.map(function (row, index) {
      const scale = Math.sqrt(weights[index]);
      return row.map(function (value) { return value * scale; });
    });
    return matmul(transpose(weighted), weighted);
  }

  function weightedRightHand(jacobian, residuals, weights) {
    return transpose(jacobian).map(function (column) {
      return column.reduce(function (sum, value, index) { return sum + value * weights[index] * residuals[index]; }, 0);
    });
  }

  function conditionIndicator(matrix) {
    const diagonal = matrix.map(function (row, index) { return Math.abs(row[index]); }).filter(function (value) { return value > 1e-18; });
    if (!diagonal.length) return Infinity;
    return Math.max.apply(null, diagonal) / Math.min.apply(null, diagonal);
  }

  function polynomialDegree(model) {
    if (model === 'linear') return 1;
    if (model === 'quadratic') return 2;
    if (model === 'cubic') return 3;
    return null;
  }

  function weightedPolynomialFit(x, y, degree, weights) {
    requireSameLength(x, y, 'polyFit');
    if (x.length <= degree) throw new Error('polyFit: need more points than the polynomial degree.');
    const X = design(x, degree);
    const normal = weightedNormalMatrix(X, weights);
    const rhs = weightedRightHand(X, y, weights);
    const coef = solve(normal, rhs);
    return {
      coef,
      jacobian: X,
      pred: x.map(function (value) {
        return coef.reduce(function (sum, coefficient, power) { return sum + coefficient * value ** power; }, 0);
      }),
      normalMatrix: normal,
      converged: true,
      terminationReason: 'closed-form weighted normal equations solved',
      iterations: 1,
      acceptedSteps: 1,
      rejectedSteps: 0,
      evaluations: x.length,
    };
  }

  function initialParams(model, x, y) {
    const info = modelInfo(model);
    if (info.linear) return weightedPolynomialFit(x, y, info.names.length - 1, Array.from({ length: x.length }, function () { return 1; })).coef;
    if (info.id === 'exponential') {
      const positive = x.map(function (value, index) { return [value, y[index]]; }).filter(function (pair) { return pair[1] > 0; });
      if (positive.length >= 2) {
        const linear = weightedPolynomialFit(
          positive.map(function (pair) { return pair[0]; }),
          positive.map(function (pair) { return Math.log(pair[1]); }),
          1,
          Array.from({ length: positive.length }, function () { return 1; })
        ).coef;
        return [Math.exp(linear[0]), linear[1]];
      }
      return [Math.max(1e-6, mean(y)), 0.1];
    }
    if (info.id === 'logistic') {
      const sortedX = x.slice().sort(function (a, b) { return a - b; });
      const range = Math.max(1e-9, sortedX[sortedX.length - 1] - sortedX[0]);
      const trend = y[y.length - 1] >= y[0] ? 1 : -1;
      return [Math.max(1e-6, Math.max.apply(null, y) * 1.05), trend * 4 / range, sortedX[Math.floor(sortedX.length / 2)]];
    }
    if (info.id === 'michaelis') {
      const positiveX = x.filter(function (value) { return value > 0; }).sort(function (a, b) { return a - b; });
      return [Math.max(1e-6, Math.max.apply(null, y) * 1.1), positiveX[Math.floor(positiveX.length / 2)] || Math.max(1e-6, mean(x))];
    }
    throw new Error(`No initialisation is defined for ${model}.`);
  }

  function applyParameterDomain(model, parameters) {
    const next = parameters.slice();
    if (model === 'exponential') next[0] = Math.max(1e-12, next[0]);
    if (model === 'logistic') next[0] = Math.max(1e-12, next[0]);
    if (model === 'michaelis' || model === 'michaelis-menten') {
      next[0] = Math.max(1e-12, next[0]);
      next[1] = Math.max(1e-12, next[1]);
    }
    return next;
  }

  function numericJacobian(model, x, parameters) {
    const info = modelInfo(model);
    return x.map(function (value) {
      return parameters.map(function (parameter, index) {
        const step = 1e-6 * (Math.abs(parameter) + 1);
        const plus = parameters.slice();
        const minus = parameters.slice();
        plus[index] += step;
        minus[index] -= step;
        const numerator = info.predict(value, applyParameterDomain(info.id, plus)) - info.predict(value, applyParameterDomain(info.id, minus));
        return numerator / (2 * step);
      });
    });
  }

  function weightedSSE(model, x, y, parameters, weights) {
    return x.reduce(function (sum, value, index) {
      const residual = y[index] - predictModel(model, value, parameters);
      return sum + weights[index] * residual * residual;
    }, 0);
  }

  function lmOptimize(model, x, y, start, options) {
    const opts = Object.assign({ maxIterations: 250, ftol: 1e-10, xtol: 1e-9, lambda: 1e-3 }, options || {});
    const weights = opts.weights || Array.from({ length: x.length }, function () { return 1; });
    let parameters = applyParameterDomain(model, start.map(Number));
    if (!parameters.every(Number.isFinite)) throw new Error('Initial parameter guesses must be finite.');
    let lambda = opts.lambda;
    let objective = weightedSSE(model, x, y, parameters, weights);
    let evaluations = x.length;
    let acceptedSteps = 0;
    let rejectedSteps = 0;
    let converged = false;
    let terminationReason = 'maximum iterations reached';
    let iterations = 0;
    let lastNormal = null;
    const history = [{ iteration: 0, objective, lambda, accepted: true }];

    for (let iteration = 1; iteration <= opts.maxIterations; iteration += 1) {
      iterations = iteration;
      const prediction = x.map(function (value) { return predictModel(model, value, parameters); });
      evaluations += x.length;
      const residuals = y.map(function (value, index) { return value - prediction[index]; });
      const jacobian = numericJacobian(model, x, parameters);
      evaluations += x.length * parameters.length * 2;
      const normal = weightedNormalMatrix(jacobian, weights);
      const rhs = weightedRightHand(jacobian, residuals, weights);
      lastNormal = normal;
      const damped = normal.map(function (row, rowIndex) {
        return row.map(function (value, columnIndex) {
          if (rowIndex !== columnIndex) return value;
          return value + lambda * Math.max(1, Math.abs(normal[rowIndex][rowIndex]));
        });
      });
      let delta;
      try {
        delta = solve(damped, rhs);
      } catch (error) {
        lambda *= 10;
        rejectedSteps += 1;
        history.push({ iteration, objective, lambda, accepted: false, reason: 'singular damped system' });
        if (lambda > 1e16) {
          terminationReason = 'normal equations remained singular under damping';
          break;
        }
        continue;
      }
      const stepNorm = Math.sqrt(dot(delta, delta));
      const parameterNorm = Math.sqrt(dot(parameters, parameters));
      if (stepNorm <= opts.xtol * (parameterNorm + opts.xtol)) {
        converged = true;
        terminationReason = 'parameter-step tolerance reached';
        break;
      }
      const trial = applyParameterDomain(model, parameters.map(function (value, index) { return value + delta[index]; }));
      const trialObjective = weightedSSE(model, x, y, trial, weights);
      evaluations += x.length;
      if (Number.isFinite(trialObjective) && trialObjective < objective) {
        const improvement = objective - trialObjective;
        parameters = trial;
        objective = trialObjective;
        lambda = Math.max(1e-12, lambda / 3);
        acceptedSteps += 1;
        history.push({ iteration, objective, lambda, accepted: true });
        if (improvement <= opts.ftol * (1 + objective)) {
          converged = true;
          terminationReason = 'objective-improvement tolerance reached';
          break;
        }
      } else {
        lambda = Math.min(1e18, lambda * 5);
        rejectedSteps += 1;
        history.push({ iteration, objective, lambda, accepted: false });
        if (lambda >= 1e18) {
          terminationReason = 'damping overflow after rejected steps';
          break;
        }
      }
    }

    return {
      coef: parameters,
      pred: x.map(function (value) { return predictModel(model, value, parameters); }),
      jacobian: numericJacobian(model, x, parameters),
      normalMatrix: lastNormal || weightedNormalMatrix(numericJacobian(model, x, parameters), weights),
      converged,
      terminationReason,
      iterations,
      acceptedSteps,
      rejectedSteps,
      evaluations,
      objective,
      history,
    };
  }

  function covarianceFromJacobian(jacobian, weightsOrSigma2, scaleMaybe) {
    try {
      let weights;
      let scale;
      if (Array.isArray(weightsOrSigma2)) {
        weights = weightsOrSigma2;
        scale = Number.isFinite(scaleMaybe) ? scaleMaybe : 1;
      } else {
        weights = Array.from({ length: jacobian.length }, function () { return 1; });
        scale = Number.isFinite(weightsOrSigma2) ? weightsOrSigma2 : 1;
      }
      const information = weightedNormalMatrix(jacobian, weights);
      return inverse(information).map(function (row) { return row.map(function (value) { return value * scale; }); });
    } catch (error) {
      return null;
    }
  }

  function parameterSummary(names, coef, covariance, alpha) {
    const critical = normalInv(1 - (alpha || 0.05) / 2);
    return coef.map(function (value, index) {
      const standardError = covariance && covariance[index] ? Math.sqrt(Math.max(0, covariance[index][index])) : NaN;
      return {
        name: names[index] || `p${index}`,
        value,
        se: standardError,
        z: Number.isFinite(standardError) && standardError > 0 ? value / standardError : NaN,
        ci: Number.isFinite(standardError) ? [value - critical * standardError, value + critical * standardError] : [NaN, NaN],
        ci95: Number.isFinite(standardError) ? [value - 1.959963984540054 * standardError, value + 1.959963984540054 * standardError] : [NaN, NaN],
      };
    });
  }

  function influenceDiagnostics(jacobian, residuals, parameterCount, residualVariance, weights, sigmas) {
    const sqrtWeighted = jacobian.map(function (row, index) {
      const scale = Math.sqrt(weights[index]);
      return row.map(function (value) { return value * scale; });
    });
    let informationInverse;
    try {
      informationInverse = inverse(matmul(transpose(sqrtWeighted), sqrtWeighted));
    } catch (error) {
      informationInverse = null;
    }
    const leverage = jacobian.map(function (row, index) {
      if (!informationInverse) return NaN;
      const weightedRow = row.map(function (value) { return value * Math.sqrt(weights[index]); });
      return Math.max(0, Math.min(0.999999, dot(weightedRow, matvec(informationInverse, weightedRow))));
    });
    const scale = Math.max(1e-15, residualVariance);
    const standardizedResiduals = residuals.map(function (residual, index) {
      const observationScale = sigmas && Number.isFinite(sigmas[index]) ? sigmas[index] : Math.sqrt(scale);
      const denominator = observationScale * Math.sqrt(Math.max(1e-12, 1 - (leverage[index] || 0)));
      return residual / denominator;
    });
    const cooksDistance = standardizedResiduals.map(function (standardized, index) {
      const h = leverage[index] || 0;
      return standardized * standardized * h / Math.max(1e-12, parameterCount * (1 - h));
    });
    return { leverage, standardizedResiduals, cooksDistance };
  }

  function predictionBands(model, x, coef, covariance, residualVariance, alpha, predictionAvailable) {
    const sorted = x.slice().sort(function (a, b) { return a - b; });
    const minimum = sorted[0];
    const maximum = sorted[sorted.length - 1];
    const critical = normalInv(1 - (alpha || 0.05) / 2);
    const count = 120;
    return Array.from({ length: count }, function (_, index) {
      const value = minimum === maximum ? minimum : minimum + (maximum - minimum) * index / (count - 1);
      const fit = predictModel(model, value, coef);
      const gradient = numericJacobian(model, [value], coef)[0];
      let meanVariance = NaN;
      if (covariance) meanVariance = Math.max(0, dot(gradient, matvec(covariance, gradient)));
      const meanSe = Number.isFinite(meanVariance) ? Math.sqrt(meanVariance) : NaN;
      const predictionSe = predictionAvailable && Number.isFinite(meanVariance)
        ? Math.sqrt(meanVariance + Math.max(0, residualVariance))
        : NaN;
      return {
        x: value,
        fit,
        meanLo: fit - critical * meanSe,
        meanHi: fit + critical * meanSe,
        predLo: Number.isFinite(predictionSe) ? fit - critical * predictionSe : NaN,
        predHi: Number.isFinite(predictionSe) ? fit + critical * predictionSe : NaN,
      };
    });
  }

  function confidenceEllipse(coef, covariance, names, alpha) {
    if (!covariance || coef.length < 2) return null;
    const a = covariance[0][0];
    const b = covariance[0][1];
    const d = covariance[1][1];
    if (![a, b, d].every(Number.isFinite)) return null;
    const trace = a + d;
    const determinant = a * d - b * b;
    const discriminant = Math.sqrt(Math.max(0, trace * trace / 4 - determinant));
    const eigen1 = Math.max(0, trace / 2 + discriminant);
    const eigen2 = Math.max(0, trace / 2 - discriminant);
    const angle = 0.5 * Math.atan2(2 * b, a - d);
    const probability = 1 - (alpha || 0.05);
    const chiSquare2 = -2 * Math.log(Math.max(1e-12, 1 - probability));
    const scale = Math.sqrt(chiSquare2);
    const points = Array.from({ length: 121 }, function (_, index) {
      const theta = 2 * Math.PI * index / 120;
      const localX = scale * Math.sqrt(eigen1) * Math.cos(theta);
      const localY = scale * Math.sqrt(eigen2) * Math.sin(theta);
      return {
        x: coef[0] + localX * Math.cos(angle) - localY * Math.sin(angle),
        y: coef[1] + localX * Math.sin(angle) + localY * Math.cos(angle),
      };
    });
    return { xName: names[0], yName: names[1], points, level: probability };
  }

  function sensitivityCoefficients(model, x, coef) {
    const jacobian = numericJacobian(model, x, coef);
    return modelInfo(model).names.map(function (name, parameterIndex) {
      return { name, x: x.slice(), values: jacobian.map(function (row) { return row[parameterIndex]; }) };
    });
  }


  function parameterCorrelationMatrix(covariance, names) {
    if (!covariance) return { names: names.slice(), matrix: [], pairs: [] };
    const matrix = covariance.map(function (row, i) {
      return row.map(function (value, j) {
        const denominator = Math.sqrt(Math.max(0, covariance[i][i]) * Math.max(0, covariance[j][j]));
        return denominator > 0 && Number.isFinite(value) ? Math.max(-1, Math.min(1, value / denominator)) : NaN;
      });
    });
    const pairs = [];
    for (let i = 0; i < matrix.length; i += 1) {
      for (let j = i + 1; j < matrix.length; j += 1) {
        if (Number.isFinite(matrix[i][j])) pairs.push({ left: names[i], right: names[j], correlation: matrix[i][j], absolute: Math.abs(matrix[i][j]) });
      }
    }
    pairs.sort(function (a, b) { return b.absolute - a.absolute; });
    return { names: names.slice(), matrix, pairs };
  }

  function profileIdentifiability(profileLikelihood, coef, residualVariance, absoluteSigma) {
    if (!Array.isArray(profileLikelihood) || !profileLikelihood.length) return [];
    const delta95 = absoluteSigma ? 3.841458820694124 : Math.max(1e-12, 3.841458820694124 * Math.max(1e-12, residualVariance));
    return profileLikelihood.map(function (profile, parameterIndex) {
      const values = profile.values || [];
      const minimum = values.length ? Math.min.apply(null, values.map(function (point) { return point.sse; })) : NaN;
      const estimate = coef[parameterIndex];
      const left = values.filter(function (point) { return point.value < estimate; });
      const right = values.filter(function (point) { return point.value > estimate; });
      const leftCrosses = left.some(function (point) { return point.sse - minimum >= delta95; });
      const rightCrosses = right.some(function (point) { return point.sse - minimum >= delta95; });
      const rise = values.length ? Math.max.apply(null, values.map(function (point) { return point.sse - minimum; })) : NaN;
      return {
        name: profile.name,
        estimate,
        delta95,
        leftCrosses,
        rightCrosses,
        boundedBothSides: leftCrosses && rightCrosses,
        maximumObservedRise: rise,
        verdict: leftCrosses && rightCrosses ? 'locally bounded in the finite profile scan' : 'practical non-identifiability likely in the finite profile scan',
        limitation: 'This is a finite local profile-SSE diagnostic. It is not a structural-identifiability certificate or a global profile likelihood.'
      };
    });
  }

  function experimentalDesignAdvice(model, x, coef, covariance) {
    if (!covariance || !x.length) return { available: false, candidates: [], sentence: 'Local experimental-design advice is unavailable because the covariance estimate is unavailable.', limitation: 'No design guarantee is provided.' };
    const minimum = Math.min.apply(null, x);
    const maximum = Math.max.apply(null, x);
    const span = Math.max(1e-9, maximum - minimum || Math.max(1, Math.abs(maximum)));
    const lower = model === 'michaelis' || model === 'michaelis-menten' ? Math.max(0, minimum - 0.25 * span) : minimum - 0.5 * span;
    const upper = maximum + (model === 'michaelis' || model === 'michaelis-menten' ? 2 * span : span);
    const candidates = Array.from({ length: 121 }, function (_, index) {
      const value = lower + (upper - lower) * index / 120;
      const gradient = numericJacobian(model, [value], coef)[0];
      const score = Math.max(0, dot(gradient, matvec(covariance, gradient)));
      return { x: value, score };
    }).filter(function (item) { return Number.isFinite(item.score); }).sort(function (a, b) { return b.score - a.score; });
    const chosen = [];
    for (const candidate of candidates) {
      if (chosen.every(function (existing) { return Math.abs(existing.x - candidate.x) >= 0.12 * span; })) chosen.push(candidate);
      if (chosen.length === 3) break;
    }
    const text = chosen.map(function (item) { return Number(item.x.toPrecision(5)); }).join(', ');
    return {
      available: chosen.length > 0,
      candidates: chosen,
      sentence: chosen.length ? `Under the fitted local covariance geometry, new measurements near x = ${text} are the highest-ranked one-point uncertainty probes in the scanned range.` : 'No finite candidate location could be ranked.',
      method: 'local predictive-variance score g(x)^T Cov(theta) g(x) over a finite candidate grid',
      limitation: 'This is a local heuristic conditional on the fitted model, covariance approximation, current parameter estimate and candidate range. It does not guarantee identifiability or optimal experimental design.'
    };
  }

  function identifiabilityAssessment(result, names) {
    const correlation = parameterCorrelationMatrix(result.covariance, names);
    const profile = profileIdentifiability(result.profileLikelihood, result.coef, result.residualVariance, result.absoluteSigma);
    const highCorrelation = correlation.pairs.filter(function (pair) { return pair.absolute >= 0.95; });
    const weakProfiles = profile.filter(function (item) { return !item.boundedBothSides; });
    const weakNames = Array.from(new Set(highCorrelation.flatMap(function (pair) { return [pair.left, pair.right]; }).concat(weakProfiles.map(function (item) { return item.name; }))));
    const rankWarning = !Number.isFinite(result.conditionIndicator) || result.conditionIndicator > 1e8;
    const likely = weakNames.length > 0 || rankWarning;
    const sentence = likely
      ? `${weakNames.length || names.length} of ${names.length} parameters show evidence of practical weak identification under the current data and local diagnostics. Structural identifiability was not assessed.`
      : `No strong practical-identifiability warning was triggered by the local covariance, correlation and finite profile diagnostics. Structural identifiability was not assessed.`;
    return {
      practicalVerdict: likely ? 'practical non-identifiability likely' : 'no strong practical warning triggered',
      structuralVerdict: 'not assessed',
      flaggedParameters: weakNames,
      highCorrelationPairs: highCorrelation,
      profile,
      rankWarning,
      sentence,
      limitation: 'This verdict is diagnostic and local. It does not establish structural identifiability, uniqueness of the optimum, or global parameter recoverability.'
    };
  }

  function fitNoBootstrap(pairs, model, options) {
    requirePairs(pairs, 'fitNoBootstrap');
    const info = modelInfo(model);
    const x = pairs.map(function (pair) { return pair[0]; });
    const y = pairs.map(function (pair) { return pair[1]; });
    if (x.length <= info.names.length) throw new Error(`Model ${info.id} requires more observations than parameters (${info.names.length}).`);
    const weightInfo = normaliseWeights(x.length, options || {});
    const degree = polynomialDegree(info.id);
    if (degree != null) return weightedPolynomialFit(x, y, degree, weightInfo.weights);
    const start = options && Array.isArray(options.initialParams) && options.initialParams.length === info.names.length
      ? options.initialParams
      : initialParams(info.id, x, y);
    return lmOptimize(info.id, x, y, start, Object.assign({}, options || {}, { weights: weightInfo.weights }));
  }

  function parameterLowerBound(model, index) {
    if (model === 'exponential' && index === 0) return 1e-12;
    if (model === 'logistic' && index === 0) return 1e-12;
    if ((model === 'michaelis' || model === 'michaelis-menten') && (index === 0 || index === 1)) return 1e-12;
    return -Infinity;
  }

  function profileLikelihood(model, x, y, coef, options) {
    const opts = Object.assign({ points: 31, spanSE: 3, maxIterations: 80 }, options || {});
    const info = modelInfo(model);
    const weights = opts.weights || Array.from({ length: x.length }, function () { return 1; });
    const covariance = opts.covariance || null;
    return info.names.map(function (name, parameterIndex) {
      const estimatedSE = covariance && covariance[parameterIndex] ? Math.sqrt(Math.max(0, covariance[parameterIndex][parameterIndex])) : NaN;
      const span = Number.isFinite(estimatedSE) && estimatedSE > 0 ? estimatedSE * opts.spanSE : Math.abs(coef[parameterIndex]) * 0.5 + 0.1;
      const lowerBound = parameterLowerBound(info.id, parameterIndex);
      const values = Array.from({ length: opts.points }, function (_, index) {
        const value = coef[parameterIndex] - span + 2 * span * index / (opts.points - 1);
        return Math.max(lowerBound, value);
      }).filter(function (value, index, array) { return index === 0 || value > array[index - 1] + 1e-14; });
      const scan = values.map(function (fixedValue) {
        const start = coef.slice();
        start[parameterIndex] = fixedValue;
        const active = coef.map(function (_, index) { return index !== parameterIndex; });
        let parameters = start.slice();
        let objective = weightedSSE(info.id, x, y, parameters, weights);
        let lambda = 1e-3;
        for (let iteration = 0; iteration < opts.maxIterations; iteration += 1) {
          const prediction = x.map(function (value) { return info.predict(value, parameters); });
          const residuals = y.map(function (value, index) { return value - prediction[index]; });
          const fullJacobian = numericJacobian(info.id, x, parameters);
          const activeIndices = active.map(function (flag, index) { return flag ? index : -1; }).filter(function (index) { return index >= 0; });
          if (!activeIndices.length) break;
          const jacobian = fullJacobian.map(function (row) { return activeIndices.map(function (index) { return row[index]; }); });
          const normal = weightedNormalMatrix(jacobian, weights);
          const rhs = weightedRightHand(jacobian, residuals, weights);
          const damped = normal.map(function (row, rowIndex) {
            return row.map(function (value, columnIndex) { return rowIndex === columnIndex ? value + lambda * Math.max(1, Math.abs(value)) : value; });
          });
          let delta;
          try { delta = solve(damped, rhs); } catch (error) { lambda *= 10; continue; }
          const trial = parameters.slice();
          activeIndices.forEach(function (index, deltaIndex) { trial[index] += delta[deltaIndex]; });
          trial[parameterIndex] = fixedValue;
          const bounded = applyParameterDomain(info.id, trial);
          bounded[parameterIndex] = fixedValue;
          const trialObjective = weightedSSE(info.id, x, y, bounded, weights);
          if (trialObjective < objective) {
            parameters = bounded;
            objective = trialObjective;
            lambda /= 3;
          } else lambda *= 5;
        }
        return { value: fixedValue, sse: objective };
      });
      return { name, values: scan };
    });
  }

  function seededRandom(seed) {
    let state = Number(seed) >>> 0;
    return function () {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function bootstrapFit(pairs, model, replicates, options) {
    requirePairs(pairs, 'bootstrapFit');
    const opts = Object.assign({ seed: 9144, initialParams: null, maxIterations: 160 }, options || {});
    const count = Math.max(0, Math.floor(Number(replicates) || 0));
    const random = seededRandom(opts.seed);
    const names = modelInfo(model).names;
    const rows = [];
    let failed = 0;
    const sourceSigmas = Array.isArray(opts.sigmas) ? opts.sigmas : null;
    const sourceWeights = Array.isArray(opts.weights) ? opts.weights : null;
    for (let replicate = 0; replicate < count; replicate += 1) {
      const samplePairs = [];
      const sampleSigmas = [];
      const sampleWeights = [];
      for (let index = 0; index < pairs.length; index += 1) {
        const selected = Math.floor(random() * pairs.length);
        samplePairs.push(pairs[selected]);
        if (sourceSigmas) sampleSigmas.push(sourceSigmas[selected]);
        if (sourceWeights) sampleWeights.push(sourceWeights[selected]);
      }
      try {
        const result = fitNoBootstrap(samplePairs, model, {
          sigmas: sourceSigmas ? sampleSigmas : undefined,
          weights: sourceWeights ? sampleWeights : undefined,
          initialParams: opts.initialParams,
          maxIterations: opts.maxIterations,
        });
        if (result.coef && result.coef.every(Number.isFinite)) rows.push(result.coef);
        else failed += 1;
      } catch (error) {
        failed += 1;
      }
    }
    const summary = names.map(function (name, parameterIndex) {
      const values = rows.map(function (row) { return row[parameterIndex]; }).filter(Number.isFinite);
      return {
        name,
        values,
        mean: mean(values),
        median: quantile(values, 0.5),
        lo: quantile(values, 0.025),
        hi: quantile(values, 0.975),
      };
    });
    return { requested: count, replicates: rows.length, failed, seed: opts.seed, method: 'pairs bootstrap', summary };
  }

  function qqData(residuals) {
    const sample = residuals.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; });
    const center = mean(sample);
    const spread = sd(sample) || 1;
    return {
      theory: sample.map(function (_, index) { return center + spread * normalInv((index + 0.5) / sample.length); }),
      sample,
    };
  }

  function score(x, y, pred, extra, parameterCount, weights, absoluteSigma, sigmas) {
    const residuals = y.map(function (value, index) { return value - pred[index]; });
    const sse = residuals.reduce(function (sum, residual) { return sum + residual * residual; }, 0);
    const weightedObjective = residuals.reduce(function (sum, residual, index) { return sum + weights[index] * residual * residual; }, 0);
    const centered = mean(y);
    const total = y.reduce(function (sum, value) { return sum + (value - centered) ** 2; }, 0);
    const degreesOfFreedom = y.length - parameterCount;
    const residualVariance = sse / Math.max(1, degreesOfFreedom);
    const covarianceScale = absoluteSigma ? 1 : weightedObjective / Math.max(1, degreesOfFreedom);
    let minus2LogLikelihood;
    let informationCriterionBasis;
    if (absoluteSigma && Array.isArray(sigmas)) {
      minus2LogLikelihood = residuals.reduce(function (sum, residual, index) {
        const sigma = sigmas[index];
        return sum + Math.log(2 * Math.PI * sigma * sigma) + residual * residual / (sigma * sigma);
      }, 0);
      informationCriterionBasis = 'Gaussian likelihood with supplied sigma';
    } else {
      const mleVariance = Math.max(1e-300, sse / y.length);
      minus2LogLikelihood = y.length * (Math.log(2 * Math.PI * mleVariance) + 1);
      informationCriterionBasis = 'Gaussian likelihood with fitted common variance';
    }
    return Object.assign({
      n: y.length,
      parameterCount,
      df: degreesOfFreedom,
      sse,
      weightedObjective,
      residualVariance,
      covarianceScale,
      rmse: Math.sqrt(sse / y.length),
      r2: total > 0 ? 1 - sse / total : (sse < 1e-14 ? 1 : NaN),
      adjustedR2: total > 0 && degreesOfFreedom > 0 ? 1 - (sse / degreesOfFreedom) / (total / Math.max(1, y.length - 1)) : NaN,
      aic: minus2LogLikelihood + 2 * parameterCount,
      bic: minus2LogLikelihood + Math.log(y.length) * parameterCount,
      informationCriterionBasis,
      pred,
      residuals,
    }, extra || {});
  }

  function enrich(model, x, y, optimisation, options, weightInfo) {
    const opts = Object.assign({ alpha: 0.05, bootstrapReplicates: 0, bootstrapSeed: 9144, computeProfile: false }, options || {});
    const info = modelInfo(model);
    const base = score(x, y, optimisation.pred, {
      model: info.id,
      equation: info.equation,
      coef: optimisation.coef.slice(),
      converged: optimisation.converged,
      terminationReason: optimisation.terminationReason,
      iterations: optimisation.iterations,
      acceptedSteps: optimisation.acceptedSteps,
      rejectedSteps: optimisation.rejectedSteps,
      evaluations: optimisation.evaluations,
      objectiveHistory: optimisation.history || [],
      weighting: weightInfo.mode,
      absoluteSigma: weightInfo.absoluteSigma,
      conditionIndicator: conditionIndicator(optimisation.normalMatrix),
    }, info.names.length, weightInfo.weights, weightInfo.absoluteSigma, weightInfo.sigmas);

    const covariance = covarianceFromJacobian(optimisation.jacobian, weightInfo.weights, base.covarianceScale);
    base.covariance = covariance;
    base.parameterSummary = parameterSummary(info.names, base.coef, covariance, opts.alpha);
    base.parameterSE = base.parameterSummary.map(function (parameter) { return parameter.se; });
    base.influence = influenceDiagnostics(optimisation.jacobian, base.residuals, info.names.length, base.residualVariance, weightInfo.weights, weightInfo.sigmas);
    base.predictionBandAvailable = weightInfo.mode !== 'known-sigma';
    base.predictionBands = predictionBands(info.id, x, base.coef, covariance, base.residualVariance, opts.alpha, base.predictionBandAvailable);
    base.confidenceEllipse = confidenceEllipse(base.coef, covariance, info.names, opts.alpha);
    base.sensitivity = sensitivityCoefficients(info.id, x.slice().sort(function (a, b) { return a - b; }), base.coef);
    base.profileLikelihood = opts.computeProfile ? profileLikelihood(info.id, x, y, base.coef, {
      weights: weightInfo.weights,
      covariance,
      points: opts.profilePoints || 31,
      maxIterations: opts.profileIterations || 70,
    }) : [];
    base.bootstrap = opts.bootstrapReplicates > 0 ? bootstrapFit(x.map(function (value, index) { return [value, y[index]]; }), info.id, opts.bootstrapReplicates, {
      seed: opts.bootstrapSeed,
      sigmas: weightInfo.sigmas,
      weights: weightInfo.mode === 'relative-weight' ? weightInfo.weights : undefined,
      initialParams: base.coef,
      maxIterations: Math.min(180, opts.maxIterations || 180),
    }) : { requested: 0, replicates: 0, failed: 0, seed: opts.bootstrapSeed, method: 'pairs bootstrap', summary: [] };
    base.parameterCorrelation = parameterCorrelationMatrix(covariance, info.names);
    base.identifiability = identifiabilityAssessment(base, info.names);
    base.experimentalDesignAdvice = experimentalDesignAdvice(info.id, x, base.coef, covariance);
    base.warnings = [];
    if (base.identifiability.practicalVerdict === 'practical non-identifiability likely') base.warnings.push(base.identifiability.sentence);
    if (!base.converged && !info.linear) base.warnings.push(`Nonlinear least-squares search did not satisfy a convergence tolerance: ${base.terminationReason}.`);
    if (!covariance) base.warnings.push('The local covariance matrix could not be estimated; parameters may be weakly identified or the Jacobian may be rank deficient.');
    if (base.n <= 2 * info.names.length) base.warnings.push('The sample is small relative to the number of parameters; uncertainty and influence diagnostics are unstable.');
    if (base.conditionIndicator > 1e8) base.warnings.push('The normal-matrix diagonal condition indicator is large; parameter scaling or identifiability may be poor.');
    if (weightInfo.mode === 'ordinary') base.warnings.push('Classical intervals assume independent, approximately homoscedastic residuals and a locally adequate model.');
    if (weightInfo.mode === 'known-sigma') {
      base.warnings.push('Inverse-variance weighting treats the supplied sigma values as known observation standard deviations.');
      base.warnings.push('A prediction band is not shown because no model for sigma at unobserved x values was supplied.');
    }
    if (opts.bootstrapReplicates > 0 && base.bootstrap.replicates < Math.max(50, 0.8 * opts.bootstrapReplicates)) base.warnings.push('Many bootstrap resamples failed to fit; percentile intervals are unreliable.');
    base.maxCook = Math.max.apply(null, base.influence.cooksDistance.filter(Number.isFinite).concat([0]));
    base.maxAbsStandardizedResidual = Math.max.apply(null, base.influence.standardizedResiduals.map(Math.abs).filter(Number.isFinite).concat([0]));
    if (info.id === 'exponential') { base.a = base.coef[0]; base.b = base.coef[1]; }
    if (info.id === 'logistic') { base.K = base.coef[0]; base.r = base.coef[1]; base.x0 = base.coef[2]; }
    if (info.id === 'michaelis') { base.model = 'michaelis-menten'; base.Vmax = base.coef[0]; base.Km = base.coef[1]; }
    return base;
  }

  function fit(pairs, model, options) {
    requirePairs(pairs, 'fit');
    const info = modelInfo(model || 'linear');
    const x = pairs.map(function (pair) { return pair[0]; });
    const y = pairs.map(function (pair) { return pair[1]; });
    if (x.length <= info.names.length) throw new Error(`Model ${info.id} has ${info.names.length} parameters and needs at least ${info.names.length + 1} usable observations.`);
    if (Math.max.apply(null, x) === Math.min.apply(null, x)) throw new Error('The x values must vary to identify a curve.');
    const opts = Object.assign({}, options || {});
    const weightInfo = normaliseWeights(x.length, opts);
    const degree = polynomialDegree(info.id);
    let optimisation;
    if (degree != null) optimisation = weightedPolynomialFit(x, y, degree, weightInfo.weights);
    else {
      const start = Array.isArray(opts.initialParams) && opts.initialParams.length === info.names.length ? opts.initialParams : initialParams(info.id, x, y);
      optimisation = lmOptimize(info.id, x, y, start, Object.assign({}, opts, { weights: weightInfo.weights }));
    }
    return enrich(info.id, x, y, optimisation, opts, weightInfo);
  }

  function polyFit(x, y, degree, options) {
    requireSameLength(x, y, 'polyFit');
    const model = degree === 1 ? 'linear' : degree === 2 ? 'quadratic' : degree === 3 ? 'cubic' : null;
    if (!model) {
      if (x.length <= degree) throw new Error('polyFit: need more points than the polynomial degree.');
      throw new Error('polyFit: the browser reference supports polynomial degrees 1, 2 and 3.');
    }
    return fit(x.map(function (value, index) { return [value, y[index]]; }), model, options);
  }

  function linearFit(pairs, options) { return fit(pairs, 'linear', options); }
  function expFit(pairs, options) { return fit(pairs, 'exponential', options); }
  function logisticFit(pairs, options) { return fit(pairs, 'logistic', options); }
  function michaelisFit(pairs, options) { return fit(pairs, 'michaelis', options); }

  function format(result) {
    return [
      `model = ${result.model}`,
      `n = ${result.n}`,
      `converged = ${result.converged}`,
      `termination = ${result.terminationReason}`,
      `RMSE = ${Number(result.rmse).toPrecision(6)}`,
      `R² = ${Number(result.r2).toPrecision(6)}`,
      `parameters = ${JSON.stringify(result.parameterSummary.map(function (parameter) {
        return { name: parameter.name, value: parameter.value, se: parameter.se, ci: parameter.ci };
      }))}`,
    ].join('\n');
  }

  const api = {
    parsePairs,
    solve,
    inverse,
    modelInfo,
    polyFit,
    linearFit,
    expFit,
    logisticFit,
    michaelisFit,
    fit,
    fitNoBootstrap,
    qqData,
    score,
    predictModel,
    numericJacobian,
    covarianceFromJacobian,
    confidenceEllipse,
    profileLikelihood,
    bootstrapFit,
    predictionBands,
    influenceDiagnostics,
    sensitivityCoefficients,
    parameterCorrelationMatrix,
    profileIdentifiability,
    identifiabilityAssessment,
    experimentalDesignAdvice,
    seededRandom,
    normaliseWeights,
    lmOptimize,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoFitting = api;
}(typeof window !== 'undefined' ? window : globalThis));
