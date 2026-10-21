import { useState } from 'react';
import IpaChart from './IpaChart';
import VoiceSettings from './VoiceSettings';

export default function StudyTools() {
  const [open, setOpen] = useState(false);

  return (
    <section className="entry-details study-tools">
      <div className="entry-details-header">
        <h2>IPA và giọng đọc</h2>

        <button
          className="secondary-button"
          type="button"
          aria-expanded={open}
          aria-controls="study-tools-content"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Thu gọn' : 'Mở'}
        </button>
      </div>

      {open && (
        <div id="study-tools-content" className="study-tools-content">
          <VoiceSettings />
          <IpaChart />
        </div>
      )}
    </section>
  );
}