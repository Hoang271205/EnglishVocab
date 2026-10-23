import NotebookWordRow from './NotebookWordRow';
import type { NotebookPageProps } from './types';
import type { useNotebookPage } from './useNotebookPage';

export default function NotebookStacks({
  model,
  onOpenSession,
}: {
  model: ReturnType<typeof useNotebookPage>;
  onOpenSession: NotebookPageProps['onOpenSession'];
}) {
  const { reviewStacks } = model;
  return (
    <div className="notebook-stacks">
      {reviewStacks.map((stack) => (
        <section
          key={stack.id}
          className={`notebook-stack notebook-stack-${stack.id}`}
          aria-labelledby={`notebook-stack-${stack.id}`}
        >
          <header className="notebook-stack-header">
            <div>
              <h2 id={`notebook-stack-${stack.id}`}>
                {stack.title}
                <span className="notebook-stack-count">
                  {stack.rows.length}
                </span>
              </h2>

              <p>{stack.description}</p>
            </div>
          </header>

          {stack.rows.length === 0 && (
            <p className="notebook-stack-empty">Chưa có từ trong nhóm này.</p>
          )}

          <ul className="notebook-list">
            {stack.rows.map((row) => (
              <NotebookWordRow
                key={row.entry.id}
                model={model}
                row={row}
                onOpenSession={onOpenSession}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
