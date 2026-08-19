(function(){
'use strict';
function css(href,key){if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.setAttribute(`data-${key}`,'1');document.head.appendChild(l)}
function js(src,key){if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute(`data-${key}`,'1');document.body.appendChild(s)}

/* Core complementary modules only. Previous V1.4–V2.0 patch layers were intentionally retired here because multiple observers/event layers were competing for the same DOM and could freeze interaction on iOS Safari. */
css('divorce-energy.css?v=20260818-21','lumera-divorce-css');
js('divorce-energy.js?v=20260818-21','lumera-divorce');
css('lumera-workspace.css?v=20260818-21','lumera-workspace-css');
css('lumera-layout-audit.css?v=20260818-21','lumera-layout-audit');
js('lumera-workspace.js?v=20260818-21','lumera-workspace');
css('lumera-v13.css?v=20260818-21','lumera-v13-css');

/* Single stabilization/UX layer loaded last. */
css('lumera-v21-stable.css?v=20260818-21','lumera-v21-css');
js('lumera-v21-stable.js?v=20260818-21','lumera-v21');

/* Dedicated protocol library. Event-driven only: no MutationObserver or polling. */
css('lumera-v22-library.css?v=20260818-22','lumera-v22-library-css');
js('lumera-v22-library.js?v=20260818-22','lumera-v22-library');

/* Unified Session journey + robust protocol resume + mobile navigation. */
css('lumera-v23-session.css?v=20260818-23','lumera-v23-session-css');
js('lumera-v23-session.js?v=20260818-23','lumera-v23-session');

/* Treatment continuity + validation guard. Event-driven; no global DOM observer. */
css('lumera-v24-treatment.css?v=20260818-24','lumera-v24-treatment-css');
js('lumera-v24-treatment.js?v=20260818-24','lumera-v24-treatment');

/* Navigable client records/history. Preserves legacy stores and links assessments to sessions conservatively. */
css('lumera-v22-records.css?v=20260818-25','lumera-v22-records-css');
js('lumera-v22-records.js?v=20260818-25','lumera-v22-records');
})();
