
import jsPDF from 'jspdf';
import { AppState, Professor, GridType, Turma, GradeSlot, Disciplina } from '../types';
import { DIAS_SEMANA, HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR, HORARIOS_NOITE_MODULAR } from '../constants';


// This function remains unchanged as requested, for individual professor exports.
export const generatePdfForProfessor = (professor: Professor, grade: GradeSlot[], turmas: Turma[], disciplinas: any[]): { doc: jsPDF | null, error?: string } => {
    if (!professor || !grade || !turmas || !disciplinas) {
      return { doc: null, error: 'Dados incompletos para gerar o PDF do professor.' };
    }

    // --- 1. Data Preparation ---
    const professorGrade = grade.filter(slot => slot.professorId === professor.id);
    const totalAulas = professorGrade.reduce((total, slot) => {
        const turma = turmas.find(t => t.id === slot.turmaId);
        return total + (turma?.isModular ? 1.25 : 1);
    }, 0);

    const dailyTotals = DIAS_SEMANA.reduce((acc, dia) => {
        acc[dia] = professorGrade
            .filter(slot => slot.dia === dia)
            .reduce((diaTotal, slot) => {
                const turma = turmas.find(t => t.id === slot.turmaId);
                return diaTotal + (turma?.isModular ? 1.25 : 1);
            }, 0);
        return acc;
    }, {} as Record<string, number>);

    const schedule: Record<string, Record<string, { turma: string; disciplina: string }>> = {};
    professorGrade.forEach(slot => {
        if (!schedule[slot.dia]) schedule[slot.dia] = {};
        const turmaNome = turmas.find(t => t.id === slot.turmaId)?.nome || 'N/A';
        const disciplinaNome = disciplinas.find(d => d.id === slot.disciplinaId)?.nome || 'N/A';
        schedule[slot.dia][slot.horario] = { turma: turmaNome, disciplina: disciplinaNome };
    });
    
    const horariosNoite = [...new Set([...HORARIOS_NOITE_REGULAR, ...HORARIOS_NOITE_MODULAR])].sort();
    const periods = [
        { label: "Manhã", horarios: HORARIOS_MANHA },
        { label: "Tarde", horarios: HORARIOS_TARDE },
        { label: "Noite", horarios: horariosNoite },
    ];

    // --- 2. Dimension and Scaling Calculation ---
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const baseMargin = 30;

    let dims: Record<string, number> = {
        titleFontSize: 16,
        subtitleFontSize: 10,
        headerFontSize: 9,
        periodFontSize: 8,
        cellFontSize: 8,
        footerFontSize: 9,
        titleSpacing: 18,
        subtitleSpacing: 25,
        headerRowH: 20,
        regularRowH: 32,
        periodSeparatorH: 5,
        periodHeaderH: 15,
        footerSpacing: 5,
    };

    let totalRequiredHeight = baseMargin;
    totalRequiredHeight += dims.titleSpacing;
    totalRequiredHeight += dims.subtitleSpacing;
    totalRequiredHeight += dims.headerRowH;
    periods.forEach(p => {
        if(p.horarios.length > 0) {
            totalRequiredHeight += dims.periodSeparatorH;
            totalRequiredHeight += dims.periodHeaderH;
            totalRequiredHeight += p.horarios.length * dims.regularRowH;
        }
    });
    totalRequiredHeight += dims.footerSpacing;
    totalRequiredHeight += dims.headerRowH;
    totalRequiredHeight += baseMargin;

    const availableHeight = pageH;
    let scale = 1.0;
    if (totalRequiredHeight > availableHeight) {
        scale = availableHeight / totalRequiredHeight;
    }
    
    const margin = baseMargin * Math.min(scale, 1);
    const contentW = pageW - margin * 2;
    for (const key in dims) {
        dims[key] *= scale;
    }

    // --- 3. PDF Drawing with Scaled Dimensions ---
    let cursorY = margin;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(dims.titleFontSize);
    pdf.text(professor.nome, pageW / 2, cursorY, { align: 'center' });
    cursorY += dims.titleSpacing;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(dims.subtitleFontSize);
    pdf.text(`Total de Aulas Semanais: ${totalAulas}`, pageW / 2, cursorY, { align: 'center' });
    cursorY += dims.subtitleSpacing;

    const timeColW = 65 * Math.min(scale, 1);
    const dayColW = (contentW - timeColW) / DIAS_SEMANA.length;
    
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, cursorY, contentW, dims.headerRowH, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(dims.headerFontSize);
    pdf.setDrawColor(180, 180, 180);
    pdf.rect(margin, cursorY, contentW, dims.headerRowH);

    const headerTextY = cursorY + dims.headerRowH / 2 + (dims.headerFontSize * 0.35);
    pdf.text('Horário', margin + timeColW / 2, headerTextY, { align: 'center' });
    DIAS_SEMANA.forEach((dia, i) => {
        const x = margin + timeColW + (i * dayColW) + (dayColW / 2);
        pdf.text(dia.charAt(0).toUpperCase() + dia.slice(1), x, headerTextY, { align: 'center' });

        // CORREÇÃO 1: Adiciona a linha vertical para a coluna do dia no cabeçalho.
        const lineX = margin + timeColW + (i * dayColW);
        pdf.line(lineX, cursorY, lineX, cursorY + dims.headerRowH);
    });
    cursorY += dims.headerRowH;

    periods.forEach(period => {
        if (period.horarios.length > 0) {
            cursorY += dims.periodSeparatorH;
            pdf.setFillColor(240, 240, 240);
            pdf.rect(margin, cursorY, contentW, dims.periodHeaderH, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(dims.periodFontSize);
            pdf.text(period.label, margin + 5, cursorY + dims.periodHeaderH / 2, { baseline: 'middle' });
            cursorY += dims.periodHeaderH;

            period.horarios.forEach(horario => {
                const rowY = cursorY;
                pdf.setDrawColor(220, 220, 220);
                pdf.rect(margin, rowY, contentW, dims.regularRowH);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(dims.cellFontSize);
                pdf.text(horario, margin + timeColW / 2, rowY + dims.regularRowH / 2, { align: 'center', baseline: 'middle' });
                
                // CORREÇÃO 1: Adiciona a linha vertical após a coluna de horário para cada linha de dados.
                pdf.line(margin + timeColW, rowY, margin + timeColW, rowY + dims.regularRowH);

                DIAS_SEMANA.forEach((dia, i) => {
                    const slot = schedule[dia]?.[horario];
                    const cellX = margin + timeColW + (i * dayColW);

                    if (slot) {
                        pdf.setFillColor(232, 242, 255);
                        pdf.rect(cellX, rowY, dayColW, dims.regularRowH, 'F');
                        
                        // CORREÇÃO 2: Implementa a lógica de truncamento para texto longo.
                        const textYDiscipline = rowY + dims.regularRowH / 2 - (dims.cellFontSize * 0.2); // Posição da primeira linha
                        const textYTurma = textYDiscipline + dims.cellFontSize * 1.1; // Posição da segunda linha
                        const textMaxWidth = dayColW - 6; // Largura máxima com uma pequena margem

                        let disciplinaText = slot.disciplina;
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(dims.cellFontSize); // Define a fonte antes de medir
                        if (pdf.getTextWidth(disciplinaText) > textMaxWidth) {
                            while (disciplinaText.length > 0 && pdf.getTextWidth(disciplinaText + '...') > textMaxWidth) {
                                disciplinaText = disciplinaText.slice(0, -1);
                            }
                            disciplinaText += '...';
                        }
                        pdf.text(disciplinaText, cellX + dayColW / 2, textYDiscipline, { align: 'center' });
                        
                        let turmaText = slot.turma;
                        pdf.setFont('helvetica', 'normal');
                        if (pdf.getTextWidth(turmaText) > textMaxWidth) {
                             while (turmaText.length > 0 && pdf.getTextWidth(turmaText + '...') > textMaxWidth) {
                                turmaText = turmaText.slice(0, -1);
                            }
                            turmaText += '...';
                        }
                        pdf.text(turmaText, cellX + dayColW / 2, textYTurma, { align: 'center' });
                    }
                     // CORREÇÃO 1: Adiciona a linha vertical após cada coluna de dia.
                     pdf.line(cellX, rowY, cellX, rowY + dims.regularRowH);
                });
                cursorY += dims.regularRowH;
            });
        }
    });

    cursorY += dims.footerSpacing;
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, cursorY, contentW, dims.headerRowH, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(dims.footerFontSize);
    pdf.setDrawColor(180, 180, 180);
    pdf.rect(margin, cursorY, contentW, dims.headerRowH);

    const footerTextY = cursorY + dims.headerRowH / 2 + (dims.footerFontSize * 0.35);
    pdf.text('Carga Diária', margin + timeColW / 2, footerTextY, { align: 'center' });
    DIAS_SEMANA.forEach((dia, i) => {
        const x = margin + timeColW + (i * dayColW) + (dayColW / 2);
        pdf.text(String(dailyTotals[dia] || 0), x, footerTextY, { align: 'center' });
         // CORREÇÃO 1: Adiciona a linha vertical para as colunas do rodapé.
        const lineX = margin + timeColW + (i * dayColW);
        pdf.line(lineX, cursorY, lineX, cursorY + dims.headerRowH);
    });

    return { doc: pdf };
};

// --- NEW REFACTORED EXPORT WITH ACRONYMS ---

const generateProfessorAcronyms = (professors: Professor[]): Map<string, string> => {
    const acronymMap = new Map<string, string>();
    const counts = new Map<string, number>();
    const nameToBaseAcronym = new Map<string, string>();

    const sortedProfessors = [...professors].sort((a, b) => a.nome.localeCompare(b.nome));

    for (const prof of sortedProfessors) {
        const ignoredWords = new Set(['de', 'da', 'do', 'dos', 'das']);
        const nameParts = prof.nome.trim().split(' ').filter(p => !ignoredWords.has(p.toLowerCase()));
        
        let baseAcronym = '??';
        if (nameParts.length > 0) {
            const firstInitial = nameParts[0].charAt(0).toUpperCase();
            const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0).toUpperCase() : '';
            baseAcronym = `${firstInitial}${lastInitial}`;
        }
        
        counts.set(baseAcronym, (counts.get(baseAcronym) || 0) + 1);
        nameToBaseAcronym.set(prof.nome, baseAcronym);
    }

    const assignedCounts = new Map<string, number>();
    for (const prof of sortedProfessors) {
        const baseAcronym = nameToBaseAcronym.get(prof.nome)!;
        const totalOccurrences = counts.get(baseAcronym)!;

        let finalAcronym = baseAcronym;
        if (totalOccurrences > 1) {
            const numAssigned = assignedCounts.get(baseAcronym) || 0;
            const suffix = numAssigned + 1;
            if (suffix > 1) { 
                finalAcronym = `${baseAcronym}${suffix}`;
            }
            assignedCounts.set(baseAcronym, suffix);
        }
        acronymMap.set(prof.id, finalAcronym);
    }
    return acronymMap;
};

const generateDisciplinaAcronyms = (disciplinas: Disciplina[]): Map<string, string> => {
    const acronymMap = new Map<string, string>();
    const namesSeen = new Set<string>();

    for (const disciplina of disciplinas) {
        if (namesSeen.has(disciplina.nome)) continue;

        const name = disciplina.nome.trim();
        const nameParts = name.split(' ').filter(p => p.length > 0);
        let acronym = '???';

        if (nameParts.length > 1) {
            acronym = nameParts.map(p => p.charAt(0)).join('').toUpperCase();
        } else if (nameParts.length === 1 && nameParts[0].length > 0) {
            acronym = nameParts[0].substring(0, 3).toUpperCase();
        }
        
        if (acronym.length > 5) {
            acronym = acronym.substring(0, 5);
        }
        
        acronymMap.set(disciplina.nome, acronym);
        namesSeen.add(disciplina.nome);
    }
    return acronymMap;
};

const drawSingleLineCellText = (
    doc: jsPDF,
    text: string,
    box: { x: number; y: number; w: number; h: number },
    baseFontSize: number
) => {
    const PADDING = 6; // More safety margin
    const MIN_FONT_SIZE = 4; // More aggressive minimum font
    const availableWidth = box.w - PADDING * 2;
    const availableHeight = box.h - (box.h * 0.1);

    if (availableWidth <= 0 || availableHeight < MIN_FONT_SIZE) {
        return;
    }

    let currentFontSize = Math.min(baseFontSize, availableHeight);
    let fittedText = text;

    // Finer adjustment loop
    while (currentFontSize > MIN_FONT_SIZE) {
        doc.setFontSize(currentFontSize);
        const textWidth = doc.getTextWidth(fittedText);
        if (textWidth < availableWidth) {
            break;
        }
        currentFontSize -= 0.25; // Finer adjustment
    }

    // Final check: if text still doesn't fit at min font size, truncate it.
    doc.setFontSize(MIN_FONT_SIZE);
    if (doc.getTextWidth(text) > availableWidth) {
        let truncated = text;
        // Keep removing characters until the text with "..." fits
        while (truncated.length > 0 && doc.getTextWidth(truncated + "...") > availableWidth) {
            truncated = truncated.slice(0, -1);
        }
        fittedText = truncated + "...";
    }

    const finalFontSize = Math.max(currentFontSize, MIN_FONT_SIZE);
    doc.setFontSize(finalFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(fittedText, box.x + box.w / 2, box.y + box.h / 2, {
        align: 'center',
        baseline: 'middle',
        maxWidth: availableWidth
    });
};

const drawPageFrame = (
    doc: jsPDF,
    pageIndex: number,
    totalPages: number,
    turmaChunk: Turma[],
    gridName: string,
    ano: number,
    margin: number,
    titleHeight: number,
    footerHeight: number,
    guideStartY: number,
    guideEndY: number
) => {
    const pageW = doc.internal.pageSize.getWidth();
    const footerY = doc.internal.pageSize.getHeight() - margin;

    doc.setFontSize(titleHeight * 0.6); // Base font size on scaled title height
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const pageInfo = totalPages > 1 ? `(Página ${pageIndex + 1} de ${totalPages})` : '';
    doc.text(`Grade de Horários ${ano} - ${gridName} ${pageInfo}`, pageW / 2, margin, { align: 'center' });

    doc.setFontSize(titleHeight * 0.4);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    if (turmaChunk.length > 0) {
        const firstTurma = turmaChunk[0].nome;
        const lastTurma = turmaChunk[turmaChunk.length - 1].nome;
        const turmasText = `Exibindo turmas: ${firstTurma} a ${lastTurma}`;
        doc.text(turmasText, pageW / 2, margin + titleHeight * 0.5, { align: 'center' });
    }

    doc.setFontSize(footerHeight * 0.4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, footerY + footerHeight * 0.6);
    
    if (totalPages > 1) {
        doc.text('Instruções: Para montar, imprima todas as páginas e alinhe as guias pontilhadas laterais.', pageW / 2, footerY + footerHeight * 0.6, { align: 'center' });
    }

    if (totalPages > 1) {
        doc.setLineDashPattern([2, 2], 0);
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        if (pageIndex < totalPages - 1) {
            const guideX = pageW - margin;
            doc.line(guideX, guideStartY, guideX, guideEndY);
            doc.setFontSize(footerHeight * 0.45);
            doc.setTextColor(150, 150, 150);
            doc.text(`Continua na Pág. ${pageIndex + 2} ->`, guideX - 5, guideStartY + 10, { align: 'right', angle: 90 });
        }
        if (pageIndex > 0) {
            const guideX = margin;
            doc.line(guideX, guideStartY, guideX, guideEndY);
            doc.setFontSize(footerHeight * 0.45);
            doc.setTextColor(150, 150, 150);
            doc.text(`<- Vem da Pág. ${pageIndex}`, guideX + 5, guideEndY - 10, { align: 'left', angle: 90 });
        }
        doc.setLineDashPattern([], 0);
        doc.setTextColor(0, 0, 0);
    }
};

/**
 * Exports the current grid view to a multi-page PDF document.
 * Optimized for A3 landscape printing. For A4 printing, users should select the "Fit to page" option.
 * This function handles pagination, scaling, and formatting of the entire timetable grid.
 */
export const exportGridToPdf = (state: AppState, gridType: GridType): { doc: jsPDF | null, error?: string } => {
    const { ano, cursos, turmas, grade, disciplinas, professores } = state;

    if (!turmas || !grade || !disciplinas || !professores || !cursos) {
      return { doc: null, error: 'Dados incompletos para gerar o PDF da grade.' };
    }

    const allVisibleTurmas = turmas
        .filter(t => t.isModular === (gridType === 'modular'))
        .sort((a, b) => {
            const cursoA = cursos.find(c => c.id === a.cursoId)?.nome || '';
            const cursoB = cursos.find(c => c.id === b.cursoId)?.nome || '';
            if (cursoA.localeCompare(cursoB) !== 0) return cursoA.localeCompare(cursoB);
            return a.nome.localeCompare(b.nome);
        });

    if (allVisibleTurmas.length === 0) {
        return { doc: null, error: `Nenhuma turma para a grade ${gridType === 'regular' ? 'Regular' : 'Modular'}.` };
    }

    const professorIdsInGrid = new Set<string>();
    const disciplinaIdsInGrid = new Set<string>();
    const turmasInGridIds = new Set(allVisibleTurmas.map(t => t.id));
    grade.forEach(slot => {
        if (turmasInGridIds.has(slot.turmaId)) {
            professorIdsInGrid.add(slot.professorId);
            disciplinaIdsInGrid.add(slot.disciplinaId);
        }
    });
    
    const allProfessorsInGrid = state.professores.filter(p => professorIdsInGrid.has(p.id));
    const allDisciplinasInGrid = state.disciplinas.filter(d => disciplinaIdsInGrid.has(d.id));

    const professorAcronyms = generateProfessorAcronyms(allProfessorsInGrid);
    const disciplinaAcronyms = generateDisciplinaAcronyms(allDisciplinasInGrid);
    
    const diurnoTurmas = allVisibleTurmas.filter(t => t.periodo !== 'noite');
    const noturnoTurmas = allVisibleTurmas.filter(t => t.periodo === 'noite');
    
    const gradeMap = new Map<string, GradeSlot[]>();
    grade.forEach(slot => {
        const baseId = `${slot.turmaId}_${slot.dia}_${slot.horario}`;
        if (!gradeMap.has(baseId)) gradeMap.set(baseId, []);
        gradeMap.get(baseId)!.push(slot);
    });
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 30;
    
    const FONT_SIZES = { title: 14, header: 11, cell: 9, dividedCell: 8 };
    const ROW_HEIGHTS = { titleHeader: 25, titleSubheader: 15, footer: 20, curso: 18, turma: 45, cell: 35, periodSeparator: 3, daySeparator: 5 };
    const COL_WIDTHS = { day: 40, period: 40, time: 60, turma: 90 };
    
    const fixedColsW = COL_WIDTHS.day + COL_WIDTHS.period + COL_WIDTHS.time;
    const availableTurmasW = pageW - margin * 2 - fixedColsW;
    const turmasPerPage = Math.max(1, Math.floor(availableTurmasW / COL_WIDTHS.turma));
    
    const diurnoTurmaChunks: Turma[][] = [];
    for (let i = 0; i < diurnoTurmas.length; i += turmasPerPage) {
        diurnoTurmaChunks.push(diurnoTurmas.slice(i, i + turmasPerPage));
    }
    const noturnoTurmaChunks: Turma[][] = [];
    for (let i = 0; i < noturnoTurmas.length; i += turmasPerPage) {
        noturnoTurmaChunks.push(noturnoTurmas.slice(i, i + turmasPerPage));
    }

    const gridPageCount = diurnoTurmaChunks.length + noturnoTurmaChunks.length;
    if (gridPageCount === 0) {
        return { doc: null, error: `Nenhuma aula encontrada para a grade ${gridType === 'regular' ? 'Regular' : 'Modular'}.` };
    }
    const totalPages = gridPageCount + 1; // +1 for the legend page
    
    let pageCounter = 0;

    const drawGridPagesForChunks = (
        turmaChunks: Turma[][], 
        periods: { name: string, horarios: string[] }[], 
        periodTitle: string
    ) => {
        if (turmaChunks.length === 0) return;

        turmaChunks.forEach((turmaChunk) => {
            if (pageCounter > 0) doc.addPage();
            
            // --- SCALING LOGIC START ---
            let requiredBodyHeight = 0;
            DIAS_SEMANA.forEach((_, diaIndex) => {
                periods.forEach((period, periodIndex) => {
                    if (period.horarios.length === 0) return;
                    requiredBodyHeight += period.horarios.length * ROW_HEIGHTS.cell;
                    if (periods.slice(periodIndex + 1).some(p => p.horarios.length > 0)) {
                        requiredBodyHeight += ROW_HEIGHTS.periodSeparator;
                    }
                });
                if (diaIndex < DIAS_SEMANA.length - 1) {
                    requiredBodyHeight += ROW_HEIGHTS.daySeparator;
                }
            });

            const headerHeight = ROW_HEIGHTS.curso + ROW_HEIGHTS.turma;
            const totalContentHeight = headerHeight + requiredBodyHeight;
            const titleAndFooterHeight = ROW_HEIGHTS.titleHeader + ROW_HEIGHTS.titleSubheader + ROW_HEIGHTS.footer + 20; // +20 de segurança extra
            const availableHeight = pageH - (margin * 2) - titleAndFooterHeight;
            
            let scale = Math.min(1.0, availableHeight / totalContentHeight);
            if (scale < 1.0) {
                scale = scale * 0.95; // 5% adicional de redução para garantir que cabe
            }
            
            const SCALED_ROW_HEIGHTS = { ...ROW_HEIGHTS };
            for (const key in SCALED_ROW_HEIGHTS) {
                SCALED_ROW_HEIGHTS[key as keyof typeof SCALED_ROW_HEIGHTS] *= scale;
            }
            
            const SCALED_FONT_SIZES = { ...FONT_SIZES };
            for (const key in SCALED_FONT_SIZES) {
                SCALED_FONT_SIZES[key as keyof typeof SCALED_FONT_SIZES] *= scale;
            }
            // --- SCALING LOGIC END ---

            const gridName = `${gridType === 'regular' ? 'Grade Regular' : 'Grade Modular'} - ${periodTitle}`;
            const headerAndTableStartY = margin + SCALED_ROW_HEIGHTS.titleHeader + SCALED_ROW_HEIGHTS.titleSubheader;
            const tableEndY = headerAndTableStartY + (totalContentHeight * scale);

            drawPageFrame(doc, pageCounter, totalPages, turmaChunk, gridName, ano, margin, SCALED_ROW_HEIGHTS.titleHeader, SCALED_ROW_HEIGHTS.footer, headerAndTableStartY, tableEndY);
            
            let cursorY = headerAndTableStartY;
            doc.setFont('helvetica', 'bold');
            doc.setDrawColor(150);
            
            let cursorX = margin + fixedColsW;
            const chunkTurmaIds = new Set(turmaChunk.map(t => t.id));
            const relevantCursos = cursos
                .map(c => ({ ...c, turmas: turmas.filter(t => t.cursoId === c.id && chunkTurmaIds.has(t.id)) }))
                .filter(c => c.turmas.length > 0);

            relevantCursos.forEach(curso => {
                const width = curso.turmas.length * COL_WIDTHS.turma;
                doc.setFillColor(220, 220, 220);
                doc.rect(cursorX, cursorY, width, SCALED_ROW_HEIGHTS.curso, 'FD');
                doc.setFontSize(SCALED_FONT_SIZES.header * 1.2);
                doc.setFont('helvetica', 'bold');
                doc.text(curso.nome, cursorX + width / 2, cursorY + SCALED_ROW_HEIGHTS.curso / 2, { align: 'center', baseline: 'middle', maxWidth: width - 4 });
                cursorX += width;
            });
            
            cursorX = margin + fixedColsW;
            turmaChunk.forEach(turma => {
                doc.setFillColor(235, 235, 235);
                doc.setTextColor(0, 0, 0);
                doc.rect(cursorX, cursorY + SCALED_ROW_HEIGHTS.curso, COL_WIDTHS.turma, SCALED_ROW_HEIGHTS.turma, 'FD');
                doc.setFontSize(SCALED_FONT_SIZES.header * 1.1);
                doc.setFont('helvetica', 'bold');
                const lines = doc.splitTextToSize(turma.nome, COL_WIDTHS.turma - 4);
                doc.text(lines, cursorX + COL_WIDTHS.turma / 2, cursorY + SCALED_ROW_HEIGHTS.curso + SCALED_ROW_HEIGHTS.turma / 2, { align: 'center', baseline: 'middle' });
                cursorX += COL_WIDTHS.turma;
            });

            const scaledFixedHeaderH = SCALED_ROW_HEIGHTS.curso + SCALED_ROW_HEIGHTS.turma;
            doc.setFillColor(220, 220, 220);
            doc.rect(margin, cursorY, fixedColsW, scaledFixedHeaderH, 'FD');
            doc.setFontSize(SCALED_FONT_SIZES.header * 1.15);
            doc.setFont('helvetica', 'bold');
            doc.text('Dia', margin + COL_WIDTHS.day / 2, cursorY + scaledFixedHeaderH / 2, { align: 'center', baseline: 'middle' });
            doc.text('Período', margin + COL_WIDTHS.day + COL_WIDTHS.period / 2, cursorY + scaledFixedHeaderH / 2, { align: 'center', baseline: 'middle' });
            doc.text('Horário', margin + COL_WIDTHS.day + COL_WIDTHS.period + COL_WIDTHS.time / 2, cursorY + scaledFixedHeaderH / 2, { align: 'center', baseline: 'middle' });
            
            cursorY += scaledFixedHeaderH;

            DIAS_SEMANA.forEach((dia, diaIndex) => {
                const dayStartRowY = cursorY;
                periods.forEach((period, periodIndex) => {
                    if (period.horarios.length === 0) return;
                    const periodStartRowY = cursorY;
                    period.horarios.forEach(horario => {
                        doc.setFontSize(SCALED_FONT_SIZES.header);
                        doc.setFont('helvetica', 'bold');
                        doc.setFillColor(245, 245, 245);
                        doc.setDrawColor(200);
                        doc.rect(margin + COL_WIDTHS.day + COL_WIDTHS.period, cursorY, COL_WIDTHS.time, SCALED_ROW_HEIGHTS.cell, 'FD');
                        doc.text(horario, margin + COL_WIDTHS.day + COL_WIDTHS.period + COL_WIDTHS.time / 2, cursorY + SCALED_ROW_HEIGHTS.cell / 2, { align: 'center', baseline: 'middle' });
                        
                        let cellCursorX = margin + fixedColsW;
                        turmaChunk.forEach(turma => {
                            const isDisabled = gridType === 'modular' && horario === '18:10-19:00';
                            doc.setDrawColor(200);
                            if (isDisabled) {
                                doc.setFillColor(220, 220, 220);
                                doc.rect(cellCursorX, cursorY, COL_WIDTHS.turma, SCALED_ROW_HEIGHTS.cell, 'FD');
                                const p = 4 * scale;
                                doc.line(cellCursorX + p, cursorY + p, cellCursorX + COL_WIDTHS.turma - p, cursorY + SCALED_ROW_HEIGHTS.cell - p);
                                doc.line(cellCursorX + COL_WIDTHS.turma - p, cursorY + p, cellCursorX + p, cursorY + SCALED_ROW_HEIGHTS.cell - p);
                            } else {
                                const slots = gradeMap.get(`${turma.id}_${dia}_${horario}`);
                                doc.setFillColor(255, 255, 255);
                                doc.rect(cellCursorX, cursorY, COL_WIDTHS.turma, SCALED_ROW_HEIGHTS.cell, 'FD');
                                if (slots && slots.length > 0) {
                                    const disc = disciplinas.find(d => d.id === slots[0].disciplinaId);
                                    const discAcronym = disc ? disciplinaAcronyms.get(disc.nome) || '???' : '???';
                                
                                    if (slots.length === 1) {
                                        const profAcronym = professorAcronyms.get(slots[0].professorId) || '??';
                                        drawSingleLineCellText(doc, `${discAcronym} - ${profAcronym}`, { x: cellCursorX, y: cursorY, w: COL_WIDTHS.turma, h: SCALED_ROW_HEIGHTS.cell }, SCALED_FONT_SIZES.cell);
                                    } else {
                                        // Divided discipline: split cell vertically
                                        const sortedSlots = slots.sort((a, b) => a.id.localeCompare(b.id));
                                        const subCellWidth = COL_WIDTHS.turma / sortedSlots.length;

                                        let baseFontSize = SCALED_FONT_SIZES.dividedCell;
                                        if (sortedSlots.length === 2) {
                                            baseFontSize *= 0.7;
                                        } else if (sortedSlots.length === 3) {
                                            baseFontSize *= 0.55;
                                        } else if (sortedSlots.length >= 4) {
                                            baseFontSize *= 0.45;
                                        }
                                        
                                        // Temporary debug log as requested
                                        console.log(`Divisões: ${sortedSlots.length}, Largura sub-célula: ${subCellWidth.toFixed(2)}, Fonte inicial: ${baseFontSize.toFixed(2)}`);

                                        const textFormat = sortedSlots.length > 2 
                                            ? (d: string, p: string) => `${d}${p}` 
                                            : (d: string, p: string) => `${d} - ${p}`;

                                        sortedSlots.forEach((slot, index) => {
                                            const profAcronym = professorAcronyms.get(slot.professorId) || '??';
                                            const cellText = textFormat(discAcronym, profAcronym);
                                            const subCellX = cellCursorX + (index * subCellWidth);
                                            const box = {
                                                x: subCellX,
                                                y: cursorY,
                                                w: subCellWidth,
                                                h: SCALED_ROW_HEIGHTS.cell
                                            };
                                            
                                            drawSingleLineCellText(doc, cellText, box, baseFontSize);
                                
                                            // Draw vertical separator line if not the last sub-cell
                                            if (index < sortedSlots.length - 1) {
                                                doc.setDrawColor(200);
                                                doc.setLineWidth(0.5);
                                                doc.line(subCellX + subCellWidth, cursorY, subCellX + subCellWidth, cursorY + SCALED_ROW_HEIGHTS.cell);
                                            }
                                        });
                                    }
                                }
                            }
                            cellCursorX += COL_WIDTHS.turma;
                        });
                        cursorY += SCALED_ROW_HEIGHTS.cell;
                    });
                    
                    const periodHeight = cursorY - periodStartRowY;
                    if (periodHeight > 0) {
                         doc.setFillColor(240, 240, 240);
                         doc.setDrawColor(150);
                         doc.rect(margin + COL_WIDTHS.day, periodStartRowY, COL_WIDTHS.period, periodHeight, 'FD');
                         doc.text(period.name, margin + COL_WIDTHS.day + COL_WIDTHS.period / 2, periodStartRowY + periodHeight / 2, { align: 'center', baseline: 'middle', angle: 90 });
                    }
                    if (periods.slice(periodIndex + 1).some(p => p.horarios.length > 0)) {
                        doc.setFillColor(200, 200, 200);
                        doc.rect(margin, cursorY, pageW - margin * 2, SCALED_ROW_HEIGHTS.periodSeparator, 'F');
                        cursorY += SCALED_ROW_HEIGHTS.periodSeparator;
                    }
                });
                const dayHeight = cursorY - dayStartRowY;
                if (dayHeight > 0) {
                    doc.setFillColor(230, 230, 230);
                    doc.setDrawColor(150);
                    doc.rect(margin, dayStartRowY, COL_WIDTHS.day, dayHeight, 'FD');
                    doc.text(dia.charAt(0).toUpperCase() + dia.slice(1), margin + COL_WIDTHS.day / 2, dayStartRowY + dayHeight / 2, { align: 'center', baseline: 'middle', angle: 90 });
                }
                if(diaIndex < DIAS_SEMANA.length - 1) {
                    doc.setFillColor(150, 150, 150);
                    doc.rect(margin, cursorY, pageW - margin * 2, SCALED_ROW_HEIGHTS.daySeparator, 'F');
                    cursorY += SCALED_ROW_HEIGHTS.daySeparator;
                }
            });
            pageCounter++;
        });
    };

    const diurnoPeriods = [{ name: "Manhã", horarios: HORARIOS_MANHA }, { name: "Tarde", horarios: HORARIOS_TARDE }];
    const horariosNoite = gridType === 'modular' ? HORARIOS_NOITE_MODULAR : HORARIOS_NOITE_REGULAR;
    const noturnoPeriods = [{ name: "Noite", horarios: horariosNoite }];

    drawGridPagesForChunks(diurnoTurmaChunks, diurnoPeriods, 'Diurno');
    drawGridPagesForChunks(noturnoTurmaChunks, noturnoPeriods, 'Noturno');

    // --- Draw Legend Page ---
    doc.addPage('a3', 'landscape');
    let cursorY = margin;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Legenda de Siglas', pageW / 2, cursorY, { align: 'center' });
    cursorY += 30;

    const col1X = margin;
    const col2X = pageW / 3 + margin;
    const col3X = (pageW / 3) * 2 + margin;
    const colWidth = pageW / 3 - margin - 10;
    const itemFontSize = 8;
    const lineHeight = itemFontSize * 1.3;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Disciplinas', col1X, cursorY);
    doc.text('Professores', col2X, cursorY);
    cursorY += 20;

    const sortedDisciplinas = [...disciplinaAcronyms.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const sortedProfessors = [...allProfessorsInGrid].sort((a,b) => a.nome.localeCompare(b.nome));
    
    let col1Y = cursorY, col2Y = cursorY, col3Y = cursorY;

    const halfwayPoint = Math.ceil(sortedProfessors.length / 2);
    const profCol1 = sortedProfessors.slice(0, halfwayPoint);
    const profCol2 = sortedProfessors.slice(halfwayPoint);
    
    doc.setFontSize(itemFontSize);
    doc.setFont('helvetica', 'normal');

    for (const [fullName, acronym] of sortedDisciplinas) {
        const text = `${acronym}: ${fullName}`;
        const lines = doc.splitTextToSize(text, colWidth);
        doc.text(lines, col1X, col1Y);
        col1Y += lines.length * lineHeight;
    }
    for (const prof of profCol1) {
        const acronym = professorAcronyms.get(prof.id) || '??';
        doc.text(`${acronym}: ${prof.nome}`, col2X, col2Y, { maxWidth: colWidth });
        col2Y += lineHeight;
    }
    for (const prof of profCol2) {
        const acronym = professorAcronyms.get(prof.id) || '??';
        doc.text(`${acronym}: ${prof.nome}`, col3X, col3Y, { maxWidth: colWidth });
        col3Y += lineHeight;
    }

    return { doc };
};
