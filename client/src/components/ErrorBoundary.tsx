import { Component, ErrorInfo, ReactNode } from "react";
import { requestAppReload } from "@/lib/appRuntime";
import { ErrorFallback } from "@/components/ErrorFallback";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SELRS] Uncaught render error", error, info.componentStack);
  }

  // On web requestAppReload only dispatches "selrs-soft-reload", which does
  // not reset this boundary, so clear the state here first.
  handleReload = () => {
    this.setState({ hasError: false, error: null });
    requestAppReload("error-boundary");
  };

  // The fallback renders outside the Router, so navigate directly.
  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
