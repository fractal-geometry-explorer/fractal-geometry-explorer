const fs = require('fs');
eval(fs.readFileSync('core.js', 'utf8') + ';global.X={riverTree,pruneTree};');
for (const n of [8, 9, 10, 11, 12]) {
  const t0 = Date.now(), r = X.riverTree(n); let e = 0; for (const s of r.adj.values()) e += s.size;
  console.log(n, 'nodes', r.nodes, 'edges', e / 2, 'ms', Date.now() - t0, 'pruned2', X.pruneTree(r.adj, 2).size);
}
