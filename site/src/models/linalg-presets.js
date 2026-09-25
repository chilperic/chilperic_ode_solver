(function (root) {
  'use strict';
  root.FokoLinalgPresets = {
    'well-conditioned-solve': {
      title: 'Well-conditioned linear system',
      operation: 'solve',
      matrix: '4, 1, 0\n1, 3, 1\n0, 1, 2',
      vector: '1, 2, 3',
      note: 'A small symmetric positive-definite system with a unique solution and a directly checkable residual.'
    },
    'ill-conditioned-hilbert': {
      title: 'Hilbert conditioning stress test',
      operation: 'summary',
      matrix: '1, 0.5, 0.3333333333, 0.25\n0.5, 0.3333333333, 0.25, 0.2\n0.3333333333, 0.25, 0.2, 0.1666666667\n0.25, 0.2, 0.1666666667, 0.1428571429',
      vector: '1, 1, 1, 1',
      note: 'A dense matrix whose small singular values make finite-precision solutions sensitive to perturbations.'
    },
    'least-squares-line': {
      title: 'Overdetermined least squares',
      operation: 'least-squares',
      matrix: '1, 0\n1, 1\n1, 2\n1, 3\n1, 4',
      vector: '1.2, 2.1, 2.9, 4.2, 5.1',
      note: 'A design matrix with intercept and slope columns. Residual diagnostics remain descriptive, not a full regression analysis.'
    },
    'symmetric-spectrum': {
      title: 'Symmetric eigensystem',
      operation: 'eigen',
      matrix: '2, -1, 0\n-1, 2, -1\n0, -1, 2',
      vector: '1, 0, -1',
      note: 'A real symmetric tridiagonal matrix, for which the browser Jacobi eigensolver returns real eigenpairs and residual norms.'
    },
    'rank-deficient': {
      title: 'Rank-deficient matrix',
      operation: 'nullspace',
      matrix: '1, 2, 3\n2, 4, 6\n1, 1, 1',
      vector: '1, 2, 1',
      note: 'One row is an exact multiple of another. A unique inverse or unique least-squares coefficient vector is not established.'
    },
    'pca-correlated': {
      title: 'Correlated observations for PCA',
      operation: 'pca',
      matrix: '2.5, 2.4\n0.5, 0.7\n2.2, 2.9\n1.9, 2.2\n3.1, 3.0\n2.3, 2.7\n2.0, 1.6\n1.0, 1.1\n1.5, 1.6\n1.1, 0.9',
      vector: '1, 1',
      note: 'Rows are observations and columns are variables. PCA is descriptive and sensitive to scaling.'
    },
    'markov-chain': {
      title: 'Finite Markov chain',
      operation: 'markov',
      matrix: '0.7, 0.2, 0.1\n0.1, 0.8, 0.1\n0.2, 0.3, 0.5',
      vector: '0.333333, 0.333333, 0.333333',
      note: 'A row-stochastic transition matrix. Power iteration reports a stationary candidate and its residual, not uniqueness or mixing-time certification.'
    },
    'two-dimensional-transform': {
      title: 'Two-dimensional linear transform',
      operation: 'summary',
      matrix: '1.2, 0.6\n-0.3, 0.9',
      vector: '1, 1',
      note: 'A nonsymmetric 2×2 map suitable for visualizing transformed basis vectors and a regular grid.'
    }
  };
}(typeof window !== 'undefined' ? window : globalThis));
