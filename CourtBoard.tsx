import React, { useRef, useState, useEffect } from 'react';
import { PlayerState, PlayerRole, DrawingPath, Position, Play } from '../types';
import { defaultHalfCourtPlayers, defaultFullCourtPlayers } from '../utils';

interface CourtBoardProps {
  courtType: 'half' | 'full';
  players: PlayerState[];
  drawings: DrawingPath[];
  isAnimating: boolean;
  onUpdatePlayers: (players: PlayerState[]) => void;
  onAddDrawing: (drawing: DrawingPath) => void;
  onDeleteDrawing: (id: string) => void;
  activePlay: Play;
  currentStepIndex: number;
  onStartGraphing?: () => void;
  playerNames: Record<string, string>;
  onAutoAddStep?: () => void;
  playerAnchors: Record<string, string>;
  setPlayerAnchors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  deletedDefenders: string[];
  setDeletedDefenders: React.Dispatch<React.SetStateAction<string[]>>;
  isViewerMode?: boolean;
  onRestartPlay?: () => void;
  onClearAnimationSteps?: () => void;
  isInitialSetupMode: boolean;
  setIsInitialSetupMode: (val: boolean) => void;
}

export default function CourtBoard({
  courtType,
  players,
  drawings,
  isAnimating,
  onUpdatePlayers,
  onAddDrawing,
  onDeleteDrawing,
  activePlay,
  currentStepIndex,
  onStartGraphing,
  playerNames,
  onAutoAddStep,
  playerAnchors,
  setPlayerAnchors,
  deletedDefenders,
  setDeletedDefenders,
  isViewerMode = false,
  onRestartPlay,
  onClearAnimationSteps,
  isInitialSetupMode,
  setIsInitialSetupMode,
}: CourtBoardProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragPathRef = useRef<Position[]>([]);
  const activeDragIdRef = useRef<PlayerRole | null>(null);
  const [activeDragId, setActiveDragId] = useState<PlayerRole | null>(null);
  const [drawTool, setDrawTool] = useState<'select' | 'pass' | 'dribble' | 'cut' | 'screen' | 'shot' | 'handoff'>('select');
  const [drawColor, setDrawColor] = useState<string>('#3b82f6'); // blue default
  const [tempDrawing, setTempDrawing] = useState<Position[] | null>(null);

  // Translate client coordinates of pointer actions to relative percentage (0-100)
  const getRelativeCoords = (e: React.PointerEvent<SVGSVGElement>): Position => {
    if (!svgRef.current) return { x: 50, y: 50 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  // Find player closest to a position
  const getClosestPlayerToPos = (pos: Position, allPlayers: PlayerState[]) => {
    let closest: PlayerState | null = null;
    let minDist = Infinity;
    for (const p of allPlayers) {
      if (p.id === 'Ball') continue;
      const d = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    return { player: closest, dist: minDist };
  };

  // Dynamically resolve drawing points so vectors lock to current player positions
  const resolveDynamicDrawing = (d: DrawingPath): DrawingPath => {
    if (!d) return d;
    
    // First, handle standard step-based dynamic trails (player movement, ball pass/shot)
    if (d.id && d.id.startsWith('step-')) {
      const parts = d.id.split('-');
      const stepIdx = parseInt(parts[1], 10);
      if (!isNaN(stepIdx) && activePlay && activePlay.steps) {
        const prevStep = activePlay.steps[stepIdx - 1];
        const currStep = activePlay.steps[stepIdx];
        if (prevStep && currStep) {
          if (parts[2] === 'player') {
            const playerId = parts[3];
            const pStart = prevStep.players.find((pl) => pl.id === playerId);
            const pEnd = currStep.players.find((pl) => pl.id === playerId);
            if (pStart && pEnd) {
              if (d.points.length >= 2) {
                const updatedPoints = [...d.points];
                updatedPoints[0] = { x: pStart.x, y: pStart.y };
                updatedPoints[updatedPoints.length - 1] = { x: pEnd.x, y: pEnd.y };
                return { ...d, points: updatedPoints };
              } else {
                return { ...d, points: [{ x: pStart.x, y: pStart.y }, { x: pEnd.x, y: pEnd.y }] };
              }
            }
          } else if (parts[2] === 'ball') {
            const ballInPrev = prevStep.players.find((pl) => pl.id === 'Ball');
            const ballNow = currStep.players.find((pl) => pl.id === 'Ball');
            if (ballInPrev && ballNow) {
              const { player: passer } = getClosestPlayerToPos({ x: ballInPrev.x, y: ballInPrev.y }, prevStep.players);
              const startX = passer ? passer.x : ballInPrev.x;
              const startY = passer ? passer.y : ballInPrev.y;
              
              if (d.points.length >= 2) {
                const updatedPoints = [...d.points];
                updatedPoints[0] = { x: startX, y: startY };
                updatedPoints[updatedPoints.length - 1] = { x: ballNow.x, y: ballNow.y };
                return { ...d, points: updatedPoints };
              } else {
                return { ...d, points: [{ x: startX, y: startY }, { x: ballNow.x, y: ballNow.y }] };
              }
            }
          }
        }
      }
    }

    // Now, handle custom drawings that are bound/anchored to player positions dynamically!
    if ((d.startPlayerId || d.endPlayerId) && d.points.length >= 2) {
      // Find where those bound players are right now (in the 'players' array of the current view step)
      let newStart = d.points[0];
      let newEnd = d.points[d.points.length - 1];

      if (d.startPlayerId) {
        const found = players.find((p) => p.id === d.startPlayerId);
        if (found) {
          newStart = { x: found.x, y: found.y };
        }
      }
      if (d.endPlayerId) {
        const found = players.find((p) => p.id === d.endPlayerId);
        if (found) {
          newEnd = { x: found.x, y: found.y };
        }
      }

      // Check if we have pristine original start/end points to perform scaling & rotation
      const origStart = d.origStart || d.points[0];
      const origEnd = d.origEnd || d.points[d.points.length - 1];

      if (d.startPlayerId && d.endPlayerId) {
        // Double locked (e.g. Pass or Block between two players) -> Perform similarity transform!
        const dx0 = origEnd.x - origStart.x;
        const dy0 = origEnd.y - origStart.y;
        const len0 = Math.hypot(dx0, dy0);
        
        if (len0 < 0.2) {
          // Fallback to translation if original segment is extremely compressed
          const tx = newStart.x - origStart.x;
          const ty = newStart.y - origStart.y;
          const updatedPoints = d.points.map(p => ({
            x: parseFloat((p.x + tx).toFixed(1)),
            y: parseFloat((p.y + ty).toFixed(1))
          }));
          return { ...d, points: updatedPoints };
        }

        const dx = newEnd.x - newStart.x;
        const dy = newEnd.y - newStart.y;
        const len = Math.hypot(dx, dy);

        const angle0 = Math.atan2(dy0, dx0);
        const angle = Math.atan2(dy, dx);
        const diffAngle = angle - angle0;
        const scaleBy = len / len0;

        const updatedPoints = d.points.map((p) => {
          // Translate relative to original start
          const rx = p.x - origStart.x;
          const ry = p.y - origStart.y;

          // Rotate
          const cosV = Math.cos(diffAngle);
          const sinV = Math.sin(diffAngle);
          const rotX = rx * cosV - ry * sinV;
          const rotY = rx * sinV + ry * cosV;

          // Scale and translate to new start
          return {
            x: parseFloat((newStart.x + rotX * scaleBy).toFixed(1)),
            y: parseFloat((newStart.y + rotY * scaleBy).toFixed(1))
          };
        });

        // Ensure extremities match perfectly
        updatedPoints[0] = newStart;
        updatedPoints[updatedPoints.length - 1] = newEnd;

        return { ...d, points: updatedPoints };
      } else if (d.startPlayerId) {
        // Only start is locked (e.g. Cut draft starting from a player into space) -> Shift everything
        const tx = newStart.x - origStart.x;
        const ty = newStart.y - origStart.y;
        const updatedPoints = d.points.map((p) => ({
          x: parseFloat((p.x + tx).toFixed(1)),
          y: parseFloat((p.y + ty).toFixed(1))
        }));
        updatedPoints[0] = newStart;
        return { ...d, points: updatedPoints };
      } else if (d.endPlayerId) {
        // Only end is locked (e.g. Cut ending near a player) -> Shift everything
        const tx = newEnd.x - origEnd.x;
        const ty = newEnd.y - origEnd.y;
        const updatedPoints = d.points.map((p) => ({
          x: parseFloat((p.x + tx).toFixed(1)),
          y: parseFloat((p.y + ty).toFixed(1))
        }));
        updatedPoints[updatedPoints.length - 1] = newEnd;
        return { ...d, points: updatedPoints };
      }
    }

    return d;
  };

  // Drag and drop handlers
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>, playerId: PlayerRole) => {
    if (isAnimating || isViewerMode) return; // No dragging during animations or on viewer mode
    e.stopPropagation();
    setActiveDragId(playerId);
    activeDragIdRef.current = playerId;

    const coords = getRelativeCoords(e);
    if (currentStepIndex > 0 && activePlay) {
      const prevStep = activePlay.steps[currentStepIndex - 1];
      if (playerId === 'Ball') {
        const ballInPrev = prevStep?.players.find((p) => p.id === 'Ball');
        if (ballInPrev) {
          const { player: passer } = getClosestPlayerToPos({ x: ballInPrev.x, y: ballInPrev.y }, prevStep.players);
          if (passer) {
            dragPathRef.current = [{ x: passer.x, y: passer.y }];
          } else {
            dragPathRef.current = [{ x: ballInPrev.x, y: ballInPrev.y }];
          }
        } else {
          dragPathRef.current = [{ x: coords.x, y: coords.y }];
        }
      } else {
        const playerInPrev = prevStep?.players.find((p) => p.id === playerId);
        if (playerInPrev) {
          dragPathRef.current = [{ x: playerInPrev.x, y: playerInPrev.y }];
        } else {
          dragPathRef.current = [{ x: coords.x, y: coords.y }];
        }
      }
    } else {
      dragPathRef.current = [{ x: coords.x, y: coords.y }];
    }
  };

  // Main board pointer handlers for pencil drawing
  const handleBoardPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isAnimating || isViewerMode || drawTool === 'select') return;
    const coords = getRelativeCoords(e);
    setTempDrawing([coords]);
  };

  const getClosestBasket = (pos: Position) => {
    if (courtType === 'half') {
      return { x: 50, y: 14.2, dist: Math.hypot(pos.x - 50, pos.y - 14.2) };
    } else {
      const leftDist = Math.hypot(pos.x - 8.5, pos.y - 50);
      const rightDist = Math.hypot(pos.x - 91.5, pos.y - 50);
      if (leftDist < rightDist) {
        return { x: 8.5, y: 50, dist: leftDist };
      } else {
        return { x: 91.5, y: 50, dist: rightDist };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const activeDrag = activeDragIdRef.current;
    if (activeDrag) {
      if (isAnimating) {
        setActiveDragId(null);
        activeDragIdRef.current = null;
        return;
      }
      const coords = getRelativeCoords(e);
      const px = parseFloat(coords.x.toFixed(1));
      const py = parseFloat(coords.y.toFixed(1));

      if (isNaN(px) || isNaN(py)) return;

      // Accumulate drag coordinates with simple distance-based threshold filtering (except for Ball, which is a straight line)
      if (currentStepIndex > 0 && activePlay && dragPathRef.current && activeDrag !== 'Ball') {
        const lastPt = dragPathRef.current[dragPathRef.current.length - 1];
        if (lastPt) {
          const distFromLast = Math.hypot(px - lastPt.x, py - lastPt.y);
          if (distFromLast > 1.2) {
            dragPathRef.current.push({ x: px, y: py });
          }
        }
      }

      let updated = [...players];

      // If dragging the Ball itself
      if (activeDrag === 'Ball') {
        updated = players.map((p) => (p.id === 'Ball' ? { ...p, x: px, y: py } : p));
      } else {
        // Dragging any normal player
        // Check if the ball is anchored (extremely close, e.g. < 1.8) to this player
        const ballItem = players.find((p) => p.id === 'Ball');
        const activePlayerItem = players.find((p) => p.id === activeDrag);
        
        const isBallAnclado =
          ballItem &&
          activePlayerItem &&
          Math.hypot(ballItem.x - activePlayerItem.x, ballItem.y - activePlayerItem.y) < 1.8;

        const dx = activePlayerItem ? parseFloat((px - activePlayerItem.x).toFixed(1)) : 0;
        const dy = activePlayerItem ? parseFloat((py - activePlayerItem.y).toFixed(1)) : 0;

        updated = players.map((p) => {
          if (p.id === activeDrag) {
            return { ...p, x: px, y: py };
          }
          if (p.id === 'Ball' && isBallAnclado) {
            // Ball automatically follows player
            // Move conjuntamente! a la vez!
            return { ...p, x: px, y: py };
          }
          if (playerAnchors[p.id] === activeDrag) {
            // This player (attacker or defender) follows the current master player being dragged
            if (p.id.startsWith('D') && deletedDefenders.includes(p.id)) return p;
            const rx = parseFloat((p.x + dx).toFixed(1));
            const ry = parseFloat((p.y + dy).toFixed(1));
            return {
              ...p,
              x: Math.max(0, Math.min(100, rx)),
              y: Math.max(0, Math.min(100, ry)),
            };
          }
          return p;
        });
      }

      onUpdatePlayers(updated);

      // --- RECORD TRAIL VECTORS AUTOMATICALLY PER STEP ---
      if (currentStepIndex > 0 && activePlay) {
        const prevStep = activePlay.steps[currentStepIndex - 1];

        if (activeDrag !== 'Ball') {
          // Automatic movement trail for active player from their starting step coordinates
          const playerInPrev = prevStep?.players.find((p) => p.id === activeDrag);
          if (playerInPrev) {
            const stepDrawId = `step-${currentStepIndex}-player-${activeDrag}`;
            const dist = Math.hypot(px - playerInPrev.x, py - playerInPrev.y);

            if (dist > 1.8) {
              // --- COACH STUDIO ENGINE ---
              // 1. Check if they had the ball in the previous step
              const ballInPrev = prevStep?.players.find((p) => p.id === 'Ball');
              const hadBallInPrev = ballInPrev && Math.hypot(ballInPrev.x - playerInPrev.x, ballInPrev.y - playerInPrev.y) < 1.8;

              // 2. Check if the ball is currently anchored to this player in this step
              const ballNow = updated.find((p) => p.id === 'Ball');
              const isBallAncladoNow = ballNow && Math.hypot(ballNow.x - px, ballNow.y - py) < 1.8;

              let type: 'dribble' | 'cut' | 'screen' | 'shot' = 'cut';
              let color = '#000000'; // Pure black for tactical design consistency

              if (hadBallInPrev && isBallAncladoNow) {
                // Moving with the ball is automatically a dribble (Bote)
                type = 'dribble';
              } else if (drawTool === 'screen') {
                // Moving a player without the ball while screen (bloqueo) tool is active
                type = 'screen';
              } else {
                // Moving a player without the ball is a cut (Corte/Carrera)
                type = 'cut';
              }

              const points = dragPathRef.current && dragPathRef.current.length > 1
                ? [...dragPathRef.current]
                : [{ x: playerInPrev.x, y: playerInPrev.y }, { x: px, y: py }];

              if (points.length > 0) {
                points[points.length - 1] = { x: px, y: py };
              }

              const newDrawing: DrawingPath = {
                id: stepDrawId,
                type,
                color,
                points,
              };
              onAddDrawing(newDrawing);
            } else {
              // Deleted if returned to original start position
              onDeleteDrawing(stepDrawId);
            }
          }

          // Also record/update the trail for any other player anchored to the dragged player
          const activePlayerItem = players.find((p) => p.id === activeDragId);
          if (activePlayerItem) {
            const dx = parseFloat((px - activePlayerItem.x).toFixed(1));
            const dy = parseFloat((py - activePlayerItem.y).toFixed(1));

            players.forEach((p) => {
              if (playerAnchors[p.id] === activeDragId) {
                if (p.id.startsWith('D') && deletedDefenders.includes(p.id)) return;
                const pInPrev = prevStep?.players.find((prevP) => prevP.id === p.id);
                if (pInPrev) {
                  const pDrawId = `step-${currentStepIndex}-player-${p.id}`;
                  const pPx = parseFloat((p.x + dx).toFixed(1));
                  const pPy = parseFloat((p.y + dy).toFixed(1));
                  const pDist = Math.hypot(pPx - pInPrev.x, pPy - pInPrev.y);

                  if (pDist > 1.8) {
                    const ballInPrev = prevStep?.players.find((bp) => bp.id === 'Ball');
                    const hadBallInPrev = ballInPrev && Math.hypot(ballInPrev.x - pInPrev.x, ballInPrev.y - pInPrev.y) < 1.8;
                    const ballNow = updated.find((bp) => bp.id === 'Ball');
                    const isBallAncladoNow = ballNow && Math.hypot(ballNow.x - pPx, ballNow.y - pPy) < 1.8;

                    let type: 'dribble' | 'cut' | 'screen' | 'shot' = 'cut';
                    if (hadBallInPrev && isBallAncladoNow) {
                      type = 'dribble';
                    } else if (drawTool === 'screen') {
                      type = 'screen';
                    }

                    const pPoints = dragPathRef.current && dragPathRef.current.length > 1
                      ? dragPathRef.current.map((pt) => {
                          const shiftX = pt.x - playerInPrev.x;
                          const shiftY = pt.y - playerInPrev.y;
                          return {
                            x: parseFloat((pInPrev.x + shiftX).toFixed(1)),
                            y: parseFloat((pInPrev.y + shiftY).toFixed(1))
                          };
                        })
                      : [{ x: pInPrev.x, y: pInPrev.y }, { x: pPx, y: pPy }];

                    if (pPoints.length > 0) {
                      pPoints[pPoints.length - 1] = { x: pPx, y: pPy };
                    }

                    const newPDrawing: DrawingPath = {
                      id: pDrawId,
                      type,
                      color: '#000000',
                      points: pPoints,
                    };
                    onAddDrawing(newPDrawing);
                  } else {
                    onDeleteDrawing(pDrawId);
                  }
                }
              }
            });
          }
        } else {
          // Dragging the Ball itself -> record as a dynamic pass or shot!
          const ballInPrev = prevStep?.players.find((p) => p.id === 'Ball');
          if (ballInPrev) {
            // Find who had the ball in the previous step (closest player to ballInPrev)
            const { player: passer } = getClosestPlayerToPos({ x: ballInPrev.x, y: ballInPrev.y }, prevStep.players);
            if (passer) {
              const stepDrawId = `step-${currentStepIndex}-ball-pass`;
              const dist = Math.hypot(px - passer.x, py - passer.y);

              // Ball pass lines are strictly straight lines
              const points = [{ x: passer.x, y: passer.y }, { x: px, y: py }];

              if (dist > 2.5) {
                // Coach Studio: Detect if ball is dragged near the basket to draw as a Shot (Tiro) instead of Pass (Pase)
                const basketInfo = getClosestBasket({ x: px, y: py });
                const isShotToBasket = basketInfo.dist < 13.0;

                const newPass: DrawingPath = {
                  id: stepDrawId,
                  type: isShotToBasket ? 'shot' : 'pass',
                  color: isShotToBasket ? '#ef4444' : '#3b82f6', // Bright red for shots, blue for passes
                  points,
                };
                onAddDrawing(newPass);

                // --- KEY CHANGE: PASSER IS NO LONGER INITIAL DRIBBLER ---
                // Switch passer's trail to cut (green) since they have now released/passed the ball!
                const passerDrawId = `step-${currentStepIndex}-player-${passer.id}`;
                const existingPasserDrawing = drawings.find((d) => d.id === passerDrawId);
                if (existingPasserDrawing && existingPasserDrawing.type === 'dribble') {
                  onAddDrawing({
                    ...existingPasserDrawing,
                    type: 'cut',
                    color: '#10b981',
                  });
                }
              } else {
                onDeleteDrawing(stepDrawId);

                // --- RESTORE DRIBBLE IF RETURNED TO PASSER ---
                const passerDrawId = `step-${currentStepIndex}-player-${passer.id}`;
                const existingPasserDrawing = drawings.find((d) => d.id === passerDrawId);
                if (existingPasserDrawing && existingPasserDrawing.type !== 'dribble') {
                  onAddDrawing({
                    ...existingPasserDrawing,
                    type: 'dribble',
                    color: '#f59e0b',
                  });
                }
              }
            }
          }
        }
      }
    } else if (tempDrawing) {
      const coords = getRelativeCoords(e);
      // Add point if moved significantly
      const lastPoint = tempDrawing[tempDrawing.length - 1];
      const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
      if (dist > 1.5) {
        setTempDrawing([...tempDrawing, coords]);
      }
    }
  };

  const handlePointerUp = () => {
    const activeDrag = activeDragIdRef.current;
    if (activeDrag) {
      // If we dragged the ball, check if we need to snap/anchor it to the nearest player
      if (activeDrag === 'Ball') {
        const ballItem = players.find((p) => p.id === 'Ball');
        if (ballItem) {
          const { player: closest, dist } = getClosestPlayerToPos({ x: ballItem.x, y: ballItem.y }, players);
          if (closest && dist < 5.0) {
            // Snap to closest player position!
            const snappedPlayers = players.map((p) =>
              p.id === 'Ball' ? { ...p, x: closest.x, y: closest.y } : p
            );
            onUpdatePlayers(snappedPlayers);

            // If currentStepIndex > 0, also update the pass drawing to end exactly at the snapped player coordinate
            if (currentStepIndex > 0 && activePlay) {
              const prevStep = activePlay.steps[currentStepIndex - 1];
              const ballInPrev = prevStep?.players.find((p) => p.id === 'Ball');
              if (ballInPrev) {
                const { player: passer } = getClosestPlayerToPos({ x: ballInPrev.x, y: ballInPrev.y }, prevStep.players);
                if (passer) {
                  const stepDrawId = `step-${currentStepIndex}-ball-pass`;

                  const points = [{ x: passer.x, y: passer.y }, { x: closest.x, y: closest.y }];

                  const newPass: DrawingPath = {
                    id: stepDrawId,
                    type: 'pass',
                    color: '#3b82f6',
                    points,
                  };
                  onAddDrawing(newPass);

                  // Update passer style to no longer be dribble
                  const passerDrawId = `step-${currentStepIndex}-player-${passer.id}`;
                  const existingPasserDrawing = drawings.find((d) => d.id === passerDrawId);
                  if (existingPasserDrawing && existingPasserDrawing.type === 'dribble') {
                    onAddDrawing({
                      ...existingPasserDrawing,
                      type: 'cut',
                      color: '#10b981',
                    });
                  }
                }
              }
            }
          } else {
            // Coach Studio: Check if released near the basket (hoop center) to snap exactly to it and save as a shot drawing
            const basketInfo = getClosestBasket({ x: ballItem.x, y: ballItem.y });
            if (basketInfo.dist < 13.0) {
              const snappedBallToBasket = players.map((p) =>
                p.id === 'Ball' ? { ...p, x: basketInfo.x, y: basketInfo.y } : p
              );
              onUpdatePlayers(snappedBallToBasket);

              if (currentStepIndex > 0 && activePlay) {
                const prevStep = activePlay.steps[currentStepIndex - 1];
                const ballInPrev = prevStep?.players.find((p) => p.id === 'Ball');
                if (ballInPrev) {
                  const { player: passer } = getClosestPlayerToPos({ x: ballInPrev.x, y: ballInPrev.y }, prevStep.players);
                  if (passer) {
                    const stepDrawId = `step-${currentStepIndex}-ball-pass`;

                    const points = [{ x: passer.x, y: passer.y }, { x: basketInfo.x, y: basketInfo.y }];

                    const newShot: DrawingPath = {
                      id: stepDrawId,
                      type: 'shot',
                      color: '#ef4444',
                      points,
                    };
                    onAddDrawing(newShot);

                    // Update passer style to no longer be dribble
                    const passerDrawId = `step-${currentStepIndex}-player-${passer.id}`;
                    const existingPasserDrawing = drawings.find((d) => d.id === passerDrawId);
                    if (existingPasserDrawing && existingPasserDrawing.type === 'dribble') {
                      onAddDrawing({
                        ...existingPasserDrawing,
                        type: 'cut',
                        color: '#10b981',
                      });
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        // Dragged a normal player
        // Keep the ball perfectly locked / snapped on top of them if it was very close
        const ballItem = players.find((p) => p.id === 'Ball');
        const activePlayerItem = players.find((p) => p.id === activeDrag);
        if (ballItem && activePlayerItem) {
          const distance = Math.hypot(ballItem.x - activePlayerItem.x, ballItem.y - activePlayerItem.y);
          if (distance < 1.8) {
            const snappedPlayers = players.map((p) =>
              p.id === 'Ball' ? { ...p, x: activePlayerItem.x, y: activePlayerItem.y } : p
            );
            onUpdatePlayers(snappedPlayers);
          }
        }
      }

      // Automatically create a new tactical step of play when dragging ends on currentStepIndex > 0
      if (currentStepIndex > 0 && !isInitialSetupMode && onAutoAddStep) {
        setTimeout(() => {
          onAutoAddStep();
        }, 120);
      }

      setActiveDragId(null);
      activeDragIdRef.current = null;
    } else if (tempDrawing) {
      if (tempDrawing.length >= 2) {
        const startPoint = tempDrawing[0];
        const endPoint = tempDrawing[tempDrawing.length - 1];
        
        const startMatch = getClosestPlayerToPos(startPoint, players);
        const endMatch = getClosestPlayerToPos(endPoint, players);
        
        const ballItem = players.find((p) => p.id === 'Ball');
        let finalStartPlayerId: string | undefined = undefined;
        let finalEndPlayerId: string | undefined = undefined;
        
        // Match player threshold: 8.0 units (plenty of room to click/draw)
        if (startMatch.player && startMatch.dist < 8.0) {
          finalStartPlayerId = startMatch.player.id;
        }
        if (ballItem) {
          const ballStartDist = Math.hypot(ballItem.x - startPoint.x, ballItem.y - startPoint.y);
          if (ballStartDist < (startMatch.player ? startMatch.dist : 8.0) && ballStartDist < 8.0) {
            finalStartPlayerId = 'Ball';
          }
        }
        
        if (endMatch.player && endMatch.dist < 8.0) {
          finalEndPlayerId = endMatch.player.id;
        }
        if (ballItem) {
          const ballEndDist = Math.hypot(ballItem.x - endPoint.x, ballItem.y - endPoint.y);
          if (ballEndDist < (endMatch.player ? endMatch.dist : 8.0) && ballEndDist < 8.0) {
            finalEndPlayerId = 'Ball';
          }
        }

        const newDrawing: DrawingPath = {
          id: `step-${currentStepIndex}-draw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: drawTool as any,
          color: drawColor,
          points: tempDrawing,
          startPlayerId: finalStartPlayerId,
          endPlayerId: finalEndPlayerId,
          origStart: startPoint,
          origEnd: endPoint,
        };
        onAddDrawing(newDrawing);
      }
      setTempDrawing(null);
    }
  };

  // Generate beautiful wavy or zig-zag patterns for dribble lines
  const generateZigzagPath = (points: Position[]) => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    const stepSize = 3; // segment size for zigzag

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const segments = Math.max(1, Math.floor(dist / stepSize));

      const dx = (p2.x - p1.x) / segments;
      const dy = (p2.y - p1.y) / segments;

      // Normal vector for perpendicular offset
      const nx = -dy / Math.hypot(dx, dy);
      const ny = dx / Math.hypot(dx, dy);

      for (let j = 1; j <= segments; j++) {
        const cx = p1.x + dx * j;
        const cy = p1.y + dy * j;
        // Alternate perpendicular offset
        const amplitude = (j % 2 === 0 ? 1.5 : -1.5);
        if (j === segments) {
          path += ` L ${p2.x} ${p2.y}`;
        } else {
          path += ` L ${cx + nx * amplitude} ${cy + ny * amplitude}`;
        }
      }
    }
    return path;
  };

  // Generate plain polyline path
  const generatePolylinePath = (points: Position[]) => {
    if (points.length < 2) return '';
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const renderDrawing = (d: DrawingPath) => {
    if (!d || !d.points || d.points.length < 2) return null;

    // Filter points out to prevent any corrupted values causing rendering crashes
    const validPoints = d.points.filter((pt) => pt && typeof pt.x === 'number' && typeof pt.y === 'number' && !isNaN(pt.x) && !isNaN(pt.y));
    if (validPoints.length < 2) return null;

    const isWavy = d.type === 'dribble';
    const isScreen = d.type === 'screen';
    const isDotted = d.type === 'pass';
    const isShot = d.type === 'shot';
    const isHandoff = d.type === 'handoff';
    const pathString = isWavy ? generateZigzagPath(validPoints) : generatePolylinePath(validPoints);

    const start = validPoints[0];
    const end = validPoints[validPoints.length - 1];

    // Calculate tangent angle at end to orient arrows/T-bars
    const secondLast = validPoints[validPoints.length - 2];
    const angle = Math.atan2(end.y - secondLast.y, end.x - secondLast.x);
    const angleDegrees = (angle * 180) / Math.PI;

    // Build custom styling and widths for each case to differentiate clearly
    const strokeColor = '#000000'; // All play vector lines are strictly pure black
    let strokeWidth = 1.3;
    let dashArray: string | undefined = undefined;

    if (isWavy) {
      // Player moving with ball is a thick zigzag black line representing dribbling
      strokeWidth = 1.8; 
    } else if (isDotted) {
      // Ball moving as a pass is a dashed black line
      strokeWidth = 1.4;
      dashArray = '4, 3'; // dash style
    } else if (isShot) {
      // Ball moving as a shot is a black dashed line ending with a target crosshair
      strokeWidth = 1.4;
      dashArray = '4, 3';
    } else if (isScreen) {
      // Screen/block line
      strokeWidth = 1.4;
    } else if (isHandoff) {
      // Handoff (Mano a mano)
      strokeWidth = 1.4;
    } else {
      // Normal cut/run without the ball is solid black
      strokeWidth = 1.4;
    }

    return (
      <g key={d.id} className="group transition-opacity duration-200">
        {/* Hover area to tap delete draw */}
        <path
          d={pathString}
          fill="none"
          stroke="transparent"
          strokeWidth={8}
          className="cursor-pointer hover:stroke-rose-500/20"
          onClick={() => onDeleteDrawing(d.id)}
          title="Haz click para borrar este trazo"
        />

        {/* Real stroke, designed discreetly with customized styling */}
        <path
          d={pathString}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none opacity-85"
        />

        {/* End Caps (Arrows or T-bars) scaled discreetly */}
        {!isScreen && !isHandoff && (
          <path
            d="M 0,-4 L 5,0 L 0,4 Z"
            fill={strokeColor}
            transform={`translate(${end.x}, ${end.y}) rotate(${angleDegrees}) scale(0.85)`}
            className="pointer-events-none opacity-80"
          />
        )}

        {isHandoff && (
          // Draw perpendicular double lines for handoff
          <g transform={`translate(${end.x}, ${end.y}) rotate(${angleDegrees}) scale(0.85)`} className="pointer-events-none opacity-90">
            <line x1={-1.5} y1={-3.5} x2={-1.5} y2={3.5} stroke={strokeColor} strokeWidth={1.6} />
            <line x1={-3.5} y1={-3.5} x2={-3.5} y2={3.5} stroke={strokeColor} strokeWidth={1.6} />
          </g>
        )}

        {isScreen && (
          // Draw perpendicular line representing block
          <line
            x1={-1.5}
            y1={-4}
            x2={-1.5}
            y2={4}
            stroke={strokeColor}
            strokeWidth={1.8}
            transform={`translate(${end.x}, ${end.y}) rotate(${angleDegrees}) scale(0.85)`}
            className="pointer-events-none opacity-80"
          />
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col bg-brand-panel border border-brand-border rounded-xl overflow-hidden p-3 shadow-xl h-full">
      {/* Relocated Starting position manual setup status box so it is physically touching the blackboard/whiteboard! */}
      {!isViewerMode && (
        <div className="print-hidden mb-3 p-3 rounded-lg border transition-all duration-300 bg-brand-bg/30 border-brand-border/40 text-brand-text-dim">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <span className="text-lg mt-0.5">{isInitialSetupMode ? '📍' : '🔥'}</span>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-text-bright flex items-center gap-1.5">
                  {isInitialSetupMode ? (
                    <span className="text-amber-400 font-extrabold animate-pulse">Paso 1: Colocar Posiciones Iniciales</span>
                  ) : (
                    <span className="text-brand-accent font-extrabold">Fase: Motor Inteligente "Coach Studio" Activo</span>
                  )}
                </h4>
                <p className="text-[10px] leading-relaxed mt-0.5 text-brand-text-dim max-w-2xl">
                  {isInitialSetupMode 
                    ? 'Arrastra los jugadores y el balón a su sitio de salida. Al terminar dale al botón para empezar a grabar la jugada paso a paso.'
                    : 'Los movimientos se graban solos al arrastrar: Jugador con balón hace BOTE (naranja), Jugador sin balón hace CORTE (verde) o BLOQUEO (rosa si eliges la herramienta), Balón suelto a jugador hace PASE (azul) y Balón a canasta hace TIRO (rojo).'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {isInitialSetupMode ? (
                <button
                  type="button"
                  id="btn-start-graphing"
                  onClick={() => {
                    setIsInitialSetupMode(false);
                    setDrawTool('select'); // Start in select mode for smart drag-and-drop actions!
                    if (onStartGraphing) {
                      onStartGraphing();
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 bg-gradient-to-r from-brand-accent to-amber-500 hover:from-brand-accent/95 hover:to-amber-500/95 text-white text-[10px] font-bold rounded-lg shadow-md shadow-brand-accent/10 hover:shadow-brand-accent/20 transition-all scale-100 active:scale-95 cursor-pointer text-center whitespace-nowrap"
                >
                  🚀 Empezar a Grafiar Jugada
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsInitialSetupMode(true);
                    setDrawTool('select');
                  }}
                  className="w-full sm:w-auto px-2.5 py-1.2 bg-brand-bg hover:bg-white/5 border border-brand-border text-brand-text-bright text-[9px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  ⚙️ Ajustar Inicio Manual
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main SVG Board */}
      <div 
        className={`relative rounded-xl overflow-hidden border border-amber-900/60 select-none shadow-2xl w-full mx-auto transition-all duration-300 ${
          courtType === 'half' 
            ? 'aspect-[1.15/1] max-w-[540px] max-h-[440px] sm:max-h-[480px]' 
            : 'aspect-[1.75/1] max-w-[850px] max-h-[420px] sm:max-h-[460px]'
        }`}
      >
        <svg
          id="tactical-board"
          ref={svgRef}
          viewBox="0 0 100 100"
          className="w-full h-full cursor-crosshair touch-none select-none"
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            {/* Wooden Parquet Base Gradient */}
            <linearGradient id="court-wood-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3cca2" />
              <stop offset="35%" stopColor="#e2bc8d" />
              <stop offset="70%" stopColor="#dca870" />
              <stop offset="100%" stopColor="#c99558" />
            </linearGradient>
            
            {/* Realistic Wooden Plank Striping Pattern */}
            <pattern id="parquet-planks" width="8" height="40" patternUnits="userSpaceOnUse">
              <rect width="1.6" height="40" fill="rgba(255, 255, 255, 0.05)" />
              <rect x="1.6" width="1.6" height="40" fill="rgba(0, 0, 0, 0.01)" />
              <rect x="3.2" width="1.6" height="40" fill="rgba(255, 255, 255, 0.02)" />
              <rect x="4.8" width="1.6" height="40" fill="rgba(0, 0, 0, 0.02)" />
              <rect x="6.4" width="1.6" height="40" fill="rgba(255, 255, 255, 0.04)" />
              {/* Wooden joints and grain dividers */}
              <line x1="0" y1="0" x2="0" y2="40" stroke="rgba(94, 53, 11, 0.16)" strokeWidth="0.12" />
              <line x1="1.6" y1="0" x2="1.6" y2="40" stroke="rgba(94, 53, 11, 0.08)" strokeWidth="0.08" />
              <line x1="3.2" y1="0" x2="3.2" y2="40" stroke="rgba(94, 53, 11, 0.14)" strokeWidth="0.1" />
              <line x1="4.8" width="1.6" x2="4.8" y2="40" stroke="rgba(94, 53, 11, 0.09)" strokeWidth="0.08" />
              <line x1="6.4" y1="0" x2="6.4" y2="40" stroke="rgba(94, 53, 11, 0.15)" strokeWidth="0.1" />
              
              {/* Staggered plank edge ends */}
              <line x1="0" y1="12" x2="1.6" y2="12" stroke="rgba(94, 53, 11, 0.12)" strokeWidth="0.1" />
              <line x1="1.6" y1="28" x2="3.2" y2="28" stroke="rgba(94, 53, 11, 0.12)" strokeWidth="0.1" />
              <line x1="3.2" y1="8" x2="4.8" y2="8" stroke="rgba(94, 53, 11, 0.12)" strokeWidth="0.1" />
              <line x1="4.8" y1="34" x2="6.4" y2="34" stroke="rgba(94, 53, 11, 0.12)" strokeWidth="0.1" />
              <line x1="6.4" y1="20" x2="8" y2="20" stroke="rgba(94, 53, 11, 0.12)" strokeWidth="0.1" />
            </pattern>
          </defs>

          {/* BACKGROUND FILLS */}
          <rect x="0" y="0" width="100" height="100" fill="url(#court-wood-grad)" />
          <rect x="0" y="0" width="100" height="100" fill="url(#parquet-planks)" />
          {/* Subtle varnished court gloss overlay */}
          <rect x="0" y="0" width="100" height="100" fill="rgba(255, 255, 255, 0.02)" />

          {/* COURT MARKINGS (Crisp white representing real floor painted lines) */}
          {/* Outer Boundary line */}
          <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="0.9" rx="1.5" />

          {courtType === 'half' ? (
            // HALF COURT SPECIFICS (Baseline is at Y=8, Midcourt line is Y=94, hoop centered horizontally at 50, Y=14)
            <>
              {/* Midcourt boundary (Bottom line) */}
              <line x1="2" y1="94" x2="98" y2="94" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1" />
              {/* Midcourt circle arc */}
              <path d="M 40,94 A 10,10 0 0,0 60,94" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />

              {/* The Key (Zona de tres segundos) */}
              <rect x="37" y="8" width="26" height="35" fill="rgba(255,255,255,0.01)" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />
              {/* Key Free Throw circle */}
              <path d="M 37,43 A 13,13 0 0,0 63,43" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />
              <path d="M 37,43 A 13,13 0 0,1 63,43" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.8" strokeDasharray="2,2" />

              {/* Restricted Area Semi-circle under hoop */}
              <path d="M 46,14 A 4,4 0 0,0 54,14" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="0.6" />

              {/* Backboard and Hoop */}
              <line x1="44" y1="11" x2="56" y2="11" stroke="#ffffff" strokeWidth="1.2" /> {/* Tablero */}
              <line x1="50" y1="11" x2="50" y2="13.2" stroke="#ffffff" strokeWidth="0.9" /> {/* Soporte */}
              <circle cx="50" cy="14.2" r="1.6" fill="none" stroke="#FF6B00" strokeWidth="1.2" /> {/* Aro de canasta naranja */}

              {/* Three-point arc (Center 50, Y=14, radius ~36%) */}
              <path
                d="M 12,8 L 12,25 A 38,36 0 0,0 88,25 L 88,8"
                fill="none"
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth="1.0"
              />
            </>
          ) : (
            // FULL COURT SPECIFICS (Left basket at X=6.5, Right basket at X=93.5, midcourt center circle at 50,50)
            <>
              {/* Midcourt Line */}
              <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.1" />
              {/* Center Restrictive Circles */}
              <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="4" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.6" />

              {/* Left Key */}
              <rect x="2" y="32" width="22" height="36" fill="rgba(255,255,255,0.01)" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />
              {/* Left FT semi-circle */}
              <path d="M 24,32 A 18,18 0 0,1 24,68" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />
              <path d="M 24,32 A 18,18 0 0,0 24,68" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.8" strokeDasharray="2,2" />
              {/* Left Basket details */}
              <line x1="5" y1="44" x2="5" y2="56" stroke="#ffffff" strokeWidth="1.2" />
              <line x1="5" y1="50" x2="7.2" y2="50" stroke="#ffffff" strokeWidth="0.9" />
              <circle cx="8.5" cy="50" r="1.6" fill="none" stroke="#FF6B00" strokeWidth="1.2" />
              {/* Left Three Point Arc */}
              <path d="M 2,12 L 18,12 A 38,38 0 0,1 18,88 L 2,88" fill="none" stroke="rgba(255, 255, 255, 0.95)" strokeWidth="1.0" />

              {/* Right Key */}
              <rect x="76" y="32" width="22" height="36" fill="rgba(255,255,255,0.01)" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />
              {/* Right FT semi-circle */}
              <path d="M 76,32 A 18,18 0 0,0 76,68" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.8" />
              <path d="M 76,32 A 18,18 0 0,1 76,68" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.8" strokeDasharray="2,2" />
              {/* Right Basket details */}
              <line x1="95" y1="44" x2="95" y2="56" stroke="#ffffff" strokeWidth="1.2" />
              <line x1="95" y1="50" x2="92.8" y2="50" stroke="#ffffff" strokeWidth="0.9" />
              <circle cx="91.5" cy="50" r="1.6" fill="none" stroke="#FF6B00" strokeWidth="1.2" />
              {/* Right Three Point Arc */}
              <path d="M 98,12 L 82,12 A 38,38 0 0,0 82,88 L 98,88" fill="none" stroke="rgba(255, 255, 255, 0.95)" strokeWidth="1.0" />
            </>
          )}

          {/* PLAY DRAWINGS (DISABLED VISUALLY - PRESERVED FOR ENGINE MOVEMENT POLYLINES AND COGNITIVE TRANSCRIPTER) */}
          {false && drawings
            .filter((d) => {
              if (d && d.id) {
                // If this is an automatic player step movement trail
                const parts = d.id.split('-');
                if (parts[0] === 'step') {
                  const stepIdx = parseInt(parts[1], 10);
                  if (!isNaN(stepIdx) && stepIdx > currentStepIndex) {
                    return false;
                  }
                  
                  if (parts[2] === 'player') {
                    const playerId = parts[3];
                    if (deletedDefenders.includes(playerId)) {
                      return false;
                    }
                  }
                }
                
                // If this is a custom drawing bound to a deleted defender
                if (d.startPlayerId && deletedDefenders.includes(d.startPlayerId)) {
                  return false;
                }
                if (d.endPlayerId && deletedDefenders.includes(d.endPlayerId)) {
                  return false;
                }
              }
              return true;
            })
            .map((d) => {
              const dResolved = resolveDynamicDrawing(d);
              return renderDrawing(dResolved);
            })}

          {/* CURRENT TEMPORARY DRAWING (DISABLED VISUALLY - EXCLUDED TO KEEP WHITE PARQUET PRISTINE AND VOID OF CLUTTER) */}
          {false && tempDrawing && tempDrawing.length >= 2 && (
            <path
              d={drawTool === 'dribble' ? generateZigzagPath(tempDrawing) : generatePolylinePath(tempDrawing)}
              fill="none"
              stroke="#000000"
              strokeWidth={1.6}
              strokeDasharray={drawTool === 'pass' || drawTool === 'shot' ? '4,3' : undefined}
              className="opacity-60 pointer-events-none"
            />
          )}

          {/* VISUAL CHAINS / ANCHOR LINES BETWEEN ANCHORED PLAYERS AND THEIR TARGETS (DISABLED VISUALLY PER DIRECTIVE) */}
          {false && Object.entries(playerAnchors).map(([srcId, targetId]) => {
            if (!targetId) return null;
            if (srcId.startsWith('D') && deletedDefenders.includes(srcId)) return null;
            const sourcePlayer = players.find((p) => p.id === srcId);
            const targetPlayer = players.find((p) => p.id === targetId);
            if (!sourcePlayer || !targetPlayer) return null;

            return (
              <g key={`anchor-link-${srcId}-${targetId}`} className="pointer-events-none opacity-45">
                {/* Thin dashed connection line */}
                <line
                  x1={targetPlayer.x}
                  y1={targetPlayer.y}
                  x2={sourcePlayer.x}
                  y2={sourcePlayer.y}
                  stroke="#000000"
                  strokeWidth={0.5}
                  strokeDasharray="1.5,1.5"
                />
                {/* Small indicator dot in the middle */}
                <circle
                  cx={(targetPlayer.x + sourcePlayer.x) / 2}
                  cy={(targetPlayer.y + sourcePlayer.y) / 2}
                  r={0.6}
                  fill="#000000"
                />
              </g>
            );
          })}

          {/* PLAYER NODES */}
          {players.filter(Boolean).filter(p => !deletedDefenders.includes(p.id)).map((p) => {
            if (!p || !p.id) return null;
            
            // Defensively guard against NaN/undefined coordinates to prevent runtime app crashes (e.g., black screen)
            const px = typeof p.x === 'number' && !isNaN(p.x) ? p.x : 50;
            const py = typeof p.y === 'number' && !isNaN(p.y) ? p.y : 50;

            const isBall = p.type === 'ball';
            const isDefense = p.type === 'defense';
            const isOffense = p.type === 'offense';

            // Visually offset the ball slightly when it is held/coupled by any player.
            // This prevents overlapping circles, resolving hit test blocking so coaches can easily drag player or ball.
            let renderX = px;
            let renderY = py;
            if (isBall) {
              const ballCarrier = players.find(
                (pl) => pl.id !== 'Ball' && !deletedDefenders.includes(pl.id) && Math.hypot(px - pl.x, py - pl.y) < 2.5
              );
              if (ballCarrier) {
                renderX = ballCarrier.x + 3.2;
                renderY = ballCarrier.y - 3.0;
              }
            }

            // Resolve custom roster labels and numbers
            const rawLabel = playerNames?.[p.id] || '';
            const numMatch = rawLabel.match(/\((\d+)\)/);
            const customNumber = numMatch ? numMatch[1] : (p.id.match(/\d+/)?.at(0) || '1');
            const nameOnly = rawLabel.replace(/\(\d+\)/g, '').replace(/👤|🛡️/g, '').trim();
            const fallbackName = isOffense ? `Atacante ${p.id.substring(1)}` : `Defensor X${p.id.substring(1)}`;
            const customName = nameOnly || fallbackName;

            return (
              <g
                key={p.id}
                onPointerDown={(e) => handlePointerDown(e, p.id)}
                className={`select-none ${
                  isAnimating ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{ touchAction: 'none' }}
              >
                {/* Base Player Circle/Ball Visualizer */}
                {isBall ? (
                  <>
                    <circle
                      cx={renderX}
                      cy={renderY}
                      r={2.2}
                      fill="#ea580c"
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      className="shadow-md"
                      filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.4))"
                    />
                    {/* Basketball details: seam lines */}
                     <path
                       d={`M ${renderX - 2.0} ${renderY} L ${renderX + 2.0} ${renderY} M ${renderX} ${renderY - 2.0} L ${renderX} ${renderY + 2.0}`}
                       stroke="#2c0a00"
                       strokeWidth={0.25}
                       fill="none"
                       className="pointer-events-none"
                     />
                     <path
                       d={`M ${renderX - 1.4} ${renderY - 1.4} Q ${renderX} ${renderY} ${renderX + 1.4} ${renderY + 1.4}`}
                       stroke="#2c0a00"
                       strokeWidth={0.2}
                       fill="none"
                       className="pointer-events-none"
                     />
                     <path
                       d={`M ${renderX - 1.4} ${renderY + 1.4} Q ${renderX} ${renderY} ${renderX + 1.4} ${renderY - 1.4}`}
                       stroke="#2c0a00"
                       strokeWidth={0.2}
                       fill="none"
                       className="pointer-events-none"
                     />
                  </>
                ) : isDefense ? (
                  <>
                    {/* Transparent touch area for easy dragging */}
                    <circle cx={px} cy={py} r={3.8} fill="transparent" />
                    {/* Standalone red 'X' cross */}
                    <line x1={px - 1.6} y1={py - 1.6} x2={px + 1.6} y2={py + 1.6} stroke="#ef4444" strokeWidth={1.4} strokeLinecap="round" />
                    <line x1={px + 1.6} y1={py - 1.6} x2={px - 1.6} y2={py + 1.6} stroke="#ef4444" strokeWidth={1.4} strokeLinecap="round" />
                    {/* Digit offset as subscript next to X */}
                    <text
                      x={px + 2.2}
                      y={py + 1.6}
                      fontSize="2.2"
                      fontWeight="black"
                      fill="#ef4444"
                      className="pointer-events-none select-none font-sans"
                    >
                      {customNumber}
                    </text>
                  </>
                ) : (
                  (() => {
                    const ballItem = players.find((pl) => pl.id === 'Ball');
                    const hasBall = ballItem && Math.hypot(px - ballItem.x, py - ballItem.y) < 2.5;

                    if (hasBall) {
                      return (
                        <>
                          {/* Circled number design for ball carriers */}
                          <circle
                            cx={px}
                            cy={py}
                            r={3.0}
                            fill="#ffffff"
                            stroke="#000000"
                            strokeWidth={1.3}
                            filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.3))"
                          />
                          <text
                            x={px}
                            y={py + 1.1}
                            textAnchor="middle"
                            fill="#000000"
                            fontSize="3.1"
                            fontWeight="black"
                            className="pointer-events-none select-none font-sans"
                          >
                            {customNumber}
                          </text>
                        </>
                      );
                    } else {
                      return (
                        <>
                          {/* Transparent touch area for easy dragging */}
                          <circle cx={px} cy={py} r={3.8} fill="transparent" />
                          {/* Standalone black list digits */}
                          <text
                            x={px}
                            y={py + 1.3}
                            textAnchor="middle"
                            fill="#000000"
                            fontSize="3.8"
                            fontWeight="black"
                            className="pointer-events-none select-none font-sans"
                          >
                            {customNumber}
                          </text>
                        </>
                      );
                    }
                  })()
                )}

                {/* Little helper name tag underneath the node */}
                {!isBall && (
                  <g className="pointer-events-none select-none">
                    <rect
                      x={px - 6}
                      y={py + 3.8}
                      width={12}
                      height={2.2}
                      fill="rgba(15, 23, 42, 0.75)"
                      rx={0.5}
                      className="hidden md:block"
                    />
                    <text
                      x={px}
                      y={py + 5.3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="1.5"
                      fontWeight="bold"
                      className="font-sans hidden md:block"
                    >
                      {customName}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
