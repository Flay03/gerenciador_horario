import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { DIAS_SEMANA, HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR, HORARIOS_NOITE_MODULAR } from '../../constants';

interface ProfessorTimetableProps {
    professorId: string;
}

const ProfessorTimetable: React.FC<ProfessorTimetableProps> = ({ professorId }) => {
    const { state } = useData();
    const { professores, grade, turmas, disciplinas } = state;

    const professor = professores.find(p => p.id === professorId);
    if (!professor) {
        return <div className="p-4 text-red-500">Professor não encontrado.</div>;
    }

    const professorGrade = grade.filter(slot => slot.professorId === professorId);

    const totalAulas = useMemo(() => {
        return professorGrade.reduce((total, slot) => {
            const turma = turmas.find(t => t.id === slot.turmaId);
            const aulaValue = turma?.isModular ? 1.25 : 1;
            return total + aulaValue;
        }, 0);
    }, [professorGrade, turmas]);

    const schedule: Record<string, Record<string, { turma: string, disciplina: string }>> = {};
    professorGrade.forEach(slot => {
        if (!schedule[slot.dia]) {
            schedule[slot.dia] = {};
        }
        const turma = turmas.find(t => t.id === slot.turmaId)?.nome || 'N/A';
        const disciplina = disciplinas.find(d => d.id === slot.disciplinaId)?.nome || 'N/A';
        schedule[slot.dia][slot.horario] = { turma, disciplina };
    });

    const dailyTotals = useMemo(() => {
        return DIAS_SEMANA.reduce((acc, dia) => {
            const totalDia = professorGrade
                .filter(slot => slot.dia === dia)
                .reduce((diaTotal, slot) => {
                    const turma = turmas.find(t => t.id === slot.turmaId);
                    const aulaValue = turma?.isModular ? 1.25 : 1;
                    return diaTotal + aulaValue;
                }, 0);
            acc[dia] = totalDia;
            return acc;
        }, {} as Record<string, number>);
    }, [professorGrade, turmas]);
    
    const horariosToShow = useMemo(() => {
        const allNightSlots = [...new Set([...HORARIOS_NOITE_REGULAR, ...HORARIOS_NOITE_MODULAR])].sort();
        return [...HORARIOS_MANHA, ...HORARIOS_TARDE, ...allNightSlots];
    }, []);


    return (
        <div className="bg-white shadow-lg rounded-lg overflow-auto border border-gray-200">
            <div className="grid" style={{ gridTemplateColumns: '80px repeat(5, minmax(150px, 1fr))' }}>
                {/* Header Row 1: Totals and Professor Name */}
                <div className="row-span-2 p-2 border-b-2 border-r border-gray-300 bg-gray-100 flex flex-col items-center justify-center text-center">
                    <span className="font-bold text-2xl">{totalAulas}</span>
                    <span className="text-xs text-gray-600">Aulas</span>
                </div>
                <div className="col-span-5 p-4 border-b-2 border-gray-300 bg-gray-200 text-center text-xl font-bold text-gray-800 flex items-center justify-center">
                    {professor.nome}
                </div>

                {/* Header Row 2: Days of the Week */}
                <div className="col-start-2 col-span-5 grid grid-cols-5">
                    {DIAS_SEMANA.map((dia, index) => (
                        <div key={dia} className={`p-2 border-b-2 bg-gray-100 text-center font-semibold capitalize ${index < DIAS_SEMANA.length - 1 ? 'border-r' : ''} border-gray-300`}>
                            {dia.split('').join(' ')}
                        </div>
                    ))}
                </div>


                {/* Schedule Rows */}
                {horariosToShow.map((horario, horarioIndex) => {
                    const isEndOfManha = HORARIOS_MANHA[HORARIOS_MANHA.length - 1] === horario;
                    const isEndOfTarde = HORARIOS_TARDE[HORARIOS_TARDE.length - 1] === horario;
                    const isEndOfPeriod = isEndOfManha || isEndOfTarde;
                    const isLastHorario = horarioIndex === horariosToShow.length - 1;

                    return (
                        <React.Fragment key={horario}>
                            {/* Time Slot Row */}
                            <div className={`contents`}>
                                <div className={`p-2 border-r border-gray-300 bg-gray-50 text-xs text-center font-medium flex items-center justify-center ${isLastHorario ? '' : 'border-b'}`}>
                                    {horario}
                                </div>
                                {DIAS_SEMANA.map((dia, diaIndex) => {
                                    const slot = schedule[dia]?.[horario];
                                    return (
                                        <div key={`${dia}-${horario}`} className={`p-2 min-h-[50px] ${diaIndex < DIAS_SEMANA.length - 1 ? 'border-r' : ''} ${isLastHorario ? '' : 'border-b'} border-gray-200`}>
                                            {slot && (
                                                <div className="text-xs bg-indigo-100 p-1 rounded">
                                                    <p className="font-bold truncate">{slot.disciplina}</p>
                                                    <p className="text-gray-600 truncate">{slot.turma}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Separator Row */}
                            {isEndOfPeriod && !isLastHorario && (
                                <div className="col-span-6 h-2 bg-gray-200 border-b border-gray-300"></div>
                            )}
                        </React.Fragment>
                    );
                })}

                {/* Footer Row: Daily Totals */}
                <div className="p-2 border-r border-t border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center">
                    Carga Diária
                </div>
                {DIAS_SEMANA.map((dia, index) => (
                    <div key={`total-${dia}`} className={`p-2 bg-gray-100 text-center font-bold border-t ${index < DIAS_SEMANA.length - 1 ? 'border-r' : ''} border-gray-200`}>
                        {dailyTotals[dia] || 0}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfessorTimetable;