



import React from 'react';
import { useData } from '../context/DataContext';
import { View } from '../App';
import UserPresence from './UserPresence';
import SaveStatusIndicator from './SaveStatusIndicator';
import { exportTimetableToXLSX } from '../services/exportService';
import { exportGridToPdf } from '../services/pdfExportService';
import { GradeSlot, GridType } from '../types';
import { DIAS_SEMANA, HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR, HORARIOS_NOITE_MODULAR } from '../constants';


interface ToolbarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  activeGrid: GridType;
  isFocusModeEnabled: boolean;
  onFocusModeChange: (enabled: boolean) => void;
  onOpenClearDataModal: () => void;
  onOpenLoadExampleModal: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  currentView, 
  setCurrentView, 
  activeGrid,
  isFocusModeEnabled, 
  onFocusModeChange,
  onOpenClearDataModal,
  onOpenLoadExampleModal
}) => {
  const { state, dispatch } = useData();

  const handleExportJSON = () => {
    // Exclude UI-specific state from the export
    const { draggedItem, clipboard, selectedSlotId, onlineUsers, toastMessage, saveStatus, ...dataToExport } = state;
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'grade_horarios.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleExportCSV = () => {
    const { grade, turmas, disciplinas, professores } = state;
    const headers = "Turma,Dia,Horario,Disciplina,Professor";
    const rows = grade.map(slot => {
      const turma = turmas.find(t => t.id === slot.turmaId)?.nome || slot.turmaId;
      const disciplina = disciplinas.find(d => d.id === slot.disciplinaId)?.nome || slot.disciplinaId;
      const professor = professores.find(p => p.id === slot.professorId)?.nome || slot.professorId;
      return [turma, slot.dia, slot.horario, `"${disciplina}"`, `"${professor}"`].join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', 'grade_horarios.csv');
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = () => {
    dispatch({ type: 'SHOW_TOAST', payload: 'Gerando arquivo XLSX...' });

    // Use a timeout to allow the toast to render before the potentially blocking operation
    setTimeout(() => {
        try {
            const { workbook, error } = exportTimetableToXLSX(state);

            if (error) {
                dispatch({ type: 'SHOW_TOAST', payload: error });
                return;
            }

            if (workbook) {
                workbook.xlsx.writeBuffer().then(buffer => {
                    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('href', url);
                    a.setAttribute('download', 'grade_horarios.xlsx');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    dispatch({ type: 'SHOW_TOAST', payload: 'Exportação para XLSX concluída!' });
                }).catch(err => {
                    console.error("Error writing XLSX buffer:", err);
                    dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo XLSX.' });
                });
            }
        } catch(err) {
            console.error("Error generating XLSX file:", err);
            dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo XLSX.' });
        }
    }, 50);
  };

  const handleExportPDF = () => {
    if (currentView !== 'grid') return;

    dispatch({ type: 'SHOW_TOAST', payload: 'Gerando arquivo PDF...' });
    
    setTimeout(() => {
        try {
            const { doc, error } = exportGridToPdf(state, activeGrid);
            if (error || !doc) {
                dispatch({ type: 'SHOW_TOAST', payload: error || 'Erro ao gerar PDF.'});
                return;
            }
            const filename = `grade_${activeGrid}.pdf`;
            doc.save(filename);
            dispatch({ type: 'SHOW_TOAST', payload: 'Exportação para PDF concluída!' });
        } catch (err) {
            console.error("Error generating PDF:", err);
            dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo PDF.' });
        }
    }, 50);
  };


  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = e => {
        if (e.target && typeof e.target.result === 'string') {
          try {
            const newState = JSON.parse(e.target.result);
            if (newState.version && newState.cursos) {
              dispatch({ type: 'SET_STATE', payload: newState });
               dispatch({ type: 'SHOW_TOAST', payload: 'Arquivo importado com sucesso!' });
            } else {
              dispatch({ type: 'SHOW_TOAST', payload: 'Arquivo JSON inválido.' });
            }
          } catch (error) {
            dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao processar o arquivo JSON.' });
          }
        }
      };
      // Reset the input value to allow re-uploading the same file
      event.target.value = '';
    }
  };

  const handlePopulateGrid = () => {
    dispatch({ type: 'SHOW_TOAST', payload: 'Preenchendo grade...' });

    setTimeout(() => {
        const { grade, turmas, disciplinas, atribuicoes } = state;
        
        const relevantTurmas = turmas.filter(t => t.isModular === (activeGrid === 'modular'));
        const relevantTurmaIds = new Set(relevantTurmas.map(t => t.id));

        const getBaseId = (s: { turmaId: string, dia: string, horario: string }) => `${s.turmaId}_${s.dia}_${s.horario}`;

        const lessonsToPlace: { disciplina: any, professores: string[] }[] = [];
        atribuicoes.forEach(atribuicao => {
            const disciplina = disciplinas.find(d => d.id === atribuicao.disciplinaId);
            if (!disciplina || !relevantTurmaIds.has(disciplina.turmaId)) return;

            const turma = turmas.find(t => t.id === disciplina.turmaId);
            const aulaValue = turma?.isModular ? 1.25 : 1;

            const placedSessions = new Set();
            grade.filter(s => s.disciplinaId === disciplina.id).forEach(s => placedSessions.add(getBaseId(s)));
            const numPlaced = placedSessions.size;

            const numNeeded = Math.round(disciplina.aulasSemanais / aulaValue);
            const numToPlace = numNeeded - numPlaced;

            for (let i = 0; i < numToPlace; i++) {
                lessonsToPlace.push({ disciplina, professores: atribuicao.professores });
            }
        });

        const newGrade = [...grade];
        const occupiedSlots = new Set(grade.map(s => s.id));
        const occupiedBaseSlots = new Set(grade.map(getBaseId));

        lessonsToPlace.sort(() => Math.random() - 0.5).forEach(lesson => {
            const { disciplina, professores } = lesson;
            const turma = relevantTurmas.find(t => t.id === disciplina.turmaId);
            if (!turma) return;

            let horarios: string[] = [];
            if (turma.periodo === 'manha') horarios = HORARIOS_MANHA;
            else if (turma.periodo === 'tarde') horarios = HORARIOS_TARDE;
            else if (turma.periodo === 'noite') horarios = turma.isModular ? HORARIOS_NOITE_MODULAR : HORARIOS_NOITE_REGULAR;

            const shuffledDays = [...DIAS_SEMANA].sort(() => Math.random() - 0.5);
            for (const dia of shuffledDays) {
                const shuffledHorarios = [...horarios].sort(() => Math.random() - 0.5);
                for (const horario of shuffledHorarios) {
                    if (turma.isModular && horario === '18:10-19:00') continue;

                    const baseId = `${turma.id}_${dia}_${horario}`;
                    if (!occupiedBaseSlots.has(baseId)) {
                        if (disciplina.divisao) {
                            professores.forEach((profId, index) => {
                                const subId = `${baseId}-${index}`;
                                if (!occupiedSlots.has(subId)) {
                                    const newSlot: GradeSlot = { id: subId, turmaId: turma.id, dia, horario, disciplinaId: disciplina.id, professorId: profId };
                                    newGrade.push(newSlot);
                                    occupiedSlots.add(subId);
                                }
                            });
                        } else {
                            const newSlot: GradeSlot = { id: baseId, turmaId: turma.id, dia, horario, disciplinaId: disciplina.id, professorId: professores[0] };
                            newGrade.push(newSlot);
                            occupiedSlots.add(baseId);
                        }
                        occupiedBaseSlots.add(baseId);
                        return; 
                    }
                }
            }
        });

        dispatch({ type: 'POPULATE_GRADE', payload: newGrade });
        dispatch({ type: 'SHOW_TOAST', payload: 'Grade preenchida aleatoriamente!' });
    }, 50);
  };

  const baseButtonClass = "px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500";
  const activeButtonClass = "bg-indigo-600 text-white";
  const inactiveButtonClass = "bg-gray-200 text-gray-700 hover:bg-gray-300";

  return (
    <>
      <div className="flex items-center justify-between p-2 bg-white">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-700">Timetable Scheduler</h1>
          <div className="flex items-center bg-gray-200 rounded-md p-1">
              <button onClick={() => setCurrentView('dashboard')} className={`${baseButtonClass} ${currentView === 'dashboard' ? activeButtonClass : inactiveButtonClass}`}>
                  Painel
              </button>
              <button onClick={() => setCurrentView('grid')} className={`${baseButtonClass} ${currentView === 'grid' ? activeButtonClass : inactiveButtonClass}`}>
                  Grade
              </button>
              <button onClick={() => setCurrentView('management')} className={`${baseButtonClass} ${currentView === 'management' ? activeButtonClass : inactiveButtonClass}`}>
                  Gerenciamento
              </button>
              <button onClick={() => setCurrentView('professor')} className={`${baseButtonClass} ${currentView === 'professor' ? activeButtonClass : inactiveButtonClass}`}>
                  Professor
              </button>
          </div>
          {currentView === 'grid' && (
            <div className="flex items-center space-x-2 ml-6">
                <label htmlFor="focus-mode-toggle" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                    Modo Foco
                </label>
                <div className="relative">
                    <input 
                        id="focus-mode-toggle"
                        type="checkbox" 
                        className="sr-only" 
                        checked={isFocusModeEnabled} 
                        onChange={e => onFocusModeChange(e.target.checked)} 
                    />
                    <div 
                        onClick={() => onFocusModeChange(!isFocusModeEnabled)} 
                        className={`block w-10 h-6 rounded-full transition-colors cursor-pointer ${isFocusModeEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    ></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isFocusModeEnabled ? 'translate-x-4' : ''}`}></div>
                </div>
            </div>
           )}
        </div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
           <SaveStatusIndicator 
              status={state.saveStatus} 
              lastModifiedBy={state.lastModifiedBy}
              lastModifiedAt={state.lastModifiedAt}
            />
           <div className="w-px h-6 bg-gray-300 mx-2"></div>
           <UserPresence />
           <div className="w-px h-6 bg-gray-300 mx-2"></div>
            {/* {currentView === 'grid' && (
              <button onClick={handlePopulateGrid} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Preencher grade com dados aleatórios (Desabilitado)" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
              </button>
            )} */}
           <button onClick={onOpenLoadExampleModal} className="p-2 rounded hover:bg-gray-200" title="Carregar dados de demonstração">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7v4c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
              </svg>
           </button>
          <button onClick={onOpenClearDataModal} className="p-2 rounded hover:bg-gray-200" title="Limpar todos os dados da aplicação">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={() => dispatch({ type: 'UNDO' })} className="p-2 rounded hover:bg-gray-200" title="Desfazer (Ctrl+Z)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 15l-3-3m0 0l3-3m-3 3h8a5 5 0 015 5v1" /></svg>
          </button>
          <button onClick={() => dispatch({ type: 'REDO' })} className="p-2 rounded hover:bg-gray-200" title="Refazer (Ctrl+Y)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 15l3-3m0 0l-3-3m3 3H5a5 5 0 01-5-5v-1" /></svg>
          </button>
          <label htmlFor="import-json" className="cursor-pointer p-2 rounded hover:bg-gray-200" title="Restaurar backup (JSON)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <input type="file" id="import-json" className="hidden" accept=".json" onChange={handleImport} />
          </label>
          <button onClick={handleExportJSON} className="p-2 rounded hover:bg-gray-200" title="Fazer backup dos dados (JSON)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <button onClick={handleExportCSV} className="p-2 rounded hover:bg-gray-200" title="Exportar dados brutos para planilha (CSV)">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
          </button>
          <button onClick={handleExportXLSX} className="p-2 rounded hover:bg-gray-200" title="Exportar grades formatadas para Excel (XLSX)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button onClick={handleExportPDF} disabled={currentView !== 'grid'} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Exportar grade atual para PDF">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-700 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default Toolbar;