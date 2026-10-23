import type { SessionView } from '../../../../../../src/domain/types';

import type { backend } from '../../backend';

import type { Entry } from '../../../../../../src/domain/types';

export type NotebookRow = Awaited<
  ReturnType<typeof backend.queries.notebook>
>[number];

export type NotebookScope = 'learned' | 'personal';

export type PersonalEntryStatus =
  'all' | 'draft' | 'unlearned' | 'reviewing' | 'mastered';

export type NotebookPageProps = {
  onLearn: () => void;
  onOpenSession: (session: SessionView) => void;
};

export type EntryDetailsData = Awaited<
  ReturnType<typeof backend.queries.details>
>;

export type EntryDetailsProps = {
  entryId: string;
  onClose: () => void;
  onSaved: (id: string, copied: boolean) => void;
  onOpenSession: (session: SessionView) => void;
};

export type PersonalEntryInitial = {
  entry: Entry;
  note: string;
  hasProgress: boolean;
};

export type PersonalEntryEditorProps = {
  initial: PersonalEntryInitial | null;
  onSaved: (id: string, copied: boolean) => void;
  onCancel: () => void;
};
