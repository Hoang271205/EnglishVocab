import ExperienceControls from './audio/ExperienceControls';
import FeedbackEffects from './audio/FeedbackEffects';
import { Suspense } from 'react';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import { createRoot } from 'react-dom/client';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử #root');
}

createRoot(rootElement).render(
  <>
    <Suspense fallback={<LoadingSkeleton label="Đang tải giao diện" />}>
      <App />
    </Suspense>
    <ExperienceControls />
    <FeedbackEffects />
    <SpeedInsights />
  </>,
);
