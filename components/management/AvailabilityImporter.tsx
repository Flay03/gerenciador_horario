import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Professor } from '../../types';
import { parseAvailabilityExcel, generateAvailabilityTemplate } from '../../services/availabilityImportService';

type Step = 'upload' | 'validate' | 'success';

interface ParsedProfessor {
    name: string;
    availability: Record<string, string[]>;
}

interface Match {
    parsed: ParsedProfessor;
    matchId: string; // 'not_found', 'ignore', or a professor ID
}

// Simple normalization for matching names
const normalizeName = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ' ')
    .trim();
};

const AvailabilityImporter: React.FC = () => {
  const { state, dispatch } = useData();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
        const workbook = await generateAvailabilityTemplate();
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_disponibilidade.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error generating template:", err);
        setError("Não foi possível gerar o modelo de planilha.");
    }
  };

  const handleParse = () => {
    if (!file) {
      setError('Por favor, selecione um arquivo Excel.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const data = await parseAvailabilityExcel(buffer);

        if (data.length === 0) {
            throw new Error("Nenhum professor encontrado na planilha. Verifique se o formato está correto ou use o modelo.");
        }
        
        const systemProfs = state.professores;
        const initialMatches = data.map(parsedProf => {
            const found = systemProfs.find(p => normalizeName(p.nome) === normalizeName(parsedProf.name));
            return {
                parsed: parsedProf,
                matchId: found ? found.id : 'not_found',
            };
        });
        setMatches(initialMatches);
        
        setStep('validate');
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro ao analisar a planilha. Verifique se o formato está correto.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        setError('Não foi possível ler o arquivo.');
        setIsLoading(false);
    }
    reader.readAsArrayBuffer(file);
  };

  const handleMatchChange = (index: number, newMatchId: string) => {
    const newMatches = [...matches];
    newMatches[index].matchId = newMatchId;
    setMatches(newMatches);
  };

  const handleImport = () => {
    const professorsToUpdate: Professor[] = [];
    matches.forEach(match => {
        if (match.matchId !== 'not_found' && match.matchId !== 'ignore') {
            const professor = state.professores.find(p => p.id === match.matchId);
            if (professor) {
                professorsToUpdate.push({
                    ...professor,
                    disponibilidade: match.parsed.availability,
                });
            }
        }
    });

    if (professorsToUpdate.length > 0) {
        dispatch({ type: 'BATCH_UPDATE_PROFESSORS', payload: { professors: professorsToUpdate } });
        setStep('success');
    } else {
        setError("Nenhum professor foi selecionado para atualização. Verifique os pareamentos.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setMatches([]);
    setError(null);
    setIsLoading(false);
    setStep('upload');
  };

  const sortedProfessorsForDropdown = useMemo(() => 
    [...state.professores].sort((a,b) => a.nome.localeCompare(b.nome)), 
    [state.professores]
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Importar Disponibilidade de Professores (Excel)</h2>
      
      {step === 'upload' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Instruções</h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 mt-2 space-y-1">
                <li>Baixe o modelo de planilha para garantir o formato correto.</li>
                <li>Preencha a planilha com os dados de disponibilidade dos professores, marcando 'X' nos horários disponíveis.</li>
                <li>Salve a planilha e selecione o arquivo abaixo.</li>
                <li>Clique em "Analisar Planilha" para continuar.</li>
              </ol>
            </div>

            <div className="flex justify-start">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar Modelo de Planilha
              </button>
            </div>

            <div>
                <label htmlFor="excel-upload-label" className="block text-sm font-medium text-gray-700 mb-1">Arquivo Excel (.xlsx)</label>
                <div className="mt-1 flex items-center space-x-3">
                    <label
                        htmlFor="excel-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Escolher arquivo
                    </label>
                    <input
                        id="excel-upload"
                        name="excel-upload"
                        type="file"
                        accept=".xlsx"
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
                    {isLoading ? 'Analisando...' : 'Analisar Planilha'}
                </button>
            </div>
        </div>
      )}

      {step === 'validate' && matches.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Passo 2: Validar Pareamento</h3>
            <p className="text-sm text-gray-600">O sistema tentou parear os professores da planilha com os do sistema. Por favor, revise e ajuste os pareamentos. A disponibilidade dos professores selecionados será **substituída**.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome na Planilha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor no Sistema</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {matches.map((match, index) => (
                            <tr key={index} className={match.matchId === 'not_found' ? 'bg-yellow-50' : match.matchId === 'ignore' ? 'bg-gray-100 opacity-60' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{match.parsed.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <select 
                                        value={match.matchId}
                                        onChange={e => handleMatchChange(index, e.target.value)}
                                        className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {match.matchId === 'not_found' && <option value="not_found">-- Nenhum professor encontrado --</option>}
                                        <option value="ignore">Ignorar este professor</option>
                                        {sortedProfessorsForDropdown.map(p => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end space-x-2">
                <button onClick={handleReset} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                <button onClick={handleImport} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Confirmar e Atualizar</button>
            </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white p-6 rounded-lg shadow text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-700">Importação Concluída!</h3>
            <p>A disponibilidade dos professores selecionados foi atualizada com sucesso. Você pode verificar as mudanças na aba "Professores".</p>
            <button onClick={handleReset} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Importar Nova Planilha</button>
        </div>
      )}
    </div>
  );
};

export default AvailabilityImporter;