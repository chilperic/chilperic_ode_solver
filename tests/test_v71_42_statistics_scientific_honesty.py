import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
STAT_CORE = ROOT / 'src' / 'core' / 'statistics.js'
STAT_LAB = ROOT / 'src' / 'labs' / 'statistics.js'


def test_statistics_core_exports_real_diagnostics():
    js = STAT_CORE.read_text(encoding='utf-8')
    for fn in [
        'rocPrCurve',
        'benjaminiHochberg',
        'olsInfluence',
        'olsBands',
        'kaplanMeier',
        'logRank2',
    ]:
        assert f'function {fn}' in js
        assert fn in re.search(r'const api=\{([^}]+)\}', js, re.S).group(1)


def test_statistics_lab_no_longer_decorates_claimed_methods():
    js = STAT_LAB.read_text(encoding='utf-8')
    assert 'FokoStatistics core is not loaded' in js
    assert 'Two-proportion z-test computed from grouped successes and totals' in js
    assert 'Kaplan-Meier curves use event=1 and event=0 as censored' in js
    assert 'Benjamini-Hochberg adjusted q-values are monotone' in js
    assert 'ROC, AUC, precision-recall and average precision' in js
    assert 'Cook distance' in js
    assert 'confidence and prediction bands' in js.lower()
    assert '(tp++,fp)[1]' not in js
    assert "r.fdr={p:pvals,q:bh(pvals)}" not in js


def test_statistics_engine_outputs_auc_qvalues_logrank_and_bands():
    script = r'''
    globalThis.window = globalThis;
    const S = require('./src/core/statistics.js');
    globalThis.FokoStatistics = S;
    const L = require('./src/labs/statistics.js');
    function run(mode, ex){
      const e = L.EXAMPLES[ex];
      return L.engine(Object.assign({preset: ex}, e, {mode})).result;
    }
    const cls = run('classification', 'credit');
    const fdr = run('fdr', 'gene');
    const surv = run('survival', 'survival');
    const reg = run('regression', 'housing');
    if (!(cls.roc && cls.roc.auc >= 0 && cls.roc.auc <= 1 && cls.roc.pr.length > 0)) throw new Error('bad roc/pr');
    if (!(fdr.fdr && fdr.fdr.q.length === fdr.fdr.p.length && fdr.fdr.q.some(q => q <= 0.05))) throw new Error('bad fdr');
    if (!(surv.survival && surv.survival.logRank && Number.isFinite(surv.survival.logRank.p))) throw new Error('bad survival/logrank');
    if (!(reg.bands && reg.bands.length === reg.regression.n && reg.cooks.length === reg.regression.n)) throw new Error('bad regression diagnostics');
    console.log('ok statistics honesty');
    '''
    out = subprocess.check_output(['node', '-e', script], cwd=ROOT, text=True)
    assert 'ok statistics honesty' in out


def test_release_tokens_stamped_to_7142():
    offenders = []
    for p in ROOT.rglob('*'):
        if any(part in {'.git', '.venv', 'node_modules', '__pycache__'} for part in p.parts):
            continue
        if p.is_file() and p.suffix.lower() in {'.html', '.js', '.css', '.md', '.json', '.cff'}:
            try:
                text = p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            for m in re.findall(r'\?v=([0-9]+(?:\.[0-9]+){1,3})', text):
                if m != '71.46.0':
                    offenders.append(f'{p.relative_to(ROOT)} -> {m}')
    assert not offenders
