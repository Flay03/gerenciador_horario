
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { GridType, Alerta, AlertType } from '../types';
import { HORARIOS_MANHA, HORARIOS_TARDE } from '../constants';
import { resolveBnccDiscipline } from '../services/bnccHelper';
import OverviewStats from '../components/Dashboard/OverviewStats';
import AlertsChart from '../components/Dashboard/AlertsChart';
import ProfessorLoadChart from '../components/Dashboard/ProfessorLoadChart';
import TurmaCompletionList from '../components/Dashboard/TurmaCompletionList';
import PeriodDistributionChart from '../components/Dashboard/PeriodDistributionChart';
import QuickInsights from '../components/Dashboard/QuickInsights';

const DashboardPage: React.FC = () => {
    const { state } = useData();
    const [activeGrid, setActiveGrid] = useState<GridType>('regular');

    const filteredData = useMemo(() => {
        const isModular = activeGrid === 'modular';
        const relevantTurmas = state.turmas.filter(t => t.isModular === isModular);
        const relevantTurmaIds = new Set(relevantTurmas.map(t => t.id));
        const relevantDisciplinas = state.disciplinas.filter(d => relevantTurmaIds.has(d.turmaId));
        const relevantDisciplinaIds = new Set(relevantDisciplinas.map(d => d.id));
        const relevantAtribuicoes = state.atribuicoes.filter(a => relevantDisciplinaIds.has(a.disciplinaId));
        const relevantGrade = state.grade.filter(s => relevantTurmaIds.has(s.turmaId));
        const relevantAlertas = state.alertas.filter(alerta => 
            alerta.gradeSlotIds.some(slotId => {
                const turmaId = slotId.split('_')[0];
                return relevantTurmaIds.has(turmaId);
            })
        );

        return {
            turmas: relevantTurmas,
            disciplinas: relevantDisciplinas,
            atribuicoes: relevantAtribuicoes,
            grade: relevantGrade,
            alertas: relevantAlertas,
            professores: state.professores, // All professors are needed for some insights
        };
    }, [activeGrid, state]);

    const dashboardStats = useMemo(() => {
        const { turmas, disciplinas, atribuicoes, grade, alertas } = filteredData;

        // 1. Completion Stats
        const totalAulasNecessarias = disciplinas.reduce((sum, d) => sum + d.aulasSemanais, 0);

        // Count unique class sessions (turma/dia/horario) to correctly handle divided classes and BNCC swaps.
        const uniqueSessions = new Map<string, { disciplinaId: string; turmaId: string }>();
        grade.forEach(slot => {
            const baseId = `${slot.turmaId}_${slot.dia}_${slot.horario}`;
            if (!uniqueSessions.has(baseId)) {
                // CORRECTLY attribute the session to the final discipline, resolving BNCC swaps.
                const { finalDisciplinaId } = resolveBnccDiscipline(slot, state);
                uniqueSessions.set(baseId, { disciplinaId: finalDisciplinaId, turmaId: slot.turmaId });
            }
        });

        // Calculate allocated classes per discipline based on these unique sessions.
        const aulasAlocadasPorDisciplina = new Map<string, number>();
        uniqueSessions.forEach((session) => {
            const turma = turmas.find(t => t.id === session.turmaId);
            const aulaValue = turma?.isModular ? 1.25 : 1;
            const currentCount = aulasAlocadasPorDisciplina.get(session.disciplinaId) || 0;
            aulasAlocadasPorDisciplina.set(session.disciplinaId, currentCount + aulaValue);
        });

        let totalAulasAlocadas = 0;
        aulasAlocadasPorDisciplina.forEach(count => {
            totalAulasAlocadas += count;
        });
        
        const completionPercentage = totalAulasNecessarias > 0 ? (totalAulasAlocadas / totalAulasNecessarias) * 100 : 0;

        // 2. Alert Stats
        const alertCounts = alertas.reduce((acc, alerta) => {
            acc[alerta.tipo] = (acc[alerta.tipo] || 0) + 1;
            return acc;
        }, {} as Record<AlertType, number>);
        const criticalAlertCount = alertCounts[AlertType.ProfessorConflitoHorario] || 0;

        // 3. Overview KPIs
        const activeProfessorIds = new Set(grade.map(s => s.professorId));

        // 4. Professor Load
        const professorLoad = new Map<string, { nome: string; aulas: number }>();
        grade.forEach(slot => {
            const prof = state.professores.find(p => p.id === slot.professorId);
            if (!prof) return;

            const isModular = turmas.find(t => t.id === slot.turmaId)?.isModular ?? false;
            const aulaValue = isModular ? 1.25 : 1;
            
            if (!professorLoad.has(prof.id)) {
                professorLoad.set(prof.id, { nome: prof.nome, aulas: 0 });
            }
            professorLoad.get(prof.id)!.aulas += aulaValue;
        });
        const professorLoadData = Array.from(professorLoad.values()).sort((a, b) => b.aulas - a.aulas);

        // 5. Turma Completion
        const turmaCompletionData = turmas.map(turma => {
            const disciplinasDaTurma = disciplinas.filter(d => d.turmaId === turma.id);
            const total = disciplinasDaTurma.reduce((sum, d) => sum + d.aulasSemanais, 0);
            
            let alocadas = 0;
            disciplinasDaTurma.forEach(d => {
                alocadas += aulasAlocadasPorDisciplina.get(d.id) || 0;
            });
            return { id: turma.id, nome: turma.nome, alocadas, total };
        }).sort((a,b) => (a.alocadas/a.total || 0) - (b.alocadas/b.total || 0));

        // 6. Period Distribution
        const periodDistribution = { manha: 0, tarde: 0, noite: 0 };
        uniqueSessions.forEach(session => {
            const slotInGrade = grade.find(g => g.turmaId === session.turmaId && g.disciplinaId === session.disciplinaId);
            if(!slotInGrade) return;
            const horario = slotInGrade.horario;
            if (HORARIOS_MANHA.includes(horario)) periodDistribution.manha++;
            else if (HORARIOS_TARDE.includes(horario)) periodDistribution.tarde++;
            else periodDistribution.noite++;
        });


        // 7. Quick Insights
        // Unassigned disciplines are specific to the current grid view
        const assignedDisciplineIds = new Set(atribuicoes.map(a => a.disciplinaId));
        const unassignedDisciplines = disciplinas.filter(d => !assignedDisciplineIds.has(d.id));
        
        // Unassigned professors should be global, not tied to the current grid view
        const allAssignedProfessorIds = new Set(state.atribuicoes.flatMap(a => a.professores));
        const globallyUnassignedProfessors = state.professores.filter(p => !allAssignedProfessorIds.has(p.id));


        return {
            completionPercentage,
            criticalAlertCount,
            activeProfessorCount: activeProfessorIds.size,
            turmaCount: turmas.length,
            alertCounts,
            professorLoadData,
            turmaCompletionData,
            periodDistribution,
            unassignedDisciplines,
            unassignedProfessors: globallyUnassignedProfessors,
        };
    }, [filteredData, state]);

    return (
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 lg:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Painel de Controle</h1>
                <div className="mt-4 md:mt-0">
                    <div className="flex items-center bg-gray-200 rounded-md p-1">
                        <button onClick={() => setActiveGrid('regular')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeGrid === 'regular' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-gray-300'}`}>
                            Grade Regular
                        </button>
                        <button onClick={() => setActiveGrid('modular')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeGrid === 'modular' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-gray-300'}`}>
                            Grade Modular
                        </button>
                    </div>
                </div>
            </div>

            {/* Main grid for dashboard widgets */}
            <div className="grid grid-cols-12 gap-6">
                {/* Overview Stats Row */}
                <div className="col-span-12">
                   <OverviewStats 
                        completionPercentage={dashboardStats.completionPercentage}
                        criticalAlerts={dashboardStats.criticalAlertCount}
                        activeProfessors={dashboardStats.activeProfessorCount}
                        totalTurmas={dashboardStats.turmaCount}
                   />
                </div>

                {/* Main Content: Charts and Lists */}
                <div className="col-span-12 lg:col-span-4">
                    <AlertsChart data={dashboardStats.alertCounts} />
                </div>
                <div className="col-span-12 lg:col-span-8">
                    <ProfessorLoadChart data={dashboardStats.professorLoadData} />
                </div>

                <div className="col-span-12 lg:col-span-5">
                    <TurmaCompletionList data={dashboardStats.turmaCompletionData} />
                </div>

                <div className="col-span-12 lg:col-span-3">
                    <PeriodDistributionChart data={dashboardStats.periodDistribution} />
                </div>
                 <div className="col-span-12 lg:col-span-4">
                    <QuickInsights 
                        unassignedDisciplines={dashboardStats.unassignedDisciplines}
                        unassignedProfessors={dashboardStats.unassignedProfessors}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
