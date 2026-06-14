import { Play, PlayStep, PlayerState } from './types';

// Default standard player positions for half court
export const defaultHalfCourtPlayers: PlayerState[] = [
  // Offense (O1-O5)
  { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 78 },
  { id: 'O2', name: 'O2 👤', type: 'offense', x: 18, y: 65 },
  { id: 'O3', name: 'O3 👤', type: 'offense', x: 82, y: 65 },
  { id: 'O4', name: 'O4 👤', type: 'offense', x: 25, y: 35 },
  { id: 'O5', name: 'O5 👤', type: 'offense', x: 75, y: 35 },
  // Defense (D1-D5)
  { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 70 },
  { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 23, y: 58 },
  { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 77, y: 58 },
  { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 28, y: 28 },
  { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 72, y: 28 },
  // Ball
  { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 78 }
];

export const defaultFullCourtPlayers: PlayerState[] = [
  // Offense
  { id: 'O1', name: 'O1 👤', type: 'offense', x: 20, y: 50 },
  { id: 'O2', name: 'O2 👤', type: 'offense', x: 45, y: 20 },
  { id: 'O3', name: 'O3 👤', type: 'offense', x: 45, y: 80 },
  { id: 'O4', name: 'O4 👤', type: 'offense', x: 12, y: 35 },
  { id: 'O5', name: 'O5 👤', type: 'offense', x: 12, y: 65 },
  // Defense
  { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 30, y: 50 },
  { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 52, y: 25 },
  { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 51, y: 75 },
  { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 20, y: 35 },
  { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 20, y: 65 },
  // Ball
  { id: 'Ball', name: '🏀', type: 'ball', x: 12, y: 35 } // Start with ball at left baseline/O4
];

export const presetPlays: Play[] = [
  {
    id: 'pnr-classic',
    name: '🔴 Pick & Roll Clásico',
    description: 'El base utiliza un bloqueo alto del pivot (O5), atrae al defensor defensor y asiste para roll o penetración.',
    courtType: 'half',
    steps: [
      {
        description: 'Paso 1: Posicionamiento inicial. O1 tiene el balón arriba. O5 (Pivot) sube a realizar un bloqueo (Screen) a la izquierda de D1.',
        duration: 2.0,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 78 },
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 18, y: 65 },
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 82, y: 65 },
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 25, y: 35 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 55, y: 70 }, // Moving near O1's guard
          // Defense
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 73 },
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 23, y: 58 },
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 77, y: 58 },
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 28, y: 28 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 58, y: 64 }, // Defense responds to center
          // Ball
          { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 78 }
        ]
      },
      {
        description: 'Paso 2: Bloqueo y salida. O5 bloquea firmemente. O1 dribla hacia la derecha pasando por encima del bloqueo. D5 hace un "hedge" (ayuda corta). O5 comienza a rodar (roll) libre hacia el aro.',
        duration: 2.5,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 38, y: 68 }, // Dribbling to the left
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 15, y: 60 },
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 85, y: 60 },
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 25, y: 35 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 48, y: 50 }, // Rolling towards basket
          // Defense
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 44, y: 70 }, // Blocked!
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 20, y: 55 },
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 75, y: 55 },
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 28, y: 28 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 38, y: 58 }, // Helping on O1
          // Ball
          { id: 'Ball', name: '🏀', type: 'ball', x: 38, y: 68 }
        ]
      },
      {
        description: 'Paso 3: Asistencia y tiro. O1 da un pase picado perfecto por medio de la defensa. O5 recibe de espaldas y ataca directamente la canasta para un mate o bandeja limpia.',
        duration: 1.8,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 38, y: 68 },
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 15, y: 60 },
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 85, y: 60 },
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 25, y: 35 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 50, y: 16 }, // Inside paint!
          // Defense
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 41, y: 65 },
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 20, y: 52 },
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 72, y: 45 }, // Help collapsing
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 34, y: 22 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 45, y: 30 }, // Left behind
          // Ball
          { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 16 } // Pass lands on hoop!
        ]
      }
    ],
    drawings: [
      {
        id: 'd1',
        type: 'screen',
        color: '#f43f5e',
        points: [{ x: 55, y: 70 }, { x: 50, y: 73 }]
      },
      {
        id: 'd2',
        type: 'dribble',
        color: '#f59e0b',
        points: [{ x: 50, y: 78 }, { x: 45, y: 75 }, { x: 38, y: 68 }]
      },
      {
        id: 'd3',
        type: 'cut',
        color: '#10b981',
        points: [{ x: 55, y: 70 }, { x: 48, y: 50 }, { x: 50, y: 16 }]
      },
      {
        id: 'd4',
        type: 'pass',
        color: '#3b82f6',
        points: [{ x: 38, y: 68 }, { x: 45, y: 40 }, { x: 50, y: 16 }]
      }
    ]
  },
  {
    id: 'backdoor-cut',
    name: '⚡ Puerta Atrás (Backdoor Cut)',
    description: 'El escolta (O2) amaga con recibir arriba, hace una finta rápida, y corta hacia el aro libre por detrás para recibir un pase medido de O1.',
    courtType: 'half',
    steps: [
      {
        description: 'Paso 1: O1 sube el balón para organizar el ataque. O2 amaga hacia arriba arrastrando a su defensor defensor D2, simulando que va a recibir un bloqueo indirecto de O4.',
        duration: 2.0,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 80 },
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 20, y: 50 }, // Elevated wing position
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 75, y: 65 },
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 22, y: 30 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 78, y: 30 },
          // Defense
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 50, y: 74 },
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 24, y: 45 }, // Aggressive overplay!
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 72, y: 58 },
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 25, y: 25 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 74, y: 25 },
          // Ball
          { id: 'Ball', name: '🏀', type: 'ball', x: 50, y: 80 }
        ]
      },
      {
        description: 'Paso 2: Finta de fusta. O2 corta explosivamente hacia la canasta en línea de fondo. O1 detecta que D2 se anticipó en exceso y lanza un pase telegrafiado hacia el callejón.',
        duration: 2.2,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 50, y: 80 },
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 30, y: 18 }, // Deep cutting
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 75, y: 65 },
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 15, y: 30 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 78, y: 30 },
          // Defense
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 48, y: 76 },
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 26, y: 28 }, // Beaten on backdoor
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 72, y: 58 },
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 18, y: 28 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 74, y: 25 },
          // Ball
          { id: 'Ball', name: '🏀', type: 'ball', x: 30, y: 18 } // Ball reaches O2 under hoop
        ]
      }
    ],
    drawings: [
      {
        id: 'bd1',
        type: 'cut',
        color: '#10b981',
        points: [{ x: 20, y: 50 }, { x: 24, y: 45 }, { x: 30, y: 18 }]
      },
      {
        id: 'bd2',
        type: 'pass',
        color: '#3b82f6',
        points: [{ x: 50, y: 80 }, { x: 40, y: 49 }, { x: 30, y: 18 }]
      }
    ]
  },
  {
    id: 'fastbreak-outlet',
    name: '🏃 Contraataque de Transición',
    description: 'Robo de balón en la media cancha. O5 defiende fuertemente y pasa a O1 que corre por el carril lateral para asistir a O3 que vuela al aro.',
    courtType: 'full',
    steps: [
      {
        description: 'Paso 1: Recuperación de balón en el campo defensivo. O5 atrapa el rebote defensivo y levanta la cabeza buscando el pase de outlet. O1 se abre rápidamente a la banda.',
        duration: 2.0,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 20, y: 20 }, // Wing outlet
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 35, y: 50 },
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 45, y: 80 }, // Sprints right lane
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 15, y: 40 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 10, y: 50 }, // Secure rebound
          // Defense transitioning
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 25, y: 25 },
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 38, y: 48 },
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 48, y: 75 },
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 18, y: 48 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 14, y: 52 },
          // Ball is with Center
          { id: 'Ball', name: '🏀', type: 'ball', x: 10, y: 50 }
        ]
      },
      {
        description: 'Paso 2: Pase de salida rápido. O5 asiste largo a O1. O1 recibe el balón girando en carrera para cruzar la línea central. O3 gana carril contrario descolgando la defensa.',
        duration: 2.5,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 48, y: 20 }, // Ball carrier crosses half
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 55, y: 50 },
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 75, y: 80 }, // Sprints deep right
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 35, y: 40 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 25, y: 50 },
          // Defense scrambling
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 45, y: 28 },
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 52, y: 52 },
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 72, y: 78 },
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 40, y: 48 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 35, y: 52 },
          // Ball is passed to O1
          { id: 'Ball', name: '🏀', type: 'ball', x: 48, y: 20 }
        ]
      },
      {
        description: 'Paso 3: Pase de gol. Desde el medio del campo, O1 dibuja un pase cruzado largo hacia O3 solo en transición, quien anota una bandeja en carrera.',
        duration: 2.0,
        players: [
          { id: 'O1', name: 'O1 👤', type: 'offense', x: 55, y: 25 },
          { id: 'O2', name: 'O2 👤', type: 'offense', x: 68, y: 50 },
          { id: 'O3', name: 'O3 👤', type: 'offense', x: 92, y: 54 }, // Layup position (Right basket is at 94, 50)
          { id: 'O4', name: 'O4 👤', type: 'offense', x: 50, y: 40 },
          { id: 'O5', name: 'O5 👤', type: 'offense', x: 40, y: 50 },
          // Defense completely beaten
          { id: 'D1', name: 'D1 🛡️', type: 'defense', x: 58, y: 32 },
          { id: 'D2', name: 'D2 🛡️', type: 'defense', x: 65, y: 52 },
          { id: 'D3', name: 'D3 🛡️', type: 'defense', x: 88, y: 64 }, // Chasing
          { id: 'D4', name: 'D4 🛡️', type: 'defense', x: 52, y: 48 },
          { id: 'D5', name: 'D5 🛡️', type: 'defense', x: 45, y: 52 },
          // Ball reaches O3
          { id: 'Ball', name: '🏀', type: 'ball', x: 92, y: 54 }
        ]
      }
    ],
    drawings: [
      {
        id: 'fb1',
        type: 'pass',
        color: '#3b82f6',
        points: [{ x: 10, y: 50 }, { x: 29, y: 35 }, { x: 48, y: 20 }]
      },
      {
        id: 'fb2',
        type: 'cut',
        color: '#10b981',
        points: [{ x: 45, y: 80 }, { x: 75, y: 80 }, { x: 92, y: 54 }]
      },
      {
        id: 'fb3',
        type: 'pass',
        color: '#3b82f6',
        points: [{ x: 48, y: 20 }, { x: 70, y: 37 }, { x: 92, y: 54 }]
      }
    ]
  }
];
