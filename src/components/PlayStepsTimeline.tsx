import React from 'react';
import { PlayStep } from '../types';

interface PlayStepsTimelineProps {
  steps: PlayStep[];
  currentStepIndex: number;
  fractionalIndex: number;
  isAnimating: boolean;
  playbackSpeed: number;
  courtType?: 'half' | 'full';
  onSelectStep: (index: number) => void;
  onAddStep: () => void;
  onDuplicateStep: (index: number) => void;
  onDeleteStep: (index: number) => void;
  onUpdateStepDescription: (index: number, description: string) => void;
  onUpdateStepDuration: (index: number, duration: number) => void;
  onPlayToggle: () => void;
  onStop: () => void;
  onSetSpeed: (speed: number) => void;
  onScrub: (index: number) => void;
  autoCreateStepOnMove?: boolean;
  onToggleAutoCreateStep?: (val: boolean) => void;
  isViewerMode?: boolean;
  onClearAnimationSteps?: () => void;
}

export default function PlayStepsTimeline({
  steps,
  currentStepIndex,
  fractionalIndex,
  isAnimating,
  playbackSpeed,
  courtType = 'half',
  onSelectStep,
  onAddStep,
  onDuplicateStep,
  onDeleteStep,
  onUpdateStepDescription,
  onUpdateStepDuration,
  onPlayToggle,
  onStop,
  onSetSpeed,
  onScrub,
  autoCreateStepOnMove = true,
  onToggleAutoCreateStep,
  isViewerMode = false,
  onClearAnimationSteps,
}: PlayStepsTimelineProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(null);

  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const currentStep = steps[currentStepIndex];
      const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;

      if (!currentStep) return;

      const response = await fetch('/api/generate-step-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlayers: currentStep.players,
          prevPlayers: prevStep ? prevStep.players : null,
          courtType: courtType,
          stepIndex: currentStepIndex,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo al generar la descripción');
      }

      const data = await response.json();
      if (data.description) {
        onUpdateStepDescription(currentStepIndex, data.description);
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Error de conexión');
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="flex flex-col bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl text-brand-text-bright gap-4">
      {/* Play/Pause Scrubber Area */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-brand-bg/85 p-3 rounded-xl border border-brand-border">
        {/* Play Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-play-toggle"
            onClick={onPlayToggle}
            className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-lg ${
              isAnimating
                ? 'bg-brand-accent/90 hover:bg-brand-accent text-white animate-pulse shadow-brand-accent/40'
                : 'bg-brand-accent hover:bg-brand-accent/90 text-white shadow-brand-accent/20'
            }`}
          >
            {isAnimating ? (
              // Pause icon
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              // Play icon
              <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            id="btn-stop"
            onClick={onStop}
            className="w-10 h-10 rounded-full bg-brand-bg hover:bg-white/5 border border-brand-border flex items-center justify-center cursor-pointer transition-all"
            title="Reiniciar reproducción"
          >
            {/* Stop icon */}
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
              <path d="M6 19h12V5H6v14z" />
            </svg>
          </button>
        </div>

        {/* Real-time slider scrubbing */}
        <div className="flex-1 w-full flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-brand-text-dim font-mono">
            <span>Progreso Animación</span>
            <span>
              Paso {Math.floor(fractionalIndex) + 1} / {steps.length} ({((fractionalIndex / Math.max(1, steps.length - 1)) * 100).toFixed(0)}%)
            </span>
          </div>
          <input
            id="animation-scrubber"
            type="range"
            min={0}
            max={Math.max(0, steps.length - 1)}
            step={0.01}
            value={fractionalIndex}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-brand-border rounded-lg appearance-none cursor-ew-resize accent-brand-accent"
          />
        </div>

        {/* Velocity Controls */}
        <div className="flex items-center gap-1.5 bg-brand-border/40 p-1.5 rounded-lg shrink-0">
          <span className="text-[10px] uppercase font-bold text-brand-text-dim px-1 font-mono">Vel:</span>
          {[0.5, 1.0, 1.5, 2.0].map((speed) => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              className={`px-2 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                playbackSpeed === speed
                  ? 'bg-brand-accent text-white font-bold shadow'
                  : 'text-brand-text-dim hover:bg-white/5'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Frame step nodes list / Timeline strip */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h4 className="text-sm font-semibold tracking-wide text-brand-text-dim uppercase">Fotogramas de la Jugada</h4>
            {!isViewerMode && onClearAnimationSteps && steps.length > 1 && (
              <button
                type="button"
                onClick={onClearAnimationSteps}
                className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 hover:border-red-500/80 text-red-400 hover:text-red-300 rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-sm"
                title="Borrar todos los fotogramas creados manteniendo la posición inicial"
              >
                🧹 Borrar Fotogramas
              </button>
            )}
          </div>
          {!isViewerMode && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-brand-text-bright hover:text-white cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={autoCreateStepOnMove}
                  onChange={(e) => onToggleAutoCreateStep?.(e.target.checked)}
                  className="w-4 h-4 rounded bg-brand-bg border-brand-border accent-brand-accent focus:ring-0 cursor-pointer"
                />
                <span className="flex items-center gap-1">✨ Auto-crear paso al mover</span>
              </label>
            </div>
          )}
        </div>

        {/* Step Cells strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 pr-1 select-none scrollbar-thin scrollbar-thumb-brand-border">
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            return (
              <div
                key={idx}
                className={`relative flex flex-col min-w-[95px] max-w-[110px] p-1.5 rounded-lg border transition-all cursor-pointer text-center ${
                  isActive
                    ? 'bg-brand-accent/20 border-brand-accent shadow-md scale-102 font-semibold text-white'
                    : 'bg-brand-bg/90 border-brand-border text-brand-text-dim hover:border-brand-text-dim/60 hover:bg-brand-panel'
                }`}
                onClick={() => onSelectStep(idx)}
              >
                <div className="flex items-center justify-between text-[10px] mb-0.5 font-mono font-bold">
                  <span>🚀 P{idx + 1}</span>
                  {!isViewerMode && (
                    <div className="flex items-center gap-0.5">
                      <button
                        title="Duplicar"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateStep(idx);
                        }}
                        className="p-0.5 hover:bg-white/10 rounded text-amber-400 cursor-pointer text-[9px]"
                      >
                        📁
                      </button>
                      {steps.length > 1 && (
                        <button
                          title="Borrar"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStep(idx);
                          }}
                          className="p-0.5 hover:bg-red-950/40 rounded text-red-500 cursor-pointer text-[9px]"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-mono text-brand-text-dim/80 text-left mt-0.5 border-t border-brand-border/30 pt-1 flex items-center justify-between">
                  <span>Duración:</span>
                  <span className="font-bold text-brand-text-bright">{step.duration}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Notepad details Editor */}
      {!isViewerMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-brand-border pt-4">
          {/* Step Notes Description Editor */}
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-brand-text-bright uppercase tracking-wide">
                📝 Instrucciones Técnicas (Paso {currentStepIndex + 1})
              </label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={isGenerating || isAnimating}
                className="text-[11px] font-semibold bg-brand-accent/20 border border-brand-accent/40 rounded-lg px-2.5 py-1 text-brand-text-bright hover:bg-brand-accent/35 transition-all duration-200 disabled:opacity-50 flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Analiza automáticamente los vectores de movimiento y genera la descripción táctica en español con IA"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-brand-text-bright" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando descripción...
                  </>
                ) : (
                  <>✨ Escribir paso con IA</>
                )}
              </button>
            </div>
            {generationError && (
              <p className="text-[11px] text-red-400 font-medium">⚠️ {generationError}</p>
            )}
            <textarea
              id="step-description-editor"
              value={steps[currentStepIndex]?.description || ''}
              onChange={(e) => onUpdateStepDescription(currentStepIndex, e.target.value)}
              disabled={isAnimating}
              placeholder="Introduce qué se realiza en este paso o usa el botón de IA para redactarlo según los movimientos de los jugadores..."
              rows={3}
              className="w-full text-sm bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-brand-text-bright focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 resize-none placeholder:text-brand-text-dim/40 disabled:opacity-60"
            />
          </div>

          {/* Step Configuration Parameter */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-text-bright uppercase tracking-wide">
                ⏱️ Duración de este Paso
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="step-duration-editor"
                  type="number"
                  min={0.5}
                  max={10.0}
                  step={0.5}
                  disabled={isAnimating}
                  value={steps[currentStepIndex]?.duration || 1.5}
                  onChange={(e) => onUpdateStepDuration(currentStepIndex, parseFloat(e.target.value) || 1.5)}
                  className="w-20 text-sm bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-brand-text-bright focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 text-center font-mono disabled:opacity-60"
                />
                <span className="text-xs text-brand-text-dim">segundos</span>
              </div>
              <p className="text-[10px] text-brand-text-dim/60 italic mt-1 leading-normal">
                Tiempo que tardarán los jugadores en desplazarse de forma fluida desde el paso anterior.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
