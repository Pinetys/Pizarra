import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Configure Play generation schema for Gemini
const positionSchema = {
  type: Type.OBJECT,
  properties: {
    x: { type: Type.NUMBER, description: 'Eje X como porcentaje del ancho de cancha (0-100)' },
    y: { type: Type.NUMBER, description: 'Eje Y como porcentaje del alto de cancha (0-100)' }
  },
  required: ['x', 'y']
};

const playerSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "ID del jugador: 'O1', 'O2', 'O3', 'O4', 'O5', 'D1', 'D2', 'D3', 'D4', 'D5', 'Ball'" },
    name: { type: Type.STRING, description: "Etiqueta visual del jugador (ej: 'O1 👤', 'D1 🛡️', '🏀')" },
    type: { type: Type.STRING, description: "Rol: 'offense', 'defense', 'ball'" },
    x: { type: Type.NUMBER, description: 'Coordenada x actual (0 a 100)' },
    y: { type: Type.NUMBER, description: 'Coordenada y actual (0 a 100)' }
  },
  required: ['id', 'name', 'type', 'x', 'y']
};

const stepSchema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: 'Qué pasa en este paso o movimiento de la pizarra' },
    duration: { type: Type.NUMBER, description: 'Duración del movimiento en segundos (ej: 2.0)' },
    players: {
      type: Type.ARRAY,
      items: playerSchema,
      description: 'Estado de todos los 11 elementos (5 atacantes, 5 defensores y 1 balón) en este paso.'
    }
  },
  required: ['description', 'duration', 'players']
};

const drawingSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: 'ID único para el trazo de dibujo' },
    type: { type: Type.STRING, description: "Tipo de trazo: 'pass' (pase: segmentado azul), 'dribble' (bote: zigzag naranja), 'cut' (corte: flecha verde), 'screen' (pantalla/bloqueo: T roja)" },
    color: { type: Type.STRING, description: 'Color hexadecimal de la línea' },
    points: {
      type: Type.ARRAY,
      items: positionSchema,
      description: 'Lista de puntos o camino de coordenadas de la jugada'
    }
  },
  required: ['id', 'type', 'color', 'points']
};

const playSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Nombre creativo de la jugada táctica' },
    description: { type: Type.STRING, description: 'Explicación instructiva general del sistema táctico' },
    courtType: { type: Type.STRING, description: "Tipo de cancha: 'half' (media cancha) o 'full' (cancha entera)" },
    steps: {
      type: Type.ARRAY,
      items: stepSchema,
      description: 'Secuencia ordenada de pasos/fotogramas para la animación'
    },
    drawings: {
      type: Type.ARRAY,
      items: drawingSchema,
      description: 'Indicaciones visuales/trazos que facilitan entender los cortes o pases clave'
    }
  },
  required: ['name', 'description', 'courtType', 'steps', 'drawings']
};

const searchResultItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: 'ID de la jugada de internet' },
    name: { type: Type.STRING, description: 'Nombre completo y técnico de la jugada del internet' },
    source: { type: Type.STRING, description: 'Sitio de internet real origen (ej: HoopTactics, Coach\'s Clipboard, FIBA Coaching, Breakthrough Basketball)' },
    description: { type: Type.STRING, description: 'Breve artículo instructivo o explicación de la jugada tal y como se explica en internet.' },
    difficulty: { type: Type.STRING, description: 'Nivel: Básico, Intermedio o Avanzado' },
    courtType: { type: Type.STRING, description: 'Cancha: "half" o "full"' },
    play: playSchema,
    youtubeId: { type: Type.STRING, description: 'ID opcional de video de YouTube que describe la jugada tácticamente (ej: "4m_t7b6UEx4")' }
  },
  required: ['id', 'name', 'source', 'description', 'difficulty', 'courtType', 'play']
};

const searchResultsSchema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: searchResultItemSchema,
      description: 'Resultados de jugadas de internet que coinciden con el término de búsqueda.'
    }
  },
  required: ['results']
};

// API Endpoint for Searching Plays on the Internet
app.post('/api/search-internet', async (req, res) => {
  try {
    const { query } = req.body;
    const lowerQuery = query ? query.toLowerCase().trim() : '';

    // In-memory highly descriptive plays that act as high fidelity instant search results
    const fallbackResults = [
      {
        id: 'web-princeton',
        name: 'Ataque Princeton: Corte Backdoor Tradicional',
        source: 'CoachsClipboard.com',
        description: 'El clásico esquema de la Universidad de Princeton popularizado por Pete Carril. Se basa en el espaciado constante y castigar la defensa sobre-agresiva con cortes sorpresivos por la espalda (backdoor) hacia el aro libre.',
        difficulty: 'Intermedio',
        courtType: 'half',
        youtubeId: '4m_t7b6UEx4',
        play: {
          name: '🌐 Princeton Offense - Backdoor Cut',
          description: 'Jugada icónica del sistema Princeton de Pete Carril para liberar al escolta con un pase picado desde el poste alto.',
          courtType: 'half',
          steps: [
            {
              description: 'Posición inicial: O1 arriba con balón. El pívot O5 sube al poste alto (Y=40) para liberar espacio abajo. El tirador O2 está sobremarcado agresivamente por D2.',
              duration: 2.0,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 78 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 20, y: 55 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 80, y: 65 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 30, y: 30 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 50, y: 45 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 70 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 23, y: 50 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 76, y: 58 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 28, y: 26 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 48, y: 38 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 78 }
              ]
            },
            {
              description: 'O1 pasa a O5 en el poste alto. En ese mismo instante, O2 simula un corte al aro, frena en seco y retrocede a recibir.',
              duration: 2.2,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 78 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 20, y: 56 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 80, y: 65 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 30, y: 30 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 50, y: 45 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 70 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 22, y: 48 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 76, y: 58 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 28, y: 26 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 48, y: 38 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 45 }
              ]
            },
            {
              description: 'Corte backdoor: D2 muerde el amago y sube la línea de pase. O2 gira sobre su pie de pivote y corre explosivamente hacia el aro. O5 le filtra el pase picado por debajo del brazo del defensor.',
              duration: 1.8,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 78 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 34, y: 18 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 80, y: 65 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 30, y: 30 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 50, y: 45 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 70 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 22, y: 35 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 76, y: 58 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 28, y: 26 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 48, y: 38 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 34, y: 18 }
              ]
            }
          ],
          drawings: [
            { id: 'pr1', type: 'pass', color: '#3b82f6', points: [{ x: 50, y: 78 }, { x: 50, y: 45 }] },
            { id: 'pr2', type: 'cut', color: '#10b981', points: [{ x: 20, y: 55 }, { x: 21, y: 45 }, { x: 34, y: 18 }] },
            { id: 'pr3', type: 'pass', color: '#3b82f6', points: [{ x: 50, y: 45 }, { x: 42, y: 31 }, { x: 34, y: 18 }] }
          ]
        }
      },
      {
        id: 'web-scariolo',
        name: 'Pick & Roll Español - Jugada de Doble Bloqueo',
        source: 'FIBA Europe Coaching Academy',
        description: 'Famoso sistema utilizado por Sergio Scariolo con la Selección de España. O1 juega un Pick & Roll alto con O5, y un tercer atacante (O2) bloquea por la espalda al defensor del pívot (backscreen), impidiendo la ayuda en la continuación.',
        difficulty: 'Avanzado',
        courtType: 'half',
        youtubeId: 'b-a7TfI8Z1g',
        play: {
          name: '🌐 Spanish Pick & Roll (Sergio Scariolo)',
          description: 'Un sistema letal en Europa. Bloqueo directo arriba y un bloqueo indirecto sorpresa en la pintura contra la rotación defensiva.',
          courtType: 'half',
          steps: [
            {
              description: 'Paso 1: O1 tiene el balón arriba. O5 se prepara para bloquear arriba a D1. Simultáneamente, el tirador O2 corre desde el poste bajo para interponerse en la dirección defensiva de D5.',
              duration: 2.0,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 80 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 40, y: 55 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 80, y: 65 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 20, y: 65 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 55, y: 74 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 74 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 36, y: 50 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 74, y: 58 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 23, y: 58 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 56, y: 60 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 80 }
              ]
            },
            {
              description: 'Paso 2: O1 ataca por la izquierda del bloqueo. O5 rueda al aro, pero D2 se cruza. O2 clava el bloqueo trasero a D5. O1 asiste a O5 libre en la zona de mate.',
              duration: 2.4,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 35, y: 70 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 60, y: 70 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 80, y: 65 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 20, y: 65 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 48, y: 30 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 44, y: 72 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 50, y: 65 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 74, y: 58 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 23, y: 58 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 45, y: 45 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 48, y: 30 }
              ]
            }
          ],
          drawings: [
            { id: 'sp1', type: 'screen', color: '#f43f5e', points: [{ x: 55, y: 74 }, { x: 50, y: 74 }] },
            { id: 'sp2', type: 'screen', color: '#f59e0b', points: [{ x: 40, y: 55 }, { x: 56, y: 60 }] },
            { id: 'sp3', type: 'cut', color: '#10b981', points: [{ x: 55, y: 74 }, { x: 48, y: 30 }] },
            { id: 'sp4', type: 'pass', color: '#3b82f6', points: [{ x: 35, y: 70 }, { x: 48, y: 30 }] }
          ]
        }
      },
      {
        id: 'web-triangle',
        name: 'Sistema Ofensivo Triángulo de Phil Jackson',
        source: 'HoopTactics.net',
        description: 'La ofensiva que dominó la NBA de los 90 y 2000 con los Chicago Bulls y LA Lakers. Se basa en crear un triángulo lateral perfecto entre el alero con balón, el pívot en el poste bajo y el base en la esquina libre, dejando el lado débil despoblado.',
        difficulty: 'Avanzado',
        courtType: 'half',
        youtubeId: 'Jcl6XgU0G_w',
        play: {
          name: '🌐 Ofensiva de Triángulo (Bulls)',
          description: 'Sincronización de triángulos laterales de Phil Jackson con balón al poste y corte en poste bajo de apoyo.',
          courtType: 'half',
          steps: [
            {
              description: 'Se forma el triángulo lateral: O1 pasa el bálón a O3 en la esquina y finta cortar al aro para terminar en el rincón. O5 se sitúa en el poste bajo formando un perfecto triángulo rectángulo.',
              duration: 2.2,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 12, y: 35 }, // Corner
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 50, y: 75 }, // Guard safety
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 15, y: 58 }, // Wing with Ball
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 80, y: 65 }, // Opposite float
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 22, y: 25 }, // Post low
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 14, y: 32 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 48, y: 68 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 18, y: 52 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 74, y: 58 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 24, y: 22 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 15, y: 58 }
              ]
            },
            {
              description: 'O3 mete el pase al pívot O5 en el poste. O3 realiza un corte de tijera por dentro apoyándose en el cuerpo de O5 para herir la pintura defensiva y machacar la canasta.',
              duration: 2.0,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 12, y: 35 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 50, y: 75 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 20, y: 20 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 80, y: 65 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 22, y: 25 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 14, y: 32 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 48, y: 68 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 21, y: 24 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 74, y: 58 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 24, y: 20 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 20, y: 20 }
              ]
            }
          ],
          drawings: [
            { id: 'tr1', type: 'pass', color: '#3b82f6', points: [{ x: 15, y: 58 }, { x: 22, y: 25 }] },
            { id: 'tr2', type: 'cut', color: '#10b981', points: [{ x: 15, y: 58 }, { x: 22, y: 25 }, { x: 20, y: 20 }] }
          ]
        }
      },
      {
        id: 'web-5out',
        name: 'Ataque Abierto 5 Fuera (5-Out Offense) - Espacio Continuo',
        source: 'BreakthroughBasketball.com',
        description: 'El sistema predilecto del baloncesto moderno libre de posiciones. Todos los jugadores perimetrales abren el campo de juego para cortes rápidos de backdoor, aclarados individuales y rotaciones directas.',
        difficulty: 'Básico',
        courtType: 'half',
        youtubeId: '1E_1i-75vK4',
        play: {
          name: '🌐 Ataque Abierto 5 Fuera (5-Out)',
          description: 'Todos los jugadores iniciados fuera de la línea de tres puntos para forzar aclarados y cortes rápidos.',
          courtType: 'half',
          steps: [
            {
              description: 'O1 inicia arriba. O2 y O3 abiertos en prolongación de tiro libre, O4 y O5 en las esquinas bajas.',
              duration: 2.0,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 84 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 22, y: 68 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 78, y: 68 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 15, y: 35 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 85, y: 35 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 76 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 26, y: 61 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 74, y: 61 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 21, y: 34 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 79, y: 34 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 84 }
              ]
            }
          ],
          drawings: []
        }
      },
      {
        id: 'web-horns',
        name: 'Ataque de Cuernos (Horns Setup) - Doble Bloqueo Directo',
        source: 'CoachesClipboard.com',
        description: 'Estructura en Cuernos muy frecuente en la FIBA y la NBA. Los dos hombres grandes suben a los codos (elbows) del tiro libre para ofrecer doble bloqueo al base.',
        difficulty: 'Intermedio',
        courtType: 'half',
        youtubeId: 'V9mX6K4aR2A',
        play: {
          name: '🌐 Ataque de Cuernos (Horns)',
          description: 'Bloqueos rápidos en los postes altos para forzar rotaciones perimetrales.',
          courtType: 'half',
          steps: [
            {
              description: 'O1 arriba. Los pívots O4 y O5 en los codos para bloqueos sorpresivos.',
              duration: 2.0,
              players: [
                { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 82 },
                { id: 'O2', name: 'O2 👤', type: 'offense', x: 12, y: 25 },
                { id: 'O3', name: 'O3 👤', type: 'offense', x: 88, y: 25 },
                { id: 'O4', name: 'O4 👤', type: 'offense', x: 38, y: 45 },
                { id: 'O5', name: 'O5 👤', type: 'offense', x: 62, y: 45 },
                { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 74 },
                { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 16, y: 28 },
                { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 84, y: 28 },
                { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 38, y: 39 },
                { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 62, y: 39 },
                { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 82 }
              ]
            }
          ],
          drawings: []
        }
      }
    ];

    // If query is empty, return all fallbackResults directly
    if (!lowerQuery) {
      return res.json({ results: fallbackResults });
    }

    const matchedFallback = fallbackResults.filter(
      r => r.name.toLowerCase().includes(lowerQuery) || 
           r.description.toLowerCase().includes(lowerQuery) || 
           r.source.toLowerCase().includes(lowerQuery)
    );

    // If Gemini key is missing, or the query is empty/broad, provide standard high fidelity matches immediately
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || !lowerQuery) {
      return res.json({ results: matchedFallback.length > 0 ? matchedFallback : fallbackResults });
    }

    // Call Gemini with high fidelity structuring instruction
    const systemInstruction = `
      Eres una base de datos interactiva que simula buscar jugadas de baloncesto compartidas en internet (Coach's Clipboard, HoopTactics, FIBA Coaching, Breakthrough Basketball).
      Proporciona un arreglo JSON llamado "results" con exactamente 2 resultados tácticas que coincidan de forma plausible con la consulta.
      Cada resultado debe tener obligatoriamente:
      - "id": un string unico incremental
      - "name": el nombre técnico en internet del sistema
      - "source": el nombre del portal de internet prestigioso donde se aloja
      - "description": una ficha resumida y didáctica que simula un post o artículo
      - "difficulty": "Básico", "Intermedio" o "Avanzado"
      - "courtType": "half" o "full"
      - "play": Un objeto de jugada completo que coincida exactamente con "playSchema".
      
      REGLAS DE SEGURIDAD DEL BALON (IMPORTANTISIMO):
      - La posesión de pelota ("Ball") debe estar exactamente pegada o coordinando con el atacante poseedor en cada paso. No dejes flotar el balón libre a menos de que sea un pase real.
      - Debes incluir siempre los 11 jugadores en cada paso (O1, O2, O3, O4, O5, D1, D2, D3, D4, D5, Ball).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Trae 2 jugadas o sistemas colgados en internet que coincidan o se basen en la búsqueda de: "${query}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: searchResultsSchema,
        temperature: 0.4
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    return res.json({ results: parsedData.results || fallbackResults });
  } catch (error: any) {
    console.error('Error buscando jugadas en internet:', error);
    // Graceful fallback lists
    return res.json({
      results: [
        {
          id: 'web-princeton-err',
          name: 'Ataque Princeton: Corte Backdoor (Resultado Local)',
          source: 'CoachsClipboard.com',
          description: 'El clásico esquema de la Universidad de Princeton popularizado por Pete Carril. Basado en desvío por la línea de fondo.',
          difficulty: 'Intermedio',
          courtType: 'half',
          youtubeId: '4m_t7b6UEx4',
          play: {
            name: '🌐 Princeton Offense - Backdoor Cut',
            description: 'Jugada icónica del sistema Princeton de Pete Carril para liberar al escolta con un pase picado desde el poste alto.',
            courtType: 'half',
            steps: [
              {
                description: 'Posición inicial: O1 arriba con balón. El pívot O5 sube al poste alto (Y=40) para liberar espacio abajo. El tirador O2 está sobremarcado agresivamente por D2.',
                duration: 2.0,
                players: [
                  { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 78 },
                  { id: 'O2', name: 'O2 👤', type: 'offense', x: 20, y: 55 },
                  { id: 'O3', name: 'O3 👤', type: 'offense', x: 80, y: 65 },
                  { id: 'O4', name: 'O4 👤', type: 'offense', x: 30, y: 30 },
                  { id: 'O5', name: 'O5 👤', type: 'offense', x: 50, y: 45 },
                  { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 70 },
                  { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 23, y: 50 },
                  { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 76, y: 58 },
                  { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 28, y: 26 },
                  { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 48, y: 38 },
                  { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 78 }
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

// API Endpoint for Play generation
app.post('/api/generate-play', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Falta proveer el texto descriptivo o idea de la jugada' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({ error: 'La API Key de Gemini no se encuentra configurada en settings.' });
    }

    const systemInstruction = `
      Eres un entrenador asistente de baloncesto de élite y experto de la FIBA y la NBA.
      Tu tarea es interpretar los requerimientos de una jugada táctica de baloncesto y transformarla en una secuencia animada de pasos perfectamente válidos, representados por un objeto JSON estructurado que sirva de pizarra animada.

      REGLAS DE VOCABULARIO Y ABREVIACIONES (IMPORTANTÍSIMO):
      - En las descripciones de los pasos y resúmenes de jugadas, NUNCA utilices "O1", "O5" , "D1" ni "D5" directamente. 
      - En su lugar, utiliza siempre el número de jugador claro y su rol de baloncesto en español:
        * O1 -> "Base (1)"
        * O2 -> "Escolta (2)"
        * O3 -> "Alero (3)"
        * O4 -> "Ala-Pívot (4)"
        * O5 -> "Pívot (5)"
        * D1 -> "Defensa (X1)" o "Defensa del Base (X1)"
        * D2 -> "Defensa (X2)" o "Defensa del Escolta (X2)"
        * D3 -> "Defensa (X3)" o "Defensa del Alero (X3)"
        * D4 -> "Defensa (X4)" o "Defensa del Ala-Pívot (X4)"
        * D5 -> "Defensa (X5)" o "Defensa del Pívot (X5)"
      - Ejemplo correcto: "El Base (1) pasa el balón al Alero (3) en la banda mientras el Pívot (5) sube a realizar un bloqueo indirecto para liberar al Escolta (2)."

      REGLAS DE COORDENADAS:
      - Todas las coordenadas son en porcentaje (0 a 100).
      - Si courtType es 'half' (Media Cancha):
        El aro (canasta) está en la coordenada exacta de { x: 50, y: 15 }, el tablero está horizontal detrás en Y ~11. El arco de tres puntos es de centro (50, 15) con radio cercano a 35. El medio campo está abajo en Y=90-100.
        Los atacantes O1-O5 juegan por encima del triple (Y de 55 a 85).
        Los defensores D1-D5 se colocan defendiendo, tapando a su atacante respectivo entre el atacante y el aro.
        La pelota ('Ball') se coloca junto a las manos del jugador poseedor en cada paso. ¡Es crucial que las coordenadas del balón coincidan casi exactamente con el jugador que tiene la posesión!
      - Si courtType es 'full' (Cancha Completa):
        La canasta izquierda está en { x: 6, y: 50 } y la derecha está en { x: 94, y: 50 }.
        Los defensores y atacantes se distribuyen a lo largo de toda la longitud (X: 0 a 100) y altura (Y: 0 a 100).

      REGLAS DE PASOS (ANIMACIÓN COHERENTE):
      - CADA PASO DEBE COORDINAR Y ANIMAR CON EL ANTERIOR. No des saltos teletransportados de jugadores. Si O1 está en (50,80) en el paso 1, y bota en el paso 2, su coordenada debe cambiar congruentemente, digamos a (40, 72), y el balón también.
      - Debes retornar exactamente 11 elementos siempre en cada paso: 'O1', 'O2', 'O3', 'O4', 'O5', 'D1', 'D2', 'D3', 'D4', 'D5', y 'Ball'.
      - El balón ('Ball') debe estar ubicado en algún jugador o en el trayecto de un pase.
      - Los trazos ('drawings') grafican de forma estética los vectores de pases ('pass'), fintas/cortes ('cut'), pantallas ('screen'), o botes de balón ('dribble'). Los puntos de los dibujos deben ligar coherentemente las posiciones iniciales y finales.

      Por favor atiende con rigurosidad las tácticas solicitadas, por ejemplo sistemas 2-3, pick and rolls, cuernos (horns), cortes de fondo, aclarados (isolation), o transiciones rápidas.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Interpreta y genera el siguiente sistema táctico de baloncesto: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: playSchema,
        temperature: 0.3
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('La respuesta del modelo de IA está vacía');
    }

    const playData = JSON.parse(textOutput.trim());
    return res.json({ play: playData });
  } catch (error: any) {
    console.error('Error generando jugada táctica:', error);
    return res.status(500).json({ error: error.message || 'Error del servidor procesando la jugada' });
  }
});

// API Endpoint for generating individual step descriptions based on player coordinate movements
app.post('/api/generate-step-description', async (req, res) => {
  try {
    const { currentPlayers, prevPlayers, courtType, stepIndex } = req.body;
    if (!currentPlayers) {
      return res.status(400).json({ error: 'Falta proveer el listado actual de jugadores.' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({ error: 'La API Key de Gemini no se encuentra configurada en settings.' });
    }

    const systemInstruction = `
      Eres un entrenador asistente de baloncesto de élite especialista de la FIBA y de la NBA.
      Analiza la transición de los jugadores desde su estado previo hasta su estado actual en un paso concreto de una jugada en la pizarra táctica.
      Por favor, genera una descripción técnica, concisa y sumamente táctica en español (máximo 2 frases) de lo que sucede en este paso de la jugada.

      REGLAS DE NOMBRES Y TERMINOLOGÍA (CRÍTICO):
      - NUNCA uses códigos como "O1", "O2", "O5", "D1", "D3" en absoluto en el texto final. 
      - Traduce siempre los IDs a nombres reales en español:
        * O1 -> "Base (1)"
        * O2 -> "Escolta (2)"
        * O3 -> "Alero (3)"
        * O4 -> "Ala-Pívot (4)"
        * O5 -> "Pívot (5)"
        * D1 -> "Defensivo (X1)"
        * D2 -> "Defensivo (X2)"
        * D3 -> "Defensivo (X3)"
        * D4 -> "Defensivo (X4)"
        * D5 -> "Defensivo (X5)"
        * Ball -> "el balón"
      - Describe los desplazamientos notables: si un jugador cambió significativamente de posición respecto al paso previo, descríbelo técnicamente (por ejemplo, "cortar hacia el aro", "abrirse a la esquina", "subir al poste alto", "hacer una pantalla/bloqueo", "driblar hacia la bombilla", "moverse hacia el tiro libre").
      - Si el balón cambió de dueño, descríbelo como un pase (ej. "el Base (1) asiste al Alero (3)" o "pasa al Alero (3)").
      - Si el balón fue hacia la canasta (posición X=50, Y=15 en media cancha), descríbelo como un lanzamiento a canasta (ej. "el Escolta (2) lanza a canasta" o "tira un triple").
      - El tono debe ser directo, técnico y limpio, tal como lo explicaría un entrenador a sus jugadores en el banquillo.
      - No añadas introducciones como "En este paso...", ve directo al grano táctico. Ejemplo correcto: "El Base (1) penetra por la derecha mientras el Pívot (5) le pone un bloqueo directo a su defensor y el Alero (3) se abre a la esquina para recibir el pase."
    `;

    const prompt = `
      Cancha: ${courtType === 'half' ? 'Media Cancha (con aro en X=50, Y=15)' : 'Cancha Completa'}. Paso de animación #${stepIndex + 1}.
      Tácticas e información de posiciones:
      
      Lista de Jugadores en el paso anterior (Posición de inicio del paso):
      ${JSON.stringify(prevPlayers || [])}
      
      Lista de Jugadores en el paso actual (Posición de término del paso):
      ${JSON.stringify(currentPlayers)}
      
      Por favor, describe técnicamente los cambios y movimientos clave de este paso de manera sumamente natural, sin rodeos de robot.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });

    const textOutput = response.text;
    res.json({ description: textOutput ? textOutput.trim() : '' });
  } catch (error: any) {
    console.error('Error generando descripción del paso:', error);
    res.status(500).json({ error: error.message || 'Error del servidor al generar descripción' });
  }
});

// Configure Vite or Static Files
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pizarra Táctica de Baloncesto activa en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fallo al iniciar el servidor Express + Vite:', err);
});
