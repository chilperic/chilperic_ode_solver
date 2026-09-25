from pathlib import Path
import re, json
root=Path(__file__).resolve().parents[1];site=root/'site'
p=site/'src/v76/app-shell.js';s=p.read_text()
s=s.replace("    home: ['platform', 'Overview'],", """    home: ['platform', 'Overview'],
    'plant-growth': ['model-engineering', 'Plant growth'],
    'leaf-physiology': ['model-engineering', 'Leaf physiology'],
    adaptation: ['populations-evolution', 'Seasonal adaptation'],
    lipids: ['model-engineering', 'Fatty acids & lipids'],
    tcell: ['populations-evolution', 'T-cell populations'],
    randomness: ['dynamical-systems', 'Randomness'],
    branching: ['populations-evolution', 'Branching processes'],
    diffusion: ['dynamical-systems', 'Spatial diffusion'],
    fractals: ['mathematical-structure', 'Fractals'],
    practice: ['resources', 'Worked companions'],""")
s=s.replace('  const ACTIVE_FAMILIES = {', """  // Additive 79.2 routes. Original menu items and destinations remain unchanged.
  GROUPS.experiment.sections.unshift({title:'Living systems & seasonal environments',items:[
    ['↟','Plant growth','Finite carbon, water and nitrogen budgets; explicit seasons.','plant-growth.html'],
    ['☼','Leaf physiology','C3 gas exchange and dynamic leaf energy balance.','leaf-physiology.html'],
    ['⌁','Seasonal adaptation','Mutation–fixation paths and declared trait landscapes.','adaptation.html'],
    ['⇄','Fatty acids & lipids','Original 18-state FADNS and four-state metabolism.','lipids.html'],
    ['◎','T-cell populations','Generation-resolved teaching model and original research tools.','tcell.html']
  ]});
  GROUPS.experiment.sections.push({title:'Randomness, space & mathematical structure',items:[
    ['⚄','Randomness','Dice, Brownian motion, OU and birth–death processes.','randomness.html'],
    ['⋔','Branching','Seeded Galton–Watson replicates and extinction.','branching.html'],
    ['▦','Diffusion','Conservative spatial balance and boundary conditions.','diffusion.html'],
    ['△','Fractals','Iterated-function systems and escape-time geometry.','fractals.html']
  ]});
  GROUPS.profile.sections[0].items.splice(4,0,['∑','Worked companions','Additional calculations; original book/practice links retained.','practice.html']);
  const ACTIVE_FAMILIES = {
    'plant-growth':'experiment','leaf-physiology':'experiment',adaptation:'experiment',lipids:'experiment',tcell:'experiment',randomness:'experiment',branching:'experiment',diffusion:'experiment',fractals:'experiment',""")
s=s.replace("    'runStudio', 'runBtn'", "    'u-run', 'runStudio', 'runBtn'")
p.write_text(s)
p=site/'src/research/shell.js';s=p.read_text();s=s.replace('const paths=Object.values(root.FokoResearchPaths',"TOOLS.push(...(root.FokoUpgradeTools||[]));\nconst paths=Object.values(root.FokoResearchPaths");p.write_text(s)
# Every existing route gets the same additive navigation and shared math/publication policy.
for p in site.rglob('*.html'):
    # Offline historical report HTML assets, if any, are not application routes.
    if any(x in p.parts for x in ['assets','materials']): continue
    s=p.read_text();rel='../'*len(p.parent.relative_to(site).parts)
    if 'styles/upgrade.css' not in s:s=s.replace('</head>',f'<link rel="stylesheet" href="{rel}styles/upgrade.css">\n</head>')
    if 'src/upgrade/registry.js' not in s:s=s.replace('</head>',f'<script src="{rel}src/upgrade/registry.js"></script>\n</head>')
    if 'src/upgrade/common.js' not in s:s=s.replace('</body>',f'<script src="{rel}src/upgrade/common.js"></script>\n</body>')
    if p.name=='studio.html':
      target=re.search(r'<script src="src/v73/model-studio.js[^>]+></script>',s)
      if target:
       s=s[:target.start()]+'<script src="src/upgrade/preserved-models.js"></script>\n<script src="src/upgrade/studio-presets.js"></script>\n'+s[target.start():]
    p.write_text(s)
# Normalization, not a blank create wrapper, preserves the original multi-state model.
p=site/'src/upgrade/lab-ui.mjs';s=p.read_text().replace('FokoProjectCore.create(q.modelSpec)','FokoProjectCore.normalize(q.modelSpec)');p.write_text(s)
