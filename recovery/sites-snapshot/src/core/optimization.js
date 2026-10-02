/* Foko Lab optimization numerical core — pure, DOM-free, testable.
 * Scope: small bounded continuous nonlinear programs with optional inequality
 * g(x) <= 0 and equality h(x) = 0 constraints. Constraints are handled by a
 * quadratic penalty during search and independently checked against a declared
 * feasibility tolerance. No routine establishes global optimality or KKT
 * sufficiency. Browser: window.FokoOptimizationCore. Node: require(...).
 */
(function (root) {
  'use strict';

  const CMA = root.FokoCMAESCore || (typeof module !== 'undefined' && module.exports ? require('./cmaes.js') : null);

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function finiteNumber(value, name) {
    const number = Number(value);
    assert(Number.isFinite(number), `${name} must be finite (got ${value}).`);
    return number;
  }

  function positiveInteger(value, name, maximum) {
    const number = Number(value);
    assert(Number.isInteger(number) && number > 0, `${name} must be a positive integer.`);
    if (maximum != null) assert(number <= maximum, `${name} must be <= ${maximum}.`);
    return number;
  }

  function clamp(value, lower, upper) {
    return Math.max(lower, Math.min(upper, value));
  }

  function seededRandom(seed) {
    let x = (Number(seed) >>> 0) || 0x9e3779b9;
    return function nextRandom() {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  function normaliseProblem(problem) {
    assert(problem && typeof problem === 'object', 'An optimization problem object is required.');
    assert(Array.isArray(problem.variables) && problem.variables.length > 0, 'variables must be a non-empty array.');
    assert(problem.variables.length <= 20, 'The browser reference core is limited to 20 variables.');
    const names = [];
    const lower = [];
    const upper = [];
    const start = [];
    problem.variables.forEach(function (variable, index) {
      assert(variable && typeof variable === 'object', `variables[${index}] must be an object.`);
      const name = String(variable.name || '').trim();
      assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(name), `variables[${index}].name is not a valid symbol.`);
      assert(!names.includes(name), `Variable name ${name} is duplicated.`);
      const lo = finiteNumber(variable.lower, `${name}.lower`);
      const hi = finiteNumber(variable.upper, `${name}.upper`);
      assert(hi > lo, `${name}.upper must be greater than ${name}.lower.`);
      const x0 = clamp(finiteNumber(variable.start, `${name}.start`), lo, hi);
      names.push(name);
      lower.push(lo);
      upper.push(hi);
      start.push(x0);
    });
    assert(typeof problem.objective === 'function', 'objective must be a function.');
    const inequalities = Array.isArray(problem.inequalities) ? problem.inequalities : [];
    const equalities = Array.isArray(problem.equalities) ? problem.equalities : [];
    inequalities.forEach(function (fn, index) { assert(typeof fn === 'function', `inequalities[${index}] must be a function.`); });
    equalities.forEach(function (fn, index) { assert(typeof fn === 'function', `equalities[${index}] must be a function.`); });
    if (problem.secondaryObjective != null) assert(typeof problem.secondaryObjective === 'function', 'secondaryObjective must be a function when supplied.');
    const sense = problem.sense === 'maximize' ? 'maximize' : 'minimize';
    return {
      names,
      lower,
      upper,
      start,
      objective: problem.objective,
      secondaryObjective: problem.secondaryObjective || null,
      inequalities,
      equalities,
      sense,
    };
  }

  function normaliseOptions(options) {
    const source = options || {};
    const algorithm = String(source.algorithm || 'coordinate');
    assert(['coordinate', 'projected_gradient', 'differential_evolution', 'cma_es', 'multi_start', 'random_search'].includes(algorithm), `Unsupported algorithm ${algorithm}.`);
    return {
      algorithm,
      seed: Number(source.seed == null ? 1729 : source.seed) >>> 0,
      maxIterations: positiveInteger(source.maxIterations == null ? 180 : source.maxIterations, 'maxIterations', 20000),
      populationSize: positiveInteger(source.populationSize == null ? 36 : source.populationSize, 'populationSize', 2000),
      starts: positiveInteger(source.starts == null ? 16 : source.starts, 'starts', 500),
      penalty: finiteNumber(source.penalty == null ? 1000 : source.penalty, 'penalty'),
      feasibilityTolerance: finiteNumber(source.feasibilityTolerance == null ? 1e-6 : source.feasibilityTolerance, 'feasibilityTolerance'),
      stepTolerance: finiteNumber(source.stepTolerance == null ? 1e-7 : source.stepTolerance, 'stepTolerance'),
      gradientTolerance: finiteNumber(source.gradientTolerance == null ? 1e-6 : source.gradientTolerance, 'gradientTolerance'),
      finiteDifferenceScale: finiteNumber(source.finiteDifferenceScale == null ? 1e-6 : source.finiteDifferenceScale, 'finiteDifferenceScale'),
      initialStepFraction: finiteNumber(source.initialStepFraction == null ? 0.2 : source.initialStepFraction, 'initialStepFraction'),
      mutationFactor: finiteNumber(source.mutationFactor == null ? 0.8 : source.mutationFactor, 'mutationFactor'),
      crossoverRate: finiteNumber(source.crossoverRate == null ? 0.9 : source.crossoverRate, 'crossoverRate'),
      cmaSigma: finiteNumber(source.cmaSigma == null ? 0.3 : source.cmaSigma, 'cmaSigma'),
      stallIterations: positiveInteger(source.stallIterations == null ? 30 : source.stallIterations, 'stallIterations', 5000),
      recordLimit: positiveInteger(source.recordLimit == null ? 5000 : source.recordLimit, 'recordLimit', 100000),
    };
  }

  function vectorKey(x) {
    return x.map(function (value) { return Number(value).toPrecision(13); }).join('|');
  }

  function createEvaluator(problem, options) {
    let evaluations = 0;
    let feasibleEvaluations = 0;
    let bestFeasible = null;
    const records = [];
    const cache = new Map();
    const sign = problem.sense === 'maximize' ? -1 : 1;

    function evaluate(input, meta) {
      const x = input.map(function (value, index) {
        return clamp(finiteNumber(value, `x[${index}]`), problem.lower[index], problem.upper[index]);
      });
      const key = vectorKey(x);
      let base = cache.get(key);
      if (!base) {
        const objective = finiteNumber(problem.objective(x.slice()), 'objective');
        const secondaryObjective = problem.secondaryObjective ? finiteNumber(problem.secondaryObjective(x.slice()), 'secondary objective') : null;
        const inequalityValues = problem.inequalities.map(function (fn, index) {
          return finiteNumber(fn(x.slice()), `inequality[${index}]`);
        });
        const equalityValues = problem.equalities.map(function (fn, index) {
          return finiteNumber(fn(x.slice()), `equality[${index}]`);
        });
        const inequalityViolations = inequalityValues.map(function (value) { return Math.max(0, value); });
        const equalityViolations = equalityValues.map(Math.abs);
        const violations = inequalityViolations.concat(equalityViolations);
        const maxViolation = violations.length ? Math.max.apply(null, violations) : 0;
        const sumSquaredViolation = violations.reduce(function (sum, value) { return sum + value * value; }, 0);
        base = {
          x,
          objective,
          secondaryObjective,
          inequalityValues,
          equalityValues,
          maxViolation,
          sumSquaredViolation,
          feasible: maxViolation <= options.feasibilityTolerance,
          orientedObjective: sign * objective,
          penalizedObjective: sign * objective + options.penalty * sumSquaredViolation,
        };
        cache.set(key, base);
        evaluations += 1;
        if (base.feasible) {
          feasibleEvaluations += 1;
          if (betterCandidate(base, bestFeasible)) bestFeasible = Object.assign({}, base, { x: base.x.slice() });
        }
      }
      const result = Object.assign({}, base, { x: base.x.slice() });
      if (records.length < options.recordLimit) {
        records.push(Object.assign({ evaluation: evaluations, phase: meta && meta.phase ? meta.phase : 'search' }, result));
      }
      return result;
    }

    return {
      evaluate,
      get evaluations() { return evaluations; },
      get feasibleEvaluations() { return feasibleEvaluations; },
      get bestFeasible() { return bestFeasible; },
      records,
    };
  }

  function comparePenalized(a, b) {
    return a.penalizedObjective - b.penalizedObjective;
  }

  function betterCandidate(a, b) {
    if (!b) return true;
    if (a.feasible && !b.feasible) return true;
    if (!a.feasible && b.feasible) return false;
    if (a.feasible && b.feasible) return a.orientedObjective < b.orientedObjective;
    if (a.maxViolation !== b.maxViolation) return a.maxViolation < b.maxViolation;
    return a.penalizedObjective < b.penalizedObjective;
  }

  function summaryPoint(candidate, iteration, evaluations) {
    return {
      iteration,
      evaluations,
      x: candidate.x.slice(),
      objective: candidate.objective,
      secondaryObjective: candidate.secondaryObjective,
      penalizedObjective: candidate.penalizedObjective,
      maxViolation: candidate.maxViolation,
      feasible: candidate.feasible,
    };
  }

  function randomPoint(problem, random) {
    return problem.lower.map(function (lower, index) {
      return lower + random() * (problem.upper[index] - lower);
    });
  }

  function coordinateSearch(problem, evaluator, options, start, phasePrefix) {
    let current = evaluator.evaluate(start || problem.start, { phase: phasePrefix || 'coordinate' });
    let best = current;
    let steps = problem.lower.map(function (lower, index) {
      return Math.max(options.stepTolerance * 10, options.initialStepFraction * (problem.upper[index] - lower));
    });
    const history = [summaryPoint(best, 0, evaluator.evaluations)];
    let terminationReason = 'max_iterations';
    let stall = 0;

    for (let iteration = 1; iteration <= options.maxIterations; iteration += 1) {
      let improved = false;
      for (let index = 0; index < current.x.length; index += 1) {
        const candidates = [-1, 1].map(function (direction) {
          const x = current.x.slice();
          x[index] = clamp(x[index] + direction * steps[index], problem.lower[index], problem.upper[index]);
          return evaluator.evaluate(x, { phase: phasePrefix || 'coordinate' });
        }).sort(comparePenalized);
        if (candidates[0].penalizedObjective + 1e-14 < current.penalizedObjective) {
          current = candidates[0];
          improved = true;
          if (betterCandidate(current, best)) best = current;
        }
      }
      if (!improved) {
        steps = steps.map(function (step) { return step * 0.5; });
        stall += 1;
      } else {
        stall = 0;
      }
      history.push(summaryPoint(best, iteration, evaluator.evaluations));
      const scaledStep = Math.max.apply(null, steps.map(function (step, index) {
        return step / Math.max(1, problem.upper[index] - problem.lower[index]);
      }));
      if (scaledStep <= options.stepTolerance) {
        terminationReason = 'local_step_tolerance';
        break;
      }
      if (stall >= options.stallIterations) {
        terminationReason = 'search_stalled';
        break;
      }
    }
    return { best, history, terminationReason, localEvidence: 'bounded coordinate pattern search' };
  }

  function penalizedGradient(problem, evaluator, options, candidate) {
    const gradient = [];
    for (let index = 0; index < candidate.x.length; index += 1) {
      const range = problem.upper[index] - problem.lower[index];
      const h = Math.max(options.finiteDifferenceScale * Math.max(1, Math.abs(candidate.x[index]), range), 1e-10);
      const xp = candidate.x.slice();
      const xm = candidate.x.slice();
      xp[index] = clamp(xp[index] + h, problem.lower[index], problem.upper[index]);
      xm[index] = clamp(xm[index] - h, problem.lower[index], problem.upper[index]);
      const fp = evaluator.evaluate(xp, { phase: 'gradient_fd' }).penalizedObjective;
      const fm = evaluator.evaluate(xm, { phase: 'gradient_fd' }).penalizedObjective;
      const denominator = xp[index] - xm[index];
      gradient.push(denominator === 0 ? 0 : (fp - fm) / denominator);
    }
    return gradient;
  }

  function norm2(values) {
    return Math.sqrt(values.reduce(function (sum, value) { return sum + value * value; }, 0));
  }

  function projectedGradient(problem, evaluator, options) {
    let current = evaluator.evaluate(problem.start, { phase: 'projected_gradient' });
    let best = current;
    const history = [summaryPoint(best, 0, evaluator.evaluations)];
    let terminationReason = 'max_iterations';
    let stepScale = 1;
    let stall = 0;

    for (let iteration = 1; iteration <= options.maxIterations; iteration += 1) {
      const gradient = penalizedGradient(problem, evaluator, options, current);
      const gradientNorm = norm2(gradient);
      if (!Number.isFinite(gradientNorm)) {
        terminationReason = 'invalid_gradient';
        break;
      }
      if (gradientNorm <= options.gradientTolerance) {
        terminationReason = 'penalized_gradient_tolerance';
        break;
      }
      let alpha = stepScale;
      let accepted = null;
      while (alpha >= options.stepTolerance) {
        const x = current.x.map(function (value, index) {
          const scaled = gradient[index] / Math.max(1, gradientNorm);
          const range = problem.upper[index] - problem.lower[index];
          return clamp(value - alpha * 0.2 * range * scaled, problem.lower[index], problem.upper[index]);
        });
        const candidate = evaluator.evaluate(x, { phase: 'projected_gradient' });
        if (candidate.penalizedObjective < current.penalizedObjective - 1e-12) {
          accepted = candidate;
          break;
        }
        alpha *= 0.5;
      }
      if (!accepted) {
        stall += 1;
        stepScale *= 0.5;
      } else {
        current = accepted;
        stepScale = Math.min(1, alpha * 1.5);
        stall = 0;
        if (betterCandidate(current, best)) best = current;
      }
      history.push(summaryPoint(best, iteration, evaluator.evaluations));
      if (stepScale <= options.stepTolerance) {
        terminationReason = 'projected_step_tolerance';
        break;
      }
      if (stall >= options.stallIterations) {
        terminationReason = 'search_stalled';
        break;
      }
    }
    return { best, history, terminationReason, localEvidence: 'finite-difference projected penalty descent' };
  }

  function differentialEvolution(problem, evaluator, options) {
    const random = seededRandom(options.seed);
    const dimension = problem.names.length;
    const populationSize = Math.max(4, options.populationSize);
    let population = Array.from({ length: populationSize }, function (_, index) {
      return evaluator.evaluate(index === 0 ? problem.start : randomPoint(problem, random), { phase: 'de_initialisation' });
    });
    let best = population.reduce(function (currentBest, candidate) {
      return betterCandidate(candidate, currentBest) ? candidate : currentBest;
    }, null);
    const history = [summaryPoint(best, 0, evaluator.evaluations)];
    let stall = 0;
    let terminationReason = 'max_generations';

    for (let generation = 1; generation <= options.maxIterations; generation += 1) {
      let changed = false;
      const next = population.slice();
      for (let targetIndex = 0; targetIndex < populationSize; targetIndex += 1) {
        const pool = [];
        while (pool.length < 3) {
          const index = Math.floor(random() * populationSize);
          if (index !== targetIndex && !pool.includes(index)) pool.push(index);
        }
        const [a, b, c] = pool.map(function (index) { return population[index]; });
        const forced = Math.floor(random() * dimension);
        const trial = population[targetIndex].x.map(function (value, index) {
          if (index !== forced && random() > options.crossoverRate) return value;
          return clamp(a.x[index] + options.mutationFactor * (b.x[index] - c.x[index]), problem.lower[index], problem.upper[index]);
        });
        const candidate = evaluator.evaluate(trial, { phase: 'differential_evolution' });
        if (candidate.penalizedObjective <= population[targetIndex].penalizedObjective) {
          next[targetIndex] = candidate;
          changed = true;
          if (betterCandidate(candidate, best)) best = candidate;
        }
      }
      population = next;
      history.push(summaryPoint(best, generation, evaluator.evaluations));
      stall = changed ? 0 : stall + 1;
      if (stall >= options.stallIterations) {
        terminationReason = 'population_stalled';
        break;
      }
    }
    return { best, history, terminationReason, population, localEvidence: 'seeded differential evolution heuristic' };
  }

  function cmaEvolutionStrategy(problem, evaluator, options) {
    assert(CMA && typeof CMA.createStrategy === 'function', 'FokoCMAESCore is unavailable.');
    const strategy = CMA.createStrategy({
      mean: problem.start,
      lower: problem.lower,
      upper: problem.upper,
      sigma: options.cmaSigma,
      populationSize: options.populationSize,
      seed: options.seed,
      maxGenerations: options.maxIterations,
      stallGenerations: options.stallIterations,
      stepTolerance: options.stepTolerance,
    });
    let best = null;
    let population = [];
    const history = [];
    while (!strategy.terminated) {
      const generationStart = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const samples = strategy.ask();
      const evaluated = samples.map(function (sample) {
        const candidate = evaluator.evaluate(sample.x, { phase: 'cma_es' });
        if (betterCandidate(candidate, best)) best = candidate;
        return { id: sample.id, score: candidate.penalizedObjective, metadata: candidate };
      });
      const generation = strategy.tell(evaluated);
      population = generation.population.map(function (item) { return item.metadata; });
      const rankedObjectives = generation.population.map(function (item) { return item.metadata.objective; });
      generation.evaluations = evaluator.evaluations;
      generation.bestObjective = rankedObjectives[0];
      generation.medianObjective = rankedObjectives[Math.floor(rankedObjectives.length / 2)];
      generation.worstObjective = rankedObjectives[rankedObjectives.length - 1];
      generation.bestViolation = generation.population[0].metadata.maxViolation;
      const generationEnd = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      generation.runtimeMs = generationEnd - generationStart;
      history.push(summaryPoint(best, generation.generation, evaluator.evaluations));
    }
    return {
      best,
      history,
      terminationReason: strategy.terminationReason,
      population,
      cmaes: {
        generations: strategy.history,
        finalState: strategy.getState(),
        populationSize: strategy.populationSize,
        coordinateSystem: 'normalized bounds with reflected repair',
      },
      localEvidence: 'seeded bounded rank-one + rank-mu CMA-ES',
    };
  }

  function multiStart(problem, evaluator, options) {
    const random = seededRandom(options.seed);
    let best = null;
    const history = [];
    const subOptions = Object.assign({}, options, {
      maxIterations: Math.max(20, Math.floor(options.maxIterations / Math.max(1, Math.sqrt(options.starts)))),
      stallIterations: Math.max(8, Math.floor(options.stallIterations / 2)),
    });
    for (let startIndex = 0; startIndex < options.starts; startIndex += 1) {
      const start = startIndex === 0 ? problem.start : randomPoint(problem, random);
      const run = coordinateSearch(problem, evaluator, subOptions, start, `multi_start_${startIndex + 1}`);
      if (betterCandidate(run.best, best)) best = run.best;
      history.push(summaryPoint(best, startIndex + 1, evaluator.evaluations));
    }
    return { best, history, terminationReason: 'declared_starts_completed', localEvidence: `${options.starts} seeded coordinate-search starts` };
  }

  function randomSearch(problem, evaluator, options) {
    const random = seededRandom(options.seed);
    let best = evaluator.evaluate(problem.start, { phase: 'random_search' });
    const history = [summaryPoint(best, 0, evaluator.evaluations)];
    for (let iteration = 1; iteration <= options.maxIterations; iteration += 1) {
      const candidate = evaluator.evaluate(randomPoint(problem, random), { phase: 'random_search' });
      if (betterCandidate(candidate, best)) best = candidate;
      history.push(summaryPoint(best, iteration, evaluator.evaluations));
    }
    return { best, history, terminationReason: 'sample_budget_exhausted', localEvidence: 'seeded uniform random search' };
  }

  function optimise(rawProblem, rawOptions) {
    const problem = normaliseProblem(rawProblem);
    const options = normaliseOptions(rawOptions);
    assert(options.penalty > 0, 'penalty must be positive.');
    assert(options.feasibilityTolerance >= 0, 'feasibilityTolerance must be non-negative.');
    assert(options.stepTolerance > 0, 'stepTolerance must be positive.');
    assert(options.gradientTolerance > 0, 'gradientTolerance must be positive.');
    assert(options.initialStepFraction > 0 && options.initialStepFraction <= 1, 'initialStepFraction must be in (0, 1].');
    assert(options.mutationFactor > 0 && options.mutationFactor <= 2, 'mutationFactor must be in (0, 2].');
    assert(options.crossoverRate >= 0 && options.crossoverRate <= 1, 'crossoverRate must be in [0, 1].');
    assert(options.cmaSigma > 0 && options.cmaSigma <= 2, 'cmaSigma must be in (0, 2].');
    const evaluator = createEvaluator(problem, options);
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    let run;
    if (options.algorithm === 'coordinate') run = coordinateSearch(problem, evaluator, options);
    else if (options.algorithm === 'projected_gradient') run = projectedGradient(problem, evaluator, options);
    else if (options.algorithm === 'differential_evolution') run = differentialEvolution(problem, evaluator, options);
    else if (options.algorithm === 'cma_es') run = cmaEvolutionStrategy(problem, evaluator, options);
    else if (options.algorithm === 'multi_start') run = multiStart(problem, evaluator, options);
    else run = randomSearch(problem, evaluator, options);
    const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    const bestFeasible = evaluator.bestFeasible;
    const reported = bestFeasible || run.best;
    const status = bestFeasible ? 'success' : 'warning';
    const message = bestFeasible
      ? 'A feasible candidate was found. This is a numerical candidate, not a proof of global optimality.'
      : 'No candidate satisfied the declared feasibility tolerance. The least-violating candidate is reported.';
    return {
      status,
      message,
      algorithm: options.algorithm,
      methodEvidence: run.localEvidence,
      terminationReason: run.terminationReason,
      globalOptimality: 'not established',
      localOptimality: 'not certified',
      problem: {
        names: problem.names.slice(),
        lower: problem.lower.slice(),
        upper: problem.upper.slice(),
        start: problem.start.slice(),
        sense: problem.sense,
        inequalityCount: problem.inequalities.length,
        equalityCount: problem.equalities.length,
        hasSecondaryObjective: Boolean(problem.secondaryObjective),
      },
      options,
      candidate: reported,
      bestFeasible,
      searchBest: run.best,
      evaluations: evaluator.evaluations,
      history: run.history,
      records: evaluator.records,
      runtimeMs: endTime - startTime,
      feasibleEvaluations: evaluator.feasibleEvaluations,
      feasibilityRate: evaluator.evaluations ? evaluator.feasibleEvaluations / evaluator.evaluations : 0,
      cmaes: run.cmaes || null,
    };
  }

  function landscape(rawProblem, rawOptions) {
    const problem = normaliseProblem(rawProblem);
    assert(problem.names.length === 2, 'A landscape is available only for two-variable problems.');
    const options = normaliseOptions(rawOptions || {});
    const resolution = positiveInteger(rawOptions && rawOptions.resolution != null ? rawOptions.resolution : 45, 'resolution', 100);
    assert(resolution >= 10, 'resolution must be at least 10.');
    const evaluator = createEvaluator(problem, options);
    const xs = Array.from({ length: resolution }, function (_, index) {
      return problem.lower[0] + (problem.upper[0] - problem.lower[0]) * index / (resolution - 1);
    });
    const ys = Array.from({ length: resolution }, function (_, index) {
      return problem.lower[1] + (problem.upper[1] - problem.lower[1]) * index / (resolution - 1);
    });
    const objective = [];
    const penalized = [];
    const violation = [];
    const feasible = [];
    ys.forEach(function (y) {
      const objectiveRow = [];
      const penaltyRow = [];
      const violationRow = [];
      const feasibleRow = [];
      xs.forEach(function (x) {
        const point = evaluator.evaluate([x, y], { phase: 'landscape' });
        objectiveRow.push(point.objective);
        penaltyRow.push(point.penalizedObjective);
        violationRow.push(point.maxViolation);
        feasibleRow.push(point.feasible ? 1 : 0);
      });
      objective.push(objectiveRow);
      penalized.push(penaltyRow);
      violation.push(violationRow);
      feasible.push(feasibleRow);
    });
    return { xs, ys, objective, penalized, violation, feasible, evaluations: evaluator.evaluations };
  }

  function nondominated(points, primarySense) {
    const sign = primarySense === 'maximize' ? -1 : 1;
    const feasible = points.filter(function (point) {
      return point.feasible && Number.isFinite(point.objective) && Number.isFinite(point.secondaryObjective);
    });
    return feasible.filter(function (point, index) {
      const a0 = sign * point.objective;
      const a1 = point.secondaryObjective;
      return !feasible.some(function (other, otherIndex) {
        if (otherIndex === index) return false;
        const b0 = sign * other.objective;
        const b1 = other.secondaryObjective;
        return b0 <= a0 && b1 <= a1 && (b0 < a0 || b1 < a1);
      });
    }).sort(function (a, b) { return sign * a.objective - sign * b.objective; });
  }

  function paretoSample(rawProblem, rawOptions) {
    const problem = normaliseProblem(rawProblem);
    assert(problem.secondaryObjective, 'A secondary objective is required for a Pareto sample.');
    const options = normaliseOptions(rawOptions || {});
    const samples = positiveInteger(rawOptions && rawOptions.samples != null ? rawOptions.samples : 1000, 'samples', 20000);
    const random = seededRandom(options.seed);
    const evaluator = createEvaluator(problem, Object.assign({}, options, { recordLimit: Math.max(options.recordLimit, samples + 1) }));
    evaluator.evaluate(problem.start, { phase: 'pareto_sample' });
    for (let index = 1; index < samples; index += 1) evaluator.evaluate(randomPoint(problem, random), { phase: 'pareto_sample' });
    const front = nondominated(evaluator.records, problem.sense);
    return {
      points: evaluator.records,
      front,
      feasiblePoints: evaluator.records.filter(function (point) { return point.feasible; }).length,
      evaluations: evaluator.evaluations,
      primarySense: problem.sense,
      secondarySense: 'minimize',
      claim: 'Seeded finite candidate sample; not an exact Pareto frontier.',
    };
  }

  const api = {
    seededRandom,
    normaliseProblem,
    normaliseOptions,
    optimise,
    landscape,
    nondominated,
    paretoSample,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoOptimizationCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
