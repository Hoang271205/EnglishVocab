export const selectionStyles = `
  :host {
    all: initial;
    font-family: system-ui, sans-serif;
    font-size: 15px;
    color: #283126;
  }

  * {
    box-sizing: border-box;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 3px solid #3288d2;
    outline-offset: 3px;
  }

  .lookup-trigger {
    position: fixed;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid #e3e7de;
    border-radius: 10px;
    background: white;
    box-shadow: 0 4px 16px #25301c26;
    font-size: 18px;
  }

  .lookup-trigger:hover {
    background: #fff8d9;
  }

  .lookup-panel {
    position: fixed;
    width: min(340px, calc(100vw - 16px));
    max-height: calc(100dvh - 16px);
    overflow-y: auto;
    padding: 20px;
    border: 1px solid #e3e7de;
    border-radius: 18px;
    background: white;
    box-shadow: 0 12px 48px #25301c30;
    overflow-wrap: anywhere;
    line-height: 1.6;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  header strong {
    color: #248232;
  }

  h2 {
    margin: 16px 0;
    font-size: 24px;
  }

  .close-button {
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 50%;
    background: #f1f3ee;
    font-size: 22px;
  }

  .label {
    margin-bottom: 6px;
    font-size: 13px;
    color: #6e7867;
  }

  .context {
    margin-top: 0;
    white-space: pre-wrap;
  }

  .message {
    padding: 12px;
    border-radius: 10px;
    background: #fff8d9;
    font-size: 13px;
  }
      .dictionary-form fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .dictionary-form label {
    display: grid;
    gap: 6px;
    margin: 14px 0;
    font-weight: 600;
  }

  .dictionary-form input,
  .dictionary-form textarea,
  .dictionary-form select {
    width: 100%;
    min-height: 40px;
    padding: 10px;
    border: 1px solid #dce4d5;
    border-radius: 10px;
    background: white;
    color: #283126;
    font: inherit;
  }

  .dictionary-form textarea {
    min-height: 80px;
    resize: vertical;
  }

  .dictionary-form a {
    color: #248232;
  }

  .save-word {
    width: 100%;
    margin-top: 16px;
    padding: 12px;
    border: 0;
    border-radius: 12px;
    background: #248232;
    color: white;
    font-weight: 700;
  }

  .save-word:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;