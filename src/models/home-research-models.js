/* Foko Lab home-page research model definitions.
 * Model-specific right-hand sides only; integration is delegated to FokoODECore.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoHomeResearchModels = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const fattyAcidMetabolism = {
    id: 'fa-metabolism-reduced-public',
    title: 'Reduced fatty-acid metabolism model',
    variables: ['Acetyl-CoA', 'Malonyl-CoA', 'Fatty acids', 'Triglycerides'],
    config: {
      t0: 0,
      t1: 80,
      points: 420,
      y0: [1.2, 0.55, 1.0, 0.8],
      vars: ['S1', 'S2', 'S3', 'S4'],
      method: 'rk45',
      rtol: 1e-6,
      atol: 1e-9
    },
    parameters: {
      k1: 0.55, k2: 0.25, k3: 0.18,
      alpha: 0.2, beta: 0.18, gamma: 0.14,
      V1: 1.2, Km1: 0.6, q1: 1.1,
      V2: 0.9, Km2: 0.45,
      V3: 0.7, Km3: 0.5,
      V4: 0.8, Km4: 0.55, q4: 1.0,
      V5: 0.55, Km5: 0.5
    },
    rhs: function (_t, y, p) {
      const S1 = y[0], S2 = y[1], S3 = y[2], S4 = y[3];
      const v1 = p.V1 * S1 / ((p.Km1 + S1) * (1 + p.q1 * S3));
      const v2 = p.V2 * S2 / (p.Km2 + S2);
      const v3 = p.V3 * S3 / (p.Km3 + S3);
      const v4 = p.V4 * S3 / ((p.Km4 + S3) * (1 + p.q4 * S2));
      const v5 = p.V5 * S4 / (p.Km5 + S4);
      return [
        p.k1 - v1 + v4 - p.alpha * S1,
        v1 - v2,
        p.k2 + v2 - v3 - v4 + v5 - p.beta * S3,
        p.k3 + v3 - v5 - p.gamma * S4
      ];
    }
  };


  const fadnsReduced = {
    id: 'fadns-reduced-public',
    title: 'Reduced public FADNS model',
    variables: ['Acetyl-CoA', 'Malonyl-CoA', 'NADPH', 'EC2', 'EC14', 'EC16', 'EC18', 'C14:0', 'C16:0', 'C18:0'],
    config: {
      t0: 0,
      t1: 120,
      points: 220,
      y0: [120, 18, 160, 0, 0, 0, 0, 0, 0, 0],
      vars: ['AcetCoA', 'MalCoA', 'NADPH', 'EC2', 'EC14', 'EC16', 'EC18', 'C14', 'C16', 'C18'],
      method: 'rk45',
      rtol: 1e-7,
      atol: 1e-9
    },
    parameters: {
      kon: 0.018,
      kappa: 0.00002,
      delta14: 0.010,
      delta16: 0.026,
      delta18: 0.012
    },
    rhs: function (_t, y, p) {
      const AcetCoA = Math.max(0, y[0]);
      const MalCoA = Math.max(0, y[1]);
      const NADPH = Math.max(0, y[2]);
      const EC2 = Math.max(0, y[3]);
      const EC14 = Math.max(0, y[4]);
      const EC16 = Math.max(0, y[5]);
      const EC18 = Math.max(0, y[6]);
      const initiation = p.kon * AcetCoA;
      const elongate14 = p.kappa * EC2 * MalCoA * NADPH;
      const elongate16 = p.kappa * EC14 * MalCoA * NADPH;
      const elongate18 = p.kappa * EC16 * MalCoA * NADPH;
      const release14 = p.delta14 * EC14;
      const release16 = p.delta16 * EC16;
      const release18 = p.delta18 * EC18;
      return [
        -initiation,
        -elongate14 - elongate16 - elongate18,
        -2 * (elongate14 + elongate16 + elongate18),
        initiation - elongate14,
        elongate14 - elongate16 - release14,
        elongate16 - elongate18 - release16,
        elongate18 - release18,
        release14,
        release16,
        release18
      ];
    }
  };

  return { fattyAcidMetabolism: fattyAcidMetabolism, fadnsReduced: fadnsReduced };
}));
