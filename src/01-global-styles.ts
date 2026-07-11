
	/* ----------------------------------------------------------
	 * 0. Global styles
	 * ---------------------------------------------------------- */
	export const style = document.createElement('style');
	style.textContent = `
    :root{--tm-font-scale:1.08;--tm-ui-scale:1.08}
    .tm-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#323232;color:#fff;padding:calc(8px * var(--tm-ui-scale)) calc(16px * var(--tm-ui-scale));border-radius:6px;opacity:0;transition:opacity .2s ease;z-index:10000;font-size:calc(15px * var(--tm-font-scale));pointer-events:none}
    .tm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:10000}
    .tm-dialog{background:#fff;color:#000;padding:calc(24px * var(--tm-ui-scale)) calc(28px * var(--tm-ui-scale));border-radius:12px;width:min(calc(980px * var(--tm-ui-scale)),94vw);max-width:calc(980px * var(--tm-ui-scale));box-shadow:0 10px 30px rgba(0,0,0,.25);max-height:84vh;display:flex;flex-direction:column;font-size:calc(14px * var(--tm-font-scale))}
    .tm-dialog header{margin:0 0 14px 0;font-size:18px;font-weight:700}
    .tm-dialog .tm-content{flex:1 1 auto;overflow:auto;min-height:0}
    .tm-dialog footer{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}
    .tm-dialog button{padding:10px 16px;border:none;border-radius:8px;font-size:14px;cursor:pointer}
    .tm-dialog button.primary{background:#065fd4;color:#fff}
    .tm-dialog button.secondary{background:#eee;color:#000}
    .tm-dialog button[disabled]{opacity:.6;cursor:wait}
    .tm-dialog textarea{width:100%;height:260px;resize:vertical;margin-top:8px;font-family:monospace;font-size:14px}
    .tm-block-list{list-style:none;padding:0;margin:0}
    .tm-block-list li{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;gap:12px;word-break:break-word;border-bottom:1px solid #ececec}
    .tm-block-list li:last-child{border-bottom:none}
    .tm-block-list li button{padding:4px 12px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#d32f2f;color:#fff;flex:0 0 auto}
    .tm-block-main{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 auto}
    .tm-block-label{font-weight:600;word-break:break-all}
    .tm-block-badges{display:flex;gap:6px;flex-wrap:wrap}
    .tm-badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:600;background:#f1f3f4;color:#333}
    .tm-badge.handle-only{background:#fff4d6;color:#8a5b00}
    .tm-badge.paired{background:#e3f5ea;color:#1d6f42}
    .tm-badge.stale{background:#ffe5cc;color:#a45100}
    .tm-badge.mismatch{background:#fde2e1;color:#b42318}
    .tm-badge.unverified{background:#ecebff;color:#5243aa}
    .tm-badge.uid{background:#e4f0ff;color:#0b57d0}
    .tm-badge.regex{background:#ececec;color:#444}
    .tm-block-meta{font-size:12px;line-height:1.5;color:#5f6368}
    .tm-section{border:1px solid #e5e5e5;border-radius:12px;padding:14px 16px;margin-bottom:14px}
    .tm-section h3{margin:0 0 10px 0;font-size:15px}
    .tm-settings-panel{padding:0;overflow:hidden}
    .tm-settings-panel > h3{padding:14px 16px 0 16px}
    .tm-settings-intro{padding:0 16px 12px 16px;margin:0;border-bottom:1px solid #ececec}
    .tm-settings-list{list-style:none;margin:0;padding:0}
    .tm-settings-list > .tm-setting-group{display:grid;grid-template-columns:minmax(130px,.7fr) minmax(0,2fr);gap:12px;border-top:1px solid #ececec;padding:14px 16px;margin:0}
    .tm-settings-list > .tm-setting-group:first-child{border-top:none}
    .tm-settings-list > .tm-setting-group h4{margin:0;font-size:13px;color:#3c4043}
    .tm-setting-controls{display:flex;flex-direction:column;gap:10px;min-width:0}
    .tm-setting-controls label{display:flex;align-items:center;gap:8px;font-weight:600;flex-wrap:wrap}
    .tm-setting-controls p{margin:2px 0 0 0;font-size:12px;color:#5f6368}
    .tm-setting-group{border-top:1px solid #ececec;padding-top:12px;margin-top:12px}
    .tm-setting-group:first-of-type{border-top:none;padding-top:0;margin-top:0}
    .tm-setting-group h4{margin:0 0 8px 0;font-size:13px;color:#3c4043}
    .tm-toggle-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .tm-toggle-row label{display:flex;align-items:center;gap:8px;font-weight:600}
    .tm-toggle-row p{margin:6px 0 0 0;font-size:12px;color:#5f6368}
    .tm-inline-actions{display:flex;gap:8px;flex-wrap:wrap}
    .tm-inline-actions button{padding:8px 12px;font-size:13px}
    .tm-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
    .tm-summary-card{border-radius:10px;background:#f8f9fa;padding:10px 12px}
    .tm-summary-card strong{display:block;font-size:18px}
    .tm-summary-card span{font-size:12px;color:#5f6368}
    .tm-toolbar{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
    .tm-toolbar-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .tm-toolbar-group{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .tm-toolbar-group label{font-weight:600}
    .tm-toolbar-group select{padding:7px 10px;border:1px solid #d0d7de;border-radius:8px;background:#fff;color:inherit}
    .tm-toolbar-group input[type="search"]{padding:7px 10px;border:1px solid #d0d7de;border-radius:8px;background:#fff;color:inherit;min-width:220px}
    .tm-tag-group{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .tm-tag-group label{display:inline-flex;align-items:center;gap:6px;font-weight:500}
    .tm-counter{font-size:12px;color:#5f6368}
    .tm-list-empty{padding:18px 0;text-align:center;color:#5f6368}
    .tm-item-check{margin-top:2px}
    .tm-inline-note{font-size:12px;color:#5f6368}
    .tm-progress{height:4px;border-radius:999px;background:#e8f0fe;overflow:hidden;margin-top:8px}
    .tm-progress::before{content:"";display:block;width:45%;height:100%;border-radius:999px;background:#065fd4;animation:tm-progress-slide 1s ease-in-out infinite}
    .tm-progress[hidden]{display:none}
    @keyframes tm-progress-slide{0%{transform:translateX(-100%)}100%{transform:translateX(230%)}}
    .tm-result-panel{margin-top:10px;border-top:1px solid #ececec;padding-top:10px}
    .tm-result-panel details{border:1px solid #e5e5e5;border-radius:10px;padding:8px 10px;background:#fafafa}
    .tm-result-panel summary{cursor:pointer;font-weight:600}
    .tm-result-list{list-style:none;padding:0;margin:10px 0 0 0;display:flex;flex-direction:column;gap:8px}
    .tm-result-list li{padding:8px 10px;border:1px solid #ececec;border-radius:8px}
    .tm-result-outcome{font-weight:700}
    .tm-search-note{font-size:12px;color:#5f6368}
    .tm-regex-summary{display:flex;flex-direction:column;gap:8px}
    .tm-regex-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .tm-regex-match-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
    .tm-regex-match-list li{padding:6px 8px;border:1px solid #ececec;border-radius:8px}
    .tm-regex-bar{position:sticky;top:0;z-index:1;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:12px 14px;margin-bottom:14px}
    .tm-regex-bar header{margin:0;font-size:16px;font-weight:700}
    .tm-regex-bar .row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .tm-regex-bar .controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .tm-regex-bar input,.tm-section input{padding:7px 10px;border:1px solid #d0d7de;border-radius:8px}
    .tm-banner{position:fixed;top:18px;right:18px;z-index:9999;max-width:min(420px,calc(100vw - 36px));background:#fff7e6;color:#3d2f00;border:1px solid #ffd27a;border-radius:14px;box-shadow:0 12px 24px rgba(0,0,0,.18);padding:14px 16px}
    .tm-banner strong{display:block;margin-bottom:6px}
    .tm-banner p{margin:0;font-size:13px;line-height:1.45}
    .tm-banner .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .tm-banner .actions button{padding:8px 12px;border:none;border-radius:8px;cursor:pointer;font-size:13px}
    .tm-banner .actions .primary{background:#065fd4;color:#fff}
    .tm-banner .actions .secondary{background:#fff;color:#3d2f00;border:1px solid #ffd27a}
    .tm-muted{font-size:12px;color:#5f6368}
    .tm-hide-channel{display:flex !important;align-items:center;gap:10px;color:#b3261e;font-weight:600}
    .tm-menu-script-mark{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:4px;background:#b3261e;color:#fff;font-size:10px;font-weight:700;letter-spacing:0}
    .tm-hidden{display:none !important}
    .tm-block-placeholder-mode > :not(.tm-block-placeholder){display:none !important}
    .tm-block-placeholder-mode.tm-block-revealed > :not(.tm-block-placeholder){display:revert !important}
    .tm-block-placeholder-mode.tm-block-revealed > .tm-block-placeholder{display:none !important}
    .tm-block-placeholder{display:block;width:100%;box-sizing:border-box;padding:10px 12px;margin:6px 0;border:1px solid #d0d7de;border-radius:8px;background:#f1f3f4;color:#5f6368;font:inherit;text-align:left}
    button.tm-block-placeholder{cursor:pointer}
    button.tm-block-placeholder:hover{background:#e8eaed;color:#202124}
    @media (max-width: 640px){
      .tm-dialog{padding:18px}
      .tm-settings-list > .tm-setting-group{grid-template-columns:1fr}
      .tm-block-list li{flex-direction:column}
      .tm-block-list li button{align-self:flex-end}
      .tm-toolbar-row,.tm-toolbar-group{align-items:stretch}
      .tm-toolbar-group{flex-direction:column;align-items:flex-start}
      .tm-toolbar-group input[type="search"]{min-width:0;width:100%}
      .tm-banner{left:12px;right:12px;top:auto;bottom:72px;max-width:none}
    }
    @media (prefers-color-scheme: dark){
      .tm-dialog{background:#1f1f1f;color:#fff}
      .tm-dialog button.secondary{background:#333;color:#fff}
      .tm-section,.tm-regex-bar{background:#1f1f1f;border-color:#444}
      .tm-settings-intro,.tm-settings-list > .tm-setting-group{border-color:#333}
      .tm-setting-group{border-color:#333}
      .tm-setting-group h4{color:#e8eaed}
      .tm-summary-card{background:#2a2a2a}
      .tm-block-list li{border-color:#333}
      .tm-block-meta,.tm-toggle-row p,.tm-summary-card span,.tm-muted,.tm-inline-note,.tm-search-note{color:#c7c7c7}
      .tm-counter,.tm-list-empty{color:#c7c7c7}
      .tm-badge{background:#303134;color:#f1f3f4}
      .tm-badge.handle-only{background:#4b3900;color:#ffd76a}
      .tm-badge.paired{background:#143823;color:#87d7a6}
      .tm-badge.stale{background:#4b2c00;color:#ffbe76}
      .tm-badge.mismatch{background:#4a1e1e;color:#ff8a80}
      .tm-badge.unverified{background:#2e2559;color:#c7b9ff}
      .tm-badge.uid{background:#16325c;color:#9bc2ff}
      .tm-banner{background:#2a2416;color:#ffe8ad;border-color:#8e6c25}
      .tm-banner .actions .secondary{background:#2a2416;color:#ffe8ad;border-color:#8e6c25}
      .tm-result-panel details,.tm-regex-match-list li{background:#2a2a2a;border-color:#444}
      .tm-result-list li{border-color:#444}
      .tm-block-placeholder{background:#2a2a2a;color:#c7c7c7;border-color:#555}
      button.tm-block-placeholder:hover{background:#333;color:#fff}
      .tm-regex-bar input,.tm-section input,.tm-toolbar-group select,.tm-toolbar-group input[type="search"]{background:#111;color:#fff;border-color:#555}
    }
  `;
	document.head.appendChild(style);

