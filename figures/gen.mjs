// Generates the article figures as standalone HTML pages for headless-Chrome screenshots.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
mkdirSync(out, { recursive: true });

const css = `
:root{--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#7a7974;--grid:#e6e5e0;--line:#d4d3cd;
--a:#2a78d6;--b:#eb6834;--c:#1baf7a;--jev:#6250d6;--ref:#85847f;--card:#f4f3ef}
*{box-sizing:border-box}
body{margin:0;background:var(--surface);color:var(--ink);font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.fig{width:900px;padding:30px 36px 22px}
h1{font-size:25px;line-height:1.2;margin:0 0 6px;font-weight:650;letter-spacing:-.01em}
.sub{font-size:16px;color:var(--ink2);margin:0 0 22px;line-height:1.4}
.src{font-size:12.5px;color:var(--muted);margin-top:18px;line-height:1.4}
svg text{font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif}
`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="fig" id="fig">${body}</div></body></html>`;
const save = (name, body) => writeFileSync(join(out, `${name}.html`), page(body));

// ---------- Figure 1: pipeline with touch-points ----------
const chip = (p, text) => `<div class="chip chip-${p}"><span class="badge badge-${p}">${p}</span><span>${text}</span></div>`;
save('fig1-pipeline', `
<style>
.row{display:flex;align-items:flex-start;gap:0}
.col{flex:1;display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:0}
.arrow{width:16px;flex:none;text-align:center;color:var(--muted);font-size:18px;line-height:46px}
.agent{height:46px;border:1.5px solid var(--ink);border-radius:8px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:600;font-size:14.5px;line-height:1.15;background:#fff}
.chip{font-size:13px;line-height:1.25;padding:7px 8px 7px 7px;border-radius:6px;display:flex;align-items:flex-start;gap:6px;background:#fff}
.badge{flex:none;width:18px;height:18px;border-radius:4px;color:#fff;font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.badge-A{background:var(--a)}.badge-B{background:var(--b)}.badge-C{background:#138a60}
.chip-A{border:1.5px solid var(--a)}
.chip-C{border:1.5px solid var(--c);background:#e6f6ef}
.tool{margin-top:16px;border:1.5px dashed var(--b);border-radius:8px;padding:10px 12px;font-size:14.5px;display:flex;gap:8px;align-items:center;background:#fff}
.legend{display:flex;gap:22px;margin-top:20px;font-size:13.5px;color:var(--ink2)}
.legend div{display:flex;gap:7px;align-items:center}
.sw{width:22px;height:14px;border-radius:3px;background:#fff}
.note{font-size:12px;color:var(--muted);display:block;margin-top:2px}
</style>
<h1>Where Jev sat in the pipeline</h1>
<p class="sub">Three integration patterns, distinguished by who asks and whether the answer binds a decision.</p>
<div class="row">
  <div class="col"><div class="agent">Planner</div></div>
  <div class="arrow">→</div>
  <div class="col"><div class="agent">Sprint Scoper</div>${chip('A', 'scope necessity')}${chip('A', 'contract consistency')}</div>
  <div class="arrow">→</div>
  <div class="col"><div class="agent">Sprint Planner</div>${chip('A', 'file triage<br><span class="note">also before the Executor</span>')}</div>
  <div class="arrow">→</div>
  <div class="col"><div class="agent">Executor</div>${chip('A', 'rule compliance<br><span class="note">on the sprint diff</span>')}</div>
  <div class="arrow">→</div>
  <div class="col"><div class="agent">Critic</div>${chip('A', 'test strength<br><span class="note">before review</span>')}${chip('C', 'claim-support gate<br><span class="note">before a high/medium flag</span>')}</div>
  <div class="arrow">→</div>
  <div class="col"><div class="agent">Evaluator</div>${chip('C', 'criterion-evidence gate<br><span class="note">before passing a text criterion</span>')}</div>
</div>
<div class="tool"><span class="badge badge-B">B</span><span><b>On-demand tool</b>: offered to every role; the agent decides whether to ask.</span></div>
<div class="legend">
  <div><span class="sw" style="border:1.5px solid var(--a)"></span>A · Advisory check: a script asks, the brief shows the answer</div>
  <div><span class="sw" style="border:1.5px dashed var(--b)"></span>B · Agent asks if it wants</div>
  <div><span class="sw" style="border:1.5px solid var(--c);background:#e6f6ef"></span>C · Gate: must ask before deciding</div>
</div>
<div class="src">Source: Plugin releases 0.69.0–0.76.0. Shadow mode (0.69–0.71) not shown: removed after one day, no measurements.</div>
`);

// ---------- Figure 2: timeline ----------
{
  const X0 = 250, X1 = 830, D0 = 2, D1 = 18.6;
  const x = (d) => X0 + ((d - D0) / (D1 - D0)) * (X1 - X0);
  const lanes = [
    { y: 70, label: 'Setup', note: '(not evaluated)', color: '#c9c8c2', from: 2, to: 4, end: 'spec, sizing, config, repair routing' },
    { y: 128, label: 'Shadow mode', note: '(not evaluated)', color: 'var(--ref)', from: 4, to: 5, end: 'removed after 1 day' },
    { y: 186, label: 'A · Advisory checks', color: 'var(--a)', from: 5, to: 18 },
    { y: 244, label: 'B · On-demand tool', color: 'var(--b)', from: 5, to: 18 },
    { y: 302, label: 'C · Binding gates', color: 'var(--c)', from: 18, to: 18.45 },
  ];
  const marks = [
    { lane: 2, d: 5.25, t: 'file triage' },
    { lane: 2, d: 8, t: 'planning checks, test strength' },
    { lane: 3, d: 6, t: 'warning: tool never called' },
  ];
  let s = `<svg width="900" height="390" viewBox="0 10 900 390" xmlns="http://www.w3.org/2000/svg" style="margin-left:-36px;display:block">`;
  for (let d = 2; d <= 18; d += 2) {
    s += `<line x1="${x(d)}" x2="${x(d)}" y1="40" y2="330" stroke="var(--grid)" stroke-width="1"/>`;
    s += `<text x="${x(d)}" y="352" font-size="13" fill="var(--ink2)" text-anchor="middle">Oct ${d}</text>`;
  }
  s += `<line x1="${X0}" x2="${X1}" y1="330" y2="330" stroke="var(--line)" stroke-width="1"/>`;
  for (const l of lanes) {
    s += `<text x="36" y="${l.y + 5}" font-size="15" font-weight="600" fill="var(--ink)">${l.label}</text>`;
    if (l.note) s += `<text x="36" y="${l.y + 23}" font-size="12.5" fill="var(--muted)">${l.note}</text>`;
    s += `<rect x="${x(l.from)}" y="${l.y - 10}" width="${Math.max(x(l.to) - x(l.from), 8)}" height="20" rx="4" fill="${l.color}"/>`;
    if (l.end) s += `<text x="${x(l.to) + 8}" y="${l.y + 5}" font-size="13" fill="var(--ink2)">${l.end}</text>`;
  }
  for (const m of marks) {
    const y = lanes[m.lane].y;
    s += `<circle cx="${x(m.d)}" cy="${y}" r="5" fill="#fff" stroke="var(--ink)" stroke-width="2"/>`;
    s += `<text x="${x(m.d) - 4}" y="${y - 17}" font-size="12.5" fill="var(--ink2)">${m.t}</text>`;
  }
  s += `<text x="${x(18) - 10}" y="${lanes[4].y + 5}" font-size="13" fill="var(--ink2)" text-anchor="end">gates ship (0.76.0)</text>`;
  s += `<line x1="${x(18)}" x2="${x(18)}" y1="30" y2="330" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  s += `<text x="${x(18)}" y="378" font-size="13" fill="var(--ink)" font-weight="600" text-anchor="end">Oct 18: offline experiment, removal decision</text>`;
  s += `</svg>`;
  save('fig2-timeline', `<h1>Sixteen days, 20 releases, 491 commits</h1><p class="sub">When each integration pattern was live in the Plugin.</p>${s}<div class="src">Source: CHANGELOG entries 0.64.0–0.76.0; commit log 2026-10-02 to 2026-10-18.</div>`);
}

// ---------- Figure 3: labeled sets ----------
save('fig3-sets', `
<style>
.top{display:flex;align-items:center;gap:12px;font-size:15px}
.box{border:1.5px solid var(--ink);border-radius:8px;padding:10px 14px;background:#fff;line-height:1.35}
.arr{color:var(--muted);font-size:20px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px}
.card{border:1.5px solid var(--line);border-radius:10px;background:#fff;overflow:hidden}
.card .hd{padding:12px 14px 10px;border-bottom:1px solid var(--grid)}
.card .n{font-size:28px;font-weight:650;letter-spacing:-.01em}
.card .t{font-size:15.5px;font-weight:600;margin-top:2px}
.card .bd{padding:10px 14px 12px;font-size:14px;line-height:1.4;color:var(--ink2)}
.kv{display:flex;justify-content:space-between;border-top:1px solid var(--grid);padding:9px 14px;font-size:14px}
.kv b{font-variant-numeric:tabular-nums}
.tag{display:inline-block;font-size:12px;color:var(--muted);margin-top:4px}
.code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;background:var(--card);border-radius:6px;padding:6px 8px;margin-top:8px;line-height:1.5;color:var(--ink2)}
.hl{background:#fbe3d6;border-radius:2px;color:var(--ink)}
.ok{background:#dcefe6;border-radius:2px;color:var(--ink)}
</style>
<h1>Three labeled sets from historic Critic flags</h1>
<p class="sub">Same claim, different code. A useful gate must separate the first two.</p>
<div class="top">
  <div class="box"><b>313</b> Critic transcripts</div><span class="arr">→</span>
  <div class="box"><b>915</b> flags; code rebuilt from what the Critic read</div><span class="arr">→</span>
  <div class="box">high + medium flags<br><span style="color:var(--ink2);font-size:13.5px">the gate's scope</span></div>
</div>
<div class="cards">
  <div class="card"><div class="hd"><div class="n">232</div><div class="t">Real flags</div><span class="tag">label: defect present</span></div>
    <div class="bd">The flag against the code it was raised on.<div class="code">if (cfg.retries)<br><span class="hl">&nbsp;&nbsp;retry(cfg.retries - 1)</span><br>return done()</div></div>
    <div class="kv"><span>Jev median score</span><b>0.10</b></div></div>
  <div class="card"><div class="hd"><div class="n">127</div><div class="t">Stale flags</div><span class="tag">label: defect gone · the hard negative</span></div>
    <div class="bd">The same flag against the same spot after the fix landed.<div class="code">if (cfg.retries)<br><span class="ok">&nbsp;&nbsp;retry(cfg.retries)</span><br>return done()</div></div>
    <div class="kv"><span>Jev median score</span><b>0.08</b></div></div>
  <div class="card"><div class="hd"><div class="n">232</div><div class="t">Wrong code</div><span class="tag">label: unrelated · sanity check</span></div>
    <div class="bd">The same flag against another file's code.<div class="code">export function parse(s) {<br>&nbsp;&nbsp;return JSON.parse(s)<br>}</div></div>
    <div class="kv"><span>Jev median score</span><b>0.02</b></div></div>
</div>
<div class="src">Code snippets are illustrative. Scores: claim-support-v2 as shipped, 591 calls, jev-1.13.0.</div>
`);

// ---------- Figure 4: AUC bars ----------
{
  const rows = [
    { who: 'Opus', q: '“Is the defect present?”', v: 0.974, c: 'var(--ref)' },
    { who: 'Opus', q: 'gate wording', v: 0.975, c: 'var(--ref)' },
    { who: 'Jev', q: '“Is the defect present?”', v: 0.790, c: 'var(--jev)' },
    { who: 'Jev', q: 'gate wording (as shipped)', v: 0.609, c: 'var(--jev)' },
  ];
  const X0 = 300, X1 = 780, H = 34, G = 22, Y0 = 50;
  const x = (v) => X0 + v * (X1 - X0);
  let s = `<svg width="828" height="${Y0 + rows.length * (H + G) + 40}" xmlns="http://www.w3.org/2000/svg" style="margin-left:-36px;display:block">`;
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const yb = Y0 + rows.length * (H + G) - G + 10;
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${Y0 - 14}" y2="${yb}" stroke="var(--grid)"/>`;
    s += `<text x="${x(t)}" y="${yb + 20}" font-size="13" fill="var(--ink2)" text-anchor="middle">${t}</text>`;
  }
  rows.forEach((r, i) => {
    const y = Y0 + i * (H + G);
    s += `<text x="36" y="${y + 15}" font-size="15" font-weight="600" fill="var(--ink)">${r.who}</text>`;
    s += `<text x="36" y="${y + 33}" font-size="13.5" fill="var(--ink2)">${r.q}</text>`;
    s += `<rect x="${X0}" y="${y + 4}" width="${x(r.v) - X0}" height="${H - 8}" rx="4" fill="${r.c}"/>`;
    s += `<text x="${x(r.v) + 8}" y="${y + H / 2 + 5}" font-size="15" font-weight="600" fill="var(--ink)">${r.v.toFixed(3)}</text>`;
  });
  const yb = Y0 + rows.length * (H + G) - G + 10;
  s += `<line x1="${x(0.5)}" x2="${x(0.5)}" y1="${Y0 - 22}" y2="${yb}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  s += `<text x="${x(0.5) + 6}" y="${Y0 - 12}" font-size="12.5" fill="var(--ink)">chance</text>`;
  s += `</svg>`;
  save('fig4-auc', `<h1>Same evidence, different judges</h1><p class="sub">AUC for telling a real Critic flag from the same flag after the fix, on the same 30 pairs. 0.5 is chance.</p>${s}<div class="src">Source: two blind Opus judges and jev-1.13.0 on 30 real/stale pairs. On all 127 pairs Jev scored 0.77 (reworded) and 0.62 (as shipped).</div>`);
}

// ---------- Figure 5: scorecard table ----------
{
  const rows = [
    ['Is this code what the claim is about?', 'C', '232 real vs 232 unrelated', 'AUC 0.97', 'Good'],
    ['May this file need changes?', 'A', '768 file checks, 6 positive', 'AUC 0.955', 'Good, thin'],
    ['Does this file concern the task? (one build)', 'A', '220 file checks, 9 relevant', 'AUC 0.825', 'Good'],
    ['Does this file concern the task? (main build)', 'A', '746 file checks, 24 relevant', 'AUC 0.54', 'Chance'],
    ['Real flag or stale flag? (as shipped)', 'C', '232 real vs 127 stale', 'AUC 0.62', 'Near chance'],
    ['Real flag or stale flag? (reworded)', 'C', '232 real vs 127 stale', 'AUC 0.77', 'Below Opus 0.97'],
    ['Is this test weak?', 'A', '126 tests, 16 weak', 'AUC 0.23', 'Inverted'],
    ['Are these criteria consistent?', 'A', '191 answers', '191 / 191 “yes”', 'Constant'],
    ['Is this file needed for this criterion?', 'A', '240 judgments', '72% no verdict', 'No verdict'],
    ['Agent asks on its own', 'B', '~157 dispatches', '~8% used', 'Rarely used'],
  ];
  const tone = { Good: '▲', 'Good, thin': '▲', Chance: '▼', 'Near chance': '▼', 'Below Opus 0.97': '■', Inverted: '▼', Constant: '■', 'No verdict': '■', 'Rarely used': '■' };
  const badge = (p) => `<span class="badge badge-${p}">${p}</span>`;
  save('fig5-scorecard', `
<style>
table{width:100%;border-collapse:collapse;font-size:14.5px}
th{text-align:left;font-size:12.5px;font-weight:600;color:var(--ink2);text-transform:uppercase;letter-spacing:.04em;padding:0 10px 10px;border-bottom:1.5px solid var(--ink)}
td{padding:10px;border-bottom:1px solid var(--grid);vertical-align:middle}
td.num{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
td.data{color:var(--ink2);white-space:nowrap}
td.read{white-space:nowrap}
.badge{display:inline-flex;width:20px;height:20px;border-radius:4px;color:#fff;font-size:12px;font-weight:700;align-items:center;justify-content:center}
.badge-A{background:var(--a)}.badge-B{background:var(--b)}.badge-C{background:#138a60}
.mk{display:inline-block;width:16px;color:var(--ink2)}
</style>
<h1>Scorecard</h1>
<p class="sub">Jev checks whose results could be measured. A = advisory check, B = on-demand tool, C = gate (offline test).</p>
<table><thead><tr><th>Question Jev answered</th><th></th><th>Data</th><th>Result</th><th>Reading</th></tr></thead><tbody>
${rows.map(([q, p, d, r, k]) => `<tr><td>${q}</td><td>${badge(p)}</td><td class="data">${d}</td><td class="num">${r}</td><td class="read"><span class="mk">${tone[k]}</span>${k}</td></tr>`).join('')}
</tbody></table>
<div class="src">▲ useful signal · ■ no usable signal · ▼ at or below chance. AUC: 0.5 is chance, 1.0 perfect. Rule compliance and criterion evidence left out: one-class labels. Sources: decision logs of five builds and the offline experiment (jev-1.13.0).</div>
`);
}

// ---------- Figure 6: Jev vs always giving the majority answer (dot plot) ----------
{
  const rows = [
    { q: 'Does this file concern the task?', d: '746 file checks, 24 relevant', jev: 0.930, base: 0.968 },
    { q: 'May this file need changes?', d: '768 file checks, 6 positive', jev: 0.980, base: 0.992 },
    { q: 'Is this file needed for this criterion?', d: '24 labels, 0 needed', jev: 0.833, base: 1.0 },
  ];
  const X0 = 330, X1 = 790, V0 = 0.8, V1 = 1.0, Y0 = 70, RH = 70;
  const x = (v) => X0 + ((v - V0) / (V1 - V0)) * (X1 - X0);
  const H = Y0 + rows.length * RH + 30;
  let s = `<svg width="828" height="${H}" xmlns="http://www.w3.org/2000/svg" style="margin-left:-36px;display:block">`;
  // legend
  s += `<circle cx="${X0 + 6}" cy="22" r="7" fill="var(--jev)"/><text x="${X0 + 20}" y="27" font-size="14" fill="var(--ink)">Jev</text>`;
  s += `<rect x="${X0 + 80}" y="15" width="14" height="14" rx="2" fill="#fff" stroke="var(--ref)" stroke-width="2.5"/><text x="${X0 + 102}" y="27" font-size="14" fill="var(--ink)">Always giving the majority answer</text>`;
  const yAxis = Y0 + rows.length * RH - 20;
  for (const t of [0.8, 0.85, 0.9, 0.95, 1.0]) {
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${Y0 - 20}" y2="${yAxis}" stroke="var(--grid)"/>`;
    s += `<text x="${x(t)}" y="${yAxis + 20}" font-size="13" fill="var(--ink2)" text-anchor="middle">${t.toFixed(2)}</text>`;
  }
  s += `<text x="${(X0 + X1) / 2}" y="${yAxis + 40}" font-size="12.5" fill="var(--muted)" text-anchor="middle">accuracy (axis starts at 0.80)</text>`;
  rows.forEach((r, i) => {
    const y = Y0 + i * RH + 10;
    s += `<text x="36" y="${y - 2}" font-size="15" font-weight="600" fill="var(--ink)">${r.q}</text>`;
    s += `<text x="36" y="${y + 17}" font-size="13.5" fill="var(--ink2)">${r.d}</text>`;
    s += `<line x1="${x(r.jev)}" x2="${x(r.base)}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="2"/>`;
    s += `<circle cx="${x(r.jev)}" cy="${y}" r="7" fill="var(--jev)" stroke="var(--surface)" stroke-width="2"/>`;
    s += `<rect x="${x(r.base) - 7}" y="${y - 7}" width="14" height="14" rx="2" fill="#fff" stroke="var(--ref)" stroke-width="2.5"/>`;
    s += `<text x="${x(r.jev) - 13}" y="${y + 5}" font-size="14" font-weight="600" fill="var(--ink)" text-anchor="end">${r.jev.toFixed(3)}</text>`;
    s += `<text x="${x(r.base) + (r.base >= 0.99 ? -13 : 13)}" y="${y + (r.base >= 0.99 ? -12 : 5)}" font-size="14" fill="var(--ink2)" text-anchor="${r.base >= 0.99 ? 'end' : 'start'}">${r.base.toFixed(3)}</text>`;
  });
  s += `</svg>`;
  save('fig6-baseline', `<h1>Accurate, and still worse than a constant</h1><p class="sub">In the main build, always giving the majority answer beat Jev on every labeled triage and planning question.</p>${s}<div class="src">Source: main build, sprints 1–6, jev-1.13.0. Triage questions: probability ≥ 0.5 counted as “yes”.</div>`);
}
console.log('ok');
