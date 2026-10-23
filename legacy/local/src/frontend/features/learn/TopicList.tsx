import TopicRow from './TopicRow';
import type { useLearnPage } from './useLearnPage';

export default function TopicList({
  model,
}: {
  model: ReturnType<typeof useLearnPage>;
}) {
  const { visibleTopics } = model;
  return (
    <ul className="topic-list">
      {visibleTopics.map((topic) => {
        const hasContent = topic.total > 0;
        const completed = hasContent && topic.learned >= topic.total;
        return (
          <TopicRow
            key={topic.id}
            model={model}
            topic={topic}
            hasContent={hasContent}
            completed={completed}
          />
        );
      })}
    </ul>
  );
}
