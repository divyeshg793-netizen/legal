import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);

const app = express();
app.use(express.json());

const isServerless = process.env.NETLIFY === "true" || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL;

const storage = isServerless ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const cpUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'compareFile', maxCount: 1 }
]);

// Mock database for history
const history: any[] = [];

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/history", (req, res) => {
  res.json(history.slice(-10).reverse());
});

// Analysis Logic
const analyzeText = (text: string, mode: string, language: string) => {
  const highRiskKeywords = ["waive", "not liable", "third party", "data sharing", "perpetual", "irrevocable", "arbitration", "indemnify", "sole discretion", "unilateral", "non-refundable"];
  const mediumRiskKeywords = ["modify", "terminate", "notice", "limited", "fees", "automatic renewal", "confidentiality", "governing law"];
  
  const foundHigh = highRiskKeywords.filter(kw => text.toLowerCase().includes(kw));
  const foundMedium = mediumRiskKeywords.filter(kw => text.toLowerCase().includes(kw));

  let riskLevel = "Low";
  let trustScore = 95;
  let decision = "Safe to Accept";

  if (foundHigh.length > 0) {
    riskLevel = "High";
    trustScore = Math.max(10, 60 - (foundHigh.length * 10));
    decision = "High Risk – Avoid";
  } else if (foundMedium.length > 0) {
    riskLevel = "Medium";
    trustScore = Math.max(40, 85 - (foundMedium.length * 5));
    decision = "Review Carefully";
  }

  const risks = [
    ...foundHigh.map(kw => ({
      clause: `Clause containing "${kw}"`,
      level: "High",
      description: `This document contains the term "${kw}", which may indicate a significant loss of rights or an unusual obligation.`
    })),
    ...foundMedium.map(kw => ({
      clause: `Clause containing "${kw}"`,
      level: "Medium",
      description: `The term "${kw}" appears here, suggesting you should review the specific conditions of this section.`
    }))
  ];

  if (risks.length === 0) {
    risks.push({
      clause: "Standard Terms",
      level: "Low",
      description: "No major red flags detected in the provided text."
    });
  }

  let summary = "";
  if (mode === "15") {
    summary = `Basically, this paper says you're giving them permission to do some things, but you should watch out for the parts where they say they aren't responsible for anything. It's like letting someone borrow your toy but they say if it breaks, it's not their fault.`;
  } else {
    summary = `The document outlines the terms of agreement. We've identified ${foundHigh.length} high-risk and ${foundMedium.length} medium-risk points. Key concerns include ${foundHigh.join(", ") || "none"}. Overall, the document is ${riskLevel.toLowerCase()} risk.`;
  }

  // Highlight risk words in summary
  const highlightedSummary = summary.replace(new RegExp(`(${highRiskKeywords.join("|")})`, "gi"), "<strong>$1</strong>");

  return {
    summary: highlightedSummary,
    risks: risks.slice(0, 5),
    riskLevel,
    trustScore,
    decision,
    translation: language !== "en" ? `[Translated to ${language}] ...` : null,
    timestamp: new Date().toISOString(),
    title: text.substring(0, 30) + "..."
  };
};

const extractTextFromFile = async (file: any) => {
  if (!file) return "";
  const mimeType = file.mimetype;
  const originalName = file.originalname || "";
  const extension = path.extname(originalName).toLowerCase();
  let text = "";

  console.log(`Extracting text from: ${originalName} (Mime: ${mimeType}, Ext: ${extension})`);

  try {
    let dataBuffer: Buffer;
    if (file.buffer) {
      dataBuffer = file.buffer;
    } else if (file.path) {
      dataBuffer = fs.readFileSync(file.path);
    } else {
      throw new Error("No file data found in request");
    }

    // Try by mime type first, then fallback to extension
    if (mimeType === "application/pdf" || extension === ".pdf") {
      const pdf = require("pdf-parse");
      const data = await pdf(dataBuffer);
      text = data.text;
    } 
    else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === ".docx") {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      text = result.value;
    } 
    else if (mimeType.startsWith("text/") || extension === ".txt" || extension === ".md") {
      text = dataBuffer.toString("utf-8");
    } 
    else if (mimeType.startsWith("image/")) {
      text = "[Image file - OCR not implemented in this demo]";
    }
    else {
      // Last resort: try to treat as text if it's small
      if (dataBuffer.length < 1024 * 1024) {
        text = dataBuffer.toString("utf-8");
      } else {
        throw new Error(`Unsupported file type: ${mimeType} (${extension})`);
      }
    }
  } catch (err: any) {
    console.error("Extraction error details:", err);
    throw new Error(`Failed to extract text: ${err.message || "Unknown error"}`);
  } finally {
    // Clean up uploaded file if using disk storage
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    }
  }
  
  if (!text || text.trim().length === 0) {
    throw new Error("Extracted text is empty. The file might be corrupted or password protected.");
  }

  return text;
};

// Extract Endpoint (New)
app.post("/api/extract", cpUpload, async (req: any, res: any) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let text = "";
    let compareText = "";

    if (files?.file?.[0]) {
      text = await extractTextFromFile(files.file[0]);
    }
    
    if (files?.compareFile?.[0]) {
      compareText = await extractTextFromFile(files.compareFile[0]);
    }

    res.json({ text, compareText });
  } catch (error: any) {
    console.error("Extraction endpoint error:", error);
    res.status(500).json({ error: error.message || "Failed to extract text from document." });
  }
});

// Save History Endpoint
app.post("/api/history/save", (req, res) => {
  try {
    const result = req.body;
    if (!result || !result.summary) {
      return res.status(400).json({ error: "Invalid analysis result" });
    }
    history.push({
      ...result,
      timestamp: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save history" });
  }
});

// Analyze Endpoint
app.post("/api/analyze", cpUpload, async (req: any, res: any) => {
  try {
    let text = req.body.text || "";
    let compareText = req.body.compareText || "";
    const mode = req.body.mode || "standard";
    const language = req.body.language || "en";

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (files?.file?.[0]) {
      text = await extractTextFromFile(files.file[0]);
    }
    
    if (files?.compareFile?.[0]) {
      compareText = await extractTextFromFile(files.compareFile[0]);
    }

    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: "Input text is too short or empty." });
    }

    const result: any = analyzeText(text, mode, language);
    
    if (compareText && compareText.trim().length >= 10) {
      const compareResult = analyzeText(compareText, mode, language);
      
      // Add comparison insights
      const scoreDiff = result.trustScore - compareResult.trustScore;
      const diffSummary = scoreDiff > 0 
        ? `Document 1 is safer by ${scoreDiff} points.` 
        : scoreDiff < 0 
          ? `Document 2 is safer by ${Math.abs(scoreDiff)} points.` 
          : "Both documents have similar risk profiles.";

      result.compareResult = {
        ...compareResult,
        diffSummary
      };
    }

    history.push(result);
    res.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to process document." });
  }
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global API Error:", err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

export default app;
