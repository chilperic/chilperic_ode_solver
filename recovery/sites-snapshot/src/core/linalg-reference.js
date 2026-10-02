(function (root) {
  'use strict';

  const EPS = 1e-12;

  function cloneMatrix(A) { return A.map(function (row) { return row.slice(); }); }
  function assertFiniteNumber(value, name) {
    if (!Number.isFinite(value)) throw new Error(name + ' must be finite.');
    return value;
  }
  function validateMatrix(A, options) {
    options = options || {};
    if (!Array.isArray(A) || A.length === 0 || !Array.isArray(A[0]) || A[0].length === 0) {
      throw new Error((options.name || 'matrix') + ' must be a non-empty matrix.');
    }
    const cols = A[0].length;
    A.forEach(function (row, i) {
      if (!Array.isArray(row) || row.length !== cols) throw new Error((options.name || 'matrix') + ' must be rectangular; row ' + (i + 1) + ' has the wrong length.');
      row.forEach(function (value, j) { assertFiniteNumber(value, (options.name || 'matrix') + '[' + i + ',' + j + ']'); });
    });
    if (options.square && A.length !== cols) throw new Error((options.name || 'matrix') + ' must be square.');
    return A;
  }
  function validateVector(v, n, name) {
    if (!Array.isArray(v) || v.length === 0) throw new Error((name || 'vector') + ' must be non-empty.');
    if (n != null && v.length !== n) throw new Error((name || 'vector') + ' length must equal ' + n + '.');
    v.forEach(function (value, i) { assertFiniteNumber(value, (name || 'vector') + '[' + i + ']'); });
    return v;
  }

  function parseMatrix(text) {
    const lines = String(text == null ? '' : text).trim().split(/\n+/).filter(function (line) { return line.trim(); });
    if (!lines.length) throw new Error('Matrix input is empty.');
    const matrix = lines.map(function (line, i) {
      const tokens = line.trim().split(/[\s,;]+/).filter(Boolean);
      if (!tokens.length) throw new Error('Matrix row ' + (i + 1) + ' is empty.');
      return tokens.map(function (token, j) {
        const value = Number(token);
        if (!Number.isFinite(value)) throw new Error('Matrix entry at row ' + (i + 1) + ', column ' + (j + 1) + ' is not finite.');
        return value;
      });
    });
    return validateMatrix(matrix, { name: 'matrix' });
  }

  function parseVector(text, allowEmpty) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw && allowEmpty) return [];
    if (!raw) throw new Error('Vector input is empty.');
    const vector = raw.split(/[\s,;]+/).filter(Boolean).map(function (token, i) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error('Vector entry ' + (i + 1) + ' is not finite.');
      return value;
    });
    return validateVector(vector, null, 'vector');
  }

  function transpose(A) {
    validateMatrix(A);
    return A[0].map(function (_, j) { return A.map(function (row) { return row[j]; }); });
  }
  function identity(n) {
    if (!Number.isInteger(n) || n <= 0) throw new Error('identity size must be a positive integer.');
    return Array.from({ length: n }, function (_, i) {
      return Array.from({ length: n }, function (_, j) { return i === j ? 1 : 0; });
    });
  }
  function dot(a, b) {
    validateVector(a, null, 'a');
    validateVector(b, a.length, 'b');
    return a.reduce(function (sum, value, i) { return sum + value * b[i]; }, 0);
  }
  function norm2(v) { return Math.sqrt(dot(v, v)); }
  function frobenius(A) {
    validateMatrix(A);
    return Math.sqrt(A.reduce(function (sum, row) { return sum + row.reduce(function (s, value) { return s + value * value; }, 0); }, 0));
  }
  function matvec(A, v) {
    validateMatrix(A);
    validateVector(v, A[0].length, 'vector');
    return A.map(function (row) { return row.reduce(function (sum, value, j) { return sum + value * v[j]; }, 0); });
  }
  function matmul(A, B) {
    validateMatrix(A, { name: 'A' });
    validateMatrix(B, { name: 'B' });
    if (A[0].length !== B.length) throw new Error('A columns must equal B rows.');
    const Bt = transpose(B);
    return A.map(function (row) {
      return Bt.map(function (col) { return row.reduce(function (sum, value, k) { return sum + value * col[k]; }, 0); });
    });
  }
  function subtractVectors(a, b) { return a.map(function (value, i) { return value - b[i]; }); }
  function subtractMatrices(A, B) { return A.map(function (row, i) { return row.map(function (value, j) { return value - B[i][j]; }); }); }
  function maxAbs(v) { return v.reduce(function (m, value) { return Math.max(m, Math.abs(value)); }, 0); }

  function luDecomposition(A, tolerance) {
    validateMatrix(A, { name: 'A', square: true });
    const n = A.length;
    const U = cloneMatrix(A);
    const L = identity(n);
    const P = identity(n);
    const pivots = Array.from({ length: n }, function (_, i) { return i; });
    const scale = Math.max(1, frobenius(A));
    const tol = (tolerance == null ? EPS : Math.abs(Number(tolerance))) * scale;
    let swaps = 0;
    let rank = n;
    for (let k = 0; k < n; k += 1) {
      let pivot = k;
      for (let i = k + 1; i < n; i += 1) if (Math.abs(U[i][k]) > Math.abs(U[pivot][k])) pivot = i;
      if (Math.abs(U[pivot][k]) <= tol) {
        rank = k;
        throw new Error('Matrix is singular or numerically rank deficient at pivot ' + (k + 1) + '.');
      }
      if (pivot !== k) {
        const tmpU = U[k]; U[k] = U[pivot]; U[pivot] = tmpU;
        const tmpP = P[k]; P[k] = P[pivot]; P[pivot] = tmpP;
        const tmpIndex = pivots[k]; pivots[k] = pivots[pivot]; pivots[pivot] = tmpIndex;
        for (let j = 0; j < k; j += 1) {
          const tmp = L[k][j]; L[k][j] = L[pivot][j]; L[pivot][j] = tmp;
        }
        swaps += 1;
      }
      for (let i = k + 1; i < n; i += 1) {
        L[i][k] = U[i][k] / U[k][k];
        for (let j = k; j < n; j += 1) U[i][j] -= L[i][k] * U[k][j];
      }
    }
    return { L: L, U: U, P: P, pivots: pivots, swaps: swaps, rank: rank, tolerance: tol };
  }

  function forwardSubstitution(L, b) {
    const n = L.length;
    const y = Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      let sum = b[i];
      for (let j = 0; j < i; j += 1) sum -= L[i][j] * y[j];
      y[i] = sum / L[i][i];
    }
    return y;
  }
  function backSubstitution(U, y, tolerance) {
    const n = U.length;
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i -= 1) {
      let sum = y[i];
      for (let j = i + 1; j < n; j += 1) sum -= U[i][j] * x[j];
      if (Math.abs(U[i][i]) <= tolerance) throw new Error('Back substitution encountered a near-zero pivot.');
      x[i] = sum / U[i][i];
    }
    return x;
  }
  function solveLinear(A, b, tolerance) {
    validateMatrix(A, { name: 'A', square: true });
    validateVector(b, A.length, 'b');
    const lu = luDecomposition(A, tolerance);
    const Pb = lu.P.map(function (row) { return dot(row, b); });
    const y = forwardSubstitution(lu.L, Pb);
    const x = backSubstitution(lu.U, y, lu.tolerance);
    const residual = subtractVectors(matvec(A, x), b);
    return {
      solution: x,
      residual: residual,
      residualNorm: norm2(residual),
      relativeResidual: norm2(residual) / Math.max(norm2(b), EPS),
      decomposition: lu,
    };
  }

  function determinant(A, tolerance) {
    try {
      const lu = luDecomposition(A, tolerance);
      return (lu.swaps % 2 ? -1 : 1) * lu.U.reduce(function (value, row, i) { return value * row[i]; }, 1);
    } catch (error) {
      if (/singular|rank deficient/i.test(error.message)) return 0;
      throw error;
    }
  }

  function inverse(A, tolerance) {
    validateMatrix(A, { square: true });
    const n = A.length;
    const columns = identity(n).map(function (e) { return solveLinear(A, e, tolerance).solution; });
    const inverseMatrix = transpose(columns);
    const reconstruction = matmul(A, inverseMatrix);
    const residualMatrix = subtractMatrices(reconstruction, identity(n));
    return {
      inverse: inverseMatrix,
      reconstruction: reconstruction,
      residualNorm: frobenius(residualMatrix),
    };
  }

  function modifiedGramSchmidt(A, tolerance) {
    validateMatrix(A, { name: 'A' });
    const m = A.length;
    const n = A[0].length;
    if (m < n) throw new Error('QR least squares requires rows >= columns.');
    const columns = transpose(A);
    const qColumns = [];
    const R = Array.from({ length: n }, function () { return Array(n).fill(0); });
    const tol = (tolerance == null ? EPS : Math.abs(Number(tolerance))) * Math.max(1, frobenius(A));
    let rank = 0;
    for (let j = 0; j < n; j += 1) {
      let v = columns[j].slice();
      for (let i = 0; i < j; i += 1) {
        R[i][j] = dot(qColumns[i], v);
        v = v.map(function (value, k) { return value - R[i][j] * qColumns[i][k]; });
      }
      R[j][j] = norm2(v);
      if (R[j][j] <= tol) {
        qColumns.push(Array(m).fill(0));
      } else {
        qColumns.push(v.map(function (value) { return value / R[j][j]; }));
        rank += 1;
      }
    }
    return { Q: transpose(qColumns), R: R, rank: rank, tolerance: tol };
  }

  function leastSquares(A, b, tolerance) {
    validateMatrix(A, { name: 'A' });
    validateVector(b, A.length, 'b');
    const qr = modifiedGramSchmidt(A, tolerance);
    const n = A[0].length;
    if (qr.rank < n) throw new Error('Design matrix is rank deficient; a unique least-squares coefficient vector is not established.');
    const Qtb = transpose(qr.Q).map(function (row) { return dot(row, b); });
    const coefficients = backSubstitution(qr.R, Qtb, qr.tolerance);
    const fitted = matvec(A, coefficients);
    const residual = subtractVectors(fitted, b);
    return {
      coefficients: coefficients,
      fitted: fitted,
      residual: residual,
      residualNorm: norm2(residual),
      relativeResidual: norm2(residual) / Math.max(norm2(b), EPS),
      rank: qr.rank,
      decomposition: qr,
    };
  }

  function isSymmetric(A, tolerance) {
    validateMatrix(A, { square: true });
    const tol = tolerance == null ? 1e-10 : Math.abs(Number(tolerance));
    for (let i = 0; i < A.length; i += 1) for (let j = i + 1; j < A.length; j += 1) {
      if (Math.abs(A[i][j] - A[j][i]) > tol * (1 + Math.abs(A[i][j]) + Math.abs(A[j][i]))) return false;
    }
    return true;
  }

  function symmetricEigenDecomposition(A, options) {
    validateMatrix(A, { name: 'A', square: true });
    options = options || {};
    if (!isSymmetric(A, options.symmetryTolerance)) throw new Error('Symmetric eigendecomposition requires a symmetric matrix.');
    const n = A.length;
    if (n > (options.maxSize || 30)) throw new Error('Browser symmetric eigendecomposition is limited to matrices of size ' + (options.maxSize || 30) + ' or smaller.');
    const D = cloneMatrix(A);
    const V = identity(n);
    const tolerance = options.tolerance == null ? 1e-12 : Math.abs(Number(options.tolerance));
    const maxSweeps = options.maxSweeps == null ? 120 : Math.max(1, Math.floor(options.maxSweeps));
    let sweeps = 0;
    let maxOff = Infinity;
    for (; sweeps < maxSweeps; sweeps += 1) {
      let p = 0; let q = 1; maxOff = 0;
      for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) {
        if (Math.abs(D[i][j]) > maxOff) { maxOff = Math.abs(D[i][j]); p = i; q = j; }
      }
      if (maxOff <= tolerance * Math.max(1, frobenius(D))) break;
      const app = D[p][p]; const aqq = D[q][q]; const apq = D[p][q];
      const angle = 0.5 * Math.atan2(2 * apq, aqq - app);
      const c = Math.cos(angle); const s = Math.sin(angle);
      for (let k = 0; k < n; k += 1) {
        if (k === p || k === q) continue;
        const dkp = D[k][p]; const dkq = D[k][q];
        D[k][p] = D[p][k] = c * dkp - s * dkq;
        D[k][q] = D[q][k] = s * dkp + c * dkq;
      }
      D[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      D[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      D[p][q] = D[q][p] = 0;
      for (let k = 0; k < n; k += 1) {
        const vkp = V[k][p]; const vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq;
        V[k][q] = s * vkp + c * vkq;
      }
    }
    const pairs = D.map(function (row, i) {
      return { value: row[i], vector: V.map(function (r) { return r[i]; }) };
    }).sort(function (a, b) { return b.value - a.value; });
    const values = pairs.map(function (pair) { return pair.value; });
    const vectors = transpose(pairs.map(function (pair) { return pair.vector; }));
    const residuals = pairs.map(function (pair) {
      return norm2(subtractVectors(matvec(A, pair.vector), pair.vector.map(function (value) { return value * pair.value; })));
    });
    return { values: values, vectors: vectors, sweeps: sweeps, converged: sweeps < maxSweeps, maxOffDiagonal: maxOff, residuals: residuals };
  }

  function singularValueDiagnostics(A, options) {
    validateMatrix(A, { name: 'A' });
    options = options || {};
    const AtA = matmul(transpose(A), A);
    const eig = symmetricEigenDecomposition(AtA, options);
    const singularValues = eig.values.map(function (value) { return Math.sqrt(Math.max(0, value)); });
    const largest = singularValues[0] || 0;
    const tolerance = (options.rankTolerance == null ? 1e-10 : Math.abs(Number(options.rankTolerance))) * Math.max(1, largest);
    const rank = singularValues.filter(function (value) { return value > tolerance; }).length;
    const smallestNonzero = singularValues.filter(function (value) { return value > tolerance; }).slice(-1)[0];
    const conditionEstimate = smallestNonzero == null ? Infinity : largest / smallestNonzero;
    return {
      singularValues: singularValues,
      rank: rank,
      tolerance: tolerance,
      conditionEstimate: conditionEstimate,
      eigenResiduals: eig.residuals,
      method: 'eigenvalues of AᵀA; suitable for small dense diagnostics, not a production SVD',
    };
  }

  function rref(A, tolerance) {
    validateMatrix(A, { name: 'A' });
    const R = cloneMatrix(A);
    const rows = R.length; const cols = R[0].length;
    const tol = (tolerance == null ? EPS : Math.abs(Number(tolerance))) * Math.max(1, frobenius(A));
    const pivots = [];
    let row = 0;
    for (let col = 0; col < cols && row < rows; col += 1) {
      let pivot = row;
      for (let i = row + 1; i < rows; i += 1) if (Math.abs(R[i][col]) > Math.abs(R[pivot][col])) pivot = i;
      if (Math.abs(R[pivot][col]) <= tol) continue;
      const temp = R[row]; R[row] = R[pivot]; R[pivot] = temp;
      const divisor = R[row][col];
      for (let j = 0; j < cols; j += 1) R[row][j] /= divisor;
      for (let i = 0; i < rows; i += 1) {
        if (i === row) continue;
        const factor = R[i][col];
        for (let j = 0; j < cols; j += 1) R[i][j] -= factor * R[row][j];
      }
      pivots.push(col); row += 1;
    }
    return { matrix: R, pivots: pivots, rank: pivots.length, tolerance: tol };
  }

  function nullSpace(A, tolerance) {
    const reduced = rref(A, tolerance);
    const cols = A[0].length;
    const pivotSet = new Set(reduced.pivots);
    const free = Array.from({ length: cols }, function (_, i) { return i; }).filter(function (i) { return !pivotSet.has(i); });
    const basis = free.map(function (freeCol) {
      const vector = Array(cols).fill(0); vector[freeCol] = 1;
      reduced.pivots.forEach(function (pivotCol, row) { vector[pivotCol] = -reduced.matrix[row][freeCol]; });
      return vector;
    });
    return { basis: basis, nullity: basis.length, rank: reduced.rank, residualNorms: basis.map(function (v) { return norm2(matvec(A, v)); }) };
  }

  function pca(A, options) {
    validateMatrix(A, { name: 'data' });
    if (A.length < 2) throw new Error('PCA requires at least two rows.');
    const means = transpose(A).map(function (column) { return column.reduce(function (sum, value) { return sum + value; }, 0) / column.length; });
    const centered = A.map(function (row) { return row.map(function (value, j) { return value - means[j]; }); });
    const covariance = matmul(transpose(centered), centered).map(function (row) { return row.map(function (value) { return value / (A.length - 1); }); });
    const eig = symmetricEigenDecomposition(covariance, options);
    const total = eig.values.reduce(function (sum, value) { return sum + Math.max(0, value); }, 0);
    const explained = eig.values.map(function (value) { return total > 0 ? Math.max(0, value) / total : 0; });
    const scores = matmul(centered, eig.vectors);
    return { means: means, centered: centered, covariance: covariance, eigenvalues: eig.values, components: eig.vectors, explainedVarianceRatio: explained, scores: scores, residuals: eig.residuals };
  }

  function stationaryDistribution(P, options) {
    validateMatrix(P, { name: 'P', square: true });
    options = options || {};
    const tolerance = options.tolerance == null ? 1e-12 : Math.abs(Number(options.tolerance));
    const maxIterations = options.maxIterations == null ? 5000 : Math.max(1, Math.floor(options.maxIterations));
    P.forEach(function (row, i) {
      if (row.some(function (value) { return value < -tolerance; })) throw new Error('Transition matrix contains a negative entry in row ' + (i + 1) + '.');
      const sum = row.reduce(function (s, value) { return s + value; }, 0);
      if (Math.abs(sum - 1) > 1e-9) throw new Error('Transition matrix row ' + (i + 1) + ' must sum to 1.');
    });
    const Pt = transpose(P);
    let distribution = Array(P.length).fill(1 / P.length);
    let delta = Infinity; let iterations = 0;
    for (; iterations < maxIterations; iterations += 1) {
      const next = matvec(Pt, distribution);
      const sum = next.reduce(function (s, value) { return s + value; }, 0);
      distribution = next.map(function (value) { return value / sum; });
      const previous = matvec(Pt, distribution);
      delta = norm2(subtractVectors(previous, distribution));
      if (delta <= tolerance) break;
    }
    const residual = subtractVectors(matvec(Pt, distribution), distribution);
    return { distribution: distribution, iterations: iterations + 1, converged: delta <= tolerance, residualNorm: norm2(residual), tolerance: tolerance };
  }

  function matrixSummary(A, options) {
    validateMatrix(A, { name: 'A' });
    const rows = A.length; const cols = A[0].length;
    const svd = singularValueDiagnostics(A, options);
    return {
      rows: rows,
      columns: cols,
      square: rows === cols,
      symmetric: rows === cols ? isSymmetric(A) : false,
      determinant: rows === cols ? determinant(A, options && options.tolerance) : null,
      rank: svd.rank,
      singularValues: svd.singularValues,
      conditionEstimate: svd.conditionEstimate,
      frobeniusNorm: frobenius(A),
      method: svd.method,
    };
  }

  const api = {
    parseMatrix: parseMatrix,
    parseVector: parseVector,
    validateMatrix: validateMatrix,
    validateVector: validateVector,
    transpose: transpose,
    identity: identity,
    dot: dot,
    norm2: norm2,
    frobenius: frobenius,
    matvec: matvec,
    matmul: matmul,
    luDecomposition: luDecomposition,
    solveLinear: solveLinear,
    determinant: determinant,
    inverse: inverse,
    modifiedGramSchmidt: modifiedGramSchmidt,
    leastSquares: leastSquares,
    isSymmetric: isSymmetric,
    symmetricEigenDecomposition: symmetricEigenDecomposition,
    singularValueDiagnostics: singularValueDiagnostics,
    rref: rref,
    nullSpace: nullSpace,
    pca: pca,
    stationaryDistribution: stationaryDistribution,
    matrixSummary: matrixSummary,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoLinalgReference = api;
}(typeof window !== 'undefined' ? window : globalThis));
