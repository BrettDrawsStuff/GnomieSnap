import { generateGnome } from "./gnome.js";

function colOf(line: string, char: string): number {
  return [...line].findIndex(c => c === char);
}

const testFIDs = [1, 2, 3, 4, 5, 6, 100, 999, 1234, 5678, 99999, 500000, 1000000];
let detPass   = true;
let alignPass = true;

for (const fid of testFIDs) {
  const g  = generateGnome(fid);
  const g2 = generateGnome(fid);
  const det = g.art === g2.art && g.name === g2.name;
  if (!det) detPass = false;
  console.log(`\n── FID ${fid} · ${g.name} ${det ? "✅" : "❌ NOT DETERMINISTIC"}`);
  console.log(g.art);
}

// Column alignment check across 200 FIDs
for (let fid = 1; fid <= 200; fid++) {
  const { art } = generateGnome(fid);
  const [l0, l1, l2, l3] = art.split("\n");
  const ok = [
    colOf(l0, "^") === 3,
    colOf(l1, "/") === 3,
    colOf(l1, "\\") === 7,
    colOf(l2, "<") === 0,
    colOf(l3, "/") === 3,
    colOf(l3, "\\") === 7,
  ];
  if (ok.some(c => !c)) {
    alignPass = false;
    console.log(`\n❌ Alignment failure FID ${fid}:`);
    console.log(art);
  }
}

console.log(`\n${"═".repeat(40)}`);
console.log(`Determinism (${testFIDs.length} FIDs): ${detPass   ? "✅ all pass" : "❌ failures above"}`);
console.log(`Alignment   (FID 1–200):       ${alignPass ? "✅ all pass" : "❌ failures above"}`);
