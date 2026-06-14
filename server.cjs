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
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PORT = 3e3;
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var positionSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    x: { type: import_genai.Type.NUMBER, description: "Eje X como porcentaje del ancho de cancha (0-100)" },
    y: { type: import_genai.Type.NUMBER, description: "Eje Y como porcentaje del alto de cancha (0-100)" }
  },
  required: ["x", "y"]
};
var playerSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    id: { type: import_genai.Type.STRING, description: "ID del jugador: 'O1', 'O2', 'O3', 'O4', 'O5', 'D1', 'D2', 'D3', 'D4', 'D5', 'Ball'" },
    name: { type: import_genai.Type.STRING, description: "Etiqueta visual del jugador (ej: 'O1 \u{1F464}', 'D1 \u{1F6E1}\uFE0F', '\u{1F3C0}')" },
    type: { type: import_genai.Type.STRING, description: "Rol: 'offense', 'defense', 'ball'" },
    x: { type: import_genai.Type.NUMBER, description: "Coordenada x actual (0 a 100)" },
    y: { type: import_genai.Type.NUMBER, description: "Coordenada y actual (0 a 100)" }
  },
  required: ["id", "name", "type", "x", "y"]
};
var stepSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    description: { type: import_genai.Type.STRING, description: "Qu\xE9 pasa en este paso o movimiento de la pizarra" },
    duration: { type: import_genai.Type.NUMBER, description: "Duraci\xF3n del movimiento en segundos (ej: 2.0)" },
    players: {
      type: import_genai.Type.ARRAY,
      items: playerSchema,
      description: "Estado de todos los 11 elementos (5 atacantes, 5 defensores y 1 bal\xF3n) en este paso."
    }
  },
  required: ["description", "duration", "players"]
};
var drawingSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    id: { type: import_genai.Type.STRING, description: "ID \xFAnico para el trazo de dibujo" },
    type: { type: import_genai.Type.STRING, description: "Tipo de trazo: 'pass' (pase: segmentado azul), 'dribble' (bote: zigzag naranja), 'cut' (corte: flecha verde), 'screen' (pantalla/bloqueo: T roja)" },
    color: { type: import_genai.Type.STRING, description: "Color hexadecimal de la l\xEDnea" },
    points: {
      type: import_genai.Type.ARRAY,
      items: positionSchema,
      description: "Lista de puntos o camino de coordenadas de la jugada"
    }
  },
  required: ["id", "type", "color", "points"]
};
var playSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    name: { type: import_genai.Type.STRING, description: "Nombre creativo de la jugada t\xE1ctica" },
    description: { type: import_genai.Type.STRING, description: "Explicaci\xF3n instructiva general del sistema t\xE1ctico" },
    courtType: { type: import_genai.Type.STRING, description: "Tipo de cancha: 'half' (media cancha) o 'full' (cancha entera)" },
    steps: {
      type: import_genai.Type.ARRAY,
      items: stepSchema,
      description: "Secuencia ordenada de pasos/fotogramas para la animaci\xF3n"
    },
    drawings: {
      type: import_genai.Type.ARRAY,
      items: drawingSchema,
      description: "Indicaciones visuales/trazos que facilitan entender los cortes o pases clave"
    }
  },
  required: ["name", "description", "courtType", "steps", "drawings"]
};
var searchResultItemSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    id: { type: import_genai.Type.STRING, description: "ID de la jugada de internet" },
    name: { type: import_genai.Type.STRING, description: "Nombre completo y t\xE9cnico de la jugada del internet" },
    source: { type: import_genai.Type.STRING, description: "Sitio de internet real origen (ej: HoopTactics, Coach's Clipboard, FIBA Coaching, Breakthrough Basketball)" },
    description: { type: import_genai.Type.STRING, description: "Breve art\xEDculo instructivo o explicaci\xF3n de la jugada tal y como se explica en internet." },
    difficulty: { type: import_genai.Type.STRING, description: "Nivel: B\xE1sico, Intermedio o Avanzado" },
    courtType: { type: import_genai.Type.STRING, description: 'Cancha: "half" o "full"' },
    play: playSchema,
    youtubeId: { type: import_genai.Type.STRING, description: 'ID opcional de video de YouTube que describe la jugada t\xE1cticamente (ej: "4m_t7b6UEx4")' }
  },
  required: ["id", "name", "source", "description", "difficulty", "courtType", "play"]
};
var searchResultsSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    results: {
      type: import_genai.Type.ARRAY,
      items: searchResultItemSchema,
      description: "Resultados de jugadas de internet que coinciden con el t\xE9rmino de b\xFAsqueda."
    }
  },
  required: ["results"]
};
app.post("/api/search-internet", async (req, res) => {
  try {
    const { query } = req.body;
    const lowerQuery = query ? query.toLowerCase().trim() : "";
    const fallbackResults = [
      {
        id: "web-princeton",
        name: "Ataque Princeton: Corte Backdoor Tradicional",
        source: "CoachsClipboard.com",
        description: "El cl\xE1sico esquema de la Universidad de Princeton popularizado por Pete Carril. Se basa en el espaciado constante y castigar la defensa sobre-agresiva con cortes sorpresivos por la espalda (backdoor) hacia el aro libre.",
        difficulty: "Intermedio",
        courtType: "half",
        youtubeId: "4m_t7b6UEx4",
        play: {
          name: "\u{1F310} Princeton Offense - Backdoor Cut",
          description: "Jugada ic\xF3nica del sistema Princeton de Pete Carril para liberar al escolta con un pase picado desde el poste alto.",
          courtType: "half",
          steps: [
            {
              description: "Posici\xF3n inicial: O1 arriba con bal\xF3n. El p\xEDvot O5 sube al poste alto (Y=40) para liberar espacio abajo. El tirador O2 est\xE1 sobremarcado agresivamente por D2.",
              duration: 2,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 50, y: 78 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 20, y: 55 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 80, y: 65 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 30, y: 30 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 50, y: 45 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 70 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 23, y: 50 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 76, y: 58 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 28, y: 26 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 48, y: 38 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 50, y: 78 }
              ]
            },
            {
              description: "O1 pasa a O5 en el poste alto. En ese mismo instante, O2 simula un corte al aro, frena en seco y retrocede a recibir.",
              duration: 2.2,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 50, y: 78 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 20, y: 56 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 80, y: 65 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 30, y: 30 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 50, y: 45 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 70 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 22, y: 48 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 76, y: 58 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 28, y: 26 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 48, y: 38 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 50, y: 45 }
              ]
            },
            {
              description: "Corte backdoor: D2 muerde el amago y sube la l\xEDnea de pase. O2 gira sobre su pie de pivote y corre explosivamente hacia el aro. O5 le filtra el pase picado por debajo del brazo del defensor.",
              duration: 1.8,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 50, y: 78 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 34, y: 18 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 80, y: 65 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 30, y: 30 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 50, y: 45 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 70 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 22, y: 35 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 76, y: 58 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 28, y: 26 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 48, y: 38 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 34, y: 18 }
              ]
            }
          ],
          drawings: [
            { id: "pr1", type: "pass", color: "#3b82f6", points: [{ x: 50, y: 78 }, { x: 50, y: 45 }] },
            { id: "pr2", type: "cut", color: "#10b981", points: [{ x: 20, y: 55 }, { x: 21, y: 45 }, { x: 34, y: 18 }] },
            { id: "pr3", type: "pass", color: "#3b82f6", points: [{ x: 50, y: 45 }, { x: 42, y: 31 }, { x: 34, y: 18 }] }
          ]
        }
      },
      {
        id: "web-scariolo",
        name: "Pick & Roll Espa\xF1ol - Jugada de Doble Bloqueo",
        source: "FIBA Europe Coaching Academy",
        description: "Famoso sistema utilizado por Sergio Scariolo con la Selecci\xF3n de Espa\xF1a. O1 juega un Pick & Roll alto con O5, y un tercer atacante (O2) bloquea por la espalda al defensor del p\xEDvot (backscreen), impidiendo la ayuda en la continuaci\xF3n.",
        difficulty: "Avanzado",
        courtType: "half",
        youtubeId: "b-a7TfI8Z1g",
        play: {
          name: "\u{1F310} Spanish Pick & Roll (Sergio Scariolo)",
          description: "Un sistema letal en Europa. Bloqueo directo arriba y un bloqueo indirecto sorpresa en la pintura contra la rotaci\xF3n defensiva.",
          courtType: "half",
          steps: [
            {
              description: "Paso 1: O1 tiene el bal\xF3n arriba. O5 se prepara para bloquear arriba a D1. Simult\xE1neamente, el tirador O2 corre desde el poste bajo para interponerse en la direcci\xF3n defensiva de D5.",
              duration: 2,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 50, y: 80 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 40, y: 55 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 80, y: 65 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 20, y: 65 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 55, y: 74 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 74 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 36, y: 50 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 74, y: 58 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 23, y: 58 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 56, y: 60 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 50, y: 80 }
              ]
            },
            {
              description: "Paso 2: O1 ataca por la izquierda del bloqueo. O5 rueda al aro, pero D2 se cruza. O2 clava el bloqueo trasero a D5. O1 asiste a O5 libre en la zona de mate.",
              duration: 2.4,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 35, y: 70 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 60, y: 70 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 80, y: 65 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 20, y: 65 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 48, y: 30 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 44, y: 72 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 65 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 74, y: 58 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 23, y: 58 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 45, y: 45 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 48, y: 30 }
              ]
            }
          ],
          drawings: [
            { id: "sp1", type: "screen", color: "#f43f5e", points: [{ x: 55, y: 74 }, { x: 50, y: 74 }] },
            { id: "sp2", type: "screen", color: "#f59e0b", points: [{ x: 40, y: 55 }, { x: 56, y: 60 }] },
            { id: "sp3", type: "cut", color: "#10b981", points: [{ x: 55, y: 74 }, { x: 48, y: 30 }] },
            { id: "sp4", type: "pass", color: "#3b82f6", points: [{ x: 35, y: 70 }, { x: 48, y: 30 }] }
          ]
        }
      },
      {
        id: "web-triangle",
        name: "Sistema Ofensivo Tri\xE1ngulo de Phil Jackson",
        source: "HoopTactics.net",
        description: "La ofensiva que domin\xF3 la NBA de los 90 y 2000 con los Chicago Bulls y LA Lakers. Se basa en crear un tri\xE1ngulo lateral perfecto entre el alero con bal\xF3n, el p\xEDvot en el poste bajo y el base en la esquina libre, dejando el lado d\xE9bil despoblado.",
        difficulty: "Avanzado",
        courtType: "half",
        youtubeId: "Jcl6XgU0G_w",
        play: {
          name: "\u{1F310} Ofensiva de Tri\xE1ngulo (Bulls)",
          description: "Sincronizaci\xF3n de tri\xE1ngulos laterales de Phil Jackson con bal\xF3n al poste y corte en poste bajo de apoyo.",
          courtType: "half",
          steps: [
            {
              description: "Se forma el tri\xE1ngulo lateral: O1 pasa el b\xE1l\xF3n a O3 en la esquina y finta cortar al aro para terminar en el rinc\xF3n. O5 se sit\xFAa en el poste bajo formando un perfecto tri\xE1ngulo rect\xE1ngulo.",
              duration: 2.2,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 12, y: 35 },
                // Corner
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 50, y: 75 },
                // Guard safety
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 15, y: 58 },
                // Wing with Ball
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 80, y: 65 },
                // Opposite float
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 22, y: 25 },
                // Post low
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 14, y: 32 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 48, y: 68 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 18, y: 52 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 74, y: 58 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 24, y: 22 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 15, y: 58 }
              ]
            },
            {
              description: "O3 mete el pase al p\xEDvot O5 en el poste. O3 realiza un corte de tijera por dentro apoy\xE1ndose en el cuerpo de O5 para herir la pintura defensiva y machacar la canasta.",
              duration: 2,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 12, y: 35 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 50, y: 75 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 20, y: 20 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 80, y: 65 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 22, y: 25 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 14, y: 32 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 48, y: 68 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 21, y: 24 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 74, y: 58 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 24, y: 20 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 20, y: 20 }
              ]
            }
          ],
          drawings: [
            { id: "tr1", type: "pass", color: "#3b82f6", points: [{ x: 15, y: 58 }, { x: 22, y: 25 }] },
            { id: "tr2", type: "cut", color: "#10b981", points: [{ x: 15, y: 58 }, { x: 22, y: 25 }, { x: 20, y: 20 }] }
          ]
        }
      },
      {
        id: "web-5out",
        name: "Ataque Abierto 5 Fuera (5-Out Offense) - Espacio Continuo",
        source: "BreakthroughBasketball.com",
        description: "El sistema predilecto del baloncesto moderno libre de posiciones. Todos los jugadores perimetrales abren el campo de juego para cortes r\xE1pidos de backdoor, aclarados individuales y rotaciones directas.",
        difficulty: "B\xE1sico",
        courtType: "half",
        youtubeId: "1E_1i-75vK4",
        play: {
          name: "\u{1F310} Ataque Abierto 5 Fuera (5-Out)",
          description: "Todos los jugadores iniciados fuera de la l\xEDnea de tres puntos para forzar aclarados y cortes r\xE1pidos.",
          courtType: "half",
          steps: [
            {
              description: "O1 inicia arriba. O2 y O3 abiertos en prolongaci\xF3n de tiro libre, O4 y O5 en las esquinas bajas.",
              duration: 2,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 50, y: 84 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 22, y: 68 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 78, y: 68 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 15, y: 35 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 85, y: 35 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 76 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 26, y: 61 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 74, y: 61 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 21, y: 34 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 79, y: 34 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 50, y: 84 }
              ]
            }
          ],
          drawings: []
        }
      },
      {
        id: "web-horns",
        name: "Ataque de Cuernos (Horns Setup) - Doble Bloqueo Directo",
        source: "CoachesClipboard.com",
        description: "Estructura en Cuernos muy frecuente en la FIBA y la NBA. Los dos hombres grandes suben a los codos (elbows) del tiro libre para ofrecer doble bloqueo al base.",
        difficulty: "Intermedio",
        courtType: "half",
        youtubeId: "V9mX6K4aR2A",
        play: {
          name: "\u{1F310} Ataque de Cuernos (Horns)",
          description: "Bloqueos r\xE1pidos en los postes altos para forzar rotaciones perimetrales.",
          courtType: "half",
          steps: [
            {
              description: "O1 arriba. Los p\xEDvots O4 y O5 en los codos para bloqueos sorpresivos.",
              duration: 2,
              players: [
                { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 50, y: 82 },
                { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 12, y: 25 },
                { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 88, y: 25 },
                { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 38, y: 45 },
                { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 62, y: 45 },
                { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 74 },
                { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 16, y: 28 },
                { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 84, y: 28 },
                { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 38, y: 39 },
                { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 62, y: 39 },
                { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 50, y: 82 }
              ]
            }
          ],
          drawings: []
        }
      }
    ];
    if (!lowerQuery) {
      return res.json({ results: fallbackResults });
    }
    const matchedFallback = fallbackResults.filter(
      (r) => r.name.toLowerCase().includes(lowerQuery) || r.description.toLowerCase().includes(lowerQuery) || r.source.toLowerCase().includes(lowerQuery)
    );
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || !lowerQuery) {
      return res.json({ results: matchedFallback.length > 0 ? matchedFallback : fallbackResults });
    }
    const systemInstruction = `
      Eres una base de datos interactiva que simula buscar jugadas de baloncesto compartidas en internet (Coach's Clipboard, HoopTactics, FIBA Coaching, Breakthrough Basketball).
      Proporciona un arreglo JSON llamado "results" con exactamente 2 resultados t\xE1cticas que coincidan de forma plausible con la consulta.
      Cada resultado debe tener obligatoriamente:
      - "id": un string unico incremental
      - "name": el nombre t\xE9cnico en internet del sistema
      - "source": el nombre del portal de internet prestigioso donde se aloja
      - "description": una ficha resumida y did\xE1ctica que simula un post o art\xEDculo
      - "difficulty": "B\xE1sico", "Intermedio" o "Avanzado"
      - "courtType": "half" o "full"
      - "play": Un objeto de jugada completo que coincida exactamente con "playSchema".
      
      REGLAS DE SEGURIDAD DEL BALON (IMPORTANTISIMO):
      - La posesi\xF3n de pelota ("Ball") debe estar exactamente pegada o coordinando con el atacante poseedor en cada paso. No dejes flotar el bal\xF3n libre a menos de que sea un pase real.
      - Debes incluir siempre los 11 jugadores en cada paso (O1, O2, O3, O4, O5, D1, D2, D3, D4, D5, Ball).
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Trae 2 jugadas o sistemas colgados en internet que coincidan o se basen en la b\xFAsqueda de: "${query}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: searchResultsSchema,
        temperature: 0.4
      }
    });
    const parsedData = JSON.parse(response.text.trim());
    return res.json({ results: parsedData.results || fallbackResults });
  } catch (error) {
    console.error("Error buscando jugadas en internet:", error);
    return res.json({
      results: [
        {
          id: "web-princeton-err",
          name: "Ataque Princeton: Corte Backdoor (Resultado Local)",
          source: "CoachsClipboard.com",
          description: "El cl\xE1sico esquema de la Universidad de Princeton popularizado por Pete Carril. Basado en desv\xEDo por la l\xEDnea de fondo.",
          difficulty: "Intermedio",
          courtType: "half",
          youtubeId: "4m_t7b6UEx4",
          play: {
            name: "\u{1F310} Princeton Offense - Backdoor Cut",
            description: "Jugada ic\xF3nica del sistema Princeton de Pete Carril para liberar al escolta con un pase picado desde el poste alto.",
            courtType: "half",
            steps: [
              {
                description: "Posici\xF3n inicial: O1 arriba con bal\xF3n. El p\xEDvot O5 sube al poste alto (Y=40) para liberar espacio abajo. El tirador O2 est\xE1 sobremarcado agresivamente por D2.",
                duration: 2,
                players: [
                  { id: "O1", name: "O1 \u{1F464}", type: "offense", x: 50, y: 78 },
                  { id: "O2", name: "O2 \u{1F464}", type: "offense", x: 20, y: 55 },
                  { id: "O3", name: "O3 \u{1F464}", type: "offense", x: 80, y: 65 },
                  { id: "O4", name: "O4 \u{1F464}", type: "offense", x: 30, y: 30 },
                  { id: "O5", name: "O5 \u{1F464}", type: "offense", x: 50, y: 45 },
                  { id: "D1", name: "D1 \u{1F6E1}\uFE0F", type: "defense", x: 50, y: 70 },
                  { id: "D2", name: "D2 \u{1F6E1}\uFE0F", type: "defense", x: 23, y: 50 },
                  { id: "D3", name: "D3 \u{1F6E1}\uFE0F", type: "defense", x: 76, y: 58 },
                  { id: "D4", name: "D4 \u{1F6E1}\uFE0F", type: "defense", x: 28, y: 26 },
                  { id: "D5", name: "D5 \u{1F6E1}\uFE0F", type: "defense", x: 48, y: 38 },
                  { id: "Ball", name: "\u{1F3C0}", type: "ball", x: 50, y: 78 }
                ]
              }
            ],
            drawings: []
          }
        }
      ]
    });
  }
});
app.post("/api/generate-play", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Falta proveer el texto descriptivo o idea de la jugada" });
    }
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return res.status(500).json({ error: "La API Key de Gemini no se encuentra configurada en settings." });
    }
    const systemInstruction = `
      Eres un entrenador asistente de baloncesto de \xE9lite y experto de la FIBA y la NBA.
      Tu tarea es interpretar los requerimientos de una jugada t\xE1ctica de baloncesto y transformarla en una secuencia animada de pasos perfectamente v\xE1lidos, representados por un objeto JSON estructurado que sirva de pizarra animada.

      REGLAS DE VOCABULARIO Y ABREVIACIONES (IMPORTANT\xCDSIMO):
      - En las descripciones de los pasos y res\xFAmenes de jugadas, NUNCA utilices "O1", "O5" , "D1" ni "D5" directamente. 
      - En su lugar, utiliza siempre el n\xFAmero de jugador claro y su rol de baloncesto en espa\xF1ol:
        * O1 -> "Base (1)"
        * O2 -> "Escolta (2)"
        * O3 -> "Alero (3)"
        * O4 -> "Ala-P\xEDvot (4)"
        * O5 -> "P\xEDvot (5)"
        * D1 -> "Defensa (X1)" o "Defensa del Base (X1)"
        * D2 -> "Defensa (X2)" o "Defensa del Escolta (X2)"
        * D3 -> "Defensa (X3)" o "Defensa del Alero (X3)"
        * D4 -> "Defensa (X4)" o "Defensa del Ala-P\xEDvot (X4)"
        * D5 -> "Defensa (X5)" o "Defensa del P\xEDvot (X5)"
      - Ejemplo correcto: "El Base (1) pasa el bal\xF3n al Alero (3) en la banda mientras el P\xEDvot (5) sube a realizar un bloqueo indirecto para liberar al Escolta (2)."

      REGLAS DE COORDENADAS:
      - Todas las coordenadas son en porcentaje (0 a 100).
      - Si courtType es 'half' (Media Cancha):
        El aro (canasta) est\xE1 en la coordenada exacta de { x: 50, y: 15 }, el tablero est\xE1 horizontal detr\xE1s en Y ~11. El arco de tres puntos es de centro (50, 15) con radio cercano a 35. El medio campo est\xE1 abajo en Y=90-100.
        Los atacantes O1-O5 juegan por encima del triple (Y de 55 a 85).
        Los defensores D1-D5 se colocan defendiendo, tapando a su atacante respectivo entre el atacante y el aro.
        La pelota ('Ball') se coloca junto a las manos del jugador poseedor en cada paso. \xA1Es crucial que las coordenadas del bal\xF3n coincidan casi exactamente con el jugador que tiene la posesi\xF3n!
      - Si courtType es 'full' (Cancha Completa):
        La canasta izquierda est\xE1 en { x: 6, y: 50 } y la derecha est\xE1 en { x: 94, y: 50 }.
        Los defensores y atacantes se distribuyen a lo largo de toda la longitud (X: 0 a 100) y altura (Y: 0 a 100).

      REGLAS DE PASOS (ANIMACI\xD3N COHERENTE):
      - CADA PASO DEBE COORDINAR Y ANIMAR CON EL ANTERIOR. No des saltos teletransportados de jugadores. Si O1 est\xE1 en (50,80) en el paso 1, y bota en el paso 2, su coordenada debe cambiar congruentemente, digamos a (40, 72), y el bal\xF3n tambi\xE9n.
      - Debes retornar exactamente 11 elementos siempre en cada paso: 'O1', 'O2', 'O3', 'O4', 'O5', 'D1', 'D2', 'D3', 'D4', 'D5', y 'Ball'.
      - El bal\xF3n ('Ball') debe estar ubicado en alg\xFAn jugador o en el trayecto de un pase.
      - Los trazos ('drawings') grafican de forma est\xE9tica los vectores de pases ('pass'), fintas/cortes ('cut'), pantallas ('screen'), o botes de bal\xF3n ('dribble'). Los puntos de los dibujos deben ligar coherentemente las posiciones iniciales y finales.

      Por favor atiende con rigurosidad las t\xE1cticas solicitadas, por ejemplo sistemas 2-3, pick and rolls, cuernos (horns), cortes de fondo, aclarados (isolation), o transiciones r\xE1pidas.
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Interpreta y genera el siguiente sistema t\xE1ctico de baloncesto: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: playSchema,
        temperature: 0.3
      }
    });
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("La respuesta del modelo de IA est\xE1 vac\xEDa");
    }
    const playData = JSON.parse(textOutput.trim());
    return res.json({ play: playData });
  } catch (error) {
    console.error("Error generando jugada t\xE1ctica:", error);
    return res.status(500).json({ error: error.message || "Error del servidor procesando la jugada" });
  }
});
app.post("/api/generate-step-description", async (req, res) => {
  try {
    const { currentPlayers, prevPlayers, courtType, stepIndex } = req.body;
    if (!currentPlayers) {
      return res.status(400).json({ error: "Falta proveer el listado actual de jugadores." });
    }
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return res.status(500).json({ error: "La API Key de Gemini no se encuentra configurada en settings." });
    }
    const systemInstruction = `
      Eres un entrenador asistente de baloncesto de \xE9lite especialista de la FIBA y de la NBA.
      Analiza la transici\xF3n de los jugadores desde su estado previo hasta su estado actual en un paso concreto de una jugada en la pizarra t\xE1ctica.
      Por favor, genera una descripci\xF3n t\xE9cnica, concisa y sumamente t\xE1ctica en espa\xF1ol (m\xE1ximo 2 frases) de lo que sucede en este paso de la jugada.

      REGLAS DE NOMBRES Y TERMINOLOG\xCDA (CR\xCDTICO):
      - NUNCA uses c\xF3digos como "O1", "O2", "O5", "D1", "D3" en absoluto en el texto final. 
      - Traduce siempre los IDs a nombres reales en espa\xF1ol:
        * O1 -> "Base (1)"
        * O2 -> "Escolta (2)"
        * O3 -> "Alero (3)"
        * O4 -> "Ala-P\xEDvot (4)"
        * O5 -> "P\xEDvot (5)"
        * D1 -> "Defensivo (X1)"
        * D2 -> "Defensivo (X2)"
        * D3 -> "Defensivo (X3)"
        * D4 -> "Defensivo (X4)"
        * D5 -> "Defensivo (X5)"
        * Ball -> "el bal\xF3n"
      - Describe los desplazamientos notables: si un jugador cambi\xF3 significativamente de posici\xF3n respecto al paso previo, descr\xEDbelo t\xE9cnicamente (por ejemplo, "cortar hacia el aro", "abrirse a la esquina", "subir al poste alto", "hacer una pantalla/bloqueo", "driblar hacia la bombilla", "moverse hacia el tiro libre").
      - Si el bal\xF3n cambi\xF3 de due\xF1o, descr\xEDbelo como un pase (ej. "el Base (1) asiste al Alero (3)" o "pasa al Alero (3)").
      - Si el bal\xF3n fue hacia la canasta (posici\xF3n X=50, Y=15 en media cancha), descr\xEDbelo como un lanzamiento a canasta (ej. "el Escolta (2) lanza a canasta" o "tira un triple").
      - El tono debe ser directo, t\xE9cnico y limpio, tal como lo explicar\xEDa un entrenador a sus jugadores en el banquillo.
      - No a\xF1adas introducciones como "En este paso...", ve directo al grano t\xE1ctico. Ejemplo correcto: "El Base (1) penetra por la derecha mientras el P\xEDvot (5) le pone un bloqueo directo a su defensor y el Alero (3) se abre a la esquina para recibir el pase."
    `;
    const prompt = `
      Cancha: ${courtType === "half" ? "Media Cancha (con aro en X=50, Y=15)" : "Cancha Completa"}. Paso de animaci\xF3n #${stepIndex + 1}.
      T\xE1cticas e informaci\xF3n de posiciones:
      
      Lista de Jugadores en el paso anterior (Posici\xF3n de inicio del paso):
      ${JSON.stringify(prevPlayers || [])}
      
      Lista de Jugadores en el paso actual (Posici\xF3n de t\xE9rmino del paso):
      ${JSON.stringify(currentPlayers)}
      
      Por favor, describe t\xE9cnicamente los cambios y movimientos clave de este paso de manera sumamente natural, sin rodeos de robot.
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });
    const textOutput = response.text;
    res.json({ description: textOutput ? textOutput.trim() : "" });
  } catch (error) {
    console.error("Error generando descripci\xF3n del paso:", error);
    res.status(500).json({ error: error.message || "Error del servidor al generar descripci\xF3n" });
  }
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pizarra T\xE1ctica de Baloncesto activa en http://localhost:${PORT}`);
  });
}
start().catch((err) => {
  console.error("Fallo al iniciar el servidor Express + Vite:", err);
});
//# sourceMappingURL=server.cjs.map
