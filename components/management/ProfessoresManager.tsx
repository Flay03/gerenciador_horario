import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Professor } from '../../types';
import Modal from '../Modal';
import { DIAS_SEMANA, HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR } from '../../constants';
import ConfirmationModal from '../ConfirmationModal';
import { sanitizeString } from '../../hooks/useSanitizedInput';

// --- HELPER ---
const sanitizeDisponibilidade = (disp: any): Record<string, string[]> => {
    const clean: Record<string, string[]> = {};
    if (disp && typeof disp === 'object') {
        Object.keys(disp).forEach(key => {
            const value = disp[key];
            if (Array.isArray(value)) {
                 // Ensure items are strings
                 clean[key] = value.map(String);
            } else if (typeof value === 'string') {
                 // Recover stringified single values if possible
                 clean[key] = [value];
            } else {
                 // If it's corrupted (e.g. number, null), reset to empty array
                 clean[key] = [];
            }
        });
    }
    return clean;
};

// --- NEW COMPACT AVAILABILITY GRID COMPONENT ---

interface AvailabilityGridProps {
  disponibilidade: Record<string, string[]>;
  onAvailabilityChange: (newDisponibilidade: Record<string, string[]>) => void;
}

const PeriodGrid: React.FC<{ label: string, horarios: string[], disponibilidade: Record<string, string[]>, onToggleSlot: (d: string, h: string) => void, onToggleDay: (d: string, h: string[]) => void, onToggleTime: (h: string) => void }> = React.memo(({ label, horarios, disponibilidade, onToggleSlot, onToggleDay, onToggleTime }) => (
    <div className="p-4 border rounded-lg bg-gray-50/50">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{label}</h3>
      <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(6, 1fr)' }}>
        {/* Header */}
        <div className="font-semibold text-sm text-gray-500 px-1 py-2 text-center sticky top-0 bg-gray-50">Horário</div>
        {DIAS_SEMANA.map(dia => (
          <div key={dia} className="font-semibold text-sm text-gray-500 px-1 py-2 text-center capitalize sticky top-0 bg-gray-50">
            <button 
              type="button"
              onClick={() => onToggleDay(dia, horarios)} 
              className="hover:text-indigo-600 w-full"
              title={`Marcar/desmarcar todos os horários da ${label.toLowerCase()} para ${dia}`}
            >
              {dia}
            </button>
          </div>
        ))}
         <div className="font-semibold text-sm text-gray-500 px-1 py-2 text-center sticky top-0 bg-gray-50">Ações</div>

        {/* Rows */}
        {horarios.map(horario => (
          <React.Fragment key={horario}>
            <div className="text-sm font-mono px-1 py-2 text-center flex items-center justify-center bg-white">{horario}</div>
            {DIAS_SEMANA.map(dia => {
              const isAvailable = disponibilidade[dia]?.includes(horario) ?? false;
              return (
                <div key={`${dia}-${horario}`} className="py-1 px-0.5 flex items-center justify-center bg-white">
                  <button
                    type="button"
                    onClick={() => onToggleSlot(dia, horario)}
                    className={`w-6 h-6 rounded-md transition-colors ${isAvailable ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                    aria-label={`Disponibilidade para ${dia} às ${horario}: ${isAvailable ? 'Disponível' : 'Indisponível'}`}
                  />
                </div>
              );
            })}
             <div className="py-1 px-0.5 flex items-center justify-center bg-white">
                <button 
                    type="button"
                    onClick={() => onToggleTime(horario)}
                    className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold hover:bg-indigo-200 transition-colors"
                    title={`Marcar/desmarcar ${horario} para todos os dias`}
                >
                    Todos
                </button>
             </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  ));

const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({ disponibilidade, onAvailabilityChange }) => {
  
  const toggleSlotAvailability = (dia: string, horario: string) => {
    const newDisp = { ...disponibilidade };
    if (!newDisp[dia]) newDisp[dia] = [];
    const isAvailable = newDisp[dia].includes(horario);
    newDisp[dia] = isAvailable ? newDisp[dia].filter(h => h !== horario) : [...newDisp[dia], horario];
    onAvailabilityChange(newDisp);
  };

  const handleDayPeriodToggle = (dia: string, horarios: string[]) => {
    const newDisp = { ...disponibilidade };
    if (!newDisp[dia]) newDisp[dia] = [];
    const allAvailable = horarios.every(h => newDisp[dia].includes(h));
    
    let dayAvailability = [...newDisp[dia]];
    if (allAvailable) {
      dayAvailability = dayAvailability.filter(h => !horarios.includes(h));
    } else {
      horarios.forEach(h => {
        if (!dayAvailability.includes(h)) dayAvailability.push(h);
      });
    }
    newDisp[dia] = dayAvailability;
    onAvailabilityChange(newDisp);
  };
  
  const handleTimeSlotToggleAllDays = (horario: string) => {
      const newDisp = { ...disponibilidade };
      const allAvailable = DIAS_SEMANA.every(dia => newDisp[dia]?.includes(horario));

      DIAS_SEMANA.forEach(dia => {
          if (!newDisp[dia]) newDisp[dia] = [];
          const isAvailable = newDisp[dia].includes(horario);
          if (allAvailable) {
              // Desmarcar todos
              if(isAvailable) newDisp[dia] = newDisp[dia].filter(h => h !== horario);
          } else {
              // Marcar todos
              if(!isAvailable) newDisp[dia].push(horario);
          }
      });
      onAvailabilityChange(newDisp);
  };

  return (
    <div className="space-y-4">
      <PeriodGrid label="Manhã" horarios={HORARIOS_MANHA} disponibilidade={disponibilidade} onToggleSlot={toggleSlotAvailability} onToggleDay={handleDayPeriodToggle} onToggleTime={handleTimeSlotToggleAllDays} />
      <PeriodGrid label="Tarde" horarios={HORARIOS_TARDE} disponibilidade={disponibilidade} onToggleSlot={toggleSlotAvailability} onToggleDay={handleDayPeriodToggle} onToggleTime={handleTimeSlotToggleAllDays} />
      <PeriodGrid label="Noite" horarios={HORARIOS_NOITE_REGULAR} disponibilidade={disponibilidade} onToggleSlot={toggleSlotAvailability} onToggleDay={handleDayPeriodToggle} onToggleTime={handleTimeSlotToggleAllDays} />
    </div>
  );
};


// --- MAIN MANAGER COMPONENT ---

const ProfessoresManager: React.FC = () => {
    const { state, dispatch } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [professorsToEdit, setProfessorsToEdit] = useState<Professor[]>([]);
    const [formData, setFormData] = useState({ nome: '', disponibilidade: {} as Record<string, string[]> });
    const [selectedProfessorToCopy, setSelectedProfessorToCopy] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, ids: string[] }>({ isOpen: false, ids: [] });
    const [searchText, setSearchText] = useState('');
    const modalContentRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef(0);

    const sortedProfessores = useMemo(() =>
        [...state.professores].sort((a, b) => a.nome.localeCompare(b.nome)),
        [state.professores]
    );

    const filteredProfessores = useMemo(() => {
        if (!searchText.trim()) {
            return sortedProfessores;
        }
        return sortedProfessores.filter(p =>
            p.nome.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [sortedProfessores, searchText]);

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.size === filteredProfessores.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProfessores.map(p => p.id)));
        }
    };

    const handleOpenAddModal = () => {
        setProfessorsToEdit([]);
        setFormData({ nome: '', disponibilidade: {} });
        setSelectedProfessorToCopy('');
        scrollPositionRef.current = 0;
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (explicitProfessor?: Professor) => {
        let selectedProfs: Professor[] = [];

        if (explicitProfessor) {
            selectedProfs = [explicitProfessor];
        } else {
            if (selectedIds.size === 0) return;
            selectedProfs = sortedProfessores.filter(p => selectedIds.has(p.id));
        }
        
        setProfessorsToEdit(selectedProfs);

        if (selectedProfs.length === 1) {
            // Sanitize availability when loading single professor to prevent "expected array, received string" errors
            const prof = selectedProfs[0];
            setFormData({ 
                ...prof,
                disponibilidade: sanitizeDisponibilidade(prof.disponibilidade)
            });
        } else if (selectedProfs.length > 1) {
            // Calculate availability intersection for batch editing
            const intersectionDisp: Record<string, string[]> = {};
            const allHorarios = [...HORARIOS_MANHA, ...HORARIOS_TARDE, ...HORARIOS_NOITE_REGULAR];
            
            DIAS_SEMANA.forEach(dia => {
                intersectionDisp[dia] = allHorarios.filter(horario => 
                    selectedProfs.every(p => (Array.isArray(p.disponibilidade[dia]) ? p.disponibilidade[dia] : []).includes(horario))
                );
            });

            setFormData({ nome: '', disponibilidade: intersectionDisp });
        }
        setSelectedProfessorToCopy('');
        scrollPositionRef.current = 0;
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
      setIsModalOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // CRÍTICO: Sanitize SEMPRE imediatamente antes de salvar
        const safeAvailability = sanitizeDisponibilidade(formData.disponibilidade);
        const cleanName = sanitizeString(formData.nome);

        if (professorsToEdit.length > 0) { // Edit mode
            if (professorsToEdit.length === 1) {
                if (!cleanName.trim()) return;
                const updatedProf = {
                    ...professorsToEdit[0],
                    nome: cleanName,
                    disponibilidade: safeAvailability // Use a versão sanitizada
                };
                dispatch({ type: 'UPDATE_PROFESSOR', payload: updatedProf });
            } else {
                // Batch update mode
                const professorsToUpdate = professorsToEdit.map(prof => ({
                    ...prof,
                    disponibilidade: safeAvailability
                }));
                dispatch({ type: 'BATCH_UPDATE_PROFESSORS', payload: { professors: professorsToUpdate } });
            }

        } else { // Add mode
            if (!cleanName.trim()) return;
            dispatch({ type: 'ADD_PROFESSOR', payload: { id: `p${Date.now()}`, nome: cleanName, disponibilidade: safeAvailability } });
        }
        
        handleCloseModal();
        setSelectedIds(new Set());
    };
  
    const handleDeleteClick = (id: string) => {
        setConfirmModal({ isOpen: true, ids: [id] });
    };

    const handleDeleteSelectedClick = () => {
        if (selectedIds.size === 0) return;
        setConfirmModal({ isOpen: true, ids: Array.from(selectedIds) });
    };

    const handleConfirmDelete = () => {
        confirmModal.ids.forEach(id => {
            dispatch({ type: 'DELETE_PROFESSOR', payload: { id } });
        });
        setConfirmModal({ isOpen: false, ids: [] });
        setSelectedIds(new Set());
    };

    const handleCopyAvailability = () => {
        if (!selectedProfessorToCopy) return;
        const sourceProfessor = state.professores.find(p => p.id === selectedProfessorToCopy);
        if (sourceProfessor) {
            // Sanitize before copying to ensure we don't propagate corrupted data
            const cleanDisp = sanitizeDisponibilidade(sourceProfessor.disponibilidade);
            const newDisponibilidade = JSON.parse(JSON.stringify(cleanDisp));
            setFormData(prev => ({ ...prev, disponibilidade: newDisponibilidade }));
        }
    };
  
    const handleAvailabilityChange = (newDisponibilidade: Record<string, string[]>) => {
        if (modalContentRef.current) {
            scrollPositionRef.current = modalContentRef.current.scrollTop;
        }
        // FORÇA sanitização imediata ao mudar disponibilidade
        const sanitized = sanitizeDisponibilidade(newDisponibilidade);
        setFormData(prev => ({ ...prev, disponibilidade: sanitized }));
    };

    useLayoutEffect(() => {
        if (modalContentRef.current) {
            modalContentRef.current.scrollTop = scrollPositionRef.current;
        }
    }, [formData.disponibilidade]);

    const isAllSelected = filteredProfessores.length > 0 && selectedIds.size === filteredProfessores.length;
    const modalTitle = professorsToEdit.length === 0 ? 'Adicionar Professor' :
        professorsToEdit.length > 1 ? `Editar Disponibilidade de ${professorsToEdit.length} Professores` :
        'Editar Professor';

    return (
        <div className="relative pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold">Gerenciar Professores</h2>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Buscar por nome..."
                        className="block w-full sm:w-64 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    />
                    <button onClick={handleOpenAddModal} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg flex justify-between items-center">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={isAllSelected}
                            onChange={handleToggleSelectAll}
                            aria-label="Selecionar todos os professores"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-600">
                            Selecionar Todos
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mr-10">Ações</span>
                </div>
                <div className="divide-y divide-gray-200">
                    {filteredProfessores.length > 0 ? (
                        filteredProfessores.map((p) => (
                            <div key={p.id} className="px-4 sm:px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                                <div className="flex items-center flex-1">
                                    <input
                                        id={`prof-select-${p.id}`}
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={selectedIds.has(p.id)}
                                        onChange={() => handleToggleSelect(p.id)}
                                    />
                                    <label htmlFor={`prof-select-${p.id}`} className="ml-3 font-medium text-gray-800 cursor-pointer flex-1 select-none">
                                        {p.nome}
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleOpenEditModal(p)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors" 
                                        title="Editar Professor"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteClick(p.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" 
                                        title="Excluir Professor"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-gray-500 bg-gray-50">
                            {state.professores.length === 0 ? 'Nenhum professor cadastrado.' : 'Nenhum professor encontrado para o filtro selecionado.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bubble */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 shadow-xl rounded-full px-6 py-3 flex items-center space-x-4 z-40 animate-fade-in-up">
                    <span className="font-medium text-gray-700 whitespace-nowrap">
                        {selectedIds.size} selecionado(s)
                    </span>
                    <div className="h-5 w-px bg-gray-300"></div>
                    <button 
                        onClick={() => handleOpenEditModal()}
                        className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" />
                        </svg>
                        Editar
                    </button>
                    <button 
                        onClick={handleDeleteSelectedClick}
                        className="flex items-center text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Excluir
                    </button>
                    <div className="h-5 w-px bg-gray-300"></div>
                    <button 
                        onClick={() => setSelectedIds(new Set())}
                        className="text-gray-400 hover:text-gray-600"
                        title="Limpar seleção"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={modalTitle}
                size="5xl"
                contentRef={modalContentRef}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {professorsToEdit.length <= 1 && (
                        <div>
                            <label className="block text-sm font-medium">Nome do Professor</label>
                            <input type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>
                    )}

                    {professorsToEdit.length <= 1 && (
                      <div>
                        <label className="block text-sm font-medium">Copiar Disponibilidade de:</label>
                        <div className="mt-1 flex space-x-2">
                            <select 
                            value={selectedProfessorToCopy} 
                            onChange={e => setSelectedProfessorToCopy(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={state.professores.filter(p => p.id !== (professorsToEdit[0]?.id || '')).length === 0}
                            >
                            <option value="">Selecione um professor...</option>
                            {state.professores
                                .filter(p => p.id !== (professorsToEdit[0]?.id || ''))
                                .sort((a, b) => a.nome.localeCompare(b.nome))
                                .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)
                            }
                            </select>
                            <button 
                                type="button" 
                                onClick={handleCopyAvailability}
                                disabled={!selectedProfessorToCopy}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                            Copiar
                            </button>
                        </div>
                      </div>
                    )}


                    <div>
                        <h4 className="text-sm font-medium mb-2">Disponibilidade</h4>
                         {professorsToEdit.length > 1 && (
                            <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-md mb-2">
                                <strong>Atenção:</strong> Você está editando múltiplos professores. Um horário aparecerá marcado apenas se TODOS os professores selecionados estiverem disponíveis. Qualquer alteração aqui será aplicada a TODOS.
                            </p>
                        )}
                        <AvailabilityGrid
                            disponibilidade={formData.disponibilidade}
                            onAvailabilityChange={handleAvailabilityChange}
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Salvar</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, ids: [] })}
                onConfirm={handleConfirmDelete}
                title={`Confirmar Exclusão de ${confirmModal.ids.length} Professor(es)`}
                message={`Tem certeza que deseja excluir ${confirmModal.ids.length > 1 ? `os ${confirmModal.ids.length} professores selecionados` : 'este professor'}? Eles serão removidos de todas as atribuições e aulas permanentemente.`}
            />
            
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translate(-50%, 10px); }
                    100% { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ProfessoresManager;