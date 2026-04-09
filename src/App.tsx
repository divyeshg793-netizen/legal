import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import LandingPage from "./components/LandingPage";
import AnalysisDashboard from "./components/AnalysisDashboard";
import { motion, AnimatePresence } from "motion/react";
import { Shield, TrendingUp, Clock, FileCheck, History, ArrowRight } from "lucide-react";
import { cn } from "./lib/utils";

export default function App() {
  const [activeTab, setActiveTab] = useState("landing");
  const [isStarted, setIsStarted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isStarted) {
      fetchHistory();
    }
  }, [isStarted, activeTab]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleStart = () => {
    setIsStarted(true);
    setActiveTab("analyze");
  };

  return (
    <AnimatePresence mode="wait">
      {!isStarted ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <LandingPage onStart={handleStart} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex min-h-screen bg-slate-50 text-slate-900 font-sans"
        >
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <main className="flex-1 ml-64 p-8 bg-slate-950">
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-8 max-w-7xl mx-auto"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-4xl font-display font-bold mb-2 text-white">Welcome Back, Divyesh</h1>
                      <p className="text-slate-400">Here's an overview of your legal document activity.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 shadow-sm">
                        Last 30 Days
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={FileCheck} label="Documents Analyzed" value={history.length.toString()} trend="+12%" />
                    <StatCard icon={Shield} label="Risks Identified" value={(history.length * 4).toString()} trend="+5%" />
                    <StatCard icon={Clock} label="Time Saved" value={(history.length * 2).toString() + "h"} trend="+18%" />
                    <StatCard icon={TrendingUp} label="Avg Trust Score" value="82" trend="+3%" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-bold text-white">Recent History</h3>
                          <button onClick={() => setActiveTab("analyze")} className="text-sm text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                            Analyze New <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          {history.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 italic bg-slate-950 rounded-xl border border-dashed border-slate-800">
                              No history yet. Start by analyzing a document.
                            </div>
                          ) : (
                            history.map((item, i) => (
                              <ActivityItem 
                                key={i}
                                title={item.title} 
                                date={new Date(item.timestamp).toLocaleDateString()} 
                                status={item.riskLevel === "High" ? "High Risk" : item.riskLevel === "Medium" ? "Review" : "Safe"} 
                                score={item.trustScore} 
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold mb-6 text-white">Quick Tips</h3>
                        <div className="space-y-4">
                          <TipItem text="Always check for 'Indemnification' clauses." />
                          <TipItem text="Use 'Explain Like I'm 15' for complex IP rights." />
                          <TipItem text="Compare versions to see what changed in the update." />
                          <TipItem text="Look for 'Arbitration' to understand dispute resolution." />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "analyze" && (
                <motion.div
                  key="analyze"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <AnalysisDashboard />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
      <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
    </div>
  );
}

function ActivityItem({ title, date, status, score }: { title: string, date: string, status: string, score: number }) {
  return (
    <div className="flex items-center justify-between p-5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-blue-900/50 hover:shadow-md transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
          status === "Safe" ? "bg-emerald-950/30 text-emerald-400" : 
          status === "Review" ? "bg-amber-950/30 text-amber-400" : "bg-red-950/30 text-red-400"
        )}>
          <FileCheck className="w-6 h-6" />
        </div>
        <div className="max-w-[200px] md:max-w-[300px]">
          <h4 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors truncate">{title}</h4>
          <p className="text-xs text-slate-500 font-medium">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="text-right hidden sm:block">
          <p className="text-lg font-bold text-slate-100">{score}%</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Trust Score</p>
        </div>
        <div className={cn(
          "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
          status === "Safe" ? "bg-emerald-900/20 text-emerald-400 border border-emerald-900/30" : 
          status === "Review" ? "bg-amber-900/20 text-amber-400 border border-amber-900/30" : "bg-red-900/20 text-red-400 border border-red-900/30"
        )}>
          {status}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend }: { icon: any, label: string, value: string, trend: string }) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-blue-950/30 text-blue-400">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-900/30">{trend}</span>
      </div>
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</h3>
      <p className="text-3xl font-display font-bold text-slate-100">{value}</p>
    </div>
  );
}
