(function(root){'use strict';
root.FokoAnalysisRegistry={
  statistics:{
    examples:[
      {label:'A/B Testing Framework',scenario:'E-commerce conversion data comparing checkout button variants with conversion and time-on-page measurements.'},
      {label:'Housing Price Predictor',scenario:'Urban real-estate table with price, floor area, location, age and crime-index covariates.'},
      {label:'Sensor Noise Calibrator',scenario:'Industrial gyroscope telemetry used to estimate baseline bias and variance uncertainty.'},
      {label:'Clinical Trial Survival',scenario:'Oncology time-to-relapse records with treatment group and censoring indicators.'},
      {label:'Credit Risk Scoring',scenario:'Loan applicant table with debt ratio, credit score, delinquency history and default outcome.'},
      {label:'Yield Optimization RSM',scenario:'Factorial reactor experiment varying catalyst concentration, temperature and pressure to maximize yield.'},
      {label:'Customer Churn Profiles',scenario:'SaaS behavioral telemetry used to segment accounts into renewal-risk profiles.'},
      {label:'Air Quality Forecasting',scenario:'Daily environmental series tracking PM2.5, humidity, wind and traffic-density risk drivers.'},
      {label:'Manufacturing Quality Control',scenario:'Assembly-line batch measurements for X-bar/R control-chart monitoring.'},
      {label:'Gene Expression Matrix',scenario:'Tumor-versus-control expression screen with multiple-testing correction.'}
    ],
    plots:['Box-and-whisker plots','Histogram with KDE overlays','Missingness heatmap','Quantile-quantile Q-Q plots','ROC / precision-recall curves','Residuals vs fitted scatterplot','Cook\'s distance plot','Confidence and prediction bands','Correlation matrix correlogram','Kaplan-Meier survival curves','Violin plots','Shewhart X-bar / R control chart']
  },
  fitting:{
    examples:[
      {label:'Enzyme kinetics',scenario:'Alcohol dehydrogenase reaction velocity versus substrate concentration using Michaelis-Menten kinetics.'},
      {label:'Population Dynamics',scenario:'Closed-bioreactor yeast density over time fitted with logistic growth.'},
      {label:'Isotopic Decay Stripping',scenario:'Mixed medical-isotope count-rate decay from Geiger telemetry.'},
      {label:'Stress-Strain Rheology',scenario:'Nonlinear tensile stress response of a carbon-fiber material sample.'},
      {label:'Pharmacokinetics PK/PD',scenario:'Post-dose serum concentration measurements for drug clearance fitting.'},
      {label:'Spectroscopic Peak Profiling',scenario:'Raman intensity versus shift used to resolve a peak profile.'},
      {label:'Thermal Expansion Logarithms',scenario:'Alloy expansion calibration across an extreme temperature range.'},
      {label:'Adsorption Isotherms',scenario:'Arsenic adsorption onto charcoal versus equilibrium concentration.'},
      {label:'Battery Discharge Profiles',scenario:'Voltage decay under constant load across a full discharge cycle.'},
      {label:'Semiclassical Wave Packets',scenario:'Oscillatory pulse amplitude under a Gaussian-like envelope.'}
    ],
    plots:['Overlay fit plot','2D parameter confidence ellipses','Residual time-series chronogram','Autocorrelation lag plot','Chi-square cost map','Parameter profile likelihood curves','Residual distribution histogram','Sensitivity coefficients plot','Leverage vs residual squared plot','Bootstrap parameter histograms','Component-plus-residual plot','Prediction error expansion envelope']
  },
  linalg:{
    examples:[
      {label:'PageRank Engine',scenario:'Sparse link-transition matrix for power-iteration ranking.'},
      {label:'Image SVD Compression',scenario:'Image-like matrix decomposed by singular values to study rank reduction.'},
      {label:'Orbital Target Tracking',scenario:'Overdetermined measurement system solved by least squares.'},
      {label:'Quantum State Mixing',scenario:'Hermitian coupling matrix diagonalized for energy-mode interpretation.'},
      {label:'Structural Truss Analysis',scenario:'Sparse equilibrium matrix representing structural force balances.'},
      {label:'Markov Population Shifting',scenario:'Class-transition matrix evolved over discrete time.'},
      {label:'Chemical Reaction Balancing',scenario:'Stoichiometric matrix analyzed through its null space.'},
      {label:'Financial Portfolio PCA',scenario:'Covariance/correlation matrix reduced to dominant variance directions.'},
      {label:'Computer Graphics Camera',scenario:'Homogeneous transformation matrix for rotation, translation and scaling.'},
      {label:'Diffusion Heat Transfer',scenario:'Finite-difference Laplacian matrix for thermal diffusion.'}
    ],
    plots:['Matrix sparsity spy plot','Transformation grid deformer','Gerschgorin complex disks','3D subspace projection orbit','Orthogonal error geometric lines','Eigenvalue spectrum bar chart','Vector field domain map','Determinant volume parallelotope','Condition number surface plot','Null-space coordinate slice','Singular value cumulative variance line','Matrix power-iteration convergence vector trace']
  },
  networks:{
    examples:[
      {label:'Electrical Grid Vulnerability',scenario:'Transmission-grid topology for centrality and failure-risk screening.'},
      {label:'Supply Chain Logistics',scenario:'Directed weighted shipping network for cost and path-delay analysis.'},
      {label:'Epidemiological Transmission',scenario:'Contact network for infection-path and barrier diagnostics.'},
      {label:'Software Call Graph',scenario:'Directed dependency graph of subroutines and execution calls.'},
      {label:'Financial Contagion Matrix',scenario:'Interbank lending graph for systemic exposure chains.'},
      {label:'Telecommunications Routing',scenario:'Fiber-router network with capacity-sensitive paths.'},
      {label:'Corporate Hierarchy Flows',scenario:'Communication-flow network across organizational units.'},
      {label:'Academic Citation Tree',scenario:'Directed acyclic citation lineage graph.'},
      {label:'Metabolic Pathway Map',scenario:'Bipartite enzyme-metabolite reaction network.'},
      {label:'Urban Traffic Congestion',scenario:'Street-intersection graph for bottleneck and resilience analysis.'}
    ],
    plots:['Force-directed node layout','Adjacency matrix heatmap','Degree log-log distribution plot','Highlighted shortest path map','Hierarchical clustering dendrogram','Circular chord diagram','K-core shell decomposition plot','Bipartite projection layout','Network resilience decay curve','Edge weight heat map scatter','Ego network radar target','Sankey flow diagram']
  }
};
}(typeof window!=='undefined'?window:globalThis));
