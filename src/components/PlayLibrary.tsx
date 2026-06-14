import React, { useState } from 'react';
import { Play } from '../types';

interface PlayLibraryProps {
  plays: Play[];
  activePlayId: string;
  onSelectPlay: (playId: string) => void;
  onSavePlay: (name: string, description: string, category: 'banda' | 'fondo' | 'juego') => void;
  onDeletePlay: (playId: string) => void;
  currentPlay: Play;
  onShareLibrary: () => void;
  onShareLibraryWhatsApp: () => void;
}

export default function PlayLibrary({
  plays,
  activePlayId,
  onSelectPlay,
  onSavePlay,
  onDeletePlay,
  currentPlay,
  onShareLibrary,
  onShareLibraryWhatsApp,
}: PlayLibraryProps) {
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveCategory, setSaveCategory] = useState<'banda' | 'fondo' | 'juego'>('juego');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'juego' | 'banda' | 'fondo'>('juego');

  const handleCreateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    onSavePlay(saveName, saveDescription, saveCategory);
    setSaveName('');
    setSaveDescription('');
    setSaveCategory('juego');
    setShowSaveModal(false);
  };

  // Filter plays to active category
  // If a play doesn't have a category, treat it as 'juego'
  const filteredPlays = plays.filter((play) => {
    const cat = play.category || 'juego';
    return cat === activeTab;
  });

  return (
    <div className="flex flex-col bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl text-brand-text-bright h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border pb-3 mb-3 gap-2">
        <h3 className="text-sm font-bold tracking-wider text-brand-text-dim uppercase">📖 Biblioteca de Sistemas</h3>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            onClick={onShareLibrary}
            className="bg-brand-accent/20 hover:bg-brand-accent/30 border border-brand-accent/30 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Copiar enlace de toda la biblioteca"
          >
            🔗 Copiar Enlace
          </button>
          <button
            onClick={onShareLibraryWhatsApp}
            className="bg-[#25D366] hover:bg-[#1ebd53] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 text-center"
            title="Compartir biblioteca táctica por WhatsApp (reproducción)"
          >
            💬 WhatsApp
          </button>
        </div>
      </div>

      {/* Playbook Category Tabs */}
      <div className="flex border-b border-brand-border/60 mb-3 text-xs select-none p-0.5 bg-brand-bg/50 rounded-lg gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('juego')}
          className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer text-[10px] md:text-xs ${
            activeTab === 'juego'
              ? 'bg-brand-accent/15 text-white border border-brand-accent/30 font-bold'
              : 'text-brand-text-dim hover:text-brand-text-bright'
          }`}
        >
          🏀 Juego
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('banda')}
          className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer text-[10px] md:text-xs ${
            activeTab === 'banda'
              ? 'bg-brand-accent/15 text-white border border-brand-accent/30 font-bold'
              : 'text-brand-text-dim hover:text-brand-text-bright'
          }`}
        >
          ↔️ Banda
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fondo')}
          className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer text-[10px] md:text-xs ${
            activeTab === 'fondo'
              ? 'bg-brand-accent/15 text-white border border-brand-accent/30 font-bold'
              : 'text-brand-text-dim hover:text-brand-text-bright'
          }`}
        >
          ↕️ Fondo
        </button>
      </div>

      {/* Plays Item List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] md:max-h-none scrollbar-thin scrollbar-thumb-brand-border pr-1 min-h-[160px]">
        {filteredPlays.length === 0 ? (
          <div className="text-center py-8 text-xs text-brand-text-dim bg-brand-bg/20 rounded-xl border border-dashed border-brand-border/40">
            🚫 No hay jugadas guardadas en este apartado
          </div>
        ) : (
          filteredPlays.map((play) => {
            const isActive = play.id === activePlayId;

            return (
              <div
                key={play.id}
                onClick={() => onSelectPlay(play.id)}
                className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-accent/10 border-brand-accent text-white shadow-lg shadow-brand-accent/5'
                    : 'bg-brand-bg/60 border-brand-border text-brand-text-dim hover:bg-brand-bg hover:border-brand-text-dim/30'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-xs line-clamp-1 text-brand-text-bright">{play.name}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold font-mono bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                      {play.category === 'banda' ? 'BANDA ↔️' : play.category === 'fondo' ? 'FONDO ↕️' : 'JUEGO 🏀'}
                    </span>
                    <span className="text-[10px] text-brand-text-dim">
                      ({play.steps.length} {play.steps.length === 1 ? 'paso' : 'pasos'})
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-text-dim line-clamp-2 leading-relaxed">
                    {play.description}
                  </p>
                  <div className="mt-1.5 text-[9px] text-brand-text-dim font-semibold font-mono uppercase">
                    🎬 {play.courtType === 'half' ? 'Media Cancha' : 'Cancha Completa'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-1 items-end shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlay(play.id);
                    }}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-500 text-xs cursor-pointer transition-transform duration-200 hover:scale-110"
                    title="Eliminar de biblioteca"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Button to show save form */}
      <div className="mt-4 pt-4 border-t border-brand-border select-none">
        <button
          id="btn-show-save-modal"
          onClick={() => setShowSaveModal(true)}
          className="w-full py-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-accent/20 transition-all cursor-pointer text-center"
        >
          💾 Guardar Jugada Actual en Biblioteca
        </button>
      </div>

      {/* Embedded Save Dialog Overlay */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleCreateSave}
            className="bg-brand-panel border border-brand-border rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl shadow-brand-accent/10"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-brand-text-bright">Guardar Pizarra Táctica</h4>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-brand-text-dim hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-dim mb-1">Nombre de la Jugada</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cuernos con pase ciego"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full text-xs bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text-bright focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/40"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-dim mb-1">Apartado de Pizarra</label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value as 'banda' | 'fondo' | 'juego')}
                  className="w-full text-xs bg-brand-bg border border-brand-border rounded-lg px-2.5 py-2 text-brand-text-bright focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/40"
                >
                  <option value="juego">🏀 Juego en Estático</option>
                  <option value="banda">↔️ Saque de Banda</option>
                  <option value="fondo">↕️ Saque de Fondo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-dim mb-1">Descripción / Instrucciones</label>
                <textarea
                  placeholder="Detalles tácticos, claves de defensa o rotaciones"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text-bright focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/40 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end text-xs">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 bg-brand-bg hover:bg-white/5 border border-brand-border rounded-lg text-brand-text-bright font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-lg cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
