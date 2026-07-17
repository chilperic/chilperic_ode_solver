/* Curated v72.4 Statistics reference datasets. Small by design and reproducible. */
(function (root) {
  'use strict';
  root.FokoStatisticsPresets = {
    regression: {
      title: 'Dose–response regression',
      family: 'Linear regression', category: 'Regression', level: 'Intermediate',
      mode: 'regression', x: 'dose', y: 'response', group: 'batch', event: 'response',
      narrative: 'A small synthetic dose–response dataset with batch labels and one deliberately missing response.',
      scientificNote: 'OLS quantifies a linear association conditional on independence, linearity, constant variance and an appropriate error model. The demo does not establish causality.',
      data: `dose,response,batch
0.0,2.1,A
0.5,2.9,A
1.0,4.0,A
1.5,4.8,A
2.0,6.2,A
2.5,7.1,A
3.0,8.0,A
3.5,9.2,A
4.0,10.0,A
4.5,11.4,A
0.2,2.5,B
0.7,3.2,B
1.2,4.5,B
1.7,5.3,B
2.2,6.5,B
2.7,7.4,B
3.2,8.7,B
3.7,9.4,B
4.2,10.8,B
4.7,NA,B`
    },
    welch: {
      title: 'Two-group intervention comparison',
      family: 'Welch two-sample test', category: 'Group comparison', level: 'Intermediate',
      mode: 'welch', x: 'baseline', y: 'change', group: 'group', event: 'change',
      narrative: 'Unequal group sizes and variances motivate Welch’s test rather than the equal-variance pooled t-test.',
      scientificNote: 'The p-value tests a mean difference under independent sampling. Hedges’ g is reported as a standardized descriptive effect, not as a causal estimate.',
      data: `baseline,change,group
12.0,1.2,control
11.5,0.4,control
13.2,1.8,control
10.8,-0.2,control
12.7,0.9,control
11.9,1.0,control
13.5,1.5,control
12.1,0.2,control
11.2,0.7,control
12.9,1.1,control
12.4,2.4,treatment
11.7,3.1,treatment
13.0,2.8,treatment
10.9,1.9,treatment
12.8,3.6,treatment
11.6,2.2,treatment
13.4,4.0,treatment
12.0,2.7,treatment
11.3,NA,treatment
13.1,3.4,treatment
12.5,2.0,treatment
11.8,3.8,treatment`
    },
    anova: {
      title: 'Three-protocol yield comparison',
      family: 'One-way group comparison', category: 'Group comparison', level: 'Intermediate',
      mode: 'anova', x: 'run', y: 'yield', group: 'protocol', event: 'yield',
      narrative: 'Three protocols are compared using both one-way ANOVA and a Kruskal–Wallis sensitivity check.',
      scientificNote: 'ANOVA is an omnibus test and does not identify which groups differ. No post-hoc pairwise procedure is claimed in this release.',
      data: `run,yield,protocol
1,71,A
2,68,A
3,74,A
4,70,A
5,69,A
6,73,A
7,72,A
8,67,A
1,76,B
2,79,B
3,75,B
4,81,B
5,77,B
6,78,B
7,80,B
8,74,B
1,83,C
2,86,C
3,82,C
4,88,C
5,85,C
6,84,C
7,89,C
8,87,C`
    },
    bootstrap: {
      title: 'Sensor offset bootstrap',
      family: 'Bootstrap uncertainty', category: 'Uncertainty', level: 'Intermediate',
      mode: 'bootstrap', x: 'offset', y: 'offset', group: 'sensor', event: 'offset',
      narrative: 'A small offset sample is resampled with a fixed seed to estimate a percentile interval for the mean.',
      scientificNote: 'The percentile interval is a finite-sample bootstrap approximation. It is not guaranteed to have nominal coverage for all distributions or small samples.',
      data: `offset,sensor
0.11,S1
-0.04,S1
0.08,S1
0.02,S1
-0.09,S1
0.16,S1
0.04,S1
-0.02,S1
0.07,S1
-0.05,S1
0.03,S1
0.12,S1
-0.01,S1
0.05,S1
0.09,S1`
    },
    classification: {
      title: 'Binary risk-score evaluation',
      family: 'Classification diagnostics', category: 'Classification', level: 'Intermediate',
      mode: 'classification', x: 'score', y: 'outcome', group: 'cohort', event: 'outcome',
      narrative: 'A score is evaluated against a binary outcome using ROC and precision–recall curves.',
      scientificNote: 'AUC and average precision describe ranking on this sample. They do not establish calibration, transportability or clinical utility.',
      data: `score,outcome,cohort
0.91,1,A
0.12,0,A
0.76,1,A
0.33,0,A
0.66,1,A
0.24,0,A
0.58,1,A
0.18,0,A
0.82,1,A
0.41,0,A
0.73,1,B
0.29,0,B
0.64,1,B
0.48,0,B
0.88,1,B
0.37,0,B
0.55,0,B
0.69,1,B
0.21,0,B
0.79,1,B`
    },
    survival: {
      title: 'Two-group time-to-event sample',
      family: 'Survival analysis', category: 'Survival', level: 'Advanced',
      mode: 'survival', x: 'time', y: 'event', group: 'group', event: 'event',
      narrative: 'Kaplan–Meier estimates and a two-group log-rank test are computed from event and censoring indicators.',
      scientificNote: 'The log-rank test compares survival functions under its assumptions. No hazard ratio, proportional-hazards model or causal treatment effect is inferred.',
      data: `time,event,group
3,1,control
4,1,control
5,0,control
6,1,control
7,1,control
8,0,control
9,1,control
10,0,control
11,1,control
12,0,control
4,1,treatment
6,0,treatment
7,1,treatment
9,0,treatment
10,1,treatment
12,0,treatment
13,1,treatment
14,0,treatment
15,1,treatment
16,0,treatment`
    },
    fdr: {
      title: 'Multiple-testing correction',
      family: 'Benjamini–Hochberg FDR', category: 'Multiplicity', level: 'Advanced',
      mode: 'fdr', x: 'p_value', y: 'effect', group: 'feature', event: 'effect',
      narrative: 'Feature-level p-values are adjusted with the Benjamini–Hochberg step-up procedure.',
      scientificNote: 'Adjusted q-values depend on the validity and dependence structure of the underlying p-values. They do not rescue biased tests or selective reporting.',
      data: `feature,p_value,effect
G1,0.0004,1.7
G2,0.0030,-1.2
G3,0.0080,0.9
G4,0.0140,0.7
G5,0.0310,-0.6
G6,0.0490,0.4
G7,0.0710,0.3
G8,0.1100,-0.2
G9,0.1800,0.2
G10,0.2700,-0.1
G11,0.4200,0.1
G12,0.6500,0.0`
    },
    spc: {
      title: 'Manufacturing control chart',
      family: 'Statistical process control', category: 'Process diagnostics', level: 'Intermediate',
      mode: 'spc', x: 'run', y: 'measurement', group: 'line', event: 'measurement',
      narrative: 'A Shewhart-style center line and three-standard-deviation limits are computed for a short process series.',
      scientificNote: 'Control limits are descriptive estimates from this sample. A process is not proven stable merely because no point exceeds them.',
      data: `run,measurement,line
1,10.1,L1
2,9.9,L1
3,10.0,L1
4,10.2,L1
5,9.8,L1
6,10.1,L1
7,10.0,L1
8,9.9,L1
9,10.2,L1
10,10.1,L1
11,9.8,L1
12,10.0,L1
13,10.3,L1
14,9.9,L1
15,10.1,L1
16,11.4,L1
17,10.0,L1
18,9.8,L1
19,10.2,L1
20,10.1,L1`
    },
    descriptive_missingness: {
      title: 'Ecophysiology data-quality audit',
      family: 'Descriptive statistics and missingness', category: 'Data quality', level: 'Intermediate',
      mode: 'descriptive', x: 'temperature', y: 'assimilation', group: 'site', event: 'assimilation',
      narrative: 'A multisite plant-physiology table combines numeric and categorical fields, asymmetric missingness and a small number of suspicious values.',
      scientificNote: 'Descriptions expose distribution and missingness but cannot identify the missing-data mechanism. Mean imputation is available only as an explicit sensitivity analysis.',
      data: `site,temperature,vpd,assimilation,conductance
north,18.1,0.8,12.4,0.31
north,19.3,0.9,13.1,0.33
north,20.2,1.1,13.8,0.35
north,21.0,1.2,14.0,0.36
north,22.4,1.5,14.4,0.34
north,23.1,1.7,NA,0.32
north,24.8,2.0,13.2,0.29
north,26.0,2.2,12.1,0.25
south,24.2,1.8,15.0,0.38
south,25.1,2.0,15.3,0.39
south,26.3,2.2,15.1,0.37
south,27.5,2.5,14.6,0.34
south,28.7,2.9,13.8,0.30
south,30.0,3.2,12.7,NA
south,31.4,3.6,11.1,0.21
south,33.0,4.1,8.4,0.15
coastal,21.5,1.4,13.9,0.35
coastal,22.8,1.6,14.5,0.37
coastal,24.0,1.8,14.9,0.38
coastal,25.5,2.0,15.0,0.37
coastal,27.0,2.3,14.5,0.34
coastal,28.4,2.6,13.7,0.30
coastal,29.8,3.0,NA,0.27
coastal,31.2,3.4,11.5,0.22`
    },
    regression_influence: {
      title: 'Regression with leverage and influence',
      family: 'OLS influence diagnostics', category: 'Regression', level: 'Advanced',
      mode: 'regression', x: 'exposure', y: 'response', group: 'batch', event: 'response',
      narrative: 'Most observations follow a stable trend, while one high-leverage point and one vertical outlier test whether the fitted slope is robust.',
      scientificNote: 'Cook-style influence and leverage diagnostics identify observations that can materially alter the fitted model. They do not prove that a point is erroneous or should be deleted.',
      data: `exposure,response,batch
0.5,1.8,A
1.0,2.5,A
1.5,3.2,A
2.0,4.0,A
2.5,4.7,A
3.0,5.4,A
3.5,6.2,A
4.0,6.9,A
4.5,7.6,A
5.0,8.5,A
5.5,9.1,B
6.0,9.8,B
6.5,10.6,B
7.0,11.1,B
7.5,12.0,B
8.0,12.6,B
8.5,13.4,B
9.0,14.0,B
9.5,20.5,B
16.0,19.0,B`
    },
    regression_heteroscedastic: {
      title: 'Heteroscedastic calibration curve',
      family: 'OLS variance stress test', category: 'Regression', level: 'Advanced',
      mode: 'regression', x: 'concentration', y: 'signal', group: 'plate', event: 'signal',
      narrative: 'Signal variability increases with concentration, making the residual plot more informative than the fitted line alone.',
      scientificNote: 'Classical OLS standard errors assume an appropriate error model. A funnel-shaped residual pattern signals that weighted or heteroscedastic modeling should be considered outside this browser reference.',
      data: `concentration,signal,plate
0,0.8,P1
1,2.1,P1
2,3.9,P1
3,5.5,P1
4,7.7,P1
5,8.4,P1
6,11.8,P1
7,10.9,P1
8,15.6,P1
9,14.1,P1
10,19.8,P1
11,17.0,P1
12,24.5,P1
0,1.1,P2
1,2.5,P2
2,3.2,P2
3,6.4,P2
4,6.8,P2
5,10.1,P2
6,9.5,P2
7,14.7,P2
8,12.2,P2
9,18.9,P2
10,15.4,P2
11,23.8,P2
12,19.6,P2`
    },
    correlation_simpson: {
      title: 'Simpson reversal warning',
      family: 'Pearson correlation with grouping', category: 'Association', level: 'Advanced',
      mode: 'correlation', x: 'workload', y: 'accuracy', group: 'center', event: 'accuracy',
      narrative: 'Within each center, accuracy rises with workload, but different baseline regimes can reverse the pooled association.',
      scientificNote: 'The browser computes the pooled Pearson coefficient. The center labels are deliberately retained to show why aggregation and confounding must be inspected before interpretation.',
      data: `workload,accuracy,center
1,62,A
2,65,A
3,68,A
4,71,A
5,74,A
6,77,A
7,80,A
8,83,A
3,42,B
4,45,B
5,48,B
6,51,B
7,54,B
8,57,B
9,60,B
10,63,B
6,25,C
7,28,C
8,31,C
9,34,C
10,37,C
11,40,C
12,43,C
13,46,C`
    },
    welch_unbalanced: {
      title: 'Unbalanced assay precision comparison',
      family: 'Welch test under unequal variance', category: 'Group comparison', level: 'Advanced',
      mode: 'welch', x: 'run', y: 'error', group: 'instrument', event: 'error',
      narrative: 'A small high-variance instrument group is compared with a larger low-variance group.',
      scientificNote: 'Welch’s test addresses unequal variances and sample sizes, but it does not repair dependence, selection bias or grossly nonrepresentative samples.',
      data: `run,error,instrument
1,0.12,A
2,0.08,A
3,0.10,A
4,0.14,A
5,0.07,A
6,0.09,A
7,0.11,A
8,0.13,A
9,0.06,A
10,0.10,A
11,0.08,A
12,0.09,A
13,0.12,A
14,0.07,A
15,0.11,A
16,0.10,A
17,0.09,A
18,0.08,A
1,0.42,B
2,0.05,B
3,0.31,B
4,-0.08,B
5,0.27,B
6,0.18,B
7,0.55,B`
    },
    anova_skewed: {
      title: 'Skewed three-group response',
      family: 'ANOVA and Kruskal sensitivity', category: 'Group comparison', level: 'Advanced',
      mode: 'anova', x: 'subject', y: 'latency', group: 'protocol', event: 'latency',
      narrative: 'Three positive, right-skewed latency distributions illustrate why the parametric and rank-based omnibus tests should be compared.',
      scientificNote: 'Neither omnibus result identifies pairwise differences. Strong skew, unequal variance and small groups require cautious interpretation and possibly a model tailored to positive outcomes.',
      data: `subject,latency,protocol
1,4.1,A
2,4.4,A
3,4.8,A
4,5.0,A
5,5.3,A
6,5.7,A
7,6.2,A
8,8.9,A
9,12.4,A
1,3.2,B
2,3.5,B
3,3.7,B
4,3.9,B
5,4.0,B
6,4.4,B
7,4.8,B
8,5.1,B
9,6.0,B
1,5.2,C
2,5.5,C
3,5.9,C
4,6.1,C
5,6.6,C
6,7.0,C
7,7.8,C
8,9.5,C
9,15.0,C`
    },
    bootstrap_skewed: {
      title: 'Skewed waiting-time bootstrap',
      family: 'Bootstrap under strong skew', category: 'Uncertainty', level: 'Advanced',
      mode: 'bootstrap', x: 'waiting_time', y: 'waiting_time', group: 'site', event: 'waiting_time',
      narrative: 'A positive waiting-time sample contains a long upper tail, making the bootstrap distribution of the mean visibly asymmetric.',
      scientificNote: 'The percentile bootstrap is only an approximation. With strong skew and limited data, BCa intervals, transformation or a parametric time model may be preferable.',
      data: `waiting_time,site
1.2,A
1.5,A
1.7,A
1.9,A
2.0,A
2.2,A
2.3,A
2.5,A
2.8,A
3.0,A
3.1,A
3.5,A
4.0,A
4.8,A
5.6,A
6.9,A
8.4,A
11.2,A
15.8,A
22.0,A`
    },
    classification_imbalanced: {
      title: 'Rare-event classifier evaluation',
      family: 'ROC and precision–recall under imbalance', category: 'Classification', level: 'Advanced',
      mode: 'classification', x: 'risk_score', y: 'event', group: 'cohort', event: 'event',
      narrative: 'Only a small fraction of cases are positive, so precision–recall behavior is more informative than ROC AUC alone.',
      scientificNote: 'Ranking metrics do not provide a decision threshold, calibration or net benefit. Severe class imbalance makes prevalence-sensitive precision especially important.',
      data: `risk_score,event,cohort
0.97,1,A
0.91,1,A
0.86,1,A
0.81,1,B
0.74,1,B
0.88,0,A
0.79,0,A
0.72,0,A
0.69,0,A
0.64,0,A
0.61,0,A
0.58,0,A
0.55,0,A
0.52,0,A
0.49,0,A
0.46,0,A
0.43,0,A
0.40,0,A
0.37,0,A
0.34,0,A
0.31,0,B
0.28,0,B
0.25,0,B
0.22,0,B
0.19,0,B
0.16,0,B
0.13,0,B
0.10,0,B
0.07,0,B
0.04,0,B`
    },
    survival_crossing: {
      title: 'Crossing survival curves',
      family: 'Kaplan–Meier and log-rank limitation', category: 'Survival', level: 'Advanced',
      mode: 'survival', x: 'time', y: 'event', group: 'group', event: 'event',
      narrative: 'One group has early events but better late survival, producing crossing Kaplan–Meier curves.',
      scientificNote: 'The log-rank test is most sensitive to proportional and persistent differences. Crossing curves warn that a single omnibus p-value may conceal time-varying effects.',
      data: `time,event,group
1,1,A
2,1,A
3,1,A
4,0,A
6,0,A
8,0,A
10,0,A
12,0,A
14,1,A
16,0,A
3,0,B
4,0,B
5,0,B
6,1,B
7,1,B
8,1,B
9,1,B
10,1,B
11,0,B
12,1,B`
    },
    fdr_dense: {
      title: 'Dense omics discovery screen',
      family: 'FDR with clustered small p-values', category: 'Multiplicity', level: 'Advanced',
      mode: 'fdr', x: 'p_value', y: 'log2_effect', group: 'feature', event: 'log2_effect',
      narrative: 'A denser feature screen contains several very small p-values, a shoulder of moderate evidence and many null-like features.',
      scientificNote: 'Benjamini–Hochberg controls an expected false-discovery proportion under specified conditions. Biological dependence and data-dependent filtering still matter.',
      data: `feature,p_value,log2_effect
F01,0.00001,2.1
F02,0.00008,-1.8
F03,0.00030,1.5
F04,0.00110,1.3
F05,0.00240,-1.2
F06,0.00490,1.0
F07,0.00800,0.9
F08,0.01200,-0.8
F09,0.01800,0.7
F10,0.02600,0.6
F11,0.03900,-0.5
F12,0.05200,0.5
F13,0.07100,0.4
F14,0.09500,-0.4
F15,0.13000,0.3
F16,0.18000,0.2
F17,0.24000,-0.2
F18,0.31000,0.1
F19,0.41000,0.1
F20,0.55000,0.0
F21,0.68000,-0.1
F22,0.79000,0.0
F23,0.88000,0.1
F24,0.96000,0.0`
    },
    spc_shift: {
      title: 'Process shift and drift detection',
      family: 'Control chart with structured change', category: 'Process diagnostics', level: 'Advanced',
      mode: 'spc', x: 'run', y: 'measurement', group: 'line', event: 'measurement',
      narrative: 'A stable baseline is followed by a modest level shift and gradual drift that may not be summarized by a single extreme point.',
      scientificNote: 'A Shewhart chart is not a complete time-series model. Run rules, autocorrelation and phase-I/phase-II separation are not fully implemented here.',
      data: `run,measurement,line
1,9.9,L1
2,10.1,L1
3,10.0,L1
4,9.8,L1
5,10.2,L1
6,10.0,L1
7,9.9,L1
8,10.1,L1
9,10.0,L1
10,9.9,L1
11,10.3,L1
12,10.4,L1
13,10.5,L1
14,10.4,L1
15,10.6,L1
16,10.7,L1
17,10.8,L1
18,10.9,L1
19,11.0,L1
20,11.2,L1
21,11.1,L1
22,11.3,L1
23,11.4,L1
24,11.5,L1`
    },
    descriptive_multimodal: {
      title: 'Bimodal measurement distribution',
      family: 'Distribution-shape audit', category: 'Data quality', level: 'Intermediate',
      mode: 'descriptive', x: 'measurement', y: 'measurement', group: 'source', event: 'measurement',
      narrative: 'Two latent source regimes create a bimodal pooled distribution even though each source is relatively compact.',
      scientificNote: 'A mean and standard deviation can obscure mixture structure. Group labels and distribution plots should be inspected before reducing the sample to one location-scale summary.',
      data: `measurement,source
4.6,A
4.8,A
4.9,A
5.0,A
5.1,A
5.2,A
5.3,A
5.4,A
5.5,A
5.6,A
9.1,B
9.3,B
9.4,B
9.5,B
9.6,B
9.7,B
9.8,B
9.9,B
10.1,B
10.3,B`
    },
    pca_latent_gradient: {
      title: 'Multivariate physiological gradient',
      family: 'Principal-component analysis', category: 'Multivariate structure', level: 'Advanced',
      mode: 'pca', x: 'temperature', y: 'assimilation', group: 'site', event: 'assimilation',
      narrative: 'Five correlated physiological variables vary along a synthetic environmental gradient, with one deliberately weakly related variable.',
      scientificNote: 'PCA summarizes standardized covariance. The axes are sample-dependent linear combinations, not latent mechanisms, causal pathways or validated physiological traits.',
      data: `site,temperature,vpd,assimilation,conductance,water_potential,chlorophyll
A,18.0,0.70,10.9,0.35,-0.62,41.0
A,19.2,0.82,11.8,0.37,-0.66,42.2
A,20.5,0.96,12.9,0.39,-0.72,40.8
A,21.7,1.12,13.7,0.41,-0.79,42.5
A,23.0,1.35,14.4,0.42,-0.88,41.7
A,24.4,1.62,14.7,0.41,-0.99,43.1
B,25.8,1.94,14.3,0.38,-1.12,40.9
B,27.0,2.28,13.5,0.34,-1.25,42.0
B,28.3,2.65,12.4,0.30,-1.39,41.4
B,29.7,3.05,10.9,0.25,-1.55,42.8
B,31.1,3.48,9.1,0.20,-1.72,40.7
B,32.5,3.94,7.0,0.15,-1.91,42.3
C,20.0,0.88,12.0,0.38,-0.70,39.8
C,22.1,1.20,13.4,0.40,-0.82,40.5
C,24.0,1.52,14.1,0.40,-0.96,39.9
C,26.2,2.02,13.9,0.36,-1.16,40.7
C,28.0,2.50,12.8,0.31,-1.35,39.6
C,30.2,3.18,10.3,0.23,-1.63,40.2`
    },
    pca_collinearity_missing: {
      title: 'Collinear biomarkers with missing values',
      family: 'PCA sensitivity audit', category: 'Multivariate structure', level: 'Advanced',
      mode: 'pca', x: 'marker_a', y: 'marker_b', group: 'cohort', event: 'marker_c',
      narrative: 'Three biomarkers share a dominant common trend, one variable is mostly independent, and several cells are missing to expose the effect of the selected missing-data policy.',
      scientificNote: 'Strong first-component variance can be driven by redundant measurements. Complete-case and mean-imputed PCA answer different questions; neither identifies a biological factor without external evidence.',
      data: `cohort,marker_a,marker_b,marker_c,marker_d
control,1.0,1.1,0.9,4.2
control,1.3,1.4,1.2,3.8
control,1.7,1.8,1.6,4.5
control,2.0,2.2,1.9,3.9
control,2.4,2.5,2.3,4.4
control,2.8,2.9,NA,4.0
control,3.1,3.3,3.0,4.7
treated,3.6,3.7,3.5,3.6
treated,4.0,4.2,3.9,4.1
treated,4.5,4.6,4.4,3.7
treated,5.0,NA,4.8,4.6
treated,5.4,5.5,5.3,3.9
treated,5.9,6.1,5.8,4.3
treated,6.4,6.5,6.2,3.5`
    }

  };
})(typeof window !== 'undefined' ? window : globalThis);
