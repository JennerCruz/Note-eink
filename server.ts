import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize Gemini SDK with User-Agent telemetry
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Healthcheck endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Semantic Interpretation API
app.post("/api/ai/interpret", async (req: Request, res: Response): Promise<any> => {
  try {
    const { rawText, strokeSummary, contextDate } = req.body;
    if (!rawText && !strokeSummary) {
      return res.status(400).json({ error: "rawText or strokeSummary is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Return simulated/fallback offline rule result if no API key is provided
      return res.json({
        source: "local-fallback",
        result: {
          cleanedText: rawText || "",
          type: "note",
          items: [],
          confidence: 0.5,
          suggestion: null,
        },
      });
    }

    const prompt = `Analiza este texto capturado de escritura manuscrita en un cuaderno inteligente:
Texto manuscrito: "${rawText}"
Metadatos de trazos: ${strokeSummary || "N/A"}
Fecha de contexto: ${contextDate || new Date().toLocaleDateString("es-ES")}

Instrucciones:
1. Normaliza ortografía y gramática manteniendo el significado exacto.
2. Identifica si contiene tareas (acciones con verbos como comprar, llamar, enviar, pagar, hacer), eventos con fechas/horas (reunión, cita, fiesta), listas de compras o viñetas (líneas separadas o comas de productos), o notas reflexivas.
3. Extrae fechas relativas ("mañana", "lunes", "hoy", "el 15") y horas ("7 pm", "10:00", "tarde").
4. Si es ambiguo (por ejemplo una sola palabra sin verbo de acción que podría ser nota o tarea), formula una sugerencia discreta como: "¿Quieres convertir esto en tarea?".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "Eres el motor semántico de InkFlow, un cuaderno digital inteligente. Extrae la estructura de la escritura manuscrita de forma precisa, elegante y en español.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cleanedText: {
              type: Type.STRING,
              description: "Texto limpio normalizado con capitalización correcta",
            },
            title: {
              type: Type.STRING,
              description: "Título corto sugerido de 2 a 4 palabras",
            },
            type: {
              type: Type.STRING,
              description: "Tipo principal: 'task', 'list', 'event', o 'note'",
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "'task', 'list_item', 'event', 'note'",
                  },
                  text: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                  date: { type: Type.STRING, description: "Fecha detectada o null" },
                  time: { type: Type.STRING, description: "Hora detectada o null" },
                  priority: {
                    type: Type.STRING,
                    description: "'low', 'normal', 'high'",
                  },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["type", "text"],
              },
            },
            confidence: {
              type: Type.NUMBER,
              description: "Nivel de confianza de 0 a 1",
            },
            suggestion: {
              type: Type.STRING,
              description: "Sugerencia discreta si no está 100% seguro o null",
            },
          },
          required: ["cleanedText", "type", "items"],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json({ source: "gemini", result: parsed });
  } catch (error: any) {
    console.error("Error in /api/ai/interpret:", error);
    return res.status(500).json({ error: error.message || "Interpretation failed" });
  }
});

// Semantic Ask endpoint (Answers questions about notes)
app.post("/api/ai/ask", async (req: Request, res: Response): Promise<any> => {
  try {
    const { question, notes } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        answer: "Servicio de IA local: configúrelo con GEMINI_API_KEY para consultas avanzadas.",
      });
    }

    const context = (notes || [])
      .map(
        (n: any, idx: number) =>
          `[Nota ${idx + 1} - ${n.date || "Sin fecha"}]: ${n.text || n.cleanedText || "Sin texto"}`
      )
      .join("\n");

    const prompt = `El usuario de InkFlow hace una pregunta sobre sus notas manuscritas e interpretadas.
Notas del usuario:
${context || "No hay notas guardadas aún."}

Pregunta del usuario:
"${question}"

Responde en español de forma concisa, cálida y directa, citando qué notas contienen la respuesta si aplica.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return res.json({ answer: response.text });
  } catch (error: any) {
    console.error("Error in /api/ai/ask:", error);
    return res.status(500).json({ error: error.message || "Ask failed" });
  }
});

// Start the server with Vite middleware in development
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InkFlow Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
