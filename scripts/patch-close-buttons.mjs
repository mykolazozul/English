import fs from 'fs';

const stylePath = 'src/styles.css';
let css = fs.readFileSync(stylePath, 'utf8');

const closeButtonBlock = `

/* ==========================================================================
   v3.6.0 — 15% ENLARGED CLOSE BUTTONS FOR ALL NOTIFICATIONS & MODALS
   ========================================================================== */
.telegram-notify-close,
.epic-badge-banner button.icon,
.site-toast-close,
.toast-close,
.ef-modal button.icon,
.chat-lightbox-close,
.modal-close-btn,
button.close-btn {
  font-size: 22px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  padding: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.telegram-notify-close:hover,
.epic-badge-banner button.icon:hover,
.ef-modal button.icon:hover,
.chat-lightbox-close:hover {
  transform: scale(1.18) !important;
  background: rgba(255, 255, 255, 0.16) !important;
  color: #ffffff !important;
}
`;

if (!css.includes('v3.6.0 — 15% ENLARGED CLOSE BUTTONS')) {
  css += closeButtonBlock;
  fs.writeFileSync(stylePath, css, 'utf8');
  console.log('Enlarged close buttons added to styles.css');
} else {
  console.log('Already present');
}
