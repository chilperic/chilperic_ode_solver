/* latex-greek.js
   Shared TeX post-processor for the Foko Lab rendering path.

   Problem it solves
   -----------------
   mathjs `expr.toTex()` converts BARE Greek identifiers to Greek commands
   (beta -> \beta, gamma -> \gamma) but leaves INDEXED Greek identifiers as
   literal roman text (alpha1 -> "alpha1"). In a model like the Genetic toggle
   switch (params alpha1, alpha2, beta, gamma) this renders real beta/gamma next
   to the upright word "alpha1" — inconsistent and read as a rendering failure.

   `greekify(tex)` normalises the toTex output so every Greek name — bare or
   indexed — renders as a proper Greek symbol:
     alpha1 -> \alpha_{1}      beta -> \beta (unchanged)      u, k1 -> untouched

   Contract
   --------
   * Idempotent: greekify(greekify(t)) === greekify(t).
   * Never double-escapes an existing command: "\beta" stays "\beta".
   * Only touches whole-word Greek names; non-Greek identifiers are left alone.

   Out of scope (documented): underscore-named Greek like "gamma_1", which mathjs
   emits as "gamma\_1"; treating that underscore as a subscript changes semantics
   and is handled separately if ever needed.

   Exposed as window.FokoTex.greekify for the browser and via the same object in
   a vm/Node test context (window === ctx).
*/
(function () {
  'use strict';

  // The 24 lower-case Greek names mathjs recognises for bare conversion.
  var GREEK = [
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
    'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho',
    'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
  ];

  // Longer names first so 'epsilon' is matched before 'eta' etc. inside the
  // alternation (regex alternation is left-to-right, first match wins).
  var ALT = GREEK.slice().sort(function (a, b) { return b.length - a.length; }).join('|');

  // Case A — indexed Greek that mathjs left literal: alpha1, beta2, ...
  //   (?<!\\)   not already escaped as a command
  //   \b        word boundary
  //   (name)(digits)
  // Using a negative lookbehind for a single backslash prevents touching
  // '\beta2' (already a command followed by a stray digit — rare, left alone).
  var INDEXED = new RegExp('(?<!\\\\)\\b(' + ALT + ')(\\d+)\\b', 'g');

  // Case B — bare Greek left literal (defensive; mathjs normally handles these,
  // but toTex output can contain a stray literal after other transforms).
  //   negative lookbehind for backslash: do NOT match the 'beta' in '\beta'
  //   negative lookahead for digit: do NOT re-touch what Case A already handled
  //   negative lookahead for letters: do NOT match 'eta' inside 'theta' (the
  //     \b boundary already guards most of this, but the lookahead is belt+braces)
  var BARE = new RegExp('(?<![\\\\A-Za-z])(' + ALT + ')(?![A-Za-z0-9])', 'g');

  /**
   * greekify(tex) -> tex with indexed/bare Greek names as proper Greek commands.
   * @param {string} tex  A TeX fragment (typically mathjs toTex output).
   * @returns {string}
   */
  function greekify(tex) {
    if (tex === null || tex === undefined) return tex;
    var s = String(tex);
    // Case A first: alpha1 -> \alpha_{1}
    s = s.replace(INDEXED, function (_m, name, digits) {
      return '\\' + name + '_{' + digits + '}';
    });
    // Case B second: bare alpha -> \alpha (only where still literal)
    s = s.replace(BARE, function (_m, name) {
      return '\\' + name;
    });
    return s;
  }

  var api = { greekify: greekify };

  // Browser + vm/Node (window === ctx) exposure.
  if (typeof window !== 'undefined') {
    window.FokoTex = window.FokoTex || {};
    window.FokoTex.greekify = greekify;
  }
  // CommonJS, if ever required directly.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
