// Recomputes every number the article reports from the CSVs in data/, and checks each against
// the published value. No dependencies. Usage: node recompute.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');

function readCsv(name) {
  const text = readFileSync(join(dataDir, name), 'utf8');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
const num = (v) => (v === '' ? null : Number(v));

// Shared measures, defined exactly as in the original analysis scripts.
const auc = (pos, neg) => {
  let w = 0;
  for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
  return w / (pos.length * neg.length);
};
const quantile = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const count = (a, f) => a.filter(f).length;

let failures = 0;
const check = (label, actual, expected, digits = null) => {
  const shown = digits == null ? String(actual) : Number(actual).toFixed(digits);
  const ok = shown === String(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(72)} ${shown}${ok ? '' : `   (article: ${expected})`}`);
};
const section = (title) => console.log(`\n## ${title}`);

const calls = readCsv('field-calls.csv');
const judgments = readCsv('field-judgments.csv');
const labels = readCsv('field-labels.csv');
const tools = readCsv('tool-records.csv');
const gates = readCsv('gate-outcomes.csv');
const claims = readCsv('claim-support.csv');
const claimCalls = readCsv('claim-support-calls.csv');
const judges = readCsv('opus-judges.csv');

const judgmentOf = new Map(judgments.map((j) => [`${j.build}/${j.call}/${j.question}`, j]));
const callOf = new Map(calls.map((c) => [`${c.build}/${c.call}`, c]));
// Labels joined to the answer they grade (a probability >= 0.5 counts as "true").
const joined = labels.map((l) => ({ ...l, j: judgmentOf.get(`${l.build}/${l.call}/${l.question}`) })).filter((l) => l.j);
const truthy = (v) => v === 'true' || v === 'True' || v === '1';

section('Volume');
for (const [b, n] of [['B1', 213], ['B2', 1050], ['B3', 396], ['B4', 1598], ['B5', 965]]) check(`calls in ${b}`, count(calls, (c) => c.build === b), n);
check('calls across five builds', calls.length, 4222);
check('offline experiment calls (591 + 142 + 359)', claimCalls.length, 1092);
check('field + offline calls', calls.length + claimCalls.length, 5314);

section('Cost (medians)');
const tmplMedian = (b, t, field) => quantile(calls.filter((c) => c.build === b && c.template === t && c[field] !== '').map((c) => num(c[field])), 0.5);
check('B5 contract consistency: median input tokens', tmplMedian('B5', 'contract-consistency-v1', 'input_tokens'), 26013);
check('B5 contract consistency: median ms', tmplMedian('B5', 'contract-consistency-v1', 'ms'), 496);
const shippedCalls = claimCalls.filter((c) => c.run === 'shipped');
check('offline claim support: input tokens, thousands', shippedCalls.reduce((s, c) => s + num(c.input_tokens), 0) / 1000, 870, 0);
check('offline claim support: mean input tokens, thousands', shippedCalls.reduce((s, c) => s + num(c.input_tokens), 0) / shippedCalls.length / 1000, '1.5', 1);
const ms = shippedCalls.map((c) => num(c.ms)).sort((a, b) => a - b);
check('offline claim support: median ms (rounded to 10)', Math.round(ms[ms.length >> 1] / 10) * 10, 250);

section('A. File triage (main build B5)');
const triage5 = judgments.filter((j) => j.build === 'B5' && j.template === 'file-triage-v1');
check('triage judgments', triage5.length, 2304);
check('file checks (triage calls)', new Set(triage5.map((j) => j.call)).size, 768);
for (const [q, n, pos, aucWant, accWant, baseWant, distinct] of [
  ['concerns_task', 746, 24, '0.540', '0.930', '0.968', 18],
  ['needs_change', 768, 6, '0.955', '0.980', '0.992', 5],
]) {
  const ls = joined.filter((l) => l.build === 'B5' && l.j.template === 'file-triage-v1' && l.question === q);
  const pos_ = ls.filter((l) => truthy(l.answer)), neg_ = ls.filter((l) => !truthy(l.answer));
  check(`${q}: labeled checks`, ls.length, n);
  check(`${q}: positives`, pos_.length, pos);
  check(`${q}: distinct files among positives`, new Set(pos_.map((l) => l.j.file)).size, distinct);
  check(`${q}: AUC`, auc(pos_.map((l) => num(l.j.noul)), neg_.map((l) => num(l.j.noul))), aucWant, 3);
  check(`${q}: accuracy`, count(ls, (l) => (num(l.j.noul) >= 0.5) === truthy(l.answer)) / ls.length, accWant, 3);
  check(`${q}: majority-answer accuracy`, neg_.length / ls.length, baseWant, 3);
  if (q === 'concerns_task') check('concerns_task: positives triage dropped (score < 0.5)', count(pos_, (l) => num(l.j.noul) < 0.5), 21);
  if (q === 'needs_change') {
    const s = pos_.map((l) => num(l.j.noul)).sort((a, b) => a - b);
    check('needs_change: lowest positive score', s[0], '0.31', 2);
    check('needs_change: highest positive score', s.at(-1), '0.53', 2);
  }
}
// Routing rules from the file-triage-v1 template.
const route = (a) => (a.needs_change > 0.7 ? 'may_need_editing' : a.defines_constraint > 0.6 ? 'read_for_constraints' : a.concerns_task > 0.7 ? 'related' : 'dropped');
const byCall = new Map();
for (const j of triage5) (byCall.get(j.call) ?? byCall.set(j.call, {}).get(j.call))[j.question] = num(j.noul);
const routes = [...byCall.entries()].map(([call, a]) => ({ call, r: route(a) }));
check('routed to "read for constraints"', count(routes, (x) => x.r === 'read_for_constraints'), 32);
check('files that reached briefs (not dropped)', count(routes, (x) => x.r !== 'dropped'), 39);
const routedEdit = routes.filter((x) => x.r === 'may_need_editing');
check('routed to "may need editing"', routedEdit.length, 1);
check('...of which needs_change label was true', count(routedEdit, (x) => joined.some((l) => l.build === 'B5' && l.call === x.call && l.question === 'needs_change' && truthy(l.answer))), 0);

section('A. File triage (other builds)');
const triageLabels = (b, q) => joined.filter((l) => l.build === b && l.j.template === 'file-triage-v1' && l.question === q);
const lite = triageLabels('B3', 'concerns_task');
check('B3 concerns_task: labeled checks', lite.length, 220);
check('B3 concerns_task: positives', count(lite, (l) => truthy(l.answer)), 9);
check('B3 concerns_task: AUC', auc(lite.filter((l) => truthy(l.answer)).map((l) => num(l.j.noul)), lite.filter((l) => !truthy(l.answer)).map((l) => num(l.j.noul))), '0.825', 3);
const gated = triageLabels('B4', 'concerns_task');
check('B4 concerns_task: labels', gated.length, 801);
check('B4 concerns_task: positives', count(gated, (l) => truthy(l.answer)), 0);

section('A. Planning checks (B5)');
const scope = judgments.filter((j) => j.build === 'B5' && j.template === 'scope-necessity-v2' && j.role === 'sprintScoper');
check('scope necessity: Sprint Scoper judgments', scope.length, 240);
check('scope necessity: no admitted verdict', count(scope, (j) => j.admitted !== '1'), 172);
check('scope necessity: uncertain', count(scope, (j) => j.not_admitted_reason === 'uncertain'), 154);
check('scope necessity: insufficient evidence', count(scope, (j) => j.not_admitted_reason === 'insufficient_evidence'), 18);
check('scope necessity: share with no verdict, %', (172 / 240) * 100, 72, 0);
const scopeLabels = joined.filter((l) => l.build === 'B5' && l.j.template === 'scope-necessity-v2');
check('scope necessity: labels', scopeLabels.length, 24);
check('scope necessity: accuracy', count(scopeLabels, (l) => l.j.choice === l.answer) / scopeLabels.length, '0.833', 3);
check('scope necessity: majority-answer accuracy', count(scopeLabels, (l) => l.answer === 'not_needed') / scopeLabels.length, '1.000', 3);
const contract = judgments.filter((j) => j.build === 'B5' && j.template === 'contract-consistency-v1');
check('contract consistency: judgments', contract.length, 191);
check('contract consistency: "consistent"', count(contract, (j) => j.choice === 'consistent'), 191);
check('contract consistency: median confidence', quantile(contract.map((j) => num(j.confidence)), 0.5), '0.98', 2);

section('A. Rule compliance, test strength, criterion evidence');
const rule = joined.filter((l) => l.build === 'B2' && l.j.template === 'rule-compliance-v2');
check('B2 rule compliance: labeled answers', rule.length, 80);
check('B2 rule compliance: answered compliant', count(rule, (l) => l.j.choice === 'supported_compliance'), 56);
check('B2 rule compliance: insufficient evidence', count(rule, (l) => l.j.choice === 'insufficient_evidence'), 24);
check('B2 rule compliance: violations in labels', count(rule, (l) => l.answer !== 'supported_compliance'), 0);
// Test strength: level 0-4; weak = level < 2, and Jev's predicted level is its score rounded.
// Only the weak-vs-held side is a real measurement.
const ts = joined.filter((l) => l.build === 'B2' && l.j.template === 'test-strength-v1');
const weak = ts.filter((l) => num(l.answer) < 2), held = ts.filter((l) => num(l.answer) >= 2);
check('B2 test strength: labeled tests', ts.length, 126);
check('B2 test strength: weak', weak.length, 16);
check('B2 test strength: AUC (lower score = weaker)', auc(weak.map((l) => -num(l.j.score)), held.map((l) => -num(l.j.score))), '0.228', 3);
check('B2 test strength: weak-vs-held accuracy', count(ts, (l) => (Math.round(num(l.j.score)) < 2) === (num(l.answer) < 2)) / ts.length, '0.492', 3);
check('B2 test strength: majority-answer ("held") accuracy', held.length / ts.length, '0.873', 3);
for (const [b, n] of [['B4', 32], ['B3', 27], ['B5', 5]]) {
  const ce = joined.filter((l) => l.build === b && l.j.template === 'criterion-evidence-v2');
  check(`${b} criterion evidence: labels, all "met"`, `${ce.length}/${count(ce, (l) => l.answer === 'met')}`, `${n}/${n}`);
}
const ce5 = judgments.filter((j) => j.build === 'B5' && j.template === 'criterion-evidence-v2');
check('B5 criterion evidence: answers, all "insufficient evidence"', `${ce5.length}/${count(ce5, (j) => j.choice === 'insufficient_evidence')}`, '9/9');
const evalGates = gates.filter((g) => g.build === 'B5' && g.gate === 'evaluator');
check('B5 Evaluator gates skipped (verified by command) / total', `${count(evalGates, (g) => g.code === 'verified_by_command')}/${evalGates.length}`, '17/18');

section('Advice acted on');
for (const [b, n] of [['B5', 0], ['B2', 2], ['B3', 39], ['B4', 10]]) check(`${b} labels marked acted on`, count(labels, (l) => l.build === b && l.acted_on === '1'), n);

section('B. On-demand tool');
const exposed = tools.filter((t) => t.build === 'B5' && t.record_type === 'tool-exposure');
const toolCalls = tools.filter((t) => t.build === 'B5' && t.record_type === 'tool-call');
check('B5 dispatches offered the tool', exposed.length, 157);
check('B5 tool calls / offers, %', (toolCalls.length / exposed.length) * 100, 8, 0);
const criticAsks = judgments.filter((j) => j.build === 'B2' && j.template === 'claim-support-v2' && j.role === 'critic');
check('B2 Critic claim-support asks', criticAsks.length, 27);
check('...answered "uncertain"', count(criticAsks, (j) => j.not_admitted_reason === 'uncertain'), 26);
check('...highest score', Math.max(...criticAsks.map((j) => num(j.noul))), '0.79', 2);
check('...reaching 0.8 "supported"', count(criticAsks, (j) => num(j.noul) >= 0.8), 0);

section('C. Offline claim-support experiment');
const set = (s) => claims.filter((c) => c.set === s);
const [P, NF, NS] = ['P', 'NF', 'NS'].map(set);
check('real / stale / wrong-code items', `${P.length}/${NF.length}/${NS.length}`, '232/127/232');
const v = (rows, f) => rows.map((r) => num(r[f])).filter((x) => x != null);
check('as shipped: AUC real vs wrong code', auc(v(P, 'jev_shipped'), v(NS, 'jev_shipped')), '0.973', 3);
check('as shipped: AUC real vs stale', auc(v(P, 'jev_shipped'), v(NF, 'jev_shipped')), '0.624', 3);
check('as shipped: real flags "supported" (>= 0.8), %', (count(P, (r) => num(r.jev_shipped) >= 0.8) / P.length) * 100, 0, 0);
check('as shipped: real flags "unsupported" (<= 0.2), %', (count(P, (r) => num(r.jev_shipped) <= 0.2) / P.length) * 100, 82, 0);
const high = P.filter((r) => r.severity === 'high');
check('as shipped: high real flags "unsupported", %', (count(high, (r) => num(r.jev_shipped) <= 0.2) / high.length) * 100, 94, 0);
for (const [name, rows, want] of [['real', P, '0.10'], ['stale', NF, '0.08'], ['wrong-code', NS, '0.02']]) check(`as shipped: median score, ${name}`, quantile(v(rows, 'jev_shipped'), 0.5), want, 2);
const pairWins = (f) => { const p = new Map(P.map((r) => [r.pair, num(r[f])])); const ps = NF.filter((r) => p.has(r.pair) && r[f] !== ''); return `${count(ps, (r) => p.get(r.pair) > num(r[f]))}/${ps.length}`; };
check('as shipped: pairs where the defective version scores higher', pairWins('jev_shipped'), '63/127');
const bal = ((count(P, (r) => num(r.jev_shipped) >= 0.5) / P.length) + (count(NF, (r) => num(r.jev_shipped) < 0.5) / NF.length)) / 2;
check('as shipped: balanced accuracy at 0.5', bal, '0.51', 2);
const wideP = P.filter((r) => r.jev_shipped_wide !== ''), wideNF = NF.filter((r) => r.jev_shipped_wide !== '');
check('as shipped, ±150 lines: AUC real vs stale', auc(v(wideP, 'jev_shipped_wide'), v(wideNF, 'jev_shipped_wide')), '0.619', 3);
check('reworded: AUC real vs stale', auc(v(P, 'jev_defect'), v(NF, 'jev_defect')), '0.772', 3);
check('reworded: pairs where the defective version scores higher', pairWins('jev_defect'), '101/127');
for (const [t, realWant, staleWant] of [[0.3, 11, 44], [0.35, 19, 54], [0.4, 28, 66], [0.5, 44, 80]]) {
  check(`reworded: challenge below ${t.toFixed(2)}: real flags challenged, %`, (count(P, (r) => num(r.jev_defect) < t) / P.length) * 100, realWant, 0);
  check(`reworded: challenge below ${t.toFixed(2)}: stale flags caught, %`, (count(NF, (r) => num(r.jev_defect) < t) / NF.length) * 100, staleWant, 0);
}

section('C. Same 30 pairs: blind Opus judges vs Jev');
const jev = new Map(claims.map((c) => [`${c.set}/${c.pair}`, c]));
const rows = judges.map((j) => ({ ...j, jevShipped: num(jev.get(`${j.set}/${j.pair}`)?.jev_shipped), jevDefect: num(jev.get(`${j.set}/${j.pair}`)?.jev_defect) }));
const judgeAuc = (f) => auc(rows.filter((r) => r.set === 'P').map(f), rows.filter((r) => r.set === 'NF').map(f));
const judgePairs = (f) => { const by = new Map(); for (const r of rows) (by.get(r.pair) ?? by.set(r.pair, {}).get(r.pair))[r.set] = f(r); return count([...by.values()], (x) => x.P > x.NF); };
check('Opus, "is the defect present?": AUC', judgeAuc((r) => num(r.opus_p_defect_present)), '0.974', 3);
check('Opus, gate wording: AUC', judgeAuc((r) => num(r.opus_p_established)), '0.975', 3);
check('Jev, reworded: AUC on the 30 pairs', judgeAuc((r) => r.jevDefect), '0.790', 3);
check('Jev, as shipped: AUC on the 30 pairs', judgeAuc((r) => r.jevShipped), '0.609', 3);
check('Opus, "is the defect present?": pairs ranked right', judgePairs((r) => num(r.opus_p_defect_present)), 29);
check('Opus, gate wording: pairs ranked right', judgePairs((r) => num(r.opus_p_established)), 27);
check('Opus, gate wording: real flags at >= 0.8', count(rows, (r) => r.set === 'P' && num(r.opus_p_established) >= 0.8), 0);

console.log(`\n${failures === 0 ? 'All numbers match the article.' : `${failures} number(s) differ from the article.`}`);
process.exitCode = failures ? 1 : 0;
