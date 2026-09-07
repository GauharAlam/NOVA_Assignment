import Link from "next/link";
import {
  Layers,
  KanbanSquare,
  BarChart3,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Zap,
  Lock,
  GitBranch,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              NOVA
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <span>1-Click Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold shadow-xs">
            <Zap className="w-3.5 h-3.5" />
            Full-Stack Project Management Platform
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Plan. Collaborate. <span className="text-indigo-600">Deliver.</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            NOVA empowers high-velocity engineering and product teams to manage projects,
            coordinate interactive Kanban workflows, and monitor real-time velocity in one unified application.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Live Demo (1-Click)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all"
            >
              Create Free Account
            </Link>
          </div>

          {/* Full Stack Feature Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <KanbanSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Interactive Kanban</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Fluid drag-and-drop across customizable columns with optimistic UI updates and fractional indexing (Lexorank) for zero race conditions.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Velocity & Analytics</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dynamic project completion rates, workload distribution across assignees, overdue task alerts, and severity breakdowns.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Enterprise RBAC</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Role-based access control with granular permission boundaries for Owners, Admins, Members, and Viewers with audit trail logging.
              </p>
            </div>
          </div>

          {/* Complete Stack Architecture Box */}
          <div className="mt-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Complete Application Stack Architecture
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Frontend</span>
                <span className="text-slate-500">Next.js 14, React 18, Tailwind CSS</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Backend</span>
                <span className="text-slate-500">Next.js Route Handlers, TypeScript</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Database</span>
                <span className="text-slate-500">SQLite + PostgreSQL Prisma ORM</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Authentication</span>
                <span className="text-slate-500">JWT, HttpOnly Cookies, Bcrypt</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Validation</span>
                <span className="text-slate-500">Zod Strict Schemas, RBAC Guards</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Deployment</span>
                <span className="text-slate-500">Docker, Docker-Compose, Vercel ready</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-400">
        NOVA Team Productivity Platform © 2026. Built for Full Stack Engineering Assignment.
      </footer>
    </div>
  );
}
