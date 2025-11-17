import React, { useState } from 'react';
import CursosManager from '../components/management/CursosManager';
import TurmasManager from '../components/management/TurmasManager';
import DisciplinasManager from '../components/management/DisciplinasManager';
import ProfessoresManager from '../components/management/ProfessoresManager';
import AtribuicoesManager from '../components/management/AtribuicoesManager';
import ImportWizard from '../components/management/ImportWizard';
import AvailabilityImporter from '../components/management/AvailabilityImporter';

type Tab = 'cursos' | 'turmas' | 'disciplinas' | 'professores' | 'atribuicoes' | 'importar-html' | 'importar-disp-excel';

const ManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('cursos');

    const renderContent = () => {
        switch(activeTab) {
            case 'cursos': return <CursosManager />;
            case 'turmas': return <TurmasManager />;
            case 'disciplinas': return <DisciplinasManager />;
            case 'professores': return <ProfessoresManager />;
            case 'atribuicoes': return <AtribuicoesManager />;
            case 'importar-html': return <ImportWizard />;
            case 'importar-disp-excel': return <AvailabilityImporter />;
            default: return null;
        }
    }
    
    const TabButton: React.FC<{tabName: Tab, label: string, disabled?: boolean}> = ({ tabName, label, disabled }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            disabled={disabled}
            title={disabled ? "Função em desenvolvimento" : ""}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tabName 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:border-transparent`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 px-4 overflow-x-auto" aria-label="Tabs">
                    <TabButton tabName="cursos" label="Cursos" />
                    <TabButton tabName="turmas" label="Turmas" />
                    <TabButton tabName="disciplinas" label="Disciplinas" />
                    <TabButton tabName="professores" label="Professores" />
                    <TabButton tabName="atribuicoes" label="Atribuições" />
                    <TabButton tabName="importar-html" label="Importar SIG (HTML)" />
                    <TabButton tabName="importar-disp-excel" label="Importar Disp. (Excel)" disabled />
                </nav>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default ManagementPage;