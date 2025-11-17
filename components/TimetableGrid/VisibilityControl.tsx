import React, { useState } from 'react';
import { Curso, Periodo, Turma } from '../../types';

export interface VisibilityState {
  periods: Record<Periodo, boolean>;
  cursos: Record<string, boolean>;
  turmas: Record<string, boolean>;
}

interface VisibilityControlProps {
  visibility: VisibilityState;
  onVisibilityChange: (newVisibility: VisibilityState) => void;
  cursos: Curso[];
  turmas: Turma[];
}

const Checkbox: React.FC<{label: string, checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean}> = ({label, checked, onChange, disabled}) => (
    <label className={`flex items-center space-x-2 ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} className="rounded text-indigo-600 focus:ring-indigo-500" />
        <span>{label}</span>
    </label>
);

const Section: React.FC<{title: string, children: React.ReactNode, onSelectAll: () => void, onDeselectAll: () => void}> = ({ title, children, onSelectAll, onDeselectAll }) => (
    <div className="p-2 border rounded-md bg-white">
        <h4 className="font-bold mb-2">{title}</h4>
        <div className="flex space-x-2 mb-2">
            <button onClick={onSelectAll} className="text-xs text-indigo-600 hover:underline">Todos</button>
            <button onClick={onDeselectAll} className="text-xs text-indigo-600 hover:underline">Nenhum</button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {children}
        </div>
    </div>
);


const VisibilityControl: React.FC<VisibilityControlProps> = ({ visibility, onVisibilityChange, cursos, turmas }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePeriodChange = (period: Periodo, isVisible: boolean) => {
    onVisibilityChange({
      ...visibility,
      periods: { ...visibility.periods, [period]: isVisible },
    });
  };
  
  const handleCursoChange = (cursoId: string, isVisible: boolean) => {
    const newTurmasVisibility = { ...visibility.turmas };
    turmas.forEach(turma => {
      if (turma.cursoId === cursoId) {
        newTurmasVisibility[turma.id] = isVisible;
      }
    });
    onVisibilityChange({
      ...visibility,
      cursos: { ...visibility.cursos, [cursoId]: isVisible },
      turmas: newTurmasVisibility,
    });
  };
  
  const handleTurmaChange = (turmaId: string, isVisible: boolean) => {
    onVisibilityChange({
      ...visibility,
      turmas: { ...visibility.turmas, [turmaId]: isVisible },
    });
  };

  const handleSelectAll = (type: 'periods' | 'cursos' | 'turmas') => {
      const newVisibility = {...visibility};
      if (type === 'periods') {
          Object.keys(newVisibility.periods).forEach(k => newVisibility.periods[k as Periodo] = true);
      } else if (type === 'cursos') {
          Object.keys(newVisibility.cursos).forEach(k => newVisibility.cursos[k] = true);
          Object.keys(newVisibility.turmas).forEach(k => newVisibility.turmas[k] = true); // Also select all turmas
      } else if (type === 'turmas') {
          Object.keys(newVisibility.turmas).forEach(k => newVisibility.turmas[k] = true);
      }
      onVisibilityChange(newVisibility);
  };
  
  const handleDeselectAll = (type: 'periods' | 'cursos' | 'turmas') => {
      const newVisibility = {...visibility};
      if (type === 'periods') {
          Object.keys(newVisibility.periods).forEach(k => newVisibility.periods[k as Periodo] = false);
      } else if (type === 'cursos') {
          Object.keys(newVisibility.cursos).forEach(k => newVisibility.cursos[k] = false);
          Object.keys(newVisibility.turmas).forEach(k => newVisibility.turmas[k] = false); // Also deselect all turmas
      } else if (type === 'turmas') {
          Object.keys(newVisibility.turmas).forEach(k => newVisibility.turmas[k] = false);
      }
      onVisibilityChange(newVisibility);
  };

  return (
    <div className="bg-gray-100 p-2 mb-4 rounded-md shadow-sm border text-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left font-semibold text-gray-700 flex justify-between items-center">
        <span>{isOpen ? 'Ocultar Opções de Visualização' : 'Exibir Opções de Visualização'}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section title="Períodos" onSelectAll={() => handleSelectAll('periods')} onDeselectAll={() => handleDeselectAll('periods')}>
              <Checkbox label="Manhã" checked={visibility.periods.manha} onChange={v => handlePeriodChange('manha', v)} />
              <Checkbox label="Tarde" checked={visibility.periods.tarde} onChange={v => handlePeriodChange('tarde', v)} />
              <Checkbox label="Noite" checked={visibility.periods.noite} onChange={v => handlePeriodChange('noite', v)} />
            </Section>

            <Section title="Cursos" onSelectAll={() => handleSelectAll('cursos')} onDeselectAll={() => handleDeselectAll('cursos')}>
              {cursos.map(curso => (
                <Checkbox key={curso.id} label={curso.nome} checked={visibility.cursos[curso.id] ?? true} onChange={v => handleCursoChange(curso.id, v)} />
              ))}
            </Section>
            
            <div className="p-2 border rounded-md bg-white">
              <h4 className="font-bold mb-2">Turmas</h4>
              <div className="flex space-x-2 mb-2">
                  <button onClick={() => handleSelectAll('turmas')} className="text-xs text-indigo-600 hover:underline">Todas</button>
                  <button onClick={() => handleDeselectAll('turmas')} className="text-xs text-indigo-600 hover:underline">Nenhuma</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {cursos.map(curso => (
                      <div key={curso.id}>
                          <h5 className="font-semibold text-gray-600">{curso.nome}</h5>
                          <div className="pl-4 space-y-1">
                              {turmas.filter(t => t.cursoId === curso.id).map(turma => (
                                  <Checkbox key={turma.id} label={turma.nome} checked={visibility.turmas[turma.id] ?? true} onChange={v => handleTurmaChange(turma.id, v)} disabled={!(visibility.cursos[curso.id] ?? true)} />
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisibilityControl;