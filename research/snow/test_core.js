const fs = require('fs');
eval(fs.readFileSync('core.js', 'utf8') + ';global.X={curveOf,GEN_S,GEN_F,GEN_13,snowOutline,kochFlake,flowsnakeLattice,gosperTrees,treeCascade,clipSources,genFromCodes,FUDGE_LINKS,FUDGE_CODES,FUDGE_MAIN,QUART_PTS,QUART_CODES,QF_LINKS,QF_CODES,QF_MAIN,GOS_TREE,TER_PTS,TER_CODES,leaves};');
const r = (v) => Math.round(v * 1000) / 1000;
let P = X.curveOf([X.GEN_S, X.GEN_S]); console.log('SS', P.length / 2 - 1, Array.from(P.slice(0, 12)).map(r).join(' '));
P = X.curveOf([X.GEN_13]); console.log('13', Array.from(P).map(r).join(' '));
// compare with python: stage-2 SS first points: 0, 0.111,0, 0.222,0, 0.278,0.096, 0.222,0.192, 0.056,0.096
const O = X.snowOutline(1); console.log('outline1', O.length, O.slice(0, 4).map((p) => p.map(r).join(',')).join(' | '));
const G = X.gosperTrees(4); console.log('gosper4 tris', G.tris.length, 'links', G.links.length, 'boundary', G.boundary.length, G.boundary.slice(0, 2));
let cnt = { 1: 0, '-1': 0, 0: 0 }; G.sideOf.forEach((s) => cnt[s]++); console.log('sides', cnt);
const T = X.treeCascade(X.GOS_TREE.links, X.GOS_TREE.codes, X.GOS_TREE.main, 2); console.log('gos tree st2', T.length, 'clipped', X.clipSources(T).length);
const Fz = X.treeCascade(X.FUDGE_LINKS, X.FUDGE_CODES, X.FUDGE_MAIN, 6); console.log('fudge st6', Fz.length, 'clipped', X.clipSources(Fz).length, 'main', Fz.filter((s) => s[4] === 0).length);
const Q = X.curveOf(new Array(4).fill(X.genFromCodes(X.QUART_PTS, X.QUART_CODES))); console.log('quartet st4', Q.length / 2 - 1);
const Tz = X.curveOf(new Array(3).fill(X.genFromCodes(X.TER_PTS, X.TER_CODES))); console.log('ter st3', Tz.length / 2 - 1, Array.from(Tz.slice(-2)).map(r));
