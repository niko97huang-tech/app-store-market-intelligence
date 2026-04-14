import path from "node:path";

const CONFIDENCE_LABELS = {
  low: "低",
  medium: "中",
  high: "高",
};

const TREND_VERDICT_LABELS = {
  strengthening: "持续增强",
  mixed: "信号混合",
  noisy: "噪音偏多",
  strong_but_fragile: "强趋势但脆弱",
  weak_but_stable: "弱趋势但稳定",
  short_term_heat: "短期热度",
  insufficient_data: "样本不足",
};

const TREND_PATTERN_LABELS = {
  clustered_growth: "簇状增长",
  single_point_spike: "单点尖峰",
  stable_compounding: "稳定累积",
  short_term_heat: "短期热度",
  mixed_signal: "混合信号",
  insufficient_data: "样本不足",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderList(items, fallback = "<li>待补充</li>") {
  if (!items?.length) {
    return fallback;
  }
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function getConfidenceLabel(value) {
  return CONFIDENCE_LABELS[value] ?? value ?? "中";
}

function getTrendVerdictLabel(value) {
  return TREND_VERDICT_LABELS[value] ?? value ?? "样本不足";
}

function getTrendPatternLabel(value) {
  return TREND_PATTERN_LABELS[value] ?? value ?? "样本不足";
}

function renderTopOpportunity(item, index) {
  return `
    <article class="top-opportunity">
      <div class="top-opportunity__index">0${index + 1}</div>
      <div class="top-opportunity__body">
        <p class="tiny-label">优先机会</p>
        <h3>${escapeHtml(item.opportunity_name)}</h3>
        <p>${escapeHtml(item.one_line_conclusion)}</p>
        <div class="chip-row">
          <span class="chip chip--warm">${escapeHtml(item.recommendation)}</span>
          <span class="chip chip--soft">${escapeHtml(getConfidenceLabel(item.confidence))}</span>
          <span class="chip chip--line">${escapeHtml(getTrendPatternLabel(item.trend_pattern ?? "insufficient_data"))}</span>
        </div>
      </div>
    </article>
  `;
}

function renderOpportunityCard(card) {
  const representativeApps = (card.representative_apps ?? [])
    .slice(0, 5)
    .map((app) => `${app.app_name ?? "Unknown"} (#${app.rank ?? "?"})`);

  return `
    <article class="intel-card">
      <header class="intel-card__header">
        <div>
          <p class="tiny-label">${escapeHtml(card.category_name)} · ${escapeHtml(card.list_type)}</p>
          <h3>${escapeHtml(card.opportunity_name)}</h3>
          <p class="intel-card__lead">${escapeHtml(card.one_line_conclusion)}</p>
        </div>
        <div class="chip-column">
          <span class="chip chip--warm">${escapeHtml(card.recommendation)}</span>
          <span class="chip chip--soft">${escapeHtml(getConfidenceLabel(card.confidence_code ?? card.confidence))}</span>
        </div>
      </header>

      <section class="signal-band">
        <div class="signal-band__item">
          <span>趋势模式</span>
          <strong>${escapeHtml(card.trend_pattern_label ?? getTrendPatternLabel(card.trend_pattern))}</strong>
        </div>
        <div class="signal-band__item">
          <span>趋势强度</span>
          <strong>${escapeHtml(card.trend_strength)}</strong>
        </div>
        <div class="signal-band__item">
          <span>趋势稳定性</span>
          <strong>${escapeHtml(card.trend_stability)}</strong>
        </div>
      </section>

      <div class="intel-grid">
        <section class="intel-block intel-block--accent">
          <p class="block-label">为什么现在值得看</p>
          <ul>${renderList(card.why_now)}</ul>
        </section>
        <section class="intel-block">
          <p class="block-label">产品视角</p>
          <div class="tag-cloud">
            ${(card.product_tags ?? []).map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("") || '<span class="tag-pill tag-pill--muted">待补充</span>'}
          </div>
          <p class="block-note">${escapeHtml(card.monetization_model_hint ?? card.monetization_hint ?? "")}</p>
        </section>
        <section class="intel-block">
          <p class="block-label">支持证据</p>
          <ul>${renderList(card.supporting_evidence)}</ul>
        </section>
        <section class="intel-block">
          <p class="block-label">可能驱动因素</p>
          <ul>${renderList(card.likely_drivers)}</ul>
        </section>
        <section class="intel-block">
          <p class="block-label">证据缺口</p>
          <ul>${renderList(card.evidence_gaps)}</ul>
        </section>
        <section class="intel-block">
          <p class="block-label">代表应用</p>
          <ul>${renderList(representativeApps)}</ul>
        </section>
      </div>
    </article>
  `;
}

function renderNegativeFinding(item) {
  return `
    <article class="negative-card">
      <p class="tiny-label">暂不优先</p>
      <h3>${escapeHtml(item.track_name)}</h3>
      <p class="negative-card__lead">${escapeHtml(item.conclusion)}</p>
      <div class="chip-row">
        <span class="chip chip--danger">${escapeHtml(item.recommendation)}</span>
        <span class="chip chip--soft">${escapeHtml(getConfidenceLabel(item.confidence ?? "medium"))}</span>
      </div>
      <ul>${renderList(item.reason_summary)}</ul>
    </article>
  `;
}

function renderTagSummary(items) {
  if (!items?.length) {
    return '<article class="tag-summary-card"><p class="block-note">暂无标签摘要。</p></article>';
  }
  return items
    .slice(0, 6)
    .map(
      (item) => `
        <article class="tag-summary-card">
          <p class="tiny-label">产品簇标签</p>
          <h3>${escapeHtml(item.tag)}</h3>
          <p>${escapeHtml((item.example_opportunities ?? []).join("、"))}</p>
          <strong>${escapeHtml(item.count)}</strong>
        </article>
      `,
    )
    .join("");
}

export function renderDashboardHtml({ analysisDoc, analysisId, links }) {
  const topCards = analysisDoc.opportunity_decision_cards.slice(0, 6);
  const negativeCards = analysisDoc.negative_findings.slice(0, 4);
  const tagCards = analysisDoc.tag_summary ?? [];

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(analysisId)} · 市场情报看板</title>
    <style>
      :root {
        --paper: #f3ecdf;
        --paper-deep: #e6d7bb;
        --ink: #171411;
        --muted: #62584f;
        --warm: #9b3d23;
        --warm-soft: rgba(155, 61, 35, 0.12);
        --forest: #2e4a40;
        --forest-soft: rgba(46, 74, 64, 0.12);
        --gold: #c88a2d;
        --line: rgba(29, 21, 15, 0.12);
        --surface: rgba(255, 250, 242, 0.76);
        --shadow: 0 18px 60px rgba(36, 20, 9, 0.14);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        color: var(--ink);
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 0% 0%, rgba(200, 138, 45, 0.18), transparent 24%),
          radial-gradient(circle at 100% 10%, rgba(46, 74, 64, 0.18), transparent 28%),
          linear-gradient(180deg, #fbf6ee 0%, var(--paper) 44%, #eee3d0 100%);
      }

      .board {
        width: min(1320px, calc(100vw - 40px));
        margin: 0 auto;
        padding: 28px 0 72px;
      }

      .masthead {
        position: relative;
        overflow: hidden;
        min-height: 360px;
        padding: 34px;
        border-radius: 30px;
        background:
          linear-gradient(145deg, rgba(255, 250, 244, 0.92), rgba(235, 221, 198, 0.78)),
          linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.02));
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .masthead::before {
        content: "";
        position: absolute;
        right: -80px;
        top: -80px;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(155, 61, 35, 0.16), transparent 68%);
      }

      .masthead::after {
        content: "";
        position: absolute;
        left: 38%;
        bottom: -110px;
        width: 540px;
        height: 240px;
        background: linear-gradient(180deg, rgba(46, 74, 64, 0.08), transparent);
        transform: rotate(-8deg);
        border-radius: 999px;
      }

      .tiny-label {
        margin: 0 0 10px;
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--muted);
      }

      h1, h2, h3 {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
      }

      h1 {
        font-size: clamp(2.9rem, 6vw, 5.7rem);
        line-height: 0.92;
        max-width: 10ch;
      }

      h2 {
        font-size: clamp(1.8rem, 2vw, 2.6rem);
      }

      .masthead__subtitle {
        margin: 18px 0 0;
        max-width: 42rem;
        color: var(--muted);
        line-height: 1.75;
        font-size: 1.04rem;
      }

      .meta-row, .chip-row, .resource-links, .tag-cloud {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .meta-row {
        margin-top: 22px;
      }

      .meta-pill, .chip, .tag-pill {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 12px;
        border: 1px solid var(--line);
      }

      .meta-pill {
        background: rgba(255,255,255,0.68);
      }

      .chip--warm {
        background: var(--warm-soft);
        color: var(--warm);
        border-color: rgba(155, 61, 35, 0.18);
      }

      .chip--soft, .tag-pill {
        background: var(--forest-soft);
        color: var(--forest);
        border-color: rgba(46, 74, 64, 0.18);
      }

      .chip--line {
        background: rgba(255,255,255,0.8);
        color: var(--ink);
      }

      .chip--danger {
        background: rgba(113, 31, 20, 0.12);
        color: #712014;
        border-color: rgba(113, 31, 20, 0.18);
      }

      .tag-pill--muted {
        background: rgba(255,255,255,0.65);
        color: var(--muted);
      }

      .hero-layout {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 1.4fr 0.9fr;
        gap: 20px;
        align-items: end;
        min-height: 300px;
      }

      .hero-panel {
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .summary-box {
        padding: 22px;
        border-radius: 24px;
        background: rgba(255, 252, 247, 0.74);
        border: 1px solid var(--line);
        backdrop-filter: blur(10px);
      }

      .summary-box ul {
        margin: 10px 0 0;
        padding-left: 18px;
      }

      .summary-box li {
        margin-bottom: 9px;
        color: var(--muted);
        line-height: 1.65;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .kpi-card {
        padding: 18px;
        border-radius: 24px;
        background: rgba(255, 250, 244, 0.78);
        border: 1px solid var(--line);
      }

      .kpi-card span {
        display: block;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 10px;
      }

      .kpi-card strong {
        display: block;
        font-size: 2rem;
        line-height: 1;
      }

      .section {
        margin-top: 28px;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: end;
        margin-bottom: 16px;
      }

      .section-note {
        max-width: 36rem;
        color: var(--muted);
        line-height: 1.7;
      }

      .top-opportunity-grid {
        display: grid;
        grid-template-columns: 1.05fr 1fr;
        gap: 16px;
      }

      .top-opportunity {
        display: grid;
        grid-template-columns: 68px 1fr;
        gap: 14px;
        padding: 18px;
        border-radius: 26px;
        background: linear-gradient(180deg, rgba(255, 250, 245, 0.82), rgba(241, 231, 216, 0.84));
        border: 1px solid var(--line);
        box-shadow: 0 10px 30px rgba(37, 22, 11, 0.08);
      }

      .top-opportunity__index {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 6px;
        font-family: "Iowan Old Style", Georgia, serif;
        font-size: 2.2rem;
        color: rgba(155, 61, 35, 0.78);
      }

      .top-opportunity h3 {
        font-size: 1.2rem;
        margin-bottom: 8px;
      }

      .top-opportunity p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .tag-summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .tag-summary-card,
      .negative-card,
      .intel-card {
        border-radius: 28px;
        border: 1px solid var(--line);
        background: rgba(255, 251, 246, 0.78);
        box-shadow: 0 12px 34px rgba(40, 23, 13, 0.08);
      }

      .tag-summary-card {
        padding: 18px;
      }

      .tag-summary-card h3 {
        font-size: 1.35rem;
        margin-bottom: 10px;
      }

      .tag-summary-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .tag-summary-card strong {
        display: inline-block;
        margin-top: 14px;
        font-size: 1.3rem;
        color: var(--warm);
      }

      .intel-card {
        padding: 24px;
      }

      .intel-card + .intel-card {
        margin-top: 18px;
      }

      .intel-card__header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
      }

      .intel-card h3 {
        font-size: 1.7rem;
      }

      .intel-card__lead {
        margin: 10px 0 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .chip-column {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-end;
      }

      .signal-band {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin: 18px 0;
      }

      .signal-band__item {
        padding: 16px;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,0.75), rgba(245, 237, 225, 0.82));
        border: 1px solid var(--line);
      }

      .signal-band__item span {
        display: block;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }

      .signal-band__item strong {
        font-size: 1.28rem;
      }

      .intel-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .intel-block {
        min-height: 100%;
        padding: 18px;
        border-radius: 22px;
        background: rgba(255,255,255,0.62);
        border: 1px solid rgba(26, 18, 12, 0.08);
      }

      .intel-block--accent {
        background: linear-gradient(180deg, rgba(155, 61, 35, 0.08), rgba(255,255,255,0.72));
      }

      .block-label {
        margin: 0 0 10px;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .block-note {
        margin: 12px 0 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .intel-block ul,
      .negative-card ul {
        margin: 0;
        padding-left: 18px;
      }

      .intel-block li,
      .negative-card li {
        margin-bottom: 8px;
        color: var(--muted);
        line-height: 1.65;
      }

      .negative-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .negative-card {
        padding: 20px;
      }

      .negative-card h3 {
        font-size: 1.35rem;
      }

      .negative-card__lead {
        margin: 10px 0 12px;
        color: var(--muted);
        line-height: 1.7;
      }

      .resource-links a {
        text-decoration: none;
        color: var(--ink);
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255,255,255,0.72);
        border: 1px solid var(--line);
      }

      .resource-links a:hover {
        color: var(--warm);
        border-color: rgba(155, 61, 35, 0.24);
      }

      @media (max-width: 1040px) {
        .hero-layout,
        .top-opportunity-grid,
        .tag-summary-grid,
        .negative-grid,
        .intel-grid,
        .signal-band {
          grid-template-columns: 1fr;
        }
        .chip-column {
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <main class="board">
      <section class="masthead">
        <div class="hero-layout">
          <div class="hero-panel">
            <div>
              <p class="tiny-label">App Store 市场情报看板</p>
              <h1>${escapeHtml(analysisDoc.target_run.snapshot_date)} 决策画布</h1>
              <p class="masthead__subtitle">
                把快照、趋势、归因、风险和建议动作压缩成一个可直接展示的研究面板。
                这一页不是数据备份，而是给人第一眼就看懂项目价值的演示入口。
              </p>
              <div class="meta-row">
                <span class="meta-pill">基线 · ${escapeHtml(analysisDoc.base_run.run_id)}</span>
                <span class="meta-pill">目标 · ${escapeHtml(analysisDoc.target_run.run_id)}</span>
                <span class="meta-pill">生成时间 · ${escapeHtml(analysisDoc.generated_at)}</span>
                <span class="meta-pill">版本 · ${escapeHtml(analysisDoc.report_version)}</span>
              </div>
            </div>
          </div>
          <div class="hero-panel">
            <div class="summary-box">
              <p class="tiny-label">一页结论</p>
              <h2>关键观察</h2>
              <ul>${renderList(analysisDoc.executive_summary.key_takeaways)}</ul>
              <p class="block-note">${escapeHtml(analysisDoc.executive_summary.confidence_note)}</p>
            </div>
            <div class="kpi-grid">
              <article class="kpi-card">
                <span>新上榜</span>
                <strong>${escapeHtml(analysisDoc.market_summary.ranking_changes.new_entry_count)}</strong>
              </article>
              <article class="kpi-card">
                <span>掉榜</span>
                <strong>${escapeHtml(analysisDoc.market_summary.ranking_changes.dropped_entry_count)}</strong>
              </article>
              <article class="kpi-card">
                <span>名次变化</span>
                <strong>${escapeHtml(analysisDoc.market_summary.ranking_changes.changed_entry_count)}</strong>
              </article>
              <article class="kpi-card">
                <span>新增应用详情</span>
                <strong>${escapeHtml(analysisDoc.market_summary.app_changes.new_app_count)}</strong>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <p class="tiny-label">优先机会</p>
            <h2>第一屏结论</h2>
          </div>
          <p class="section-note">
            先看到最值得研究的方向，再决定要不要深入看证据和卡片。
          </p>
        </div>
        <div class="top-opportunity-grid">
          ${analysisDoc.executive_summary.top_opportunities.slice(0, 5).map(renderTopOpportunity).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <p class="tiny-label">产品簇</p>
            <h2>标签与归因视角</h2>
          </div>
          <p class="section-note">
            让这套系统不只按 category 说话，而开始按产品簇和归因模式表达机会。
          </p>
        </div>
        <div class="tag-summary-grid">
          ${renderTagSummary(tagCards)}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <p class="tiny-label">机会决策卡</p>
            <h2>研究卡片视图</h2>
          </div>
          <p class="section-note">
            每一张卡都同时展示趋势、标签、归因、证据缺口和代表应用，适合直接做讨论和演示。
          </p>
        </div>
        ${topCards.map(renderOpportunityCard).join("")}
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <p class="tiny-label">反方结论</p>
            <h2>哪些方向不要追</h2>
          </div>
        </div>
        <div class="negative-grid">
          ${negativeCards.map(renderNegativeFinding).join("") || '<article class="negative-card"><p class="negative-card__lead">暂无明确反方结论。</p></article>'}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <p class="tiny-label">产物入口</p>
            <h2>原始输出与导出文件</h2>
          </div>
        </div>
        <div class="resource-links">
          <a href="${escapeHtml(links.analysisMarkdown)}">分析报告 Markdown</a>
          <a href="${escapeHtml(links.analysisJson)}">分析报告 JSON</a>
          <a href="${escapeHtml(links.opportunitiesMarkdown)}">机会清单 Markdown</a>
          <a href="${escapeHtml(links.exportsDir)}">导出目录</a>
          <a href="${escapeHtml(links.xlsx)}">Insights.xlsx</a>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

export function buildDashboardLinks({ dashboardDir, analysisDir, opportunitiesDir, exportsDir }) {
  const toRelative = (target) => path.relative(dashboardDir, target).split(path.sep).join("/");
  return {
    analysisMarkdown: toRelative(path.join(analysisDir, "market-analysis.md")),
    analysisJson: toRelative(path.join(analysisDir, "market-analysis.json")),
    opportunitiesMarkdown: toRelative(path.join(opportunitiesDir, "opportunities.md")),
    exportsDir: toRelative(exportsDir),
    xlsx: toRelative(path.join(exportsDir, "insights.xlsx")),
  };
}
