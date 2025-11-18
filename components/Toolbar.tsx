import React from 'react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { View } from '../App';
import UserPresence from './UserPresence';
import SaveStatusIndicator from './SaveStatusIndicator';
import { exportTimetableToXLSX } from '../services/exportService';
import { exportGridToPdf } from '../services/pdfExportService';
import { GridType } from '../types';

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
  const { state: uiState, dispatch: uiDispatch } = useUI();

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
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
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', 'grade_horarios.csv');
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = () => {
    uiDispatch({ type: 'SHOW_TOAST', payload: 'Gerando arquivo XLSX...' });

    setTimeout(() => {
        try {
            const { workbook, error } = exportTimetableToXLSX(state);

            if (error) {
                uiDispatch({ type: 'SHOW_TOAST', payload: error });
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
                    uiDispatch({ type: 'SHOW_TOAST', payload: 'Exportação para XLSX concluída!' });
                }).catch(err => {
                    console.error("Error writing XLSX buffer:", err);
                    uiDispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo XLSX.' });
                });
            }
        } catch(err) {
            console.error("Error generating XLSX file:", err);
            uiDispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo XLSX.' });
        }
    }, 50);
  };

  const handleExportPDF = () => {
    if (currentView !== 'grid') return;

    uiDispatch({ type: 'SHOW_TOAST', payload: 'Gerando arquivo PDF...' });
    
    setTimeout(() => {
        try {
            const { doc, error } = exportGridToPdf(state, activeGrid);
            if (error || !doc) {
                uiDispatch({ type: 'SHOW_TOAST', payload: error || 'Erro ao gerar PDF.'});
                return;
            }
            const filename = `grade_${activeGrid}.pdf`;
            doc.save(filename);
            uiDispatch({ type: 'SHOW_TOAST', payload: 'Exportação para PDF concluída!' });
        } catch (err) {
            console.error("Error generating PDF:", err);
            uiDispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo PDF.' });
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
               uiDispatch({ type: 'SHOW_TOAST', payload: 'Arquivo importado com sucesso!' });
            } else {
              uiDispatch({ type: 'SHOW_TOAST', payload: 'Arquivo JSON inválido.' });
            }
          } catch (error) {
            uiDispatch({ type: 'SHOW_TOAST', payload: 'Erro ao processar o arquivo JSON.' });
          }
        }
      };
      event.target.value = '';
    }
  };

  const baseButtonClass = "px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500";
  const activeButtonClass = "bg-indigo-600 text-white";
  const inactiveButtonClass = "bg-gray-200 text-gray-700 hover:bg-gray-300";

  return (
    <>
      <div className="flex items-center justify-between p-2 bg-white">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-700">Timetable Scheduler</h1>
          <div className="flex items-center bg-gray-200 rounded-md p-1" role="tablist" aria-label="Navegação principal">
              <button onClick={() => setCurrentView('dashboard')} role="tab" aria-selected={currentView === 'dashboard'} className={`${baseButtonClass} ${currentView === 'dashboard' ? activeButtonClass : inactiveButtonClass}`}>
                  Painel
              </button>
              <button onClick={() => setCurrentView('grid')} role="tab" aria-selected={currentView === 'grid'} className={`${baseButtonClass} ${currentView === 'grid' ? activeButtonClass : inactiveButtonClass}`}>
                  Grade
              </button>
              <button onClick={() => setCurrentView('management')} role="tab" aria-selected={currentView === 'management'} className={`${baseButtonClass} ${currentView === 'management' ? activeButtonClass : inactiveButtonClass}`}>
                  Gerenciamento
              </button>
              <button onClick={() => setCurrentView('professor')} role="tab" aria-selected={currentView === 'professor'} className={`${baseButtonClass} ${currentView === 'professor' ? activeButtonClass : inactiveButtonClass}`}>
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
                        aria-label="Ativar modo foco" 
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
              status={uiState.saveStatus} 
              lastModifiedBy={state.lastModifiedBy}
              lastModifiedAt={state.lastModifiedAt}
            />
           <div className="w-px h-6 bg-gray-300 mx-2"></div>
           <UserPresence />
           <div className="w-px h-6 bg-gray-300 mx-2"></div>
           
           <button onClick={onOpenLoadExampleModal} className="p-2 rounded hover:bg-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Carregar dados de demonstração" aria-label="Carregar dados de exemplo">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7v4c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
              </svg>
           </button>
          <button onClick={onOpenClearDataModal} className="p-2 rounded hover:bg-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Limpar todos os dados da aplicação" aria-label="Apagar todos os dados">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={() => dispatch({ type: 'UNDO' })} className="p-2 rounded hover:bg-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Desfazer (Ctrl+Z)" aria-label="Desfazer ação">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 15l-3-3m0 0l3-3m-3 3h8a5 5 0 015 5v1" /></svg>
          </button>
          <button onClick={() => dispatch({ type: 'REDO' })} className="p-2 rounded hover:bg-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Refazer (Ctrl+Y)" aria-label="Refazer ação">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 15l3-3m0 0l-3-3m3 3H5a5 5 0 01-5-5v-1" /></svg>
          </button>
          <label htmlFor="import-json" className="cursor-pointer p-2 rounded hover:bg-gray-200 focus-within:ring-2 focus-within:ring-indigo-500" title="Restaurar backup (JSON)" aria-label="Importar backup JSON">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <input type="file" id="import-json" className="hidden" accept=".json" onChange={handleImport} />
          </label>
          <button onClick={handleExportJSON} className="p-2 rounded hover:bg-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Fazer backup dos dados (JSON)" aria-label="Exportar backup JSON">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <button onClick={handleExportCSV} className="p-2 rounded hover:bg-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Exportar dados brutos para planilha (CSV)" aria-label="Exportar CSV">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
          </button>
          <button onClick={handleExportXLSX} className="p-2 rounded hover:bg-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Exportar grades formatadas para Excel (XLSX)" aria-label="Exportar Excel (XLSX)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button onClick={handleExportPDF} disabled={currentView !== 'grid'} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 focus:outline-none" title="Exportar grade atual para PDF" aria-label="Exportar PDF da grade">
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