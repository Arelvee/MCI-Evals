"use client";

import { Component, type ReactNode } from "react";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={{ maxWidth: 420, margin: "15vh auto", padding: 24 }}>
          <h1>MCI Triage Evaluation</h1>
          <p>The score sheet could not open. Please try again. Your saved records have not been deleted.</p>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </main>
      );
    }
    return this.props.children;
  }
}
