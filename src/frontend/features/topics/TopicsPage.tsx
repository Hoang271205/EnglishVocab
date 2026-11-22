import Mascot from '../../components/mascot/Mascot';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import CollectionPicker from './CollectionPicker';
import TopicCard from './TopicCard';
import { useTopics } from './useTopics';

export default function TopicsPage() {
  const topics = useTopics();

  return (
    <section className="learn-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">MỖI NGÀY MỘT CHÚT</p>
          <h1>Học từ mới</h1>
        </div>
        <Mascot
          compact
          className="mascot--intro-note"
          messageLabel="KHÁM PHÁ CÙNG MÌNH"
          messageTitle="Hôm nay mình học gì nhỉ?"
          message="Chọn một chủ đề bạn thích bên dưới. Mình cùng khám phá từ mới nhé!"
        />
      </div>

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
          onChange={(event) => topics.setSearch(event.target.value)}
        />
        <div
          className="topic-status-filters"
          role="group"
          aria-label="Lọc tiến độ chủ đề"
        >
          {(
            [
              { value: 'all', label: 'Mọi trạng thái' },
              { value: 'new', label: 'Chưa bắt đầu' },
              { value: 'started', label: 'Đang học' },
              { value: 'finished', label: 'Đã xem hết' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={topics.statusFilter === filter.value}
              onClick={() => topics.setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {topics.extensionCount > 0 && (
        <div className="topic-part-filters" aria-label="Lọc phần học">
          {(
            [
              { value: 'all', label: 'Tất cả' },
              { value: '1', label: 'Part 1' },
              { value: '2', label: 'Part 2' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={topics.partFilter === filter.value}
              onClick={() => topics.setPartFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {topics.error && (
        <div className="dashboard-error">
          <StatusMessage tone="error">{topics.error}</StatusMessage>

          <Button variant="secondary" onClick={topics.reload}>
            Thử lại
          </Button>
        </div>
      )}

      {topics.loading ? (
        <LoadingSkeleton label="Đang tải chủ đề" rows={5} />
      ) : topics.data ? (
        <>
          <p className="topic-message">
            {topics.extensionCount > 0
              ? `${topics.originalTopicCount} chủ đề · ${topics.topicCount} phần học · ${topics.populatedCount} phần đã có nội dung`
              : `${topics.topicCount} chủ đề · ${topics.populatedCount} chủ đề đã có nội dung`}
          </p>
          <p className="topic-results" role="status">
            {(topics.search ||
              topics.statusFilter !== 'all' ||
              topics.partFilter !== 'all') &&
              `Hiển thị ${topics.visibleTopics.length}/${topics.topicCount} phần học phù hợp.`}
          </p>

          {topics.visibleTopics.length === 0 ? (
            <div className="topic-search-empty">
              <h2>Chưa tìm thấy chủ đề phù hợp</h2>
              <p>
                Thử tên tiếng Anh, tiếng Việt hoặc bỏ bộ lọc để xem lại các chủ
                đề.
              </p>
              <Button variant="secondary" onClick={topics.resetFilters}>
                Xóa tìm kiếm và bộ lọc
              </Button>
            </div>
          ) : (
            <ul className="topic-list">
              {topics.visibleTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  displayNumber={
                    topics.displayNumbers.get(topic.id) ?? topic.order
                  }
                  selected={topics.selectedId === topic.id}
                  onToggle={() => topics.toggleTopic(topic.id)}
                  onClose={topics.closeTopic}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
