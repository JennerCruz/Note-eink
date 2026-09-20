var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "15mb" }));
var getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/ai/interpret", async (req, res) => {
  try {
    const { rawText, strokeSummary, contextDate } = req.body;
    if (!rawText && !strokeSummary) {
      return res.status(400).json({ error: "rawText or strokeSummary is required" });
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        source: "local-fallback",
        result: {
          cleanedText: rawText || "",
          type: "note",
          items: [],
          confidence: 0.5,
          suggestion: null
        }
      });
    }
    const prompt = `Analiza este texto capturado de escritura manuscrita en un cuaderno inteligente:
Texto manuscrito: "${rawText}"
Metadatos de trazos: ${strokeSummary || "N/A"}
Fecha de contexto: ${contextDate || (/* @__PURE__ */ new Date()).toLocaleDateString("es-ES")}

Instrucciones:
1. Normaliza ortograf\xEDa y gram\xE1tica manteniendo el significado exacto.
2. Identifica si contiene tareas (acciones con verbos como comprar, llamar, enviar, pagar, hacer), eventos con fechas/horas (reuni\xF3n, cita, fiesta), listas de compras o vi\xF1etas (l\xEDneas separadas o comas de productos), o notas reflexivas.
3. Extrae fechas relativas ("ma\xF1ana", "lunes", "hoy", "el 15") y horas ("7 pm", "10:00", "tarde").
4. Si es ambiguo (por ejemplo una sola palabra sin verbo de acci\xF3n que podr\xEDa ser nota o tarea), formula una sugerencia discreta como: "\xBFQuieres convertir esto en tarea?".`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres el motor sem\xE1ntico de InkFlow, un cuaderno digital inteligente. Extrae la estructura de la escritura manuscrita de forma precisa, elegante y en espa\xF1ol.",
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            cleanedText: {
              type: import_genai.Type.STRING,
              description: "Texto limpio normalizado con capitalizaci\xF3n correcta"
            },
            title: {
              type: import_genai.Type.STRING,
              description: "T\xEDtulo corto sugerido de 2 a 4 palabras"
            },
            type: {
              type: import_genai.Type.STRING,
              description: "Tipo principal: 'task', 'list', 'event', o 'note'"
            },
            items: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  type: {
                    type: import_genai.Type.STRING,
                    description: "'task', 'list_item', 'event', 'note'"
                  },
                  text: { type: import_genai.Type.STRING },
                  completed: { type: import_genai.Type.BOOLEAN },
                  date: { type: import_genai.Type.STRING, description: "Fecha detectada o null" },
                  time: { type: import_genai.Type.STRING, description: "Hora detectada o null" },
                  priority: {
                    type: import_genai.Type.STRING,
                    description: "'low', 'normal', 'high'"
                  },
                  tags: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  }
                },
                required: ["type", "text"]
              }
            },
            confidence: {
              type: import_genai.Type.NUMBER,
              description: "Nivel de confianza de 0 a 1"
            },
            suggestion: {
              type: import_genai.Type.STRING,
              description: "Sugerencia discreta si no est\xE1 100% seguro o null"
            }
          },
          required: ["cleanedText", "type", "items"]
        }
      }
    });
    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json({ source: "gemini", result: parsed });
  } catch (error) {
    console.error("Error in /api/ai/interpret:", error);
    return res.status(500).json({ error: error.message || "Interpretation failed" });
  }
});
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { question, notes } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        answer: "Servicio de IA local: config\xFArelo con GEMINI_API_KEY para consultas avanzadas."
      });
    }
    const context = (notes || []).map(
      (n, idx) => `[Nota ${idx + 1} - ${n.date || "Sin fecha"}]: ${n.text || n.cleanedText || "Sin texto"}`
    ).join("\n");
    const prompt = `El usuario de InkFlow hace una pregunta sobre sus notas manuscritas e interpretadas.
Notas del usuario:
${context || "No hay notas guardadas a\xFAn."}

Pregunta del usuario:
"${question}"

Responde en espa\xF1ol de forma concisa, c\xE1lida y directa, citando qu\xE9 notas contienen la respuesta si aplica.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });
    return res.json({ answer: response.text });
  } catch (error) {
    console.error("Error in /api/ai/ask:", error);
    return res.status(500).json({ error: error.message || "Ask failed" });
  }
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InkFlow Server running on http://localhost:${PORT}`);
  });
}
start().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
