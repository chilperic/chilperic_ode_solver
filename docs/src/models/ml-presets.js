/* Foko Lab v72.9 ML example library.
 * Synthetic teaching and stress-test datasets; not empirical evidence.
 */
(function (root) {
  'use strict';

  function csv(header, rows) { return [header].concat(rows).join('\n'); }

  const presets = {
    'linear-calibration': {
      title: 'Linear calibration with measurement noise', family: 'Regression', difficulty: 'Foundational', task: 'regression', model: 'compare', target: 'response', features: ['dose'],
      note: 'Checks whether a linear baseline recovers a near-linear calibration curve. The data are synthetic and do not validate a real assay.',
      data: csv('dose,response', ['0,1.2','1,2.9','2,5.1','3,6.8','4,9.2','5,10.7','6,13.4','7,14.8','8,17.1','9,18.9','10,21.4','11,22.7','12,25.3','13,26.6','14,29.1','15,30.8'])
    },
    'nonlinear-underfit': {
      title: 'Nonlinear response under a linear model', family: 'Regression', difficulty: 'Stress test', task: 'regression', model: 'compare', target: 'response', features: ['dose'],
      note: 'A linear model is deliberately misspecified. Residual structure should remain visible instead of being hidden by a high-level score.',
      data: csv('dose,response', ['0,0.2','0.5,0.8','1,1.5','1.5,2.4','2,3.7','2.5,5.6','3,8.1','3.5,11.0','4,14.8','4.5,19.1','5,24.9','5.5,30.3','6,36.8','6.5,44.5','7,52.7'])
    },
    'heteroscedastic-regression': {
      title: 'Heteroscedastic regression', family: 'Regression', difficulty: 'Diagnostic', task: 'regression', model: 'ridge', target: 'y', features: ['x'],
      note: 'Noise grows with x. Ordinary regression scores do not repair non-constant variance or justify narrow uncertainty bands.',
      data: csv('x,y', ['1,2.2','2,3.7','3,6.5','4,8.8','5,8.9','6,14.8','7,11.6','8,18.9','9,14.0','10,24.7','11,18.8','12,29.1','13,20.5','14,35.0','15,24.4','16,40.8'])
    },
    'collinear-predictors': {
      title: 'Collinear predictors', family: 'Regression', difficulty: 'Diagnostic', task: 'regression', model: 'compare', target: 'y', features: ['x1','x2','x3'],
      note: 'x2 is nearly redundant with x1. Ridge may be more stable, but coefficients remain conditional on scale and model specification.',
      data: csv('x1,x2,x3,y', ['1,1.03,4,5.1','2,1.98,2,6.0','3,3.05,5,10.2','4,4.02,1,9.3','5,5.08,3,13.5','6,5.95,6,17.4','7,7.04,2,16.8','8,8.02,7,21.7','9,9.10,4,22.5','10,9.96,8,27.1','11,11.06,3,25.8','12,12.01,9,31.9'])
    },
    'extrapolation-risk': {
      title: 'Extrapolation risk', family: 'Regression', difficulty: 'Scientific boundary', task: 'regression', model: 'linear', target: 'response', features: ['temperature'],
      note: 'The observed range is narrow. Cross-validation within that range does not establish accuracy outside it.',
      data: csv('temperature,response', ['18,5.1','19,5.5','20,5.9','21,6.4','22,6.8','23,7.2','24,7.8','25,8.0','26,8.6','27,8.8','28,9.4','29,9.8'])
    },
    'binary-separable': {
      title: 'Nearly separable binary classes', family: 'Classification', difficulty: 'Foundational', task: 'classification', model: 'compare', target: 'label', features: ['x1','x2'],
      note: 'A high score is expected on this synthetic dataset. It does not establish probability calibration or external generalization.',
      data: csv('x1,x2,label', ['0.7,1.1,0','1.0,0.8,0','1.2,1.4,0','1.5,1.0,0','1.7,1.6,0','2.0,1.2,0','4.1,4.8,1','4.5,4.2,1','4.8,5.1,1','5.2,4.7,1','5.4,5.3,1','5.8,4.9,1','6.1,5.7,1','6.3,5.1,1'])
    },
    'overlapping-classes': {
      title: 'Overlapping classes', family: 'Classification', difficulty: 'Diagnostic', task: 'classification', model: 'compare', target: 'label', features: ['x1','x2'],
      note: 'No classifier can remove intrinsic overlap. Inspect ROC, precision–recall, calibration and fold variability instead of accuracy alone.',
      data: csv('x1,x2,label', ['1.0,1.2,0','1.4,1.0,0','1.8,1.6,0','2.0,2.1,0','2.3,1.8,0','2.6,2.4,0','2.2,2.0,1','2.5,2.6,1','2.8,2.1,1','3.0,2.9,1','3.3,2.5,1','3.5,3.2,1','1.9,2.4,1','2.7,1.7,0','3.1,2.2,0','2.4,3.0,1'])
    },
    'imbalanced-classification': {
      title: 'Imbalanced rare-event classification', family: 'Classification', difficulty: 'Stress test', task: 'classification', model: 'compare', target: 'event', features: ['score1','score2'],
      note: 'Accuracy is misleading because positives are rare. Balanced accuracy, precision–recall and calibration are more informative.',
      data: csv('score1,score2,event', ['0.2,0.4,0','0.4,0.5,0','0.6,0.3,0','0.7,0.8,0','0.9,0.6,0','1.0,0.9,0','1.1,0.7,0','1.3,1.0,0','1.4,1.2,0','1.5,0.9,0','1.6,1.4,0','1.8,1.3,0','2.0,1.5,0','2.1,1.7,0','2.3,1.8,0','2.5,2.0,0','2.7,2.2,0','2.9,2.1,0','3.2,2.8,1','3.6,3.1,1','2.8,3.0,1'])
    },
    'calibration-shift': {
      title: 'Probability calibration stress test', family: 'Classification', difficulty: 'Diagnostic', task: 'classification', model: 'logistic', target: 'label', features: ['marker1','marker2'],
      note: 'The class boundary is noisy. A discrimination metric can remain acceptable while probabilities are poorly calibrated.',
      data: csv('marker1,marker2,label', ['0.2,0.1,0','0.4,0.7,0','0.8,0.6,0','1.0,1.1,0','1.2,0.9,1','1.4,1.5,0','1.6,1.2,1','1.8,1.9,1','2.0,1.5,0','2.2,2.3,1','2.4,1.9,1','2.6,2.8,1','2.8,2.2,1','3.0,3.1,1','3.2,2.5,0','3.4,3.5,1'])
    },
    'leakage-trap': {
      title: 'Leakage trap with record identifier', family: 'Classification', difficulty: 'Scientific boundary', task: 'classification', model: 'compare', target: 'label', features: ['signal','noise'],
      note: 'The ID column is intentionally excluded. Adding it can create a spurious score and demonstrates why feature provenance matters.',
      data: csv('record_id,signal,noise,label', ['101,0.2,1.1,0','102,0.4,0.8,0','103,0.7,1.4,0','104,0.9,1.0,0','105,1.1,1.6,0','106,1.3,1.2,0','201,2.0,1.8,1','202,2.2,2.1,1','203,2.5,1.9,1','204,2.8,2.6,1','205,3.0,2.3,1','206,3.2,2.9,1'])
    },
    'three-clusters': {
      title: 'Three compact clusters', family: 'Clustering', difficulty: 'Foundational', task: 'clustering', model: 'kmeans', target: '', features: ['x1','x2'],
      note: 'Cluster labels are algorithmic partitions, not discovered biological or physical truth.',
      data: csv('x1,x2', ['0.8,1.0','1.0,0.7','1.2,1.1','0.9,1.4','1.4,0.9','4.7,5.1','5.0,4.8','5.2,5.3','4.8,5.5','5.5,4.9','8.0,1.0','8.2,1.3','7.7,0.8','8.5,0.9','7.9,1.6'])
    },
    'anisotropic-clusters': {
      title: 'Anisotropic clusters', family: 'Clustering', difficulty: 'Stress test', task: 'clustering', model: 'kmeans', target: '', features: ['x1','x2'],
      note: 'K-means assumes roughly spherical Euclidean groups and can misrepresent elongated structure.',
      data: csv('x1,x2', ['0,0.1','0.5,0.4','1.0,0.8','1.5,1.2','2.0,1.6','2.5,2.0','3.0,2.4','0.4,3.1','0.9,3.3','1.4,3.6','1.9,3.8','2.4,4.1','2.9,4.3','3.4,4.6'])
    },
    'pca-correlated': {
      title: 'Correlated multivariate measurements', family: 'Dimensionality reduction', difficulty: 'Foundational', task: 'pca', model: 'pca', target: '', features: ['v1','v2','v3','v4'],
      note: 'PCA summarizes sample variance after standardization. Components are not automatically mechanistic factors.',
      data: csv('v1,v2,v3,v4', ['1.0,1.1,0.9,2.0','1.4,1.5,1.1,2.5','1.9,2.0,1.5,3.1','2.3,2.5,1.8,3.6','2.8,3.0,2.2,4.2','3.2,3.4,2.6,4.8','3.7,3.8,2.9,5.3','4.1,4.4,3.3,5.9','4.6,4.8,3.7,6.4','5.0,5.2,4.1,7.0'])
    },
    'small-n-high-p': {
      title: 'Small-n, high-p warning', family: 'Regression', difficulty: 'Scientific boundary', task: 'regression', model: 'ridge', target: 'y', features: ['x1','x2','x3','x4','x5','x6'],
      note: 'The feature count is large relative to the number of rows. Cross-validation variance and coefficient instability must be treated as central evidence.',
      data: csv('x1,x2,x3,x4,x5,x6,y', ['1,2,0,1,4,2,5.2','2,1,1,0,3,4,6.1','3,2,1,2,2,3,8.4','4,3,2,1,1,5,10.2','5,4,3,2,0,4,12.5','6,5,2,3,1,6,14.0','7,6,4,2,2,5,16.7','8,7,3,4,3,7,18.1','9,8,5,3,4,6,20.4','10,9,4,5,5,8,22.0'])
    }
  };

  root.FokoMLPresets = presets;
  if (typeof module !== 'undefined' && module.exports) module.exports = presets;
})(typeof window !== 'undefined' ? window : globalThis);
