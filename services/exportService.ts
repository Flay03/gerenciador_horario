
import ExcelJS from 'exceljs';
import { AppState, GridType, GradeSlot, Professor } from '../types';
import { DIAS_SEMANA, HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR, HORARIOS_NOITE_MODULAR } from '../constants';

// --- STYLING DEFINITIONS for ExcelJS ---
const styles: { [key: string]: Partial<ExcelJS.Style> } = {
  title: {
    font: { name: 'Calibri', size: 18, bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF2F5496" } },
    alignment: { horizontal: "center", vertical: "middle" }
  },
  curso: {
    font: { name: 'Calibri', size: 12, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFAEC6CF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "medium" }, bottom: { style: "medium" },
      left: { style: "medium" }, right: { style: "medium" }
    }
  },
  turma: {
    font: { name: 'Calibri', size: 11, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF8EA9DB" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: { bottom: { style: "medium", color: { argb: "FF2F5496" } } }
  },
  day: {
    font: { name: 'Calibri', size: 12, bold: true, color: { argb: "FF404040" } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFE7E6E6" } },
    alignment: { horizontal: "center", vertical: "middle", textRotation: 90 },
    border: { right: { style: "medium", color: { argb: "FF2F5496" } } }
  },
  periodo: {
    font: { name: 'Calibri', size: 11, bold: true, color: { argb: "FF404040" } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFE7E6E6" } },
    alignment: { horizontal: "center", vertical: "middle", textRotation: 90 },
    border: { right: { style: "medium", color: { argb: "FF2F5496" } } }
  },
  time: {
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: "FF404040" } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFE7E6E6" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { right: { style: "medium", color: { argb: "FF2F5496" } } }
  },
  cell_white: {
    font: { name: 'Calibri', size: 9 },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFFFF" } }
  },
  cell_gray: {
    font: { name: 'Calibri', size: 9 },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFF2F2F2" } }
  },
  disabledCell: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFD9D9D9" } },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    }
  }
};

const createWorksheetForGridType = (workbook: ExcelJS.Workbook, state: AppState, gridType: GridType, sheetName: string) => {
    const { ano, cursos, turmas, grade, disciplinas, professores } = state;

    const visibleTurmas = turmas
        .filter(t => t.isModular === (gridType === 'modular'))
        .sort((a, b) => {
            const cursoA = cursos.find(c => c.id === a.cursoId)?.nome || '';
            const cursoB = cursos.find(c => c.id === b.cursoId)?.nome || '';
            if (cursoA.localeCompare(cursoB) !== 0) return cursoA.localeCompare(cursoB);
            return a.nome.localeCompare(b.nome);
        });
    
    if (visibleTurmas.length === 0) return;

    const turmasByCurso = cursos
        .map(c => ({ ...c, turmas: visibleTurmas.filter(t => t.cursoId === c.id) }))
        .filter(c => c.turmas.length > 0);

    const gradeMap = new Map<string, GradeSlot[]>();
    grade.forEach(slot => {
        const baseId = `${slot.turmaId}_${slot.dia}_${slot.horario}`;
        if (!gradeMap.has(baseId)) gradeMap.set(baseId, []);
        gradeMap.get(baseId)!.push(slot);
    });

    const ws = workbook.addWorksheet(sheetName);

    const titleRow = ws.addRow([`Grade de Horários ${ano}`]);
    titleRow.height = 24;
    ws.mergeCells(1, 1, 1, 3 + visibleTurmas.length);
    ws.getCell('A1').style = styles.title;

    const cursoRowValues: (string | null)[] = [null, null, null];
    turmasByCurso.forEach(curso => {
        cursoRowValues.push(curso.nome);
        for (let i = 1; i < curso.turmas.length; i++) cursoRowValues.push(null);
    });
    const cursoRow = ws.addRow(cursoRowValues);
    cursoRow.height = 20;
    let currentCol = 4;
    turmasByCurso.forEach(curso => {
        if (curso.turmas.length > 0) {
            if (curso.turmas.length > 1) {
                ws.mergeCells(2, currentCol, 2, currentCol + curso.turmas.length - 1);
            }
            for (let i = 0; i < curso.turmas.length; i++) {
                ws.getCell(2, currentCol + i).style = styles.curso;
            }
            currentCol += curso.turmas.length;
        }
    });

    const headerRow = ws.addRow(['Dia', 'Período', 'Horário', ...visibleTurmas.map(t => t.nome)]);
    headerRow.height = 35;
    headerRow.getCell(1).style = { ...styles.day, alignment: { ...styles.day.alignment, textRotation: 0 }};
    headerRow.getCell(2).style = { ...styles.periodo, alignment: { ...styles.periodo.alignment, textRotation: 0 }};
    headerRow.getCell(3).style = styles.time;
    for (let i = 4; i <= headerRow.cellCount; i++) {
        headerRow.getCell(i).style = styles.turma;
    }

    const horariosNoite = gridType === 'modular' ? HORARIOS_NOITE_MODULAR : HORARIOS_NOITE_REGULAR;
    const periods = [
        { name: "Manhã", horarios: HORARIOS_MANHA },
        { name: "Tarde", horarios: HORARIOS_TARDE },
        { name: "Noite", horarios: horariosNoite },
    ];
    
    let isGrayRow = false;
    DIAS_SEMANA.forEach((dia, diaIndex) => {
        const dayStartRow = ws.rowCount + 1;
        
        periods.forEach((period, periodIndex) => {
            if(period.horarios.length === 0) return;
            const periodStartRow = ws.rowCount + 1;
            period.horarios.forEach((horario) => {
                const cellContents = visibleTurmas.map(turma => {
                    if (gridType === 'modular' && horario === '18:10-19:00') return null;
                    const baseId = `${turma.id}_${dia}_${horario}`;
                    const slots = gradeMap.get(baseId);
                    if (!slots) return '';
                    return slots.map(slot => {
                        const disc = disciplinas.find(d => d.id === slot.disciplinaId);
                        const prof = professores.find(p => p.id === slot.professorId);
                        return `${disc?.nome || '?'}\n${prof?.nome || '?'}`;
                    }).join('\n\n');
                });

                const dataRow = ws.addRow([null, null, horario, ...cellContents]);
                dataRow.height = 50;
                dataRow.getCell(3).style = styles.time;
                for (let i = 4; i <= dataRow.cellCount; i++) {
                     dataRow.getCell(i).style = dataRow.getCell(i).value === null ? styles.disabledCell : (isGrayRow ? styles.cell_gray : styles.cell_white);
                }
                isGrayRow = !isGrayRow;
            });
            if (period.horarios.length > 0) {
              const periodCell = ws.getCell(periodStartRow, 2);
              periodCell.value = period.name;
              periodCell.style = styles.periodo;
              if (period.horarios.length > 1) {
                  ws.mergeCells(periodStartRow, 2, ws.rowCount, 2);
              }
            }

            const remainingPeriodsHaveContent = periods
                .slice(periodIndex + 1)
                .some(p => p.horarios.length > 0);

            if (remainingPeriodsHaveContent) {
                const separatorRow = ws.addRow([]);
                separatorRow.height = 3;
                for (let i = 3; i <= 3 + visibleTurmas.length; i++) { 
                    const cell = separatorRow.getCell(i);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC5D4EA' } };
                }
            }
        });
        
        if (ws.rowCount >= dayStartRow) {
            const dayCell = ws.getCell(dayStartRow, 1);
            dayCell.value = dia.charAt(0).toUpperCase() + dia.slice(1);
            dayCell.style = styles.day;
            if(ws.rowCount > dayStartRow) {
                ws.mergeCells(dayStartRow, 1, ws.rowCount, 1);
            }
        }

        if (diaIndex < DIAS_SEMANA.length - 1) {
            const separatorRow = ws.addRow([]);
            separatorRow.height = 5;
            for(let i=1; i <= 3 + visibleTurmas.length; i++) {
                separatorRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' }};
            }
        }
    });

    ws.columns = [
        { width: 8 }, { width: 10 }, { width: 15 }, 
        ...Array(visibleTurmas.length).fill({ width: 25 })
    ];
    ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }];
};


export const exportTimetableToXLSX = (state: AppState): { workbook: ExcelJS.Workbook | null; error?: string } => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Timetable Scheduler';
    workbook.created = new Date();

    createWorksheetForGridType(workbook, state, 'regular', 'Grade Regular');
    createWorksheetForGridType(workbook, state, 'modular', 'Grade Modular');
    
    if (workbook.worksheets.length === 0) {
        return { workbook: null, error: 'Não há dados para exportar.' };
    }

    return { workbook };
};

export const exportProfessorTimetableToXLSX = (state: AppState, professorId: string): { workbook: ExcelJS.Workbook | null; error?: string } => {
    const { professores, grade, turmas, disciplinas } = state;
    const professor = professores.find(p => p.id === professorId);
    if (!professor) return { workbook: null, error: 'Professor não encontrado.' };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Timetable Scheduler';
    workbook.created = new Date();
    const ws = workbook.addWorksheet(professor.nome.substring(0, 31));

    const professorGrade = grade.filter(slot => slot.professorId === professorId);
    const totalAulas = professorGrade.reduce((total, slot) => {
        const turma = turmas.find(t => t.id === slot.turmaId);
        return total + (turma?.isModular ? 1.25 : 1);
    }, 0);

    const schedule: Record<string, Record<string, { turma: string; disciplina: string }>> = {};
    professorGrade.forEach(slot => {
        if (!schedule[slot.dia]) schedule[slot.dia] = {};
        schedule[slot.dia][slot.horario] = {
            turma: turmas.find(t => t.id === slot.turmaId)?.nome || '?',
            disciplina: disciplinas.find(d => d.id === slot.disciplinaId)?.nome || '?'
        };
    });

    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = professor.nome;
    titleCell.style = styles.title;

    ws.mergeCells('A2:F2');
    const subtitleCell = ws.getCell('A2');
    subtitleCell.value = `Total de Aulas Semanais: ${totalAulas}`;
    subtitleCell.style = { font: { bold: true }, alignment: { horizontal: 'center' }};

    const header = ws.addRow(['Horário', ...DIAS_SEMANA.map(d => d.charAt(0).toUpperCase() + d.slice(1))]);
    header.eachCell(cell => {
        cell.style = styles.turma;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFC5D4EA" } };
    });

    const allHorarios = [...new Set([...HORARIOS_MANHA, ...HORARIOS_TARDE, ...HORARIOS_NOITE_REGULAR, ...HORARIOS_NOITE_MODULAR])].sort();
    
    allHorarios.forEach((horario, index) => {
        const rowData = [horario];
        DIAS_SEMANA.forEach(dia => {
            const slot = schedule[dia]?.[horario];
            rowData.push(slot ? `${slot.disciplina}\n${slot.turma}` : '');
        });
        const row = ws.addRow(rowData);
        row.getCell(1).style = styles.time;
        for (let i = 2; i <= 6; i++) {
            row.getCell(i).style = styles.cell_white;
        }
        row.height = 30;

        const isEndOfManha = HORARIOS_MANHA[HORARIOS_MANHA.length - 1] === horario;
        const isEndOfTarde = HORARIOS_TARDE[HORARIOS_TARDE.length - 1] === horario;
        const isLastHorarioOverall = index === allHorarios.length - 1;

        if ((isEndOfManha || isEndOfTarde) && !isLastHorarioOverall) {
            const separatorRow = ws.addRow([]);
            separatorRow.height = 3;
            for (let i = 1; i <= 1 + DIAS_SEMANA.length; i++) {
                const cell = separatorRow.getCell(i);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC5D4EA' } };
            }
        }
    });

    const dailyTotals = DIAS_SEMANA.map(dia =>
        professorGrade
            .filter(slot => slot.dia === dia)
            .reduce((total, slot) => total + (turmas.find(t => t.id === slot.turmaId)?.isModular ? 1.25 : 1), 0)
    );
    const footer = ws.addRow(['Carga Diária', ...dailyTotals]);
    footer.eachCell(cell => {
        cell.style = { ...styles.turma, font: { ...styles.turma.font, bold: true } };
    });
    
    ws.columns = [{ width: 15 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }];
    
    return { workbook };
};
