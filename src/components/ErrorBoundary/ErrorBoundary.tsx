import { Component, ErrorInfo, ReactNode } from "react";
import ErrorPage from "../ErrorPage/ErrorPage";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error in Covid Mapper", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorPage />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
