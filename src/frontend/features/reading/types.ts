import type { backend } from '../../backend';

export type ReadingSelection = {
  id: string;
  word: string;
  sourceUrl: string;
  capturedAt: number;
  range: Range;
};

export type LocalDetails = Awaited<ReturnType<typeof backend.queries.details>>;

export type LookupPopupProps = {
  selection: ReadingSelection;
  onClose: () => void;
  onSaved: () => void;
};

export type ReadingPanelProps = {
  onClose: () => void;
  onSaved: () => void;
};
