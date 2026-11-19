import { Component } from 'react';
import type { ReactNode } from 'react';
import Button from './Button';
import Brand from './Brand';

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <main className="session-summary" role="alert">
          <Brand />
          <h1>Chưa mở được giao diện</h1>
          <p>
            Bạn hãy tải lại trang để tiếp tục. Bài đã gửi thành công vẫn được
            lưu.
          </p>
          <Button onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>
        </main>
      );
    }
    return this.props.children;
  }
}
