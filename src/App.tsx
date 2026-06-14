import React, { useState, useEffect, useRef } from 'react';
import CourtBoard from './components/CourtBoard';
import PlayStepsTimeline from './components/PlayStepsTimeline';
import PlayLibrary from './components/PlayLibrary';
import { Play, PlayStep, PlayerState, DrawingPath, PlayerRole } from './types';
import { defaultHalfCourtPlayers, defaultFullCourtPlayers } from './utils';

export default function App() {
  // Sync custom plays in local storage
  const [plays, setPlays] = useState<Play[]>(() => {
    try {
      const saved = localStorage.getItem('basket_tactical_plays');
      const parsedSaved = saved ? JSON.parse(saved) : [];
      
      const defaultBlankPlay: Play = {
        id: 'custom-initial-play',
        name: '📋 Mi nueva jugada',
        description: 'Crea tu estrategia arrastrando los jugadores y definiendo los pasos tácticos.',
        courtType: 'half',
        steps: [
          {
            description: 'Paso 1: Posición de salida',
            duration: 2.0,
            players: JSON.parse(JSON.stringify(defaultHalfCourtPlayers)),
          },
        ],
        drawings: [],
      };

      if (parsedSaved.length > 0) {
        return parsedSaved;
      } else {
        return [defaultBlankPlay];
      }
    } catch (e) {
      console.error('Error cargando jugadas locales:', e);
      return [
        {
          id: 'custom-initial-play',
          name: '📋 Mi nueva jugada',
          description: 'Crea tu estrategia arrastrando los jugadores y definiendo los pasos tácticos.',
          courtType: 'half',
          steps: [
            {
              description: 'Paso 1: Posición de salida',
              duration: 2.0,
              players: JSON.parse(JSON.stringify(defaultHalfCourtPlayers)),
            },
          ],
          drawings: [],
        }
      ];
    }
  });

  const [activePlayId, setActivePlayId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('basket_tactical_plays');
      const parsedSaved = saved ? JSON.parse(saved) : [];
      if (parsedSaved.length > 0) {
        return parsedSaved[0].id;
      }
    } catch (e) {
      console.error(e);
    }
    return 'custom-initial-play';
  });
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [fractionalIndex, setFractionalIndex] = useState<number>(0.0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const [autoCreateStepOnMove, setAutoCreateStepOnMove] = useState<boolean>(true);

  const [shareNotification, setShareNotification] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: () => {},
    isDanger: false,
  });

  const triggerConfirm = (params: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: params.title,
      message: params.message,
      confirmText: params.confirmText || 'Confirmar',
      cancelText: params.cancelText || 'Cancelar',
      onConfirm: () => {
        params.onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      isDanger: params.isDanger || false,
    });
  };

  const [isViewerMode, setIsViewerMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'viewer' || params.has('sharedPlays');
  });

  const [playerAnchors, setPlayerAnchors] = useState<Record<string, string>>({
    O1: '',
    O2: '',
    O3: '',
    O4: '',
    O5: '',
    D1: '',
    D2: '',
    D3: '',
    D4: '',
    D5: '',
  });

  const [deletedDefenders, setDeletedDefenders] = useState<string[]>(['D1', 'D2', 'D3', 'D4', 'D5']);
  const [isInitialSetupMode, setIsInitialSetupMode] = useState<boolean>(true);

  // Sync state: start in setup mode if we are on step 0
  useEffect(() => {
    if (currentStepIndex === 0) {
      setIsInitialSetupMode(true);
    } else {
      setIsInitialSetupMode(false);
    }
  }, [currentStepIndex, activePlayId]);

  const [playerNames, setPlayerNames] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('basket_player_names');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      O1: '👤 Base O1 (1)',
      O2: '👤 Escolta O2 (2)',
      O3: '👤 Alero O3 (3)',
      O4: '👤 Ala-Pívot O4 (4)',
      O5: '👤 Pívot O5 (5)',
      D1: '🛡️ Defensor D1 (1)',
      D2: '🛡️ Defensor D2 (2)',
      D3: '🛡️ Defensor D3 (3)',
      D4: '🛡️ Defensor D4 (4)',
      D5: '🛡️ Defensor D5 (5)',
    };
  });

  useEffect(() => {
    localStorage.setItem('basket_player_names', JSON.stringify(playerNames));
  }, [playerNames]);

  const fractionalIndexRef = useRef<number>(0.0);
  const isPausedForDeleteRef = useRef<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [isDescriptionCustom, setIsDescriptionCustom] = useState<Record<string, boolean>>({});
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
  const [isVoicePaused, setIsVoicePaused] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlayingVoice(true);
        setIsVoicePaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsVoicePaused(true);
      }
    } else {
      window.speechSynthesis.cancel();
      
      // Clean up symbols/emojis and "Paso X", "Paso X: ..."
      const cleanText = text
        .replace(/^[•\s\-\*]*(paso|PASO|Fase|fase)\s*\d+[^\:\n]*:?/gi, '') // Matches "• Paso 1 (Posición de salida):" or "Paso 2:"
        .replace(/[•\s\-\*]*(paso|PASO|Fase|fase)\s*\d+[^:\n]*/gi, '') // Matches "Paso 1" anywhere
        .replace(/👥|👤|🛡️|🏀|🏃|🎯|➡️|│|└|─|>/g, ' ')
        .replace(/\(Posición de salida\)/g, ' ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      utterance.pitch = 1.0;
      utterance.rate = 1.05;

      utterance.onstart = () => {
        setIsPlayingVoice(true);
        setIsVoicePaused(false);
      };

      utterance.onpause = () => {
        setIsVoicePaused(true);
      };

      utterance.onresume = () => {
        setIsPlayingVoice(true);
        setIsVoicePaused(false);
      };

      utterance.onend = () => {
        setIsPlayingVoice(false);
        setIsVoicePaused(false);
      };

      utterance.onerror = () => {
        setIsPlayingVoice(false);
        setIsVoicePaused(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger speech synthesis narrative on phase changes during playback
  useEffect(() => {
    if (isAnimating && voiceEnabled && activePlay) {
      // Find current step's action description
      const step = activePlay.steps[currentStepIndex];
      const stepLabel = `Fase ${currentStepIndex + 1}. `;
      const stepDesc = step?.description || `Movimiento del paso ${currentStepIndex + 1}`;
      speakText(stepLabel + stepDesc);
    }
  }, [currentStepIndex, isAnimating, voiceEnabled]);

  // Keep ref synchronized with state to allow clean non-interfering updates in loops
  useEffect(() => {
    fractionalIndexRef.current = fractionalIndex;
  }, [fractionalIndex]);

  // Sync custom plays to localStorage
  useEffect(() => {
    localStorage.setItem('basket_tactical_plays', JSON.stringify(plays));
  }, [plays]);

  // Check for shared plays or single shared play in URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPlaysData = params.get('sharedPlays');
    if (sharedPlaysData) {
      try {
        const decodedBin = atob(decodeURIComponent(sharedPlaysData));
        const bytes = Uint8Array.from(decodedBin, (char) => char.charCodeAt(0));
        const jsonStr = new TextDecoder().decode(bytes);
        const importedPlays = JSON.parse(jsonStr) as Play[];

        if (Array.isArray(importedPlays) && importedPlays.length > 0) {
          setPlays(importedPlays);
          setActivePlayId(importedPlays[0].id);
          setIsViewerMode(true);
          setShareNotification('¡Se han cargado las jugadas compartidas en modo visor! 🏀');
          setTimeout(() => setShareNotification(null), 5000);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error('Error cargando cuaderno compartido:', err);
        setShareNotification('⚠️ No se pudieron decodificar las jugadas compartidas.');
        setTimeout(() => setShareNotification(null), 5000);
      }
      return;
    }

    const sharedData = params.get('play');
    if (sharedData) {
      try {
        const decodedBin = atob(decodeURIComponent(sharedData));
        const bytes = Uint8Array.from(decodedBin, (char) => char.charCodeAt(0));
        const jsonStr = new TextDecoder().decode(bytes);
        const importedPlay = JSON.parse(jsonStr) as Play;

        if (importedPlay && importedPlay.name) {
          const finalId = `shared-${Date.now()}`;
          const newPlay: Play = {
            ...importedPlay,
            id: finalId,
            name: importedPlay.name.startsWith('🔗') ? importedPlay.name : `🔗 Enlace: ${importedPlay.name}`,
          };

          setPlays((prev) => {
            // Prevent duplicate mounts in dev
            if (prev.some((p) => p.name === newPlay.name && p.steps.length === newPlay.steps.length)) {
              return prev;
            }
            return [newPlay, ...prev];
          });
          setActivePlayId(finalId);
          setShareNotification('¡Se ha cargado la jugada compartida con éxito! 🏀');
          setTimeout(() => setShareNotification(null), 5000);

          // Clean URL parameters smoothly to keep a clean browser space
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error('Error cargando jugada compartida:', err);
        setShareNotification('⚠️ No se pudo decodificar el enlace de la jugada.');
        setTimeout(() => setShareNotification(null), 5000);
      }
    }
  }, []);

  // Update overall active play metadata (direct real-time saves)
  const handleUpdatePlayMetadata = (field: 'name' | 'description', value: string) => {
    if (activePlay.isSaved) return;
    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleClearDescription = () => {
    if (activePlay.isSaved) return;
    setIsDescriptionCustom((prev) => ({ ...prev, [activePlayId]: true }));
    handleUpdatePlayMetadata('description', '');
  };

  const handleRegenerateTranscription = () => {
    if (activePlay.isSaved) return;
    setIsDescriptionCustom((prev) => ({ ...prev, [activePlayId]: false }));
    const autoText = generateTacticalTranscription(activePlay, playerNames);
    handleUpdatePlayMetadata('description', autoText || '');
  };

  // Generate safe shareable Base64 hyperlink and copy directly to keyboard clipboard
  const handleSharePlay = () => {
    try {
      const jsonStr = JSON.stringify(activePlay);
      const bytes = new TextEncoder().encode(jsonStr);
      const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
      const base64Str = btoa(binString);
      const shareUrl = `${window.location.origin}${window.location.pathname}?play=${encodeURIComponent(base64Str)}&mode=viewer`;

      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareNotification('¡Enlace táctico copiado al portapapeles! 🔗 Compártelo con tu equipo.');
        setTimeout(() => setShareNotification(null), 5000);
      }).catch((e) => {
        throw e;
      });
    } catch (err) {
      console.error('Error compartiendo jugada:', err);
      setShareNotification('⚠️ Error al copiar el enlace táctico.');
      setTimeout(() => setShareNotification(null), 4000);
    }
  };

  const handleShareAllPlays = () => {
    try {
      const jsonStr = JSON.stringify(plays);
      const bytes = new TextEncoder().encode(jsonStr);
      const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
      const base64Str = btoa(binString);
      const shareUrl = `${window.location.origin}${window.location.pathname}?sharedPlays=${encodeURIComponent(base64Str)}&mode=viewer`;

      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareNotification('¡Enlace de TODO tu cuaderno táctico en modo visor copiado! 🔗 Envíalo para presentarlo.');
        setTimeout(() => setShareNotification(null), 5000);
      }).catch((e) => {
        throw e;
      });
    } catch (err) {
      console.error('Error compartiendo jugadas:', err);
      setShareNotification('⚠️ Error al generar enlace de visor.');
      setTimeout(() => setShareNotification(null), 4000);
    }
  };

  const handleShareAllPlaysWhatsApp = () => {
    try {
      const jsonStr = JSON.stringify(plays);
      const bytes = new TextEncoder().encode(jsonStr);
      const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
      const base64Str = btoa(binString);
      const shareUrl = `${window.location.origin}${window.location.pathname}?sharedPlays=${encodeURIComponent(base64Str)}&mode=viewer`;

      // Copy to clipboard as helper fallback
      navigator.clipboard.writeText(shareUrl).catch(() => {});

      const text = `🏀 Aquí tienes toda nuestra biblioteca de sistemas tácticos (modo visualización):\n\n${shareUrl}`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

      const a = document.createElement('a');
      a.href = whatsappUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();

      setShareNotification('¡Enlace copiado! Abriendo WhatsApp con toda la biblioteca táctica... 💬');
      setTimeout(() => setShareNotification(null), 5000);
    } catch (err) {
      console.error('Error compartiendo por WhatsApp:', err);
      setShareNotification('⚠️ Error al generar enlace de WhatsApp.');
      setTimeout(() => setShareNotification(null), 4000);
    }
  };

  const handleRestartPlay = () => {
    triggerConfirm({
      title: '🔄 ¿Reiniciar Jugada?',
      message: 'Se eliminarán todos los pasos grabados y se restablecerán los jugadores a su posición de inicio en la cancha.',
      confirmText: 'Sí, reiniciar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        setPlays((prev) =>
          prev.map((p) => {
            if (p.id === activePlayId) {
              const isHalf = p.courtType === 'half';
              
              // Reset players lists dynamically to prevent reference mutations
              const offenseAndBallPlayers = isHalf 
                ? JSON.parse(JSON.stringify(defaultHalfCourtPlayers.filter(p => p.type !== 'defense')))
                : JSON.parse(JSON.stringify(defaultFullCourtPlayers.filter(p => p.type !== 'defense')));

              const cleanStep: PlayStep = {
                description: 'Posición de salida',
                duration: 1.5,
                players: offenseAndBallPlayers,
              };

              return {
                ...p,
                description: '',
                steps: [cleanStep],
                drawings: [], // Clear all drawings
              };
            }
            return p;
          })
        );
        
        // Defenders are hidden from start
        setDeletedDefenders(['D1', 'D2', 'D3', 'D4', 'D5']);

        setCurrentStepIndex(0);
        setFractionalIndex(0.0);
        setIsInitialSetupMode(true);
      }
    });
  };

  const handleClearAnimationSteps = () => {
    if (activePlay.isSaved) return;
    triggerConfirm({
      title: '🧹 ¿Borrar todos los fotogramas?',
      message: 'Esta acción eliminará todos los pasos tácticos creados, manteniendo únicamente la posición inicial de salida para esta jugada. No podrás deshacer este cambio.',
      confirmText: 'Sí, borrar todo',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        setPlays((prev) =>
          prev.map((p) => {
            if (p.id === activePlayId) {
              return {
                ...p,
                description: '', // Clear old step transcript descriptions
                steps: [JSON.parse(JSON.stringify(p.steps[0]))], // Only retain core starting frame (fase 1) safely
                drawings: [], // Clear motions/trails
              };
            }
            return p;
          })
        );
        setCurrentStepIndex(0);
        setFractionalIndex(0.0);
        setIsInitialSetupMode(true);
      }
    });
  };

  // Current active play object
  const activePlay = plays.find((p) => p.id === activePlayId) || plays[0];

  // Stop animation and reset to start
  const handleStop = () => {
    setIsAnimating(false);
    setFractionalIndex(0.0);
    setCurrentStepIndex(0);
  };

  // Toggle animation playback state
  const handlePlayToggle = () => {
    if (isAnimating) {
      setIsAnimating(false);
    } else {
      // Always start reproduction from the very beginning (Fase 1 / Step 0)
      // to avoid skipping the initial movement drawn by the user.
      setFractionalIndex(0.0);
      setCurrentStepIndex(0);
      setIsAnimating(true);
    }
  };

  // Animation frame rendering tick using linear interpolation (LERP)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!isAnimating) return;

      const elapsed = (now - lastTime) / 1000; // in seconds
      lastTime = now;

      // Make a brief pause if a vector / vertex was deleted
      if (isPausedForDeleteRef.current) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const playInstance = plays.find((p) => p.id === activePlayId);
      if (!playInstance) {
        setIsAnimating(false);
        return;
      }

      const currentVal = fractionalIndexRef.current;
      const baseIdx = Math.floor(currentVal);
      const totalSteps = playInstance.steps.length;

      if (totalSteps <= 1 || baseIdx >= totalSteps - 1) {
        setIsAnimating(false);
        setCurrentStepIndex(totalSteps - 1);
        setFractionalIndex(totalSteps - 1);
        return;
      }

      const stepDuration = playInstance.steps[baseIdx]?.duration || 2.0;
      const progressIncrement = (elapsed * playbackSpeed) / stepDuration;
      const nextFraction = currentVal + progressIncrement;

      if (nextFraction >= totalSteps - 1) {
        setIsAnimating(false);
        setCurrentStepIndex(totalSteps - 1);
        setFractionalIndex(totalSteps - 1);
        return;
      }

      setFractionalIndex(nextFraction);
      setCurrentStepIndex(Math.floor(nextFraction));

      animationFrameId = requestAnimationFrame(tick);
    };

    if (isAnimating) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAnimating, activePlayId, plays, playbackSpeed]);

  // Setup current play base structures
  const handleSelectPlay = (id: string) => {
    setIsAnimating(false);
    setActivePlayId(id);
    setFractionalIndex(0.0);
    setCurrentStepIndex(0);
  };

  // Create new play templates (Half Court or Full Court reset)
  const handleNewPlay = (type: 'half' | 'full') => {
    setIsAnimating(false);
    const newId = `custom-play-${Date.now()}`;
    const defaultPlayers = type === 'half' ? defaultHalfCourtPlayers : defaultFullCourtPlayers;

    const newPlay: Play = {
      id: newId,
      name: `🆕 Jugada Nueva (${type === 'half' ? 'Media' : 'Entera'})`,
      description: 'Crea tu estrategia arrastrando los jugadores y agregando pasos tácticos.',
      courtType: type,
      steps: [
        {
          description: 'Paso 1: Configuración inicial',
          duration: 2.0,
          players: JSON.parse(JSON.stringify(defaultPlayers)), // deep copy
        },
      ],
      drawings: [],
    };

    setPlays((prev) => [...prev, newPlay]);
    setActivePlayId(newId);
    setFractionalIndex(0.0);
    setCurrentStepIndex(0);
  };

  // Add step duplicating current players state configuration
  const handleAddStep = () => {
    if (activePlay.isSaved) return;
    setIsAnimating(false);
    const currentStep = activePlay.steps[currentStepIndex];

    const newStep: PlayStep = {
      description: `Paso ${activePlay.steps.length + 1}`,
      duration: 2.0,
      players: JSON.parse(JSON.stringify(currentStep.players)), // duplicate player placements
    };

    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          return { ...p, steps: [...p.steps, newStep] };
        }
        return p;
      })
    );

    // Focus on newly created step
    setTimeout(() => {
      const nextIdx = activePlay.steps.length;
      setCurrentStepIndex(nextIdx);
      setFractionalIndex(nextIdx);
    }, 100);
  };

  // Duplicate specified step index
  const handleDuplicateStep = (index: number) => {
    if (activePlay.isSaved) return;
    setIsAnimating(false);
    const stepToCopy = activePlay.steps[index];

    const duplicated: PlayStep = {
      description: `${stepToCopy.description} (Copia)`,
      duration: stepToCopy.duration,
      players: JSON.parse(JSON.stringify(stepToCopy.players)),
    };

    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          const updatedSteps = [...p.steps];
          updatedSteps.splice(index + 1, 0, duplicated);
          return { ...p, steps: updatedSteps };
        }
        return p;
      })
    );
  };

  // Delete specified step index
  const handleDeleteStep = (index: number) => {
    if (activePlay.isSaved) return;
    setIsAnimating(false);
    if (activePlay.steps.length <= 1) return;

    triggerConfirm({
      title: `❌ ¿Eliminar fotograma P${index + 1}?`,
      message: `¿Estás seguro de que deseas eliminar permanentemente el paso P${index + 1} de esta jugada? Los movimientos de los jugadores se reajustarán a los pasos restantes.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Conservar paso',
      isDanger: true,
      onConfirm: () => {
        let actualStepsLength = activePlay.steps.length;
        setPlays((prev) =>
          prev.map((p) => {
            if (p.id === activePlayId) {
              const updatedSteps = p.steps.filter((_, idx) => idx !== index);
              return { ...p, steps: updatedSteps };
            }
            return p;
          })
        );

        // Calculate new currentStepIndex safely
        let nextIdx = currentStepIndex;
        if (index === currentStepIndex) {
          // Deleting the currently active step
          if (index === actualStepsLength - 1) {
            nextIdx = index - 1;
          } else {
            nextIdx = index;
          }
        } else if (index < currentStepIndex) {
          // Deleting a step before the active one
          nextIdx = currentStepIndex - 1;
        } else {
          // Deleting a step after the active one
          nextIdx = currentStepIndex;
        }

        const safeIdx = Math.min(Math.max(0, nextIdx), actualStepsLength - 2);
        setCurrentStepIndex(safeIdx);
        setFractionalIndex(safeIdx);
      }
    });
  };

  // Update notes
  const handleUpdateStepDescription = (index: number, desc: string) => {
    if (activePlay.isSaved) return;
    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          const updatedSteps = p.steps.map((st, i) => (i === index ? { ...st, description: desc } : st));
          return { ...p, steps: updatedSteps };
        }
        return p;
      })
    );
  };

  // Update speed duration
  const handleUpdateStepDuration = (index: number, duration: number) => {
    if (activePlay.isSaved) return;
    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          const updatedSteps = p.steps.map((st, i) => (i === index ? { ...st, duration } : st));
          return { ...p, steps: updatedSteps };
        }
        return p;
      })
    );
  };

  // Move players state in the editor
  const handleUpdatePlayers = (updatedPlayers: PlayerState[]) => {
    if (activePlay.isSaved) return;
    if (isAnimating) return;

    setPlays((prev) =>
      prev.map((p) => {
        if (p.id !== activePlayId) return p;

        const currentStep = p.steps[currentStepIndex];
        if (!currentStep) return p;

        // If editing Step 0 (starting positions), propagate changes to all subsequent steps as deltas
        if (currentStepIndex === 0) {
          const updatedSteps = [...p.steps];
          let updatedDrawings = [...p.drawings];

          // For each player in the update, compute the coordinate delta and shift them in subsequent steps
          updatedPlayers.forEach((np) => {
            const op = currentStep.players.find((player) => player.id === np.id);
            if (op && (op.x !== np.x || op.y !== np.y)) {
              const dx = parseFloat((np.x - op.x).toFixed(1));
              const realDy = parseFloat((np.y - op.y).toFixed(1));

              // Shift in all subsequent steps
              for (let i = 1; i < updatedSteps.length; i++) {
                updatedSteps[i].players = updatedSteps[i].players.map((stepPlayer) => {
                  if (stepPlayer.id === np.id) {
                    const newX = parseFloat(Math.max(0, Math.min(100, stepPlayer.x + dx)).toFixed(1));
                    const newY = parseFloat(Math.max(0, Math.min(100, stepPlayer.y + realDy)).toFixed(1));
                    return { ...stepPlayer, x: newX, y: newY };
                  }
                  return stepPlayer;
                });
              }

              // Shift points of associated step drawings for this player/ball so custom shapes align perfectly
              updatedDrawings = updatedDrawings.map((draw) => {
                if (draw && draw.points && draw.points.length >= 2) {
                  // If it's an automatic player movement vector (id: step-X-player-Y)
                  if (draw.id.includes(`-player-${np.id}`)) {
                    const parts = draw.id.split('-');
                    const stepIdx = parseInt(parts[1], 10);
                    if (!isNaN(stepIdx)) {
                      const updatedPoints = draw.points.map((pt) => ({
                        x: parseFloat((pt.x + dx).toFixed(1)),
                        y: parseFloat((pt.y + realDy).toFixed(1)),
                      }));
                      return {
                        ...draw,
                        points: updatedPoints,
                      };
                    }
                  }
                }
                return draw;
              });
            }
          });

          // Also handle ball and pass vectors if ball's starting position changed
          const oldBall = currentStep.players.find((player) => player.id === 'Ball');
          const newBall = updatedPlayers.find((player) => player.id === 'Ball');
          if (oldBall && newBall && (oldBall.x !== newBall.x || oldBall.y !== newBall.y)) {
            const bdx = parseFloat((newBall.x - oldBall.x).toFixed(1));
            const bdy = parseFloat((newBall.y - oldBall.y).toFixed(1));

            updatedDrawings = updatedDrawings.map((draw) => {
              if (draw && draw.points && draw.points.length >= 2) {
                if (draw.id.includes('-ball-pass')) {
                  const parts = draw.id.split('-');
                  const stepIdx = parseInt(parts[1], 10);
                  if (!isNaN(stepIdx)) {
                    const updatedPoints = draw.points.map((pt) => ({
                      x: parseFloat((pt.x + bdx).toFixed(1)),
                      y: parseFloat((pt.y + bdy).toFixed(1)),
                    }));
                    return {
                      ...draw,
                      points: updatedPoints,
                    };
                  }
                }
              }
              return draw;
            });
          }

          // Set Step 0 players
          updatedSteps[0] = { ...updatedSteps[0], players: updatedPlayers };

          return { ...p, steps: updatedSteps, drawings: updatedDrawings };
        } else {
          // Editing standard step > 0, just update current step players normally
          const updatedSteps = p.steps.map((step, idx) => {
            if (idx === currentStepIndex) {
              return { ...step, players: updatedPlayers };
            }
            return step;
          });
          return { ...p, steps: updatedSteps };
        }
      })
    );
  };

  // When starting graphing from Step 0, start a brand new play and eliminate previous frames from the panel
  const handleStartGraphing = () => {
    // Generate a fresh new draft play
    const newPlayId = `custom-play-draft-${Date.now()}`;
    const newPlay: Play = {
      id: newPlayId,
      name: '📋 Mi nueva jugada',
      description: 'Crea tu estrategia arrastrando los jugadores y definiendo los pasos tácticos.',
      courtType: activePlay.courtType,
      steps: [
        {
          description: 'Paso 1: Posición de salida',
          duration: 2.0,
          players: JSON.parse(JSON.stringify(activePlay.steps[0].players)), // Carry over starting placements
        },
        {
          description: 'Paso 2: Describe el movimiento...',
          duration: 2.0,
          players: JSON.parse(JSON.stringify(activePlay.steps[0].players)), // Step being graphed
        }
      ],
      drawings: [],
    };

    setPlays((prev) => {
      // Keep any saved library plays, filter out unsaved drafts
      const cleanPrev = prev.filter((p) => p.isSaved);
      return [...cleanPrev, newPlay];
    });

    setActivePlayId(newPlayId);
    setCurrentStepIndex(1);
    setFractionalIndex(1.0);
    setIsInitialSetupMode(false);
  };

  // Clipboard draw operations - Upsert drawing with matching ID or append if new
  const handleAddDrawing = (drawing: DrawingPath) => {
    if (activePlay.isSaved) return;
    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          const filterExisting = p.drawings.filter((d) => d.id !== drawing.id);
          return { ...p, drawings: [...filterExisting, drawing] };
        }
        return p;
      })
    );
  };

  const handleDeleteDrawing = (id: string) => {
    if (activePlay.isSaved) return;
    // If we're playing the animation, cause a brief pause when deleting a drawing
    if (isAnimating) {
      isPausedForDeleteRef.current = true;
      setTimeout(() => {
        isPausedForDeleteRef.current = false;
      }, 1000); // 1.0 seconds pause
    }

    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          let updatedSteps = [...p.steps];
          
          // Check if deleted ID is an automatic player step movement: step-X-player-Y
          if (id.startsWith('step-') && id.includes('-player-')) {
            const parts = id.split('-');
            const stepIdx = parseInt(parts[1], 10);
            const playerId = parts[3];
            if (!isNaN(stepIdx) && stepIdx > 0 && stepIdx < updatedSteps.length) {
              const prevStep = updatedSteps[stepIdx - 1];
              const currStep = updatedSteps[stepIdx];
              if (prevStep && currStep) {
                const currPlayer = currStep.players.find((pl) => pl.id === playerId);
                if (currPlayer) {
                  // Keep player in place, update previous step player position to match current position!
                  updatedSteps[stepIdx - 1] = {
                    ...prevStep,
                    players: prevStep.players.map((pl) =>
                      pl.id === playerId ? { ...pl, x: currPlayer.x, y: currPlayer.y } : pl
                    )
                  };
                }
              }
            }
          } else if (id.startsWith('step-') && id.includes('-ball-pass')) {
            // Keep ball in place, update previous step ball position to match current position!
            const parts = id.split('-');
            const stepIdx = parseInt(parts[1], 10);
            if (!isNaN(stepIdx) && stepIdx > 0 && stepIdx < updatedSteps.length) {
              const prevStep = updatedSteps[stepIdx - 1];
              const currStep = updatedSteps[stepIdx];
              if (prevStep && currStep) {
                const currBall = currStep.players.find((pl) => pl.id === 'Ball');
                if (currBall) {
                  updatedSteps[stepIdx - 1] = {
                    ...prevStep,
                    players: prevStep.players.map((pl) =>
                      pl.id === 'Ball' ? { ...pl, x: currBall.x, y: currBall.y } : pl
                    )
                  };
                }
              }
            }
          }

          return { 
            ...p, 
            steps: updatedSteps, 
            drawings: p.drawings.filter((d) => d.id !== id) 
          };
        }
        return p;
      })
    );
  };

  const handleClearAllDrawings = () => {
    if (activePlay.isSaved) return;
    setPlays((prev) =>
      prev.map((p) => {
        if (p.id === activePlayId) {
          let updatedSteps = [...p.steps];
          if (currentStepIndex > 0) {
            const prevStep = updatedSteps[currentStepIndex - 1];
            const currStep = updatedSteps[currentStepIndex];
            if (prevStep && currStep) {
              // Keep players where they are, and update previous step coordinates to match them!
              updatedSteps[currentStepIndex - 1] = {
                ...prevStep,
                players: prevStep.players.map((prevPl) => {
                  const currP = currStep.players.find((pl) => pl.id === prevPl.id);
                  return currP ? { ...prevPl, x: currP.x, y: currP.y } : prevPl;
                })
              };
            }
          }
          return { ...p, steps: updatedSteps, drawings: [] };
        }
        return p;
      })
    );
  };

  const handleExportPlayJSON = () => {
    try {
      const jsonStr = JSON.stringify(activePlay, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanName = activePlay.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.href = url;
      link.download = `jugada_${cleanName || 'baloncesto'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Error al exportar la jugada como JSON.');
    }
  };

  const handleImportPlayJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        
        if (!imported || typeof imported !== 'object') {
          throw new Error('El archivo no tiene el formato JSON de jugada válido.');
        }
        if (!imported.name || !Array.isArray(imported.steps)) {
          throw new Error('El archivo JSON no contiene una estructura de jugada compatible (falta nombre o pasos de animación).');
        }

        const newPlay: Play = {
          ...imported,
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        };

        setPlays((prev) => [...prev, newPlay]);
        setActivePlayId(newPlay.id);
        setCurrentStepIndex(0);
        
        setShareNotification("✅ ¡Jugada importada correctamente!");
        setTimeout(() => setShareNotification(null), 3500);
      } catch (err: any) {
        alert(`Error al importar el archivo: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Select step safely and reposition animations
  const handleSelectStep = (idx: number) => {
    setIsAnimating(false);
    setCurrentStepIndex(idx);
    setFractionalIndex(idx);
  };

  // Save new play templates
  const handleSavePlay = (name: string, description: string, category: 'banda' | 'fondo' | 'juego') => {
    const playToSave: Play = {
      ...activePlay,
      id: `custom-play-${Date.now()}`,
      name: `💾 ${name}`,
      description: description || activePlay.description,
      category,
      isSaved: true,
    };

    setPlays((prev) => [...prev, playToSave]);
    setActivePlayId(playToSave.id);
    setFractionalIndex(0.0);
    setCurrentStepIndex(0);
  };

  // Delete play template
  const handleDeletePlay = (id: string) => {
    const playToDelete = plays.find((p) => p.id === id);
    const playName = playToDelete ? playToDelete.name : 'esta jugada';

    triggerConfirm({
      title: '🗑️ ¿Eliminar esta jugada de la biblioteca?',
      message: `Fórmula de seguridad: ¿Estás seguro de que deseas eliminar permanentemente la jugada "${playName}" de tu biblioteca privada? Esta acción es irreversible y se perderán todos los fotogramas y dibujos asociados.`,
      confirmText: 'Sí, eliminar de biblioteca',
      cancelText: 'Conservar jugada',
      isDanger: true,
      onConfirm: () => {
        setIsAnimating(false);
        const updated = plays.filter((p) => p.id !== id);
        if (updated.length === 0) {
          const defaultBlankPlay: Play = {
            id: `custom-play-${Date.now()}`,
            name: '📋 Mi nueva jugada',
            description: 'Crea tu estrategia arrastrando los jugadores y definiendo los pasos tácticos.',
            courtType: 'half',
            steps: [
              {
                description: 'Paso 1: Posición de salida',
                duration: 2.0,
                players: JSON.parse(JSON.stringify(defaultHalfCourtPlayers)),
              },
            ],
            drawings: [],
          };
          setPlays([defaultBlankPlay]);
          setActivePlayId(defaultBlankPlay.id);
          setFractionalIndex(0.0);
          setCurrentStepIndex(0);
        } else {
          setPlays(updated);
          if (activePlayId === id) {
            setActivePlayId(updated[0].id);
            setFractionalIndex(0.0);
            setCurrentStepIndex(0);
          }
        }
      }
    });
  };

  // Import JSON plays
  const handleImportPlay = (play: Play) => {
    setPlays((prev) => [...prev, play]);
    setActivePlayId(play.id);
    setFractionalIndex(0.0);
    setCurrentStepIndex(0);
  };

  // Handle Play Generated by AI Assistant
  const handlePlayGenerated = (play: Play) => {
    setPlays((prev) => [...prev, play]);
    setActivePlayId(play.id);
    setFractionalIndex(0.0);
    setCurrentStepIndex(0);
  };

  // Clean scrubber scrubbing values
  const handleScrub = (value: number) => {
    setIsAnimating(false);
    setFractionalIndex(value);
    setCurrentStepIndex(Math.round(value));
  };

  // Calculate live player locations with LERP coordinates, falling back to drawing vector path if available
  const getInterpolatedPlayers = (): PlayerState[] => {
    const steps = activePlay.steps;
    if (!steps || steps.length === 0) return [];

    const baseIndex = Math.floor(fractionalIndex);
    if (baseIndex >= steps.length - 1) {
      return steps[steps.length - 1]?.players || [];
    }

    const nextIndex = baseIndex + 1;
    let fraction = fractionalIndex - baseIndex;
    if (isNaN(fraction) || !isFinite(fraction)) {
      fraction = 0;
    }

    const basePlayers = steps[baseIndex]?.players || [];
    const nextPlayers = steps[nextIndex]?.players || [];
    const drawings = activePlay.drawings || [];

    // Pre-calculate all non-ball player interpolated positions
    const playersInterpolated: Record<string, { x: number; y: number }> = {};

    basePlayers.forEach((bp) => {
      if (bp.id === 'Ball') return;
      const np = nextPlayers.find((p) => p.id === bp.id) || bp;
      const bpX = typeof bp.x === 'number' && !isNaN(bp.x) ? bp.x : 50;
      const bpY = typeof bp.y === 'number' && !isNaN(bp.y) ? bp.y : 50;
      const npX = typeof np.x === 'number' && !isNaN(np.x) ? np.x : bpX;
      const npY = typeof np.y === 'number' && !isNaN(np.y) ? np.y : bpY;

      const drawId = `step-${nextIndex}-player-${bp.id}`;
      const matchingDrawing = drawings.find((d) => d && d.id === drawId);

      if (matchingDrawing && matchingDrawing.points && matchingDrawing.points.length > 0) {
        const pts = matchingDrawing.points;
        const totalSegments = pts.length - 1;
        let xVal = bpX;
        let yVal = bpY;

        if (totalSegments > 0) {
          const rawIdx = fraction * totalSegments;
          const segmentIdx = Math.floor(rawIdx);
          const segmentFraction = rawIdx - segmentIdx;
          const startPt = pts[Math.max(0, Math.min(segmentIdx, pts.length - 1))];
          const endPt = pts[Math.max(0, Math.min(segmentIdx + 1, pts.length - 1))];
          if (startPt && endPt) {
            xVal = startPt.x + (endPt.x - startPt.x) * segmentFraction;
            yVal = startPt.y + (endPt.y - startPt.y) * segmentFraction;
          }
        } else if (pts[0]) {
          xVal = pts[0].x;
          yVal = pts[0].y;
        }
        playersInterpolated[bp.id] = { x: xVal, y: yVal };
      } else {
        const xVal = bpX + (npX - bpX) * fraction;
        const yVal = bpY + (npY - bpY) * fraction;
        playersInterpolated[bp.id] = { x: xVal, y: yVal };
      }
    });

    // Handle Ball routing
    const ballBp = basePlayers.find((p) => p.id === 'Ball');
    if (ballBp) {
      const np = nextPlayers.find((p) => p.id === 'Ball') || ballBp;
      const bpX = typeof ballBp.x === 'number' && !isNaN(ballBp.x) ? ballBp.x : 50;
      const bpY = typeof ballBp.y === 'number' && !isNaN(ballBp.y) ? ballBp.y : 50;
      const npX = typeof np.x === 'number' && !isNaN(np.x) ? np.x : bpX;
      const npY = typeof np.y === 'number' && !isNaN(np.y) ? np.y : bpY;

      // Check if there is an active pass or shot drawing for the ball in this step
      const hasBallPass = drawings.some((d) => d && d.id === `step-${nextIndex}-ball-pass`);

      if (!hasBallPass) {
        // Find whoever was carrying the ball at the start of this step
        let carrierId: string | null = null;
        let minDist = 6.5; // lock threshold
        basePlayers.forEach((p) => {
          if (p.id === 'Ball') return;
          const d = Math.hypot(bpX - p.x, bpY - p.y);
          if (d < minDist) {
            minDist = d;
            carrierId = p.id;
          }
        });

        // Proactively check if a player has the ball at the end of this step
        if (!carrierId) {
          let endMinDist = 6.5;
          nextPlayers.forEach((p) => {
            if (p.id === 'Ball') return;
            const d = Math.hypot(npX - p.x, npY - p.y);
            if (d < endMinDist) {
              endMinDist = d;
              carrierId = p.id;
            }
          });
        }

        if (carrierId && playersInterpolated[carrierId]) {
          // Ball follows carrier's interpolated position perfectly
          playersInterpolated['Ball'] = {
            x: playersInterpolated[carrierId].x,
            y: playersInterpolated[carrierId].y,
          };
        } else {
          // Standard ball LERP
          playersInterpolated['Ball'] = {
            x: bpX + (npX - bpX) * fraction,
            y: bpY + (npY - bpY) * fraction,
          };
        }
      } else {
        // Check if there is an active pass / shot drawing to trace along
        const matchingDrawing = drawings.find((d) => d && d.id === `step-${nextIndex}-ball-pass`);
        if (matchingDrawing && matchingDrawing.points && matchingDrawing.points.length > 0) {
          const pts = matchingDrawing.points;
          const totalSegments = pts.length - 1;
          let xVal = bpX;
          let yVal = bpY;

          if (totalSegments > 0) {
            const rawIdx = fraction * totalSegments;
            const segmentIdx = Math.floor(rawIdx);
            const segmentFraction = rawIdx - segmentIdx;
            const startPt = pts[Math.max(0, Math.min(segmentIdx, pts.length - 1))];
            const endPt = pts[Math.max(0, Math.min(segmentIdx + 1, pts.length - 1))];
            if (startPt && endPt) {
              xVal = startPt.x + (endPt.x - startPt.x) * segmentFraction;
              yVal = startPt.y + (endPt.y - startPt.y) * segmentFraction;
            }
          } else if (pts[0]) {
            xVal = pts[0].x;
            yVal = pts[0].y;
          }
          playersInterpolated['Ball'] = { x: xVal, y: yVal };
        } else {
          playersInterpolated['Ball'] = {
            x: bpX + (npX - bpX) * fraction,
            y: bpY + (npY - bpY) * fraction,
          };
        }
      }
    }

    return basePlayers.map((bp) => {
      const coords = playersInterpolated[bp.id] || { x: bp.x, y: bp.y };
      return {
        ...bp,
        x: parseFloat(coords.x.toFixed(2)),
        y: parseFloat(coords.y.toFixed(2)),
      };
    });
  };

  // Generate tactical transcription based on player shapes & lines in the steps
  const generateTacticalTranscription = (play: Play, rxNames: Record<string, string>): string => {
    const cleanPlayerName = (id: string, names: Record<string, string>): string => {
      const raw = names[id] || id;
      return raw.replace(/👤|🛡️/g, '').replace(/\(\d+\)/g, '').trim();
    };

    const getClosestPlayer = (pos: { x: number; y: number }, list: PlayerState[]) => {
      let closest: PlayerState | null = null;
      let minDist = Infinity;
      for (const p of list || []) {
        if (p.id === 'Ball') continue;
        const d = Math.hypot(p.x - pos.x, p.y - pos.y);
        if (d < minDist) {
          minDist = d;
          closest = p;
        }
      }
      return closest;
    };

    const stepsList: string[] = [];

    for (let s = 0; s < play.steps.length; s++) {
      const stepDrawings = play.drawings.filter((d) => d && d.id && d.id.startsWith(`step-${s}-`));
      const stepActions: string[] = [];

      // 1. Process player movements in this step
      stepDrawings.forEach((d) => {
        const parts = d.id.split('-');
        if (parts[2] === 'player') {
          const playerId = parts[3];
          const name = cleanPlayerName(playerId, rxNames);
          if (d.type === 'dribble') {
            stepActions.push(`🏀 ${name} bota el balón`);
          } else if (d.type === 'screen') {
            stepActions.push(`🛡️ ${name} realiza un bloqueo`);
          } else {
            stepActions.push(`🏃 ${name} corta/corre sin balón`);
          }
        }
      });

      // 2. Process ball passes / shots
      const ballDraw = stepDrawings.find((d) => d.id.includes('-ball-') || d.id.includes('-pass'));
      if (ballDraw) {
        const startPt = ballDraw.points[0];
        const endPt = ballDraw.points[ballDraw.points.length - 1];
        const prevStep = s > 0 ? play.steps[s - 1] : null;
        const currStep = play.steps[s];

        if (prevStep && currStep && startPt && endPt) {
          const passer = getClosestPlayer(startPt, prevStep.players);
          const receiver = getClosestPlayer(endPt, currStep.players);
          const passerName = passer ? cleanPlayerName(passer.id, rxNames) : 'Jugador';

          if (ballDraw.type === 'shot' || ballDraw.id.includes('shot')) {
            stepActions.push(`🎯 ${passerName} realiza un lanzamiento a canasta 🏀`);
          } else {
            const receiverName = receiver ? cleanPlayerName(receiver.id, rxNames) : 'un compañero';
            stepActions.push(`➡️ ${passerName} pasa el balón a ${receiverName}`);
          }
        }
      }

      const stepCustomText = play.steps[s].description?.trim() || '';
      const hasActions = stepActions.length > 0;
      
      let stepLine = `• PASO ${s + 1}`;
      if (s === 0) {
        stepLine += ' (Posición de salida)';
      }
      
      if (stepCustomText) {
        stepLine += `: ${stepCustomText}`;
      } else if (!hasActions && s > 0) {
        stepLine += ': Sin movimientos todavía...';
      } else if (!hasActions && s === 0) {
        stepLine += ': Arrastra jugadores para definir las posiciones iniciales.';
      }
      
      if (hasActions) {
        stepLine += `\n  └─> ${stepActions.join(', ')}`;
      }
      
      stepsList.push(stepLine);
    }

    return stepsList.join('\n\n');
  };

  // Sync transcription live whenever the step drawings or instructions change
  useEffect(() => {
    if (activePlay && !isDescriptionCustom[activePlayId]) {
      const transcription = generateTacticalTranscription(activePlay, playerNames);
      if (transcription && transcription !== activePlay.description) {
        setPlays((prev) =>
          prev.map((p) => {
            if (p.id === activePlayId) {
              return { ...p, description: transcription };
            }
            return p;
          })
        );
      }
    }
  }, [activePlay?.drawings, activePlay?.steps, activePlayId, playerNames, isDescriptionCustom]);

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text-bright flex flex-col antialiased relative">
      {/* Toast Notification for Shares */}
      {shareNotification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-brand-accent text-white font-bold px-5 py-3 rounded-xl shadow-2xl border border-brand-accent/30 flex items-center gap-2 animate-bounce">
          <span>🎯</span>
          <span className="text-xs sm:text-sm">{shareNotification}</span>
        </div>
      )}

      {/* Premium Dashboard Header */}
      <header className="border-b border-brand-border bg-brand-panel/80 backdrop-blur relative z-40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-brand-accent/20">
            🏀
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Pizarra Táctica de Baloncesto
            </h1>
            <p className="text-[11px] text-brand-text-dim font-medium">
              Crea, anima y diseña jugadas de entrenamiento en tiempo real
            </p>
          </div>
        </div>

        {/* Quick actions bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-toggle-sidebar"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              isSidebarOpen 
                ? 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent hover:bg-brand-accent/20' 
                : 'bg-brand-accent text-white border-brand-accent hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/30 animate-pulse'
            }`}
            title="Ocultar paneles para ocupar toda la pantalla de trabajo"
          >
            {isSidebarOpen ? '🖥️ Ver Pantalla Completa' : '🎛️ Mostrar Paneles Laterales'}
          </button>
          <button
            id="btn-new-half"
            onClick={() => handleNewPlay('half')}
            className="px-3.5 py-2 bg-transparent hover:bg-white/5 text-brand-text-bright text-xs font-semibold rounded-xl border border-brand-border transition-colors cursor-pointer"
          >
            📋 Nueva Media Cancha
          </button>
          <button
            id="btn-new-full"
            onClick={() => handleNewPlay('full')}
            className="px-3.5 py-2 bg-transparent hover:bg-white/5 text-brand-text-bright text-xs font-semibold rounded-xl border border-brand-border transition-colors cursor-pointer"
          >
            🗺️ Nueva Cancha Entera
          </button>
          
          <div className="h-4 w-[1px] bg-brand-border/40 hidden sm:inline-block"></div>

          <button
            id="btn-share-all"
            onClick={handleShareAllPlays}
            className="px-3 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-brand-accent/20"
            title="Compartir toda tu biblioteca de sistemas en modo lectura"
          >
            🔗 Compartir Biblioteca
          </button>
          <button
            id="btn-share-all-whatsapp"
            onClick={handleShareAllPlaysWhatsApp}
            className="px-3 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-green-600/20 active:scale-95"
            title="Compartir toda tu biblioteca por WhatsApp (Modo Lectura)"
          >
            💬 Compartir por WhatsApp
          </button>
          <button
            id="btn-print-sheet"
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 hover:border-amber-500/50 text-brand-text-bright border border-brand-border text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-black/10 active:scale-95"
            title="Generar Ficha de Entrenamiento Imprimible / PDF"
          >
            📥 Imprimir Ficha / PDF
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Container */}
      <main className="flex-1 w-full max-w-full px-4 md:px-8 py-6">
        {/* HIDDEN PRINT-ONLY SUMMARY SHEET CARD */}
        <div className="hidden print:block print-only-card text-black bg-white p-6 border border-black rounded-lg mb-4 font-sans">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight mb-2">🏀 FICHA TÁCTICA DE BALONCESTO</h1>
          <hr className="border-black mb-4" />
          <div className="text-xl font-bold mb-4">SISTEMA: {activePlay.name}</div>
          <div className="text-sm font-semibold text-gray-700 mb-1">📝 DESCRIPCIÓN DE LA JUGADA:</div>
          <div className="text-base text-gray-900 bg-gray-50 border border-gray-300 p-4 rounded-lg leading-relaxed whitespace-pre-wrap font-mono mb-4">
            {activePlay.description || '• Paso 1 (Posición de salida): Arrastra los jugadores para grafiar la jugada.'}
          </div>
        </div>
        {isViewerMode ? (
          /* HIGHLY POLISHED VIEWER MODE DESIGNED FOR MOBILE AND TABLET */
          <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fade-in">
            {/* Header / Title block */}
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-[9px] bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  👀 Visor táctico de baloncesto (Modo Lectura)
                </span>
                <h2 className="text-lg font-extrabold text-white tracking-tight mt-1">
                  {activePlay.name}
                </h2>
              </div>
              {!new URLSearchParams(window.location.search).has('sharedPlays') && !new URLSearchParams(window.location.search).has('play') && (
                <button
                  onClick={() => setIsViewerMode(false)}
                  className="px-3 py-1.5 bg-brand-border text-brand-text-bright hover:bg-brand-border/85 text-[11px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  ✏️ Editar Jugada
                </button>
              )}
            </div>

            {/* Selector de Sistemas for Shared Library */}
            {plays.length > 1 && (
              <div className="bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl flex flex-col gap-1.5 w-full animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-dim block">
                  📂 Seleccionar Sistema (Biblioteca Compartida)
                </span>
                <select
                  value={activePlayId}
                  onChange={(e) => {
                    setActivePlayId(e.target.value);
                    setCurrentStepIndex(0);
                    setFractionalIndex(0.0);
                  }}
                  className="w-full bg-brand-bg text-brand-text-bright text-xs font-semibold border border-brand-border rounded-xl px-3 py-2.5 outline-none focus:border-brand-accent cursor-pointer"
                >
                  {plays.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.steps.length} {p.steps.length === 1 ? 'fase' : 'fases'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Board */}
            <div className="bg-brand-panel border border-brand-border rounded-xl p-3 shadow-xl">
              <CourtBoard
                courtType={activePlay.courtType}
                players={getInterpolatedPlayers()}
                drawings={activePlay.drawings}
                isAnimating={isAnimating}
                onUpdatePlayers={handleUpdatePlayers}
                onAddDrawing={handleAddDrawing}
                onDeleteDrawing={handleDeleteDrawing}
                activePlay={activePlay}
                currentStepIndex={currentStepIndex}
                onStartGraphing={handleStartGraphing}
                playerNames={playerNames}
                onAutoAddStep={undefined}
                playerAnchors={playerAnchors}
                setPlayerAnchors={setPlayerAnchors}
                deletedDefenders={deletedDefenders}
                setDeletedDefenders={setDeletedDefenders}
                isViewerMode={true}
                onRestartPlay={handleRestartPlay}
                onClearAnimationSteps={handleClearAnimationSteps}
                isInitialSetupMode={isInitialSetupMode}
                setIsInitialSetupMode={setIsInitialSetupMode}
              />
            </div>

            {/* Scrubber timeline controls */}
            <PlayStepsTimeline
              steps={activePlay.steps}
              currentStepIndex={currentStepIndex}
              fractionalIndex={fractionalIndex}
              isAnimating={isAnimating}
              playbackSpeed={playbackSpeed}
              courtType={activePlay.courtType}
              onSelectStep={handleSelectStep}
              onAddStep={handleAddStep}
              onDuplicateStep={handleDuplicateStep}
              onDeleteStep={handleDeleteStep}
              onUpdateStepDescription={handleUpdateStepDescription}
              onUpdateStepDuration={handleUpdateStepDuration}
              onPlayToggle={handlePlayToggle}
              onStop={handleStop}
              onSetSpeed={setPlaybackSpeed}
              onScrub={handleScrub}
              isViewerMode={true}
              onClearAnimationSteps={handleClearAnimationSteps}
            />

            {/* Live technical transcription */}
            <div className="bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  📋 Descripción jugada
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => speakText(activePlay.description || '• Paso 1 (Posición de salida): Arrastra los jugadores para grafiar la jugada.')}
                    className={`px-2.5 py-0.5 text-[9px] font-bold uppercase border rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1 ${
                      isVoicePaused
                        ? 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-500 text-amber-300 animate-pulse'
                        : isPlayingVoice
                        ? 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-400 hover:text-amber-300'
                    }`}
                    title="Escuchar locución de audio de toda la jugada técnica"
                  >
                    {isVoicePaused ? '▶️ Reanudar Voz' : isPlayingVoice ? '⏸️ Pausar Voz' : '🔊 Escuchar'}
                  </button>
                  <label className="flex items-center gap-1.5 text-[9px] font-bold text-brand-text-dim cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-brand-bg border-brand-border accent-brand-accent cursor-pointer"
                    />
                    <span>Auto Narrar Paso</span>
                  </label>
                </div>
              </div>
              <div className="text-xs text-brand-text-bright bg-brand-bg/60 border border-brand-border/60 p-4 rounded-xl font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto scrollbar-thin">
                {activePlay.description || '• Paso 1 (Posición de salida): Arrastra los jugadores para grafiar la jugada.'}
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD FULLY BUNDLED ATHLETIC EDITOR VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Playboard Column  */}
            <div className={`${isSidebarOpen ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col gap-5 h-full transition-all duration-300`}>
              {/* Casillas de Nombre y Descripción de la Jugada */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="play-metadata-cards">
                {/* Casilla de Título */}
                <div className="md:col-span-1 bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl flex flex-col justify-between gap-1 animate-fade-in">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text-dim block mb-1">
                      🏷️ Título de la Jugada
                    </label>
                    <input
                      type="text"
                      disabled={activePlay.isSaved}
                      value={activePlay.name}
                      onChange={(e) => handleUpdatePlayMetadata('name', e.target.value)}
                      className={`w-full text-sm font-bold bg-brand-bg text-brand-text-bright border border-brand-border focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 rounded-lg px-2.5 py-1.5 outline-none transition-all placeholder:text-brand-text-dim/40 ${
                        activePlay.isSaved ? 'opacity-70 cursor-not-allowed bg-brand-bg/20' : ''
                      }`}
                      placeholder="Ej: Jugada de Cuernos"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-brand-border/30">
                    <span className="text-[9px] text-brand-text-dim italic">Guardado instantáneo con autoguardado</span>
                  </div>
                </div>

                {/* Casilla de Descripción */}
                <div className="md:col-span-2 bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl flex flex-col justify-between gap-1 animate-fade-in">
                  <div className="flex flex-col gap-1.5 h-full justify-between">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap sm:flex-nowrap">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text-dim block text-left">
                        📝 Descripción jugada
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!activePlay.isSaved && (
                          <>
                            <button
                              type="button"
                              onClick={handleClearDescription}
                              className="px-2 py-0.5 text-[8.5px] font-bold uppercase bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1"
                              title="Borrar la descripción actual de la jugada"
                            >
                              🗑️ Borrar
                            </button>
                            <button
                              type="button"
                              onClick={handleRegenerateTranscription}
                              className="px-2 py-0.5 text-[8.5px] font-bold uppercase bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1"
                              title="Generar de nuevo en base a los movimientos actuales"
                            >
                              🤖 Auto
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => speakText(activePlay.description || '• Paso 1 (Posición de salida): Arrastra los jugadores para grafiar la jugada.')}
                          className={`px-2 py-0.5 text-[8.5px] font-bold uppercase border rounded transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1 ${
                            isVoicePaused
                              ? 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-500 text-amber-300 animate-pulse'
                              : isPlayingVoice
                              ? 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400'
                              : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-400 hover:text-amber-300'
                          }`}
                          title="Escuchar audio locución de toda la jugada técnica"
                        >
                          {isVoicePaused ? '▶️ Reanudar' : isPlayingVoice ? '⏸️ Pausar' : '🔊 Escuchar'}
                        </button>
                        <label className="flex items-center gap-1 text-[8.5px] font-bold text-brand-text-dim cursor-pointer hover:text-white select-none">
                          <input
                            type="checkbox"
                            checked={voiceEnabled}
                            onChange={(e) => setVoiceEnabled(e.target.checked)}
                            className="w-3 h-3 rounded bg-brand-bg border-brand-border accent-brand-accent cursor-pointer"
                          />
                          <span>Auto Narrar Paso</span>
                        </label>
                      </div>
                    </div>
                    <textarea
                      value={activePlay.description}
                      disabled={activePlay.isSaved}
                      onChange={(e) => {
                        setIsDescriptionCustom((prev) => ({ ...prev, [activePlayId]: true }));
                        handleUpdatePlayMetadata('description', e.target.value);
                      }}
                      rows={2}
                      className={`w-full text-xs bg-brand-bg/50 text-brand-text-bright border border-brand-border rounded-lg px-3 py-1.5 outline-none resize-none transition-all h-[66px] focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 font-mono leading-relaxed ${
                        activePlay.isSaved ? 'opacity-70 cursor-not-allowed bg-brand-bg/20' : ''
                      }`}
                      placeholder="Se transcribirá tu jugada y pasos automáticamente a medida que vas grafiando..."
                    />
                  </div>
                </div>
              </div>
 
              {/* Reactive Playboard View */}
              <CourtBoard
                courtType={activePlay.courtType}
                players={getInterpolatedPlayers()}
                drawings={activePlay.drawings}
                isAnimating={isAnimating}
                onUpdatePlayers={handleUpdatePlayers}
                onAddDrawing={handleAddDrawing}
                onDeleteDrawing={handleDeleteDrawing}
                activePlay={activePlay}
                currentStepIndex={currentStepIndex}
                onStartGraphing={handleStartGraphing}
                playerNames={playerNames}
                onAutoAddStep={autoCreateStepOnMove ? handleAddStep : undefined}
                playerAnchors={playerAnchors}
                setPlayerAnchors={setPlayerAnchors}
                deletedDefenders={deletedDefenders}
                setDeletedDefenders={setDeletedDefenders}
                isViewerMode={isViewerMode || activePlay.isSaved}
                onRestartPlay={handleRestartPlay}
                onClearAnimationSteps={handleClearAnimationSteps}
                isInitialSetupMode={isInitialSetupMode}
                setIsInitialSetupMode={setIsInitialSetupMode}
              />
 
              {/* Sincronizar Atacantes (Anclajes entre Jugadores) - Rendered in App.tsx right after the whiteboard */}
              {!isViewerMode && !activePlay.isSaved && (
                <div id="player-anchoring-panel" className="bg-brand-panel/50 border border-brand-border/60 rounded-xl p-4 shadow-xl animate-fade-in shrink-0 select-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-amber-500">🔗</span>
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#f59e0b]">
                        Sincronizar Atacantes (Líder y Seguidor)
                      </h4>
                    </div>
                    <p className="text-[9px] text-brand-text-dim leading-relaxed font-semibold italic">
                      Vincula dos jugadores para que se desplacen juntos al arrastrar al "Líder".
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {(['O1', 'O2', 'O3', 'O4', 'O5'] as PlayerRole[]).map((pid) => {
                      const currentAnchor = playerAnchors[pid] || '';
                      const displayName = playerNames[pid]?.split(' ')[1] || pid;
                      const otherOffenseOptions = (['O1', 'O2', 'O3', 'O4', 'O5'] as PlayerRole[]).filter((opt) => opt !== pid);
 
                      return (
                        <div key={`anchor-ctrl-${pid}`} className="flex flex-col gap-1 p-2 bg-brand-panel/65 border border-brand-border/40 rounded-lg hover:border-brand-border transition-colors">
                          <span className="text-[10px] font-bold text-white flex items-center gap-1">
                            🏃 {displayName}
                          </span>
                          <select
                            value={currentAnchor}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPlayerAnchors((prev) => ({
                                ...prev,
                                [pid]: val,
                              }));
                            }}
                            className="w-full bg-brand-bg/90 text-brand-text-bright text-[10px] font-semibold border border-brand-border rounded-md px-1.5 py-1 outline-none focus:border-amber-500 cursor-pointer transition-colors"
                          >
                            <option value="">Ninguno</option>
                            {otherOffenseOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                Sigue a {playerNames[opt]?.split(' ')[1] || opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
 
              {/* Animation Sequence Timeline View */}
              <PlayStepsTimeline
                steps={activePlay.steps}
                currentStepIndex={currentStepIndex}
                fractionalIndex={fractionalIndex}
                isAnimating={isAnimating}
                playbackSpeed={playbackSpeed}
                courtType={activePlay.courtType}
                onSelectStep={handleSelectStep}
                onAddStep={handleAddStep}
                onDuplicateStep={handleDuplicateStep}
                onDeleteStep={handleDeleteStep}
                onUpdateStepDescription={handleUpdateStepDescription}
                onUpdateStepDuration={handleUpdateStepDuration}
                onPlayToggle={handlePlayToggle}
                onStop={handleStop}
                onSetSpeed={setPlaybackSpeed}
                onScrub={handleScrub}
                autoCreateStepOnMove={autoCreateStepOnMove}
                onToggleAutoCreateStep={setAutoCreateStepOnMove}
                isViewerMode={isViewerMode || activePlay.isSaved}
                onClearAnimationSteps={handleClearAnimationSteps}
              />

              {/* Sistemas Ofensivos Preestablecidos (Playbook Presets) - Rendered in App.tsx below playback bar */}
              {!isViewerMode && (
                <div id="playbook-presets-panel" className="bg-brand-panel/50 border border-brand-border/60 rounded-xl p-4 shadow-xl animate-fade-in shrink-0 select-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base text-brand-accent">🏀</span>
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#3b82f6]">
                        Sistemas Ofensivos Preestablecidos (Playbook Presets)
                      </h4>
                    </div>
                    <p className="text-[9px] text-brand-text-dim leading-relaxed font-semibold italic">
                      Coloca a los 5 atacantes automáticamente con un solo clic.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* 1. 5 Abiertos */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 50, y: 78 },
                            O2: { x: 18, y: 65 },
                            O3: { x: 82, y: 65 },
                            O4: { x: 12, y: 38 },
                            O5: { x: 88, y: 38 },
                            Ball: { x: 50, y: 78 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      👐 5 Abiertos
                    </button>

                    {/* 2. Cuernos */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 50, y: 78 },
                            O2: { x: 12, y: 38 },
                            O3: { x: 88, y: 38 },
                            O4: { x: 38, y: 55 },
                            O5: { x: 62, y: 55 },
                            Ball: { x: 50, y: 78 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      🤘 Cuernos (Horns)
                    </button>

                    {/* 3. 1-4 Cajas */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 50, y: 78 },
                            O2: { x: 12, y: 40 },
                            O3: { x: 88, y: 40 },
                            O4: { x: 35, y: 23 },
                            O5: { x: 65, y: 23 },
                            Ball: { x: 50, y: 78 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      📦 1-4 Cajas
                    </button>

                    {/* 4. Bloqueo Central */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 50, y: 74 },
                            O2: { x: 18, y: 65 },
                            O3: { x: 82, y: 65 },
                            O4: { x: 20, y: 32 },
                            O5: { x: 55, y: 68 },
                            Ball: { x: 50, y: 74 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      ⚡ Bloqueo Central
                    </button>

                    {/* 5. Aclarado Iso */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 50, y: 78 },
                            O2: { x: 12, y: 32 },
                            O3: { x: 88, y: 32 },
                            O4: { x: 15, y: 70 },
                            O5: { x: 85, y: 70 },
                            Ball: { x: 50, y: 78 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      🗡️ Aclarado Iso
                    </button>

                    {/* 6. UCLA Stack */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 50, y: 78 },
                            O4: { x: 30, y: 25 },
                            O5: { x: 70, y: 25 },
                            O2: { x: 30, y: 40 },
                            O3: { x: 70, y: 40 },
                            Ball: { x: 50, y: 78 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      🥞 UCLA Stack
                    </button>

                    {/* 7. Cremallera (1-3-1) */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 50, y: 82 },
                            O4: { x: 50, y: 48 },
                            O5: { x: 50, y: 18 },
                            O2: { x: 15, y: 55 },
                            O3: { x: 85, y: 55 },
                            Ball: { x: 50, y: 82 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      🤐 Cremallera 1-3-1
                    </button>

                    {/* 8. Flex Offense */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = activePlay.steps[currentStepIndex].players.map((p) => {
                          const coords: Record<string, { x: number; y: number }> = {
                            O1: { x: 35, y: 75 },
                            O2: { x: 65, y: 75 },
                            O3: { x: 12, y: 30 },
                            O4: { x: 88, y: 30 },
                            O5: { x: 50, y: 22 },
                            Ball: { x: 35, y: 75 },
                          };
                          if (coords[p.id]) {
                            return { ...p, x: coords[p.id].x, y: coords[p.id].y };
                          }
                          return p;
                        });
                        handleUpdatePlayers(updated);
                      }}
                      className="px-3 py-2 bg-brand-bg hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent rounded-lg text-xs font-semibold text-brand-text-bright transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap active:scale-95 text-white"
                    >
                      🏃‍♂️ Flex Offense
                    </button>
                  </div>
                </div>
              )}

              {/* No more bottom player anchoring panel */}
            </div>

            {/* Tactical Panels Column */}
            {isSidebarOpen && (
              <div className="flex flex-col gap-6 h-full transition-all duration-300 animate-fade-in lg:col-span-1">
                {/* Saved Systems Library Manager */}
                <div className="flex-1 min-h-[300px]">
                  <PlayLibrary
                    plays={plays}
                    activePlayId={activePlayId}
                    onSelectPlay={handleSelectPlay}
                    onSavePlay={handleSavePlay}
                    onDeletePlay={handleDeletePlay}
                    currentPlay={activePlay}
                    onShareLibrary={handleShareAllPlays}
                    onShareLibraryWhatsApp={handleShareAllPlaysWhatsApp}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Design Credits and Help */}
      <footer className="border-t border-brand-border bg-brand-bg px-6 py-4 mt-auto select-none">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-brand-text-dim font-medium text-[11px]">
          <div className="flex items-center gap-2">
            <span>🛡️ FIBA Regulation Pro-Board</span>
            <span>•</span>
            <span>⏱️ 60FPS LERP Matrix Animation</span>
          </div>
          <div>
            Hecho para entrenadores de baloncesto • AI Studio Build
          </div>
        </div>
      </footer>

      {/* Diálogo interactivo de confirmación táctica */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl shadow-brand-accent/20">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${confirmModal.isDanger ? 'text-rose-500' : 'text-amber-500'}`}>
                {confirmModal.isDanger ? '⚠️' : '❓'}
              </span>
              <h4 className="font-extrabold text-base text-white tracking-tight">
                {confirmModal.title}
              </h4>
            </div>
            
            <p className="text-xs text-brand-text-dim leading-relaxed font-semibold">
              {confirmModal.message}
            </p>

            <div className="flex gap-2.5 pt-2 justify-end text-xs font-bold">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-brand-bg hover:bg-white/5 border border-brand-border rounded-xl text-brand-text-bright transition-colors cursor-pointer"
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-white transition-all transform hover:scale-102 active:scale-98 cursor-pointer shadow-md ${
                  confirmModal.isDanger
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'bg-brand-accent hover:bg-brand-accent/90 shadow-brand-accent/20'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
