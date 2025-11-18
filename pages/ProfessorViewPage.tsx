import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import ProfessorTimetable from '../components/ProfessorView/ProfessorTimetable';
import JSZip from 'jszip';
import { exportProfessorTimetableToXLSX } from '../services/exportService';
import { generatePdfForProfessor } from '../services/pdfExportService';
import ProgressBar from '../components/ProgressBar';

const ProfessorViewPage: React.FC = () => {
    const { state, dispatch } = useData();
    const { professores, grade, turmas, disciplinas } = state;

    // Memoize the sorted list of professors
    const sortedProfessores = useMemo(() => {
        return [...professores].sort((a, b) => a.nome.localeCompare(b.nome));
    }, [professores]);

    const [searchText, setSearchText] = useState('');
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    
    // Filter the sorted list based on search text
    const filteredProfessores = useMemo(() => {
        if (!searchText.trim()) {
            return sortedProfessores;
        }
        return sortedProfessores.filter(p =>
            p.nome.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [sortedProfessores, searchText]);
    
    // Initialize state with the first professor from the sorted list
    const [selectedProfessorId, setSelectedProfessorId] = useState<string>(sortedProfessores[0]?.id || '');

    // Effect to update selection if the current one is filtered out
    useEffect(() => {
        const isSelectedProfessorVisible = filteredProfessores.some(p => p.id === selectedProfessorId);
        if (!isSelectedProfessorVisible) {
            setSelectedProfessorId(filteredProfessores[0]?.id || '');
        }
    }, [searchText, filteredProfessores, selectedProfessorId]);

    // Ensure initial selection is set when data loads
    useEffect(() => {
        if (!selectedProfessorId && sortedProfessores.length > 0) {
            setSelectedProfessorId(sortedProfessores[0].id);
        }
    }, [sortedProfessores, selectedProfessorId]);

    const handleExportToPDF = () => {
        const professor = professores.find(p => p.id === selectedProfessorId);
        if (!professor) {
             dispatch({ type: 'SHOW_TOAST', payload: 'Professor não selecionado.' });
             return;
        }

        try {
            const { doc, error } = generatePdfForProfessor(professor, grade, turmas, disciplinas);
            if(error || !doc) {
                dispatch({ type: 'SHOW_TOAST', payload: error || "Erro ao gerar PDF." });
                return;
            }
            const sanitizedProfessorName = professor.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `horario_${sanitizedProfessorName}.pdf`;
            doc.save(filename);
        } catch (error) {
            console.error("Error generating PDF:", error);
            dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o PDF.' });
        }
    };

    const handleExportProfessorXLSX = () => {
        if (!selectedProfessorId) {
            dispatch({ type: 'SHOW_TOAST', payload: 'Professor não selecionado.' });
            return;
        }
    
        dispatch({ type: 'SHOW_TOAST', payload: 'Gerando arquivo XLSX...' });
    
        setTimeout(() => {
            try {
                const { workbook, error } = exportProfessorTimetableToXLSX(state, selectedProfessorId);
    
                if (error || !workbook) {
                    dispatch({ type: 'SHOW_TOAST', payload: error || 'Erro desconhecido ao gerar XLSX.' });
                    return;
                }
    
                workbook.xlsx.writeBuffer().then(buffer => {
                    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                    const url = URL.createObjectURL(blob);
                    const professor = professores.find(p => p.id === selectedProfessorId);
                    const sanitizedName = professor ? professor.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'professor';
                    const a = document.createElement('a');
                    a.setAttribute('href', url);
                    a.setAttribute('download', `horario_${sanitizedName}.xlsx`);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    dispatch({ type: 'SHOW_TOAST', payload: 'Exportação para XLSX concluída!' });
                }).catch(err => {
                    console.error("Error writing XLSX buffer:", err);
                    dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo XLSX.' });
                });
            } catch(err) {
                console.error("Error generating XLSX file:", err);
                dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo XLSX.' });
            }
        }, 50);
    };

    const handleBatchExportPDF = async () => {
        const professorIdsInGrade = [...new Set(grade.map(slot => slot.professorId))];
        const professorsToExport = sortedProfessores.filter(p => professorIdsInGrade.includes(p.id));

        if (professorsToExport.length === 0) {
            dispatch({ type: 'SHOW_TOAST', payload: 'Nenhum professor com aulas na grade para exportar.' });
            return;
        }

        const zip = new JSZip();
        setIsBatchExporting(true);
        setExportProgress({ current: 0, total: professorsToExport.length });

        dispatch({ type: 'SHOW_TOAST', payload: `Iniciando exportação de ${professorsToExport.length} horários...` });
        
        for (const [index, professor] of professorsToExport.entries()) {
             setExportProgress({ current: index + 1, total: professorsToExport.length });
             try {
                const { doc, error } = generatePdfForProfessor(professor, grade, turmas, disciplinas);
                if (doc) {
                    const sanitizedProfessorName = professor.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const filename = `horario_${sanitizedProfessorName}.pdf`;
                    const pdfBlob = doc.output('blob');
                    zip.file(filename, pdfBlob);
                }
             } catch (error) {
                console.error(`Error generating PDF for ${professor.nome}:`, error);
             }
             // Yield to the event loop to update the UI
             await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        dispatch({ type: 'SHOW_TOAST', payload: 'Gerando arquivo ZIP...' });
        try {
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            link.download = "horarios_professores.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            dispatch({ type: 'SHOW_TOAST', payload: 'Exportação para ZIP concluída!' });
        } catch(error) {
            console.error("Error generating ZIP file:", error);
            dispatch({ type: 'SHOW_TOAST', payload: 'Erro ao gerar o arquivo ZIP.' });
        } finally {
            setIsBatchExporting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-auto bg-gray-50 p-4">
            <header className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Grade por Professor</h1>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow mr-4">
                        <div>
                            <label htmlFor="professor-search" className="block text-sm font-medium text-gray-700">
                                Buscar Professor
                            </label>
                            <input
                                type="text"
                                id="professor-search"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Digite o nome..."
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            />
                        </div>
                        <div>
                            <label htmlFor="professor-select" className="block text-sm font-medium text-gray-700">
                                Selecione um Professor
                            </label>
                            <select
                                id="professor-select"
                                value={selectedProfessorId}
                                onChange={(e) => setSelectedProfessorId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                                {filteredProfessores.length > 0 ? (
                                    filteredProfessores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nome}</option>
                                    ))
                                ) : (
                                    <option value="" disabled>Nenhum professor encontrado</option>
                                )}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
                         {isBatchExporting ? (
                            <div className="w-48">
                                <ProgressBar 
                                    progress={(exportProgress.current / exportProgress.total) * 100} 
                                    label="Exportando..." 
                                />
                            </div>
                         ) : (
                            <button
                                onClick={handleBatchExportPDF}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Exportar Todos (ZIP)
                            </button>
                         )}
                        
                        <button
                            onClick={handleExportProfessorXLSX}
                            disabled={!selectedProfessorId || isBatchExporting}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            XLSX
                        </button>
                        <button
                            onClick={handleExportToPDF}
                            disabled={!selectedProfessorId || isBatchExporting}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            PDF
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto">
                {selectedProfessorId ? (
                    <ProfessorTimetable professorId={selectedProfessorId} />
                ) : (
                    <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
                        <p className="text-gray-500">
                            {professores.length === 0
                                ? 'Nenhum professor cadastrado.'
                                : 'Por favor, selecione um professor para visualizar a grade de horários.'}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProfessorViewPage;