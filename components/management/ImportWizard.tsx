

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { AppState, Turma } from '../../types';
import { parseSIGHTML } from '../../services/localParseService';

type Step = 'upload' | 'validate' | 'success';

const ImportWizard: React.FC = () => {
  const { dispatch } = useData();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<AppState> | null>(null);
  const [turmaModularStatus, setTurmaModularStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleParse = () => {
    if (!file) {
      setError('Por favor, selecione um arquivo HTML.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const htmlContent = event.target?.result as string;
        const data = parseSIGHTML(htmlContent);
        setParsedData(data);
        
        if (data.turmas) {
          const initialStatus: Record<string, boolean> = {};
          data.turmas.forEach(turma => {
            initialStatus[turma.id] = turma.isModular;
          });
          setTurmaModularStatus(initialStatus);
        }

        setStep('validate');
      } catch (err) {
        setError('Ocorreu um erro ao analisar o arquivo. Verifique se o formato está correto.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        setError('Não foi possível ler o arquivo.');
        setIsLoading(false);
    }
    reader.readAsText(file, 'UTF-8');
  };
  
  const handleImport = () => {
    if (parsedData) {
        const finalTurmas = parsedData.turmas?.map(turma => ({
            ...turma,
            isModular: turmaModularStatus[turma.id] ?? turma.isModular,
        })) ?? [];

        const fullState: AppState = {
            version: "1.0",
            ano: parsedData.ano ?? new Date().getFullYear(),
            cursos: parsedData.cursos ?? [],
            turmas: finalTurmas,
            disciplinas: parsedData.disciplinas ?? [],
            professores: parsedData.professores ?? [],
            atribuicoes: parsedData.atribuicoes ?? [],
            grade: [],
            alertas: [],
            bncc: [],
            toastMessage: null,
            draggedItem: null,
            clipboard: null,
            selectedSlotId: null,
            onlineUsers: [],
            saveStatus: 'saved',
            lastModifiedBy: null,
            lastModifiedAt: null,
        };
      dispatch({ type: 'SET_STATE', payload: fullState });
      setStep('success');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    setIsLoading(false);
    setStep('upload');
  };

  const handleTurmaModularStatusChange = (turmaId: string, isModular: boolean) => {
    setTurmaModularStatus(prev => ({
        ...prev,
        [turmaId]: isModular,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Importar Dados de HTML (SIG)</h2>
      
      {step === 'upload' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Passo 1: Selecionar Arquivo</h3>
            <p className="text-sm text-gray-600">Selecione o arquivo HTML salvo a partir da página "Consultar Quadros" do sistema SIG-URH. O sistema irá extrair os cursos, turmas, disciplinas e professores.</p>
            <div>
                <label htmlFor="html-upload-label" className="block text-sm font-medium text-gray-700 mb-1">Arquivo HTML</label>
                <div className="mt-1 flex items-center space-x-3">
                    <label
                        htmlFor="html-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Escolher arquivo
                    </label>
                    <input
                        id="html-upload"
                        name="html-upload"
                        type="file"
                        accept=".html,.htm"
                        onChange={handleFileChange}
                        className="sr-only"
                    />
                    {file ? (
                      <span className="text-sm text-gray-600">{file.name}</span>
                    ) : (
                      <span className="text-sm text-gray-500">Nenhum arquivo selecionado</span>
                    )}
                </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
                <button 
                    onClick={handleParse} 
                    disabled={!file || isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Analisando...' : 'Analisar Arquivo'}
                </button>
            </div>
        </div>
      )}

      {step === 'validate' && parsedData && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Passo 2: Validar Dados</h3>
            <p className="text-sm text-gray-600">Os seguintes dados foram encontrados. <strong>Atenção:</strong> A importação substituirá todos os dados existentes.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-gray-100 rounded-lg"><div className="text-2xl font-bold">{parsedData.cursos?.length || 0}</div><div className="text-sm">Cursos</div></div>
                <div className="p-4 bg-gray-100 rounded-lg"><div className="text-2xl font-bold">{parsedData.turmas?.length || 0}</div><div className="text-sm">Turmas</div></div>
                <div className="p-4 bg-gray-100 rounded-lg"><div className="text-2xl font-bold">{parsedData.disciplinas?.length || 0}</div><div className="text-sm">Disciplinas</div></div>
                <div className="p-4 bg-gray-100 rounded-lg"><div className="text-2xl font-bold">{parsedData.professores?.length || 0}</div><div className="text-sm">Professores</div></div>
            </div>

            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold">Validar Classificação das Turmas</h4>
              <p className="text-sm text-gray-600 mb-2">
                  Verifique a lista de turmas importadas. Marque a caixa ao lado de cada turma que deve ser considerada 'Modular'. Turmas não marcadas serão tratadas como 'Regular' (Ensino Médio, MTec, etc.).
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1 border p-3 rounded-md bg-gray-50">
                  {parsedData.turmas && parsedData.turmas.length > 0 ? (
                      parsedData.turmas
                      .slice() 
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map(turma => (
                          <div key={turma.id} className="flex items-center p-1 hover:bg-gray-100 rounded">
                              <input
                                  type="checkbox"
                                  id={`turma-modular-toggle-${turma.id}`}
                                  checked={turmaModularStatus[turma.id] ?? false}
                                  onChange={e => handleTurmaModularStatusChange(turma.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <label htmlFor={`turma-modular-toggle-${turma.id}`} className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                  {turma.nome}
                              </label>
                          </div>
                      ))
                  ) : (
                      <p className="text-sm text-gray-500">Nenhuma turma encontrada no arquivo.</p>
                  )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
                <button onClick={handleReset} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                <button onClick={handleImport} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Confirmar e Importar</button>
            </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white p-6 rounded-lg shadow text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-700">Importação Concluída!</h3>
            <p>Os dados foram importados com sucesso. Você já pode navegar para as outras abas de gerenciamento para ver os resultados.</p>
            <button onClick={handleReset} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Importar Novo Arquivo</button>
        </div>
      )}
    </div>
  );
};

export default ImportWizard;
