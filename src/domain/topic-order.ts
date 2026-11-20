import type { Topic } from './types.js';

// Storage orders remain unique (Part 1: 1–100, Part 2: 101–200).
// Presentation groups each extension immediately after its original topic.
export function topicSequence(topic: Topic): number {
  return topic.part === 2 ? (topic.order - 100) * 2 : topic.order * 2 - 1;
}

export function compareTopics(a: Topic, b: Topic): number {
  return (
    a.collectionId.localeCompare(b.collectionId) ||
    topicSequence(a) - topicSequence(b) ||
    a.id.localeCompare(b.id)
  );
}
