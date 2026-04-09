import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, FileText, Link as LinkIcon, AlertCircle, CheckCircle2, 
  XCircle, Download, Copy, Volume2, Languages, Baby, 
  History, ArrowRight, Loader2, FileUp, Clipboard, Globe,
  Maximize2, Minimize2, Trash2, Sparkles, ShieldAlert, ShieldCheck,
  X, Send, SplitSquareVertical, GraduationCap, FileJson, Table
} from "lucide-react";
import { cn } from "../lib/utils";
import { AnalysisResult } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { GoogleGenAI } from "@google/genai";

export default function AnalysisDashboard() {
  const [activeInputTab, setActiveInputTab] = useState<"upload" | "paste" | "url">("upload");
  const [inputText, setInputText] = useState("");
  const [compareText, setCompareText] = useState("");
  const [url, setUrl] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [compareDocTitle, setCompareDocTitle] = useState("");
  const [isUrlValid, setIsUrlValid] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [is15Mode, setIs15Mode] = useState(false);
  const [language, setLanguage] = useState("en");
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compareFileInputRef = useRef<HTMLInputElement>(null);

  const loadingSteps = [
    "Uploading document...",
    "Extracting legal text...",
    "Detecting hidden risks...",
    "Calculating trust score...",
    "Generating plain English summary..."
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingSteps.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  useEffect(() => {
    if (url === "") {
      setIsUrlValid(true);
    } else {
      setIsUrlValid(url.startsWith("http://") || url.startsWith("https://"));
    }
  }, [url]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error("History data is not an array:", data);
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
      setHistory([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setLoadingStep(0);

    try {
      let textToAnalyze = inputText;
      let compareTextToAnalyze = compareText;

      // 1. Extract text if files are present
      if (activeInputTab === "upload" && (file || compareFile)) {
        setLoadingStep(1); // Extracting text
        const formData = new FormData();
        if (file) formData.append("file", file);
        if (isComparing && compareFile) formData.append("compareFile", compareFile);

        const extractRes = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (!extractRes.ok) {
          let errorMessage = "Failed to extract text from files";
          try {
            const errData = await extractRes.json();
            errorMessage = errData.error || errorMessage;
          } catch (jsonErr) {
            // If not JSON, try to get text
            try {
              const textErr = await extractRes.text();
              if (textErr && textErr.length < 200) errorMessage = textErr;
            } catch (textErr) {
              console.error("Could not parse error response", textErr);
            }
          }
          throw new Error(errorMessage);
        }

        const extractData = await extractRes.json();
        textToAnalyze = extractData.text || textToAnalyze;
        compareTextToAnalyze = extractData.compareText || compareTextToAnalyze;
      } else if (activeInputTab === "url") {
        textToAnalyze = `Analyzing URL: ${url}. [Simulated] This terms of service agreement contains standard clauses regarding user data and liability.`;
      }

      if (!textToAnalyze || textToAnalyze.trim().length < 10) {
        throw new Error("No document text found to analyze. Please upload a file or paste text.");
      }

      // 2. Call Gemini
      setLoadingStep(2); // Analyzing...
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemPrompt = `You are an expert legal document analyzer. 
Analyze the provided document text and return a structured analysis.
Mode: ${is15Mode ? "Explain like I'm 15 (simple terms, very easy to understand)" : "Standard Professional Analysis"}
Language: ${language}

If comparing two documents, highlight the key differences and which one is safer.

Return ONLY a JSON object matching this schema:
{
  "summary": "string (markdown allowed, use bold for key terms)",
  "risks": [{"clause": "string", "level": "High" | "Medium" | "Low", "description": "string"}],
  "riskLevel": "High" | "Medium" | "Low",
  "trustScore": number (0-100),
  "decision": "Safe to Accept" | "Review Carefully" | "High Risk – Avoid",
  "compareResult": { // Only if comparing
    "summary": "string",
    "risks": [{"clause": "string", "level": "High" | "Medium" | "Low", "description": "string"}],
    "riskLevel": "High" | "Medium" | "Low",
    "trustScore": number,
    "decision": "string",
    "diffSummary": "string"
  }
}`;

      const prompt = `Document 1: ${textToAnalyze}
${isComparing ? `Document 2: ${compareTextToAnalyze}` : ""}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const analysisResult = JSON.parse(response.text || "{}");
      
      // Add titles
      analysisResult.docTitle = docTitle || (file ? file.name : "Document 1");
      if (isComparing) {
        analysisResult.compareDocTitle = compareDocTitle || (compareFile ? compareFile.name : "Document 2");
      }

      setResult(analysisResult);
      
      // 3. Save to history
      try {
        await fetch("/api/history/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analysisResult),
        });
        fetchHistory();
      } catch (saveErr) {
        console.warn("Failed to save to history", saveErr);
      }

    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadDemo = (type: "safe" | "risky" | "complex") => {
    setActiveInputTab("paste");
    if (type === "safe") {
      setInputText("This agreement is between the User and the Provider. The Provider will deliver services as described. The User agrees to pay the fees. Both parties can terminate with 30 days notice. Intellectual property remains with the creator.");
    } else if (type === "risky") {
      setInputText("The User waives all rights to sue the Provider. The Provider is not liable for any damages, even if caused by gross negligence. We share all your data with third parties forever. This agreement is irrevocable and governed by arbitration in Mars.");
    } else {
      setInputText("Notwithstanding anything to the contrary herein, the indemnification obligations of the party of the first part shall be limited to the extent permitted by applicable law, provided however that such limitation shall not apply in cases of willful misconduct or gross negligence as determined by a court of competent jurisdiction.");
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.summary.replace(/<[^>]*>/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const speakSummary = () => {
    if (result) {
      const utterance = new SpeechSynthesisUtterance(result.summary.replace(/<[^>]*>/g, ''));
      window.speechSynthesis.speak(utterance);
    }
  };

  const downloadPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    setError(null);
    
    try {
      // Small delay to ensure any animations are settled
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(dashboardRef.current, {
        quality: 1,
        backgroundColor: "#f8fafc",
        pixelRatio: 2, // Higher quality
        cacheBust: true,
      });
      
      if (!dataUrl || dataUrl === "data:,") {
        throw new Error("Failed to capture dashboard image");
      }
      
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Create a new PDF with the correct height to fit all content on one page
      const dynamicPdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });
      
      dynamicPdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      dynamicPdf.save(`clario-lens-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setError("Failed to generate PDF report. Please try again or use another format.");
    } finally {
      setIsExporting(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const exportToJSON = () => {
    if (!result) return;
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      triggerDownload(blob, `clario-analysis-${Date.now()}.json`);
    } catch (err) {
      setError("Failed to export JSON.");
    }
  };

  const exportToTXT = () => {
    if (!result) return;
    try {
      let text = `CLARIO LENS ANALYSIS REPORT\n`;
      text += `============================\n`;
      text += `Date: ${new Date().toLocaleString()}\n`;
      text += `Decision: ${result.decision}\n`;
      text += `Trust Score: ${result.trustScore}%\n\n`;
      text += `SUMMARY:\n`;
      text += `${result.summary.replace(/<[^>]*>/g, '')}\n\n`;
      text += `RISKS:\n`;
      result.risks.forEach(risk => {
        text += `- [${risk.level}] ${risk.clause}: ${risk.description}\n`;
      });
      
      if (result.compareResult) {
        text += `\n\nCOMPARISON ANALYSIS:\n`;
        text += `====================\n`;
        text += `Summary: ${result.compareResult.diffSummary}\n`;
      }

      const blob = new Blob([text], { type: "text/plain" });
      triggerDownload(blob, `clario-analysis-${Date.now()}.txt`);
    } catch (err) {
      setError("Failed to export TXT.");
    }
  };

  const exportToCSV = () => {
    if (!result) return;
    try {
      let csv = "Clause,Risk Level,Description\n";
      result.risks.forEach(risk => {
        csv += `"${risk.clause.replace(/"/g, '""')}","${risk.level}","${risk.description.replace(/"/g, '""')}"\n`;
      });
      
      const blob = new Blob([csv], { type: "text/csv" });
      triggerDownload(blob, `clario-risks-${Date.now()}.csv`);
    } catch (err) {
      setError("Failed to export CSV.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-10 px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2 text-white">Legal Risk Analyzer</h1>
          <p className="text-slate-400">Upload, paste, or link a document to uncover hidden risks.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadDemo("safe")}
            className="px-4 py-2 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs font-bold hover:bg-emerald-900/40 transition-all shadow-sm"
          >
            Safe Demo
          </button>
          <button 
            onClick={() => loadDemo("risky")}
            className="px-4 py-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-bold hover:bg-red-900/40 transition-all shadow-sm"
          >
            Risky Demo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Results */}
        <div className="lg:col-span-8 space-y-8">
          {/* Main Content Area */}
          <AnimatePresence mode="wait">
            {!result && !isAnalyzing && (
              <motion.div
                key="input-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden"
              >
              <div className="flex border-b border-slate-800">
                <InputTab 
                  active={activeInputTab === "upload"} 
                  onClick={() => setActiveInputTab("upload")}
                  icon={Upload}
                  label="Upload File"
                />
                <InputTab 
                  active={activeInputTab === "paste"} 
                  onClick={() => setActiveInputTab("paste")}
                  icon={FileText}
                  label="Paste Text"
                />
                <InputTab 
                  active={activeInputTab === "url"} 
                  onClick={() => setActiveInputTab("url")}
                  icon={LinkIcon}
                  label="Enter URL"
                />
              </div>

              <div className="p-8">
                <AnimatePresence mode="wait">
                  {activeInputTab === "upload" && (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-6"
                    >
                      <div className={cn("grid gap-6", isComparing ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document 1 Title</span>
                          </div>
                          <input 
                            type="text"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            placeholder={file ? file.name : "Enter document title..."}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-900/50 focus:ring-2 focus:ring-blue-900/10 transition-all text-slate-200"
                          />
                          <div
                            className={cn(
                              "relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300",
                              isDragging ? "border-blue-600 bg-blue-900/10" : "border-slate-800 hover:border-slate-700 hover:bg-slate-950/50",
                              file ? "border-emerald-500/50 bg-emerald-950/10" : ""
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileChange} 
                              className="hidden" 
                              accept=".pdf,.docx,.txt,.jpg,.png"
                            />
                            <div className="flex flex-col items-center gap-3">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                                file ? "bg-emerald-900/20 text-emerald-400" : "bg-slate-950 text-blue-400 group-hover:scale-110"
                              )}>
                                {file ? <CheckCircle2 className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-200 mb-1">
                                  {file ? file.name : "Primary Document"}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Drag & drop file"}
                                </p>
                              </div>
                              {file && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-red-900/20 text-slate-500 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {isComparing && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                              <FileText className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document 2 Title</span>
                            </div>
                            <input 
                              type="text"
                              value={compareDocTitle}
                              onChange={(e) => setCompareDocTitle(e.target.value)}
                              placeholder={compareFile ? compareFile.name : "Enter comparison title..."}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-900/50 focus:ring-2 focus:ring-emerald-900/10 transition-all text-slate-200"
                            />
                            <div
                              className={cn(
                                "relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300",
                                isDragging ? "border-blue-600 bg-blue-900/10" : "border-slate-800 hover:border-slate-700 hover:bg-slate-950/50",
                                compareFile ? "border-emerald-500/50 bg-emerald-950/10" : ""
                              )}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const droppedFile = e.dataTransfer.files?.[0];
                                if (droppedFile) setCompareFile(droppedFile);
                              }}
                              onClick={() => compareFileInputRef.current?.click()}
                            >
                              <input 
                                type="file" 
                                ref={compareFileInputRef} 
                                onChange={(e) => e.target.files && setCompareFile(e.target.files[0])} 
                                className="hidden" 
                                accept=".pdf,.docx,.txt,.jpg,.png"
                              />
                              <div className="flex flex-col items-center gap-3">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                                  compareFile ? "bg-emerald-900/20 text-emerald-400" : "bg-slate-950 text-blue-400 group-hover:scale-110"
                                )}>
                                  {compareFile ? <CheckCircle2 className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-200 mb-1">
                                    {compareFile ? compareFile.name : "Comparison Document"}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    {compareFile ? `${(compareFile.size / 1024 / 1024).toFixed(2)} MB` : "Drag & drop file"}
                                  </p>
                                </div>
                                {compareFile && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setCompareFile(null); }}
                                    className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-red-900/20 text-slate-500 hover:text-red-400 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setIsComparing(!isComparing)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                          isComparing ? "bg-blue-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        )}
                      >
                        <SplitSquareVertical className="w-3 h-3" />
                        {isComparing ? "Disable Comparison" : "Compare with another document"}
                      </button>
                    </motion.div>
                  )}

                  {activeInputTab === "paste" && (
                    <motion.div
                      key="paste"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-6"
                    >
                      <div className={cn("grid gap-6", isComparing ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document 1 Title</span>
                          </div>
                          <input 
                            type="text"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            placeholder="Enter document title..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-900/50 focus:ring-2 focus:ring-blue-900/10 transition-all text-slate-200"
                          />
                          <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Paste your legal text here..."
                            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-6 outline-none focus:border-blue-900/50 focus:ring-2 focus:ring-blue-900/10 transition-all resize-none font-sans text-slate-200"
                          />
                        </div>
                        {isComparing && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                              <FileText className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document 2 Title</span>
                            </div>
                            <input 
                              type="text"
                              value={compareDocTitle}
                              onChange={(e) => setCompareDocTitle(e.target.value)}
                              placeholder="Enter comparison title..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-900/50 focus:ring-2 focus:ring-emerald-900/10 transition-all text-slate-200"
                            />
                            <textarea
                              value={compareText}
                              onChange={(e) => setCompareText(e.target.value)}
                              placeholder="Paste the second document for comparison..."
                              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-6 outline-none focus:border-blue-900/50 focus:ring-2 focus:ring-blue-900/10 transition-all resize-none font-sans text-slate-200"
                            />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setIsComparing(!isComparing)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                          isComparing ? "bg-blue-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        )}
                      >
                        <SplitSquareVertical className="w-3 h-3" />
                        {isComparing ? "Disable Comparison" : "Compare with another document"}
                      </button>
                    </motion.div>
                  )}

                  {activeInputTab === "url" && (
                    <motion.div
                      key="url"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 px-1">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document Title</span>
                      </div>
                      <input 
                        type="text"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="Enter document title..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-900/50 focus:ring-2 focus:ring-blue-900/10 transition-all text-slate-200"
                      />
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">
                          <Globe className="w-5 h-5" />
                        </div>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://example.com/terms-of-service"
                          className={cn(
                            "w-full bg-slate-950 border rounded-2xl pl-16 pr-6 py-5 outline-none transition-all text-slate-200",
                            isUrlValid 
                              ? "border-slate-800 focus:border-blue-900/50 focus:ring-2 focus:ring-blue-900/10" 
                              : "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                          )}
                        />
                      </div>
                      {!isUrlValid && url !== "" && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-[10px] font-bold mt-2 ml-6 uppercase tracking-wider"
                        >
                          URL must start with http:// or https://
                        </motion.p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIs15Mode(!is15Mode)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          is15Mode ? "bg-blue-600" : "bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                          is15Mode ? "left-7" : "left-1"
                        )} />
                      </button>
                      <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Baby className="w-4 h-4" /> Explain Like I'm 15
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Languages className="w-4 h-4 text-slate-500" />
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-400 outline-none cursor-pointer hover:text-slate-100 transition-colors"
                      >
                        <option value="en" className="bg-slate-900">English</option>
                        <option value="es" className="bg-slate-900">Spanish</option>
                        <option value="fr" className="bg-slate-900">French</option>
                        <option value="de" className="bg-slate-900">German</option>
                        <option value="hi" className="bg-slate-900">Hindi</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || (!file && !inputText && !url)}
                    className="w-full sm:w-auto group relative px-10 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        <>
                          Analyze Now <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}

            {/* Loading Screen */}
            {isAnalyzing && (
              <motion.div 
                key="loading-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm py-20 flex flex-col items-center justify-center text-center"
              >
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-blue-900/20" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 animate-pulse flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <ShieldAlert className="text-white w-8 h-8" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Processing Document</h3>
              <p className="text-slate-400 animate-pulse font-medium">{loadingSteps[loadingStep]}</p>
            </motion.div>
          )}

            {/* Results Dashboard */}
            {result && !isAnalyzing && (
              <motion.div 
                key="results-dashboard"
                ref={dashboardRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950/30 flex items-center justify-center text-blue-400">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">Export Analysis</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Download your report in multiple formats</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={isExporting}
                      className={cn(
                        "px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2",
                        isExporting && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" /> Export Report <ArrowRight className={cn("w-4 h-4 transition-transform", showExportMenu ? "rotate-90" : "")} />
                        </>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {showExportMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-2 z-50"
                        >
                          <button 
                            onClick={() => { downloadPDF(); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-200 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-950/30 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold">PDF Report</p>
                              <p className="text-[10px] text-slate-500">High-quality document</p>
                            </div>
                          </button>
                          
                          <button 
                            onClick={() => { exportToJSON(); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-200 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-950/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FileJson className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold">JSON Data</p>
                              <p className="text-[10px] text-slate-500">Raw analysis data</p>
                            </div>
                          </button>
                          
                          <button 
                            onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-200 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-950/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Table className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold">CSV Spreadsheet</p>
                              <p className="text-[10px] text-slate-500">Risk list only</p>
                            </div>
                          </button>
                          
                          <button 
                            onClick={() => { exportToTXT(); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-200 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Clipboard className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold">Plain Text</p>
                              <p className="text-[10px] text-slate-500">Simple text summary</p>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              {result.compareResult && (
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-900/20 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <SplitSquareVertical className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Comparison Insight</h3>
                      <p className="text-blue-100 text-sm">{result.compareResult.diffSummary}</p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <span className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest">Side-by-Side Analysis</span>
                  </div>
                </div>
              )}

              <div className={cn("grid gap-8", result.compareResult ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
                <div className="space-y-8">
                  {result.compareResult && (
                    <div className="flex items-center gap-2 px-1">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {result.docTitle || "Document 1"}
                      </span>
                    </div>
                  )}
                  <ResultCard 
                    result={result} 
                    onSpeak={speakSummary} 
                    onCopy={copyToClipboard} 
                    copied={copied} 
                  />
                </div>

                {result.compareResult && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-2 px-1">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {result.compareDocTitle || "Document 2"}
                      </span>
                    </div>
                    <ResultCard 
                      result={result.compareResult as any} 
                      onSpeak={() => {
                        const utterance = new SpeechSynthesisUtterance(result.compareResult!.summary.replace(/<[^>]*>/g, ''));
                        window.speechSynthesis.speak(utterance);
                      }} 
                      onCopy={() => {
                        navigator.clipboard.writeText(result.compareResult!.summary.replace(/<[^>]*>/g, ''));
                      }} 
                      copied={false} 
                    />
                  </div>
                )}
              </div>

              {!result.compareResult && (
                <div className={cn(
                  "rounded-2xl p-8 flex flex-col items-center justify-center text-center border-2 shadow-sm",
                  result.decision.includes("Safe") ? "border-emerald-900/30 bg-emerald-950/20" : 
                  result.decision.includes("Review") ? "border-amber-900/30 bg-amber-950/20" : "border-red-900/30 bg-red-950/20"
                )}>
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-xl",
                    result.decision.includes("Safe") ? "bg-emerald-600 text-white shadow-emerald-600/20" : 
                    result.decision.includes("Review") ? "bg-amber-600 text-white shadow-amber-600/20" : "bg-red-600 text-white shadow-red-600/20"
                  )}>
                    {result.decision.includes("Safe") ? <ShieldCheck className="w-10 h-10" /> : 
                     result.decision.includes("Review") ? <AlertCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-2 text-white">Decision Recommendation</h3>
                  <p className={cn(
                    "text-xl font-bold mb-10",
                    result.decision.includes("Safe") ? "text-emerald-400" : 
                    result.decision.includes("Review") ? "text-amber-400" : "text-red-400"
                  )}>
                    {result.decision}
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={() => { setResult(null); setFile(null); setCompareFile(null); setInputText(""); setCompareText(""); }}
                      className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                    >
                      Analyze Another
                    </button>
                  </div>
                </div>
              )}

              {result.compareResult && (
                <div className="flex justify-center pt-8">
                  <button 
                    onClick={() => { setResult(null); setFile(null); setCompareFile(null); setInputText(""); setCompareText(""); }}
                    className="px-10 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20"
                  >
                    Start New Analysis
                  </button>
                </div>
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* History Sidebar */}
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-sm sticky top-28">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <History className="w-5 h-5 text-blue-400" /> Recent Activity
              </h3>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {Array.isArray(history) && history.length === 0 ? (
                <div className="py-16 text-center text-slate-500 italic text-sm bg-slate-950 rounded-xl border border-dashed border-slate-800">
                  No history yet.
                </div>
              ) : Array.isArray(history) ? (
                history.map((item, i) => (
                  <div 
                    key={i} 
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-blue-900/50 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => setResult(item)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-xs group-hover:text-blue-400 transition-colors truncate max-w-[150px] text-slate-200">{item.title}</h4>
                      <span className={cn(
                        "text-[10px] font-bold",
                        item.riskLevel === "High" ? "text-red-400" : 
                        item.riskLevel === "Medium" ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {item.trustScore}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-red-400 bg-red-950/20 rounded-xl border border-red-900/30">
                  Failed to load history.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result, onSpeak, onCopy, copied }: { result: AnalysisResult, onSpeak: () => void, onCopy: () => void, copied: boolean }) {
  return (
    <div className="space-y-8">
      {/* Document Title Header */}
      {result.docTitle && !result.compareResult && (
        <div className="bg-blue-600/10 border border-blue-900/30 rounded-2xl p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-bold text-blue-100">{result.docTitle}</span>
        </div>
      )}
      
      {/* Summary & Score Grid */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-blue-400" /> AI Summary
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={onSpeak} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-all" title="Listen">
                <Volume2 className="w-4 h-4" />
              </button>
              <button onClick={onCopy} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-all relative" title="Copy">
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap"
                  >
                    Copied!
                  </motion.span>
                )}
              </button>
            </div>
          </div>
          <div className="prose prose-invert max-w-none">
            <div 
              className="text-slate-300 leading-relaxed text-lg"
              dangerouslySetInnerHTML={{ __html: result.summary }}
            />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
          <h3 className="text-lg font-bold mb-8 text-white uppercase tracking-widest">Trust Score</h3>
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { value: result.trustScore },
                    { value: 100 - result.trustScore }
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                >
                  <Cell fill={result.trustScore > 70 ? "#10b981" : result.trustScore > 40 ? "#f59e0b" : "#ef4444"} />
                  <Cell fill="#1e293b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-display font-bold text-white">{result.trustScore}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Percent</span>
            </div>
          </div>
          <p className={cn(
            "mt-8 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm",
            result.trustScore > 70 ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30" : 
            result.trustScore > 40 ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-red-950/20 text-red-400 border border-red-900/30"
          )}>
            {result.trustScore > 70 ? "Highly Reliable" : result.trustScore > 40 ? "Moderate Risk" : "Unreliable"}
          </p>
        </div>
      </div>

      {/* Risks */}
      <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-white">
          <ShieldAlert className="w-5 h-5 text-red-400" /> Risk Analysis
        </h3>
        <div className="space-y-4">
          {Array.isArray(result.risks) ? (
            result.risks.map((risk, i) => (
              <div key={i} className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-blue-900/50 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-slate-100">{risk.clause}</h4>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    risk.level === "High" ? "bg-red-900/20 text-red-400" : 
                    risk.level === "Medium" ? "bg-amber-900/20 text-amber-400" : "bg-emerald-900/20 text-emerald-400"
                  )}>
                    {risk.level}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{risk.description}</p>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500 italic text-sm bg-slate-950 rounded-xl border border-dashed border-slate-800">
              No specific risks identified.
            </div>
          )}
        </div>
      </div>

      {/* Decision */}
      <div className={cn(
        "rounded-2xl p-8 flex flex-col items-center justify-center text-center border-2 shadow-sm",
        result.decision.includes("Safe") ? "border-emerald-900/30 bg-emerald-950/20" : 
        result.decision.includes("Review") ? "border-amber-900/30 bg-amber-950/20" : "border-red-900/30 bg-red-950/20"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
          result.decision.includes("Safe") ? "bg-emerald-600 text-white shadow-emerald-600/20" : 
          result.decision.includes("Review") ? "bg-amber-600 text-white shadow-amber-600/20" : "bg-red-600 text-white shadow-red-600/20"
        )}>
          {result.decision.includes("Safe") ? <ShieldCheck className="w-8 h-8" /> : 
           result.decision.includes("Review") ? <AlertCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>
        <h3 className="text-lg font-display font-bold mb-1 text-white">Recommendation</h3>
        <p className={cn(
          "text-sm font-bold",
          result.decision.includes("Safe") ? "text-emerald-400" : 
          result.decision.includes("Review") ? "text-amber-400" : "text-red-400"
        )}>
          {result.decision}
        </p>
      </div>
    </div>
  );
}

function InputTab({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-5 flex items-center justify-center gap-3 text-sm font-bold transition-all relative",
        active ? "text-blue-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-950/50"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"
        />
      )}
    </button>
  );
}
