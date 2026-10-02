/* Foko Lab CMA-ES numerical core — pure, DOM-free, seeded ask/tell strategy.
 *
 * The strategy operates in a normalized [0, 1]^n coordinate system so that
 * heterogeneous user bounds do not silently dominate covariance adaptation.
 * Bounds are handled by reflection followed by clipping. This is a bounded
 * reference implementation of rank-one + rank-mu CMA-ES, not a proof of
 * global optimality and not a mixed-integer optimizer.
 *
 * Browser: window.FokoCMAESCore. Node: require(...).
 */
(function (root) {
  'use strict';

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function finite(value, name) {
    const number = Number(value);
    assert(Number.isFinite(number), `${name} must be finite.`);
    return number;
  }

  function seededRandom(seed) {
    let x = (Number(seed) >>> 0) || 0x9e3779b9;
    return function random() {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  function normalSampler(random) {
    let spare = null;
    return function normal() {
      if (spare != null) {
        const value = spare;
        spare = null;
        return value;
      }
      let u = 0;
      let v = 0;
      while (u <= Number.EPSILON) u = random();
      v = random();
      const radius = Math.sqrt(-2 * Math.log(u));
      spare = radius * Math.sin(2 * Math.PI * v);
      return radius * Math.cos(2 * Math.PI * v);
    };
  }

  function identity(n) {
    return Array.from({ length: n }, function (_, i) {
      return Array.from({ length: n }, function (__, j) { return i === j ? 1 : 0; });
    });
  }

  function zeros(n) {
    return Array(n).fill(0);
  }

  function dot(a, b) {
    return a.reduce(function (sum, value, index) { return sum + value * b[index]; }, 0);
  }

  function norm(a) {
    return Math.sqrt(Math.max(0, dot(a, a)));
  }

  function matrixVector(matrix, vector) {
    return matrix.map(function (row) { return dot(row, vector); });
  }

  function transpose(matrix) {
    return matrix[0].map(function (_, column) {
      return matrix.map(function (row) { return row[column]; });
    });
  }

  function outer(a, b) {
    return a.map(function (x) { return b.map(function (y) { return x * y; }); });
  }

  function addScaled(target, source, scale) {
    for (let i = 0; i < target.length; i += 1) {
      for (let j = 0; j < target.length; j += 1) target[i][j] += scale * source[i][j];
    }
  }

  function jacobiEigen(raw) {
    const n = raw.length;
    const matrix = raw.map(function (row) { return row.slice(); });
    const vectors = identity(n);
    const limit = Math.max(40, 80 * n * n);
    for (let iteration = 0; iteration < limit; iteration += 1) {
      let p = 0;
      let q = n > 1 ? 1 : 0;
      let maximum = 0;
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const value = Math.abs(matrix[i][j]);
          if (value > maximum) { maximum = value; p = i; q = j; }
        }
      }
      if (maximum < 1e-13 || n === 1) break;
      const angle = 0.5 * Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]);
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const app = cosine * cosine * matrix[p][p] - 2 * sine * cosine * matrix[p][q] + sine * sine * matrix[q][q];
      const aqq = sine * sine * matrix[p][p] + 2 * sine * cosine * matrix[p][q] + cosine * cosine * matrix[q][q];
      for (let k = 0; k < n; k += 1) {
        if (k !== p && k !== q) {
          const mkp = matrix[k][p];
          const mkq = matrix[k][q];
          matrix[k][p] = matrix[p][k] = cosine * mkp - sine * mkq;
          matrix[k][q] = matrix[q][k] = sine * mkp + cosine * mkq;
        }
        const vkp = vectors[k][p];
        const vkq = vectors[k][q];
        vectors[k][p] = cosine * vkp - sine * vkq;
        vectors[k][q] = sine * vkp + cosine * vkq;
      }
      matrix[p][p] = app;
      matrix[q][q] = aqq;
      matrix[p][q] = matrix[q][p] = 0;
    }
    const order = Array.from({ length: n }, function (_, index) { return index; })
      .sort(function (a, b) { return matrix[a][a] - matrix[b][b]; });
    return {
      values: order.map(function (index) { return Math.max(1e-20, matrix[index][index]); }),
      vectors: vectors.map(function (row) { return order.map(function (index) { return row[index]; }); }),
    };
  }

  function reflect01(value) {
    if (!Number.isFinite(value)) return 0.5;
    let reflected = value;
    for (let count = 0; count < 12 && (reflected < 0 || reflected > 1); count += 1) {
      if (reflected < 0) reflected = -reflected;
      if (reflected > 1) reflected = 2 - reflected;
    }
    return Math.max(0, Math.min(1, reflected));
  }

  function createStrategy(config) {
    const source = config || {};
    assert(Array.isArray(source.mean) && source.mean.length > 0, 'CMA-ES mean must be a non-empty array.');
    const n = source.mean.length;
    assert(n <= 64, 'This CMA-ES reference core is limited to 64 variables.');
    assert(Array.isArray(source.lower) && source.lower.length === n, 'CMA-ES lower bounds must match the mean.');
    assert(Array.isArray(source.upper) && source.upper.length === n, 'CMA-ES upper bounds must match the mean.');
    const lower = source.lower.map(function (value, index) { return finite(value, `lower[${index}]`); });
    const upper = source.upper.map(function (value, index) {
      const result = finite(value, `upper[${index}]`);
      assert(result > lower[index], `upper[${index}] must exceed lower[${index}].`);
      return result;
    });
    const scales = upper.map(function (value, index) { return value - lower[index]; });
    let mean = source.mean.map(function (value, index) {
      return Math.max(0, Math.min(1, (finite(value, `mean[${index}]`) - lower[index]) / scales[index]));
    });
    let sigma = finite(source.sigma == null ? 0.3 : source.sigma, 'CMA-ES sigma');
    assert(sigma > 0 && sigma <= 2, 'CMA-ES sigma must be in (0, 2].');
    const lambda = Math.max(4, Math.floor(Number(source.populationSize) || (4 + 3 * Math.log(n))));
    const mu = Math.max(2, Math.floor(lambda / 2));
    let weights = Array.from({ length: mu }, function (_, index) { return Math.log(mu + 0.5) - Math.log(index + 1); });
    const weightSum = weights.reduce(function (sum, value) { return sum + value; }, 0);
    weights = weights.map(function (value) { return value / weightSum; });
    const muEff = 1 / weights.reduce(function (sum, value) { return sum + value * value; }, 0);
    const cc = (4 + muEff / n) / (n + 4 + 2 * muEff / n);
    const cs = (muEff + 2) / (n + muEff + 5);
    const c1 = 2 / (Math.pow(n + 1.3, 2) + muEff);
    const cmu = Math.min(1 - c1, 2 * (muEff - 2 + 1 / muEff) / (Math.pow(n + 2, 2) + muEff));
    const damping = 1 + 2 * Math.max(0, Math.sqrt((muEff - 1) / (n + 1)) - 1) + cs;
    const chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
    const maxGenerations = Math.max(1, Math.floor(Number(source.maxGenerations) || 200));
    const stallGenerations = Math.max(3, Math.floor(Number(source.stallGenerations) || 35));
    const stepTolerance = Math.max(1e-16, Number(source.stepTolerance) || 1e-10);
    const random = seededRandom(source.seed == null ? 1729 : source.seed);
    const normal = normalSampler(random);
    let covariance = identity(n);
    let pc = zeros(n);
    let ps = zeros(n);
    let generation = 0;
    let pending = null;
    let best = null;
    let stall = 0;
    let terminationReason = null;
    const history = [];

    function toReal(normalized) {
      return normalized.map(function (value, index) { return lower[index] + scales[index] * value; });
    }

    function decomposition() {
      const eigen = jacobiEigen(covariance);
      return { values: eigen.values, vectors: eigen.vectors, deviations: eigen.values.map(Math.sqrt) };
    }

    function ask() {
      assert(!terminationReason, `CMA-ES has terminated: ${terminationReason}.`);
      assert(!pending, 'Call tell() before asking for another CMA-ES population.');
      const eigen = decomposition();
      const samples = Array.from({ length: lambda }, function (_, sampleIndex) {
        const z = Array.from({ length: n }, function () { return normal(); });
        const scaled = z.map(function (value, index) { return value * eigen.deviations[index]; });
        const yRaw = matrixVector(eigen.vectors, scaled);
        const normalized = mean.map(function (value, index) { return reflect01(value + sigma * yRaw[index]); });
        const y = normalized.map(function (value, index) { return (value - mean[index]) / sigma; });
        return { id: `${generation + 1}:${sampleIndex + 1}`, x: toReal(normalized), normalized, y, z };
      });
      pending = { samples, eigen };
      return samples.map(function (sample) { return { id: sample.id, x: sample.x.slice() }; });
    }

    function tell(evaluations) {
      assert(pending, 'Call ask() before tell().');
      assert(Array.isArray(evaluations) && evaluations.length === lambda, `tell() requires ${lambda} evaluations.`);
      const byId = new Map(evaluations.map(function (evaluation, index) {
        const score = finite(evaluation && evaluation.score, `evaluations[${index}].score`);
        return [evaluation.id || pending.samples[index].id, { score, metadata: evaluation.metadata || null }];
      }));
      const ranked = pending.samples.map(function (sample) {
        const evaluation = byId.get(sample.id);
        assert(evaluation, `Missing evaluation for CMA-ES sample ${sample.id}.`);
        return Object.assign({}, sample, evaluation);
      }).sort(function (a, b) { return a.score - b.score; });
      const oldMean = mean.slice();
      mean = zeros(n);
      for (let i = 0; i < mu; i += 1) {
        for (let j = 0; j < n; j += 1) mean[j] += weights[i] * ranked[i].normalized[j];
      }
      const yMean = mean.map(function (value, index) { return (value - oldMean[index]) / sigma; });
      const eigen = pending.eigen;
      const btY = matrixVector(transpose(eigen.vectors), yMean);
      const inverseScaled = btY.map(function (value, index) { return value / Math.max(1e-20, eigen.deviations[index]); });
      const invSqrtY = matrixVector(eigen.vectors, inverseScaled);
      const pathScale = Math.sqrt(cs * (2 - cs) * muEff);
      ps = ps.map(function (value, index) { return (1 - cs) * value + pathScale * invSqrtY[index]; });
      const psNorm = norm(ps);
      const expectedCorrection = Math.sqrt(Math.max(1e-20, 1 - Math.pow(1 - cs, 2 * (generation + 1))));
      const hSigma = psNorm / expectedCorrection / chiN < 1.4 + 2 / (n + 1) ? 1 : 0;
      const pcScale = hSigma * Math.sqrt(cc * (2 - cc) * muEff);
      pc = pc.map(function (value, index) { return (1 - cc) * value + pcScale * yMean[index]; });

      const oldCovariance = covariance.map(function (row) { return row.slice(); });
      covariance = oldCovariance.map(function (row) { return row.map(function (value) { return (1 - c1 - cmu) * value; }); });
      addScaled(covariance, outer(pc, pc), c1);
      if (!hSigma) addScaled(covariance, oldCovariance, c1 * cc * (2 - cc));
      for (let i = 0; i < mu; i += 1) addScaled(covariance, outer(ranked[i].y, ranked[i].y), cmu * weights[i]);
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const symmetric = 0.5 * (covariance[i][j] + covariance[j][i]);
          covariance[i][j] = covariance[j][i] = symmetric;
        }
        covariance[i][i] = Math.max(1e-20, covariance[i][i]);
      }
      sigma *= Math.exp((cs / damping) * (psNorm / chiN - 1));
      sigma = Math.max(1e-16, Math.min(2, sigma));
      generation += 1;

      const leader = ranked[0];
      if (!best || leader.score < best.score - 1e-14 * Math.max(1, Math.abs(best.score))) {
        best = { score: leader.score, x: leader.x.slice(), metadata: leader.metadata };
        stall = 0;
      } else stall += 1;

      const updatedEigen = decomposition();
      const minimumEigenvalue = Math.min.apply(null, updatedEigen.values);
      const maximumEigenvalue = Math.max.apply(null, updatedEigen.values);
      const conditionNumber = maximumEigenvalue / Math.max(1e-20, minimumEigenvalue);
      const scores = ranked.map(function (sample) { return sample.score; });
      const coordinateStd = covariance.map(function (row, index) {
        return sigma * Math.sqrt(Math.max(0, row[index])) * scales[index];
      });
      const entropy = n * Math.log(Math.max(1e-300, sigma))
        + 0.5 * updatedEigen.values.reduce(function (sum, value) { return sum + Math.log(Math.max(1e-300, value)); }, 0)
        + 0.5 * n * (1 + Math.log(2 * Math.PI));
      const record = {
        generation,
        evaluations: generation * lambda,
        mean: toReal(mean),
        bestX: best.x.slice(),
        sigma,
        covariance: covariance.map(function (row) { return row.slice(); }),
        covarianceDiagonal: covariance.map(function (row, index) { return row[index]; }),
        eigenvalues: updatedEigen.values.slice(),
        conditionNumber,
        axisRatio: Math.sqrt(conditionNumber),
        coordinateStd,
        psNorm,
        pcNorm: norm(pc),
        entropy,
        bestScore: scores[0],
        medianScore: scores[Math.floor(scores.length / 2)],
        worstScore: scores[scores.length - 1],
        selectedCount: mu,
        selectedFraction: mu / lambda,
        feasibleFraction: ranked.filter(function (sample) { return sample.metadata && sample.metadata.feasible; }).length / ranked.length,
        population: ranked.map(function (sample, index) {
          return { x: sample.x.slice(), score: sample.score, selected: index < mu, metadata: sample.metadata };
        }),
      };
      history.push(record);
      pending = null;
      if (generation >= maxGenerations) terminationReason = 'max_generations';
      else if (stall >= stallGenerations) terminationReason = 'population_stalled';
      else if (sigma * Math.sqrt(maximumEigenvalue) <= stepTolerance) terminationReason = 'distribution_step_tolerance';
      else if (conditionNumber >= 1e14) terminationReason = 'covariance_condition_limit';
      return record;
    }

    return {
      ask,
      tell,
      get terminated() { return Boolean(terminationReason); },
      get terminationReason() { return terminationReason; },
      get generation() { return generation; },
      get populationSize() { return lambda; },
      get best() { return best; },
      get history() { return history; },
      getState: function () {
        return {
          generation,
          mean: toReal(mean),
          sigma,
          covariance: covariance.map(function (row) { return row.slice(); }),
          pc: pc.slice(),
          ps: ps.slice(),
          terminationReason,
        };
      },
    };
  }

  const api = { createStrategy, seededRandom, jacobiEigen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoCMAESCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
