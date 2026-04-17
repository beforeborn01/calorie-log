import { Component, type ReactNode } from 'react';
import { Button, Result } from 'antd';

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // 仅打印到控制台，后续可接 Sentry / 自有日志
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面出错了"
          subTitle={this.state.error?.message || '渲染过程抛出异常，请刷新或返回首页'}
          extra={[
            <Button type="primary" key="reload" onClick={this.handleReload}>
              刷新
            </Button>,
            <Button key="reset" onClick={this.handleReset}>
              重试
            </Button>,
          ]}
        />
      );
    }
    return this.props.children;
  }
}
