import { createRoot } from 'react-dom/client';
import AccountPage from './account/AccountPage';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Không tìm thấy phần tử root.');
}

createRoot(root).render(<AccountPage />);