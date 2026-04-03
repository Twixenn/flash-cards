import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-4xl">⚠</div>
          <div className="font-serif text-2xl text-accent">Något gick fel</div>
          <div className="text-muted text-sm max-w-sm break-words">
            {this.state.error.message}
          </div>
          <button
            className="mt-2 px-6 py-3 rounded-2xl bg-accent text-bg text-sm font-medium cursor-pointer hover:bg-accent/90 transition-colors"
            onClick={() => this.setState({ error: null })}
          >
            Försök igen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
