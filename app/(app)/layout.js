import Sidebar from "@/components/Sidebar";
import { APP_VERSION } from "@/lib/version";

// App shell: left sidebar + capped content area. All product pages live here.
export default function AppLayout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        {children}
        <footer
          className="mono"
          style={{ color: "var(--t3)", fontSize: 11, padding: "20px 26px", textAlign: "right" }}
        >
          v{APP_VERSION}
        </footer>
      </div>
    </div>
  );
}
