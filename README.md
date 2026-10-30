# Accurate and Useless: Jev in a multi-agent coding pipeline

Data and code for the article [*Accurate and Useless: What 5,300 Calls to a Small Judge Model Taught Us*](ARTICLE.md).

In October 2026 we integrated [Jev](https://typesafe.ai), a small judgment model from TypeSafe, into our Plugin, a multi-agent build pipeline for Claude Code. The goal was to save agent tokens without making results worse. We tried and measured three integration patterns: automatic advisory checks, an on-demand tool for agents, and binding gates. This repository holds the article, its figures, and the anonymized data behind every number in it.

## Contents

| Path | What it is |
|---|---|
| [`ARTICLE.md`](ARTICLE.md) | The article |
| [`figures/`](figures/) | The six figures, and `gen.mjs`, which draws them |
| [`data/`](data/) | Anonymized scores, labels and counts from five real builds and one offline experiment |
| [`recompute.mjs`](recompute.mjs) | Rebuilds every number in the article from `data/` and checks it against the published value |

## Reproduce the numbers

```bash
node recompute.mjs
```

The script needs Node 18 or newer and nothing else. It runs 103 checks, prints each with the article's value, and ends with `All numbers match the article.` A mismatch prints `FAIL` with both values and exits with code 1.

> **Disclaimer.** This data is an anonymized extract of the experiment logs, and it is the only part of them we publish. The full logs stay private because they contain the pipeline's source code and review text. Anonymizing replaced identifiers (calls, files, builds, dispatches, flags) with sequential IDs and removed all text: no source code, review text, file paths or names. No score, label or count was changed, which is why every number in the article can be recomputed from it.

## The data

| File | Rows | One row per |
|---|---|---|
| `field-calls.csv` | 4,222 | Jev call in the five real builds |
| `field-judgments.csv` | 11,760 | answer within a call (one call can ask several questions) |
| `field-labels.csv` | 3,948 | label: what actually happened later, used as the right answer |
| `tool-records.csv` | 839 | time the on-demand tool was offered to an agent, or called by one |
| `gate-outcomes.csv` | 20 | gate decision in the main build |
| `claim-support.csv` | 591 | item in the offline claim-support experiment, with all three Jev runs side by side |
| `claim-support-calls.csv` | 1,092 | offline Jev call (591 as shipped, 142 with a wider window, 359 reworded) |
| `opus-judges.csv` | 60 | blind Opus judge answer (30 real/stale pairs; each judge saw each claim once) |

### Builds

| Build | Started (October 2026) | Calls | In the article |
|---|---|---|---|
| B1 | 4 | 213 | no labels; counted in the call total only |
| B2 | 12 | 1,050 | rule compliance, test strength, the Critic's own claim-support asks |
| B3 | 15 | 396 | "another build": triage relevance AUC 0.825 |
| B4 | 17 | 1,598 | "a third": 801 triage labels, none relevant |
| B5 | 17 | 965 | **the main build** |

### Columns

**IDs.** `call` (`C…`), `file` (`F…`), `dispatch` (`D…`) and `pair` (`K…`) are sequential IDs assigned at export. They link rows within this data and mean nothing outside it. In the experiment, a real flag (`P`) and its stale version (`NF`) share a `pair`.

**field-judgments.csv**
- `template`: the question format Jev answered, such as `file-triage-v1` or `scope-necessity-v2`.
- `role`: the agent the call was made for. It's empty for repair routing, which no agent made.
- `question`: the question key within the call. File triage asks `concerns_task`, `needs_change` and `defines_constraint`.
- `type`: `noul` (a probability in `noul`), `choice` (an option in `choice`) or `score` (a value in `score`). Options that agents wrote themselves, in free-form questions, are left blank.
- `confidence`, `top_probability`: as Jev reported them.
- `admitted`: `1` if the answer passed the template's confidence bar. If not, `not_admitted_reason` gives why, such as `uncertain` or `insufficient_evidence`.
- `file`: for file triage, the file that was judged.

**field-labels.csv**
- `answer`: the observed outcome. For triage it's `true` or `false` (the agent later edited or read the file). For test strength it's a level from 0 to 4, and below 2 counts as weak. For choice templates it's the option that turned out right.
- `source`, `strength`: where the label came from, and how directly.
- `acted_on`: `1` if the agent acted on Jev's answer.

**claim-support.csv**
- `set`: `P` (a real flag against the code it was raised on), `NF` (the same flag against the code after the fix) or `NS` (the same flag against another file's code).
- `label`: `1` for `P`, `0` otherwise.
- `jev_shipped`, `jev_shipped_wide`, `jev_defect`: Jev's probability with the gate's question, the same question with a ±150-line window, and the reworded question. A blank means that run didn't cover the item.

### How the measures are computed

- **AUC** is computed over all positive/negative pairs, with ties counted as half.
- **File triage** counts a probability of 0.5 or more as "yes". Briefs are routed by the template's rules: "may need changes" above 0.7, then "defines a constraint" above 0.6, then "related" above 0.7 on "concerns the task"; everything else is dropped.
- **Test strength:** Jev's predicted level is its score rounded to the nearest level, and below 2 is weak. The label partly stores Jev's own prediction, so only the weak-vs-held comparison is a real measurement.
- **Medians** take the lower middle value.

### Not reproducible from this data

These numbers come from material that can't be shared without exposing private code or review text:
- The extraction counts: 915 flags from 313 Critic transcripts, with code recovered for 721.
- The 111 re-checks of earlier flags, all of which said "valid".
- The pipeline's own report (raw accuracy 0.956 for triage and 0.833 for scope necessity).
- The release and commit counts (20 releases, 491 commits).

All results are for one Jev model version, jev-1.13.0.

## Figures

| File | Caption |
|---|---|
| [`fig1-pipeline.png`](figures/fig1-pipeline.png) | Figure 1. Where Jev sat in the pipeline, by integration pattern. |
| [`fig2-timeline.png`](figures/fig2-timeline.png) | Figure 2. Sixteen days: 20 releases, 491 commits. |
| [`fig3-sets.png`](figures/fig3-sets.png) | Figure 3. Three labeled sets from the same historic flags. |
| [`fig4-auc.png`](figures/fig4-auc.png) | Figure 4. Same evidence, different judges: real vs stale flags. |
| [`fig5-scorecard.png`](figures/fig5-scorecard.png) | Figure 5. Where Jev was good and where it wasn't. |
| [`fig6-baseline.png`](figures/fig6-baseline.png) | Figure 6. Jev vs always giving the majority answer (main build). |

`figures/gen.mjs` writes each figure as a standalone HTML page, with the numbers written into the script. The PNGs are screenshots of those pages at 2× scale in headless Chrome:

```bash
node figures/gen.mjs out
```

## License

The article, figures and data are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the code under MIT. See [LICENSE.md](LICENSE.md).
