import { Routes, Route, Link, useLocation } from "react-router-dom";
import { SolvePage } from "./pages/SolvePage";
import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-brand-500">🔍</span>
            <span>CodeLens AI</span>
          </Link>
          <div className="flex gap-6 text-sm">
            <Link
              to="/"
              className={pathname === "/" ? "text-brand-400 font-medium" : "text-slate-400 hover:text-slate-200"}
            >
              Solve
            </Link>
            <Link
              to="/dashboard"
              className={pathname === "/dashboard" ? "text-brand-400 font-medium" : "text-slate-400 hover:text-slate-200"}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Pages */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<SolvePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}
