export const selectionStyles = `
:host { all: initial; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: #283126; color-scheme: light; }
* { box-sizing: border-box; }
button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 3px solid #8db581; outline-offset: 3px; }
input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 3px solid #287d3c22; border-color: #83a970; }
.mascot-img { display: block; width: 42px; height: 40px; object-fit: contain; flex: 0 0 auto; }
.lookup-trigger { position: fixed; display: flex; align-items: center; justify-content: center; gap: 7px; width: 128px; min-height: 44px; padding: 4px 12px; border: 1px solid #e8dba8; border-radius: 14px; background: #fff9e4; color: #2c5932; box-shadow: 0 5px 20px #25301c26; font-weight: 700; }
.lookup-trigger .mascot-img { width: 34px; height: 34px; }
.lookup-trigger:hover { background: #fff2bd; }
.lookup-panel { position: fixed; display: flex; flex-direction: column; width: min(400px, calc(100vw - 16px)); max-height: calc(100dvh - 16px); padding: 0; border: 1px solid #dce5d4; border-radius: 22px; background: #fffefb; box-shadow: 0 12px 48px #25301c30; overflow: hidden; overflow-wrap: anywhere; line-height: 1.6; }
.lookup-panel > header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #e7ecdf; background: #f7faef; }
.extension-brand { display: flex; align-items: center; gap: 8px; color: #246d38; font-size: 16px; }
.lookup-panel > h2 { margin: 14px 20px 4px; font-size: 27px; line-height: 1.3; flex: 0 0 auto; }
.close-button { width: 32px; height: 32px; border: 0; border-radius: 50%; background: #eaf0e4; color: #48683a; font-size: 22px; }
.label { margin: 10px 0; font-size: 12px; color: #6c7868; }
.message { padding: 12px; border: 1px solid #ecdfa9; border-radius: 12px; background: #fff8df; font-size: 13px; }
.dictionary-form { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.dictionary-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 20px 12px; scrollbar-width: thin; }
.extension-tip { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border: 1px solid #eddfac; border-radius: 13px; background: #fff9e4; color: #476338; font-size: 12px; }
.extension-tip .mascot-img { width: 35px; height: 33px; }
.dictionary-form fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.dictionary-form label { display: grid; gap: 7px; margin: 15px 0; color: #40513c; font-weight: 650; }
.dictionary-form input, .dictionary-form textarea, .dictionary-form select { width: 100%; min-height: 44px; padding: 11px 12px; border: 1px solid #dce4d5; border-radius: 11px; background: #fff; color: #283126; }
.dictionary-form textarea { min-height: 85px; resize: vertical; }
.dictionary-form a { color: #246d38; }
.dictionary-form details { padding: 10px 0; color: #536849; font-size: 12px; }
.dictionary-form summary { cursor: pointer; }
.dictionary-footer { display: flex; flex: 0 0 auto; flex-wrap: wrap; align-items: center; gap: 9px; padding: 12px 20px; border-top: 1px solid #dfe8d7; background: #f7faef; }
.dictionary-footer .message { order: -2; width: 100%; margin: 0; }
.save-word { flex: 1; min-height: 46px; padding: 12px 16px; border: 0; border-radius: 12px; background: #246d38; color: white; font-weight: 700; }
.save-word:disabled { opacity: .55; cursor: not-allowed; }
.cancel-word { order: -1; min-height: 46px; padding: 10px 15px; border: 1px solid #dce4d5; border-radius: 12px; color: #40513c; background: #fff; }
.connection-note { flex: 0 0 auto; margin: 0; padding: 8px 20px 12px; font-size: 11px; }
@media (prefers-reduced-motion: no-preference) { .lookup-trigger .mascot-img { animation: extension-greet 3s ease-in-out infinite; } }
@keyframes extension-greet { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-5deg); } }
`;
