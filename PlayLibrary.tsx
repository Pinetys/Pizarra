import React, { useState } from 'react';
import { Play } from '../types';

interface PlayLibraryProps {
  plays: Play[];
  activePlayId: string;
  onSelectPlay: (playId: string) => void;
  onSavePlay: (name: string, description: string, category: 'banda' | 'fondo' | 'juego') => void;
  onUpdatePlayDetails?: (playId: string, name: string, description: string, category: 'banda' | 'fondo' | 'juego') => void;
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
  onUpdatePlayDetails,
  onDeletePlay,
  currentPlay,
  onShareLibrary,
  onShareLibraryWhatsApp,
}: PlayLibraryProps) {
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveCategory, setSaveCategory] = useState<'banda' | 'fondo' | 'juego'>('juego');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'juego' | 'banda' | 'fondo'>(() => {
    return currentPlay.category || 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Keep tab in sync with selected play's category if active play changes
  React.useEffect(() => {
    if (currentPlay && currentPlay.category && activeTab !== 'all' && currentPlay.category !== activeTab) {
      setActiveTab(currentPlay.category);
    }
  }, [currentPlay.id, currentPlay.category]);

  // State for editing existing play details
  const [editingPlay, setEditingPlay] = useState<Play | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<'banda' | 'fondo' | 'juego'>('juego');

  const handleOpenEditModal = (play: Play, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlay(play);
    setEditName(play.name);
    setEditDescription(play.description || '');
    setEditCategory(play.category || 'juego');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlay || !editName.trim()) return;
    if (onUpdatePlayDetails) {
      onUpdatePlayDetails(editingPlay.id, editName.trim(), editDescription.trim(), editCategory);
    }
    setEditingPlay(null);
  };

  const handleCreateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    onSavePlay(saveName, saveDescription, saveCategory);
    setSaveName('');
    setSaveDescription('');
    setSaveCategory('juego');
    setShowSaveModal(false);
  };

  // Count plays per category
  const juegoCount = plays.filter((p) => (p.category || 'juego') === 'juego').length;
  const bandaCount = plays.filter((p) => p.category === 'banda').length;
  const fondoCount = plays.filter((p) => p.category === 'fondo').length;

  // Filter plays to active category and search query
  const filteredPlays = plays.filter((play) => {
    const cat = play.category || 'juego';
    const matchesCategory = activeTab === 'all' || cat === activeTab;
    const matchesSearch =
      !searchQuery.trim() ||
      play.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (play.description && play.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col bg-brand-panel border border-brand-border rounded-xl p-4 shadow-xl text-brand-text-bright h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border pb-3 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <h3 className="text-sm font-bold tracking-wider text-brand-text-bright uppercase">
            Biblioteca de Jugadas ({plays.length})
          </h3>
        </div>
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

      {/* Search filter input */}
      <div className="mb-2.5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar jugada por nombre o acción..."
            className="w-full bg-brand-bg/80 border border-brand-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-brand-text-bright placeholder:text-brand-text-dim/60 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/40 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-dim hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Playbook Category Tabs */}
      <div className="grid grid-cols-4 border-b border-brand-border/60 mb-3 text-xs select-none p-0.5 bg-brand-bg/50 rounded-lg gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer text-[10px] md:text-xs flex items-center justify-center gap-1 ${
            activeTab === 'all'
              ? 'bg-brand-accent text-white font-bold shadow'
              : 'text-brand-text-dim hover:text-brand-text-bright'
          }`}
        >
          <span>Todas</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded-full">{plays.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('juego')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer text-[10px] md:text-xs flex items-center justify-center gap-1 ${
            activeTab === 'juego'
              ? 'bg-brand-accent text-white font-bold shadow'
              : 'text-brand-text-dim hover:text-brand-text-bright'
          }`}
        >
          <span>🏀 Juego</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded-full">{juegoCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('banda')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer text-[10px] md:text-xs flex items-center justify-center gap-1 ${
            activeTab === 'banda'
              ? 'bg-brand-accent text-white font-bold shadow'
              : 'text-brand-text-dim hover:text-brand-text-bright'
          }`}
        >
          <span>↔️ Banda</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded-full">{bandaCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fondo')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer text-[10px] md:text-xs flex items-center justify-center gap-1 ${
            activeTab === 'fondo'
              ? 'bg-brand-accent text-white font-bold shadow'
              : 'text-brand-text-dim hover:text-brand-text-bright'
          }`}
        >
          <span>↕️ Fondo</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded-full">{fondoCount}</span>
        </button>
      </div>

      {/* Plays Item List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[420px] md:max-h-none scrollbar-thin scrollbar-thumb-brand-border pr-1 min-h-[200px]">
        {filteredPlays.length === 0 ? (
          <div className="text-center py-8 text-xs text-brand-text-dim bg-brand-bg/20 rounded-xl border border-dashed border-brand-border/40">
            {searchQuery ? `🚫 No se encontraron jugadas que coincidan con "${searchQuery}"` : '🚫 No hay jugadas guardadas en este apartado'}
          </div>
        ) : (
          filteredPlays.map((play) => {
            const isActive = play.id === activePlayId;

            return (
              <div
                key={play.id}
                onClick={() => onSelectPlay(play.id)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer gap-2 ${
                  isActive
                    ? 'bg-brand-accent/15 border-brand-accent text-white shadow-lg shadow-brand-accent/10 ring-1 ring-brand-accent/50'
                    : 'bg-brand-bg/70 border-brand-border text-brand-text-dim hover:bg-brand-bg hover:border-brand-accent/50 hover:text-white'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-bold text-sm line-clamp-1 ${isActive ? 'text-white' : 'text-brand-text-bright'}`}>
                      {play.name}
                    </span>
                    <span className="text-[8.5px] px-2 py-0.5 rounded-full font-bold font-mono bg-brand-accent/20 text-brand-accent border border-brand-accent/30">
                      {play.category === 'banda' ? 'BANDA ↔️' : play.category === 'fondo' ? 'FONDO ↕️' : 'JUEGO 🏀'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-semibold text-brand-text-dim">
                      {play.steps.length} {play.steps.length === 1 ? 'fase' : 'fases'}
                    </span>
                    {isActive && (
                      <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">
                        ✓ Activa en Cancha
                      </span>
                    )}
                  </div>
                  {play.description && (
                    <p className="text-[11px] text-brand-text-dim line-clamp-2 leading-relaxed mb-1">
                      {play.description}
                    </p>
                  )}
                  <div className="text-[9px] text-brand-text-dim font-semibold font-mono uppercase flex items-center gap-2">
                    <span>🎬 {play.courtType === 'half' ? 'Media Cancha' : 'Cancha Completa'}</span>
                    {play.updatedAt && (
                      <span>• ⏱️ {new Date(play.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-border/40" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onSelectPlay(play.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                      isActive
                        ? 'bg-brand-accent text-white hover:bg-brand-accent/90'
                        : 'bg-white/10 hover:bg-brand-accent hover:text-white text-brand-text-bright'
                    }`}
                  >
                    <span>▶️</span>
                    <span>{isActive ? 'En Cancha' : 'Cargar Jugada'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditModal(play, e)}
                    className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-400 hover:text-amber-300 text-xs cursor-pointer transition-all hover:scale-105"
                    title="Editar nombre, categoría y descripción de la jugada"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlay(play.id);
                    }}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-500 text-xs cursor-pointer transition-transform duration-200 hover:scale-105"
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
          className="w-full py-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-accent/20 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
        >
          <span>💾</span>
          <span>Guardar Jugada Actual en Biblioteca</span>
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
                  className="w-full text-xs bg-brand-bg border border-brand-border rounded-lg px-2.5 py-2 text-brand-text-bright focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/40 cursor-pointer"
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

      {/* Edit Existing Play Details Modal */}
      {editingPlay && (
        <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="bg-brand-panel border border-brand-border rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl shadow-amber-500/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">✏️</span>
                <h4 className="font-bold text-sm text-brand-text-bright">Editar Datos de la Jugada</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlay(null)}
                className="text-brand-text-dim hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-dim mb-1">Nombre del Sistema</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cuernos con pase ciego"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text-bright focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-dim mb-1">Apartado / Categoría</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as 'banda' | 'fondo' | 'juego')}
                  className="w-full text-xs bg-brand-bg border border-brand-border rounded-lg px-2.5 py-2 text-brand-text-bright focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 cursor-pointer"
                >
                  <option value="juego">🏀 Juego en Estático</option>
                  <option value="banda">↔️ Saque de Banda</option>
                  <option value="fondo">↕️ Saque de Fondo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-dim mb-1">Descripción / Claves Tácticas</label>
                <textarea
                  placeholder="Detalles tácticos, claves de defensa o rotaciones"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full text-xs bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text-bright focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 resize-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end text-xs">
              <button
                type="button"
                onClick={() => setEditingPlay(null)}
                className="px-3 py-1.5 bg-brand-bg hover:bg-white/5 border border-brand-border rounded-lg text-brand-text-bright font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <span>💾</span>
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
