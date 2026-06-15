import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Đã có lỗi xảy ra</h1>
          <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, fontSize: 13, textAlign: "left", overflow: "auto", maxHeight: 300 }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: "10px 24px", background: "#0f766e", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
