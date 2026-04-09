import { LayoutDashboard, FileText, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "analyze", icon: FileText, label: "Analyze" },
  ];

  return (
    <div className="w-64 h-screen border-r border-slate-800 bg-slate-900 flex flex-col p-4 fixed left-0 top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3 px-2 mb-10 mt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center shadow-lg shadow-blue-900/20">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-none text-white">CLARIO</h1>
          <span className="text-[10px] text-slate-500 tracking-widest uppercase font-bold">Lens AI</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === item.id
                ? "bg-blue-950/30 text-blue-400 font-bold shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              activeTab === item.id ? "text-blue-400" : "group-hover:text-slate-100"
            )} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
