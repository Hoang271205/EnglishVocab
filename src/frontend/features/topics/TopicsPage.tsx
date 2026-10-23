import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import StatusMessage from '../../components/ui/StatusMessage';
import CollectionPicker from './CollectionPicker';
import TopicCard from './TopicCard';
import { useTopics } from './useTopics';

export default function TopicsPage() {
  const topics = useTopics();

  return (
    <section className="learn-page">
      <p className="eyebrow">MỖI NGÀY MỘT CHÚT</p>
      <h1>Học từ mới</h1>

      <CollectionPicker
        value={topics.collection}
        onChange={topics.chooseCollection}
      />

      <div className="online-topic-controls">
        <FormField
          label="Tìm chủ đề"
          type="search"
          placeholder="Nhập tên tiếng Anh hoặc tiếng Việt…"
          value={topics.search}
          onChange={(event) =>
            topics.setSearch(event.target.value)
          }
        />
      </div>

      {topics.loading ? (
        <StatusMessage>
          Đang tải chủ đề…
        </StatusMessage>
      ) : topics.error ? (
        <div className="dashboard-error">
          <StatusMessage tone="error">
            {topics.error}
          </StatusMessage>

          <Button onClick={topics.reload}>
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          <p className="topic-message">
            {topics.topicCount} chủ đề ·{' '}
            {topics.populatedCount} chủ đề đã có nội dung
          </p>

          {topics.visibleTopics.length === 0 ? (
            <StatusMessage>
              Không tìm thấy chủ đề phù hợp.
            </StatusMessage>
          ) : (
            <ul className="topic-list">
              {topics.visibleTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  selected={
                    topics.selectedId === topic.id
                  }
                  onToggle={() =>
                    topics.toggleTopic(topic.id)
                  }
                  onClose={topics.closeTopic}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}