/* Theme listener must register before workspace settings because the workspace
   submit handler intentionally owns the form lifecycle. This guarantees the
   selected palette is persisted before the settings sheet closes. */
import './theme-system-ui.js';
import './workspace-shell-ui.js';
import './workspace-layout-fix.js';
import './acervo-ui.js';
import './investigation-entry-ui.js';
import './assisted-summary-ui.js';
import './operational-pickers-ui.js';
import './treatment-mobile-ux.js';
import './preparation-mobile-ux.js';
import './session-cockpit-close-ui.js';
import './app-audit-fix.js';
import './validation-round-3-ui.js';
import './validation-round-4-ui.js';
import './validation-round-5-ui.js';
