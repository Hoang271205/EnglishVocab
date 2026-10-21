import type { SessionView } from '../domain/types';
import LearnSession from './LearnSession';
import ReviewSession from './ReviewSession';

type SessionPageProps = {
  session: SessionView;
  onExit: () => void;
};

export default function SessionPage(props: SessionPageProps) {
  return props.session.mode === 'learn' ? (
    <LearnSession
      key={props.session.id}
      session={props.session}
      onExit={props.onExit}
    />
  ) : (
    <ReviewSession
      key={props.session.id}
      session={props.session}
      onExit={props.onExit}
    />
  );
}