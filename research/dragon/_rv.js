
const fs=require('fs'); eval(fs.readFileSync('core.js','utf8')+';global.X={riverTree,pruneTree};');
const out={};
for (const n of [9,10,11]) for (const pr of [1,2,3,4]) {
  const R=X.riverTree(n), g=X.pruneTree(R.adj,pr), segs=[];
  for (const [a,s] of g) for (const b of s) if (b>a) segs.push([...R.toXY(a),...R.toXY(b)]);
  out[n+'_'+pr]=segs;
}
console.log(JSON.stringify(out));
