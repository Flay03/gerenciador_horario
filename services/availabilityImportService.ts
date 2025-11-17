
import ExcelJS from 'exceljs';
import { HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR } from '../constants';

interface ParsedProfessor {
    name: string;
    availability: Record<string, string[]>;
}

const DAY_HEADER_MAP: { [key: string]: string } = {
  '2ª': 'segunda', '3ª': 'terca', '4ª': 'quarta', '5ª': 'quinta', '6ª': 'sexta'
};

const PERIOD_DETAILS = {
  MANHA: { horarios: HORARIOS_MANHA, title: 'Dias da Semana Manhã' },
  TARDE: { horarios: HORARIOS_TARDE, title: 'Dias da Semana Tarde' },
  NOITE: { horarios: HORARIOS_NOITE_REGULAR, title: 'Dias da Semana Noite' },
};

// Helper function to reliably get text from a cell, handling simple and RichText values.
const getCellText = (cell: ExcelJS.Cell): string => {
    if (cell.value === null || cell.value === undefined) {
        return '';
    }
    // Check if the value is a RichText object
    if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
        const richTextValue = cell.value as ExcelJS.CellRichTextValue;
        if (Array.isArray(richTextValue.richText)) {
            return richTextValue.richText.map(rt => rt.text).join('');
        }
    }
    // Otherwise, convert the value to a string
    return cell.value.toString();
};


/**
 * Parses an Excel file with a specific horizontal layout for teacher availability.
 * It searches for teacher blocks identified by "Docente:" and extracts their availability
 * from three side-by-side tables for Morning, Afternoon, and Night periods.
 */
export const parseAvailabilityExcel = async (fileBuffer: ArrayBuffer): Promise<ParsedProfessor[]> => {
    console.log("Iniciando análise da planilha...");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error("A planilha está vazia ou não pôde ser lida.");
    }

    const results: ParsedProfessor[] = [];
    
    // 1. Find all rows that define a new professor
    const professorStartRows: { name: string, row: number }[] = [];
    worksheet.eachRow((row, rowNumber) => {
        let foundName = '';
        row.eachCell((cell) => {
            const cellText = getCellText(cell).trim();
            if (cellText.toLowerCase().startsWith('docente:')) {
                foundName = cellText.substring('docente:'.length).trim();
            }
        });
        if (foundName) {
            console.log(`Encontrado "Docente:": ${foundName} na linha ${rowNumber}`);
            professorStartRows.push({ name: foundName, row: rowNumber });
        }
    });

    if (professorStartRows.length === 0) {
        throw new Error("Nenhum professor encontrado. Verifique se a planilha contém a linha 'Docente:'.");
    }

    // Process each found professor block
    for (const profInfo of professorStartRows) {
        const availability: Record<string, string[]> = {
            segunda: [], terca: [], quarta: [], quinta: [], sexta: []
        };
        
        // 2. Find the title row for the tables, starting from the professor's row
        let tableTitleRowNumber = -1;
        for (let i = profInfo.row; i <= worksheet.rowCount && i < profInfo.row + 10; i++) {
            const row = worksheet.getRow(i);
            let found = false;
            row.eachCell((cell) => {
                if (getCellText(cell).includes(PERIOD_DETAILS.MANHA.title)) {
                    found = true;
                }
            });
            if (found) {
                tableTitleRowNumber = i;
                console.log(`Cabeçalho da tabela encontrado para ${profInfo.name} na linha ${tableTitleRowNumber}`);
                break;
            }
        }

        if (tableTitleRowNumber === -1) {
            console.warn(`Tabelas não encontradas para o professor: ${profInfo.name}`);
            continue;
        }

        const tableTitleRow = worksheet.getRow(tableTitleRowNumber);
        const dayHeaderRow = worksheet.getRow(tableTitleRowNumber + 1);

        const periodStartColumns: { [key: string]: number } = {};
        tableTitleRow.eachCell((cell, colNumber) => {
            const cellValue = getCellText(cell);
            if (cellValue.includes(PERIOD_DETAILS.MANHA.title)) periodStartColumns.MANHA = colNumber;
            if (cellValue.includes(PERIOD_DETAILS.TARDE.title)) periodStartColumns.TARDE = colNumber;
            if (cellValue.includes(PERIOD_DETAILS.NOITE.title)) periodStartColumns.NOITE = colNumber;
        });

        for (const period of Object.keys(periodStartColumns)) {
            const startCol = periodStartColumns[period as keyof typeof periodStartColumns];
            const { horarios } = PERIOD_DETAILS[period as keyof typeof PERIOD_DETAILS];
            
            // 3. Dynamically map day columns by searching the header row
            const dayColMap: { [day: string]: number } = {};
            const searchRange = 8; // Search up to 8 columns (Aulas + 6 days + buffer)
            
            for (let i = 0; i < searchRange; i++) {
                const currentCol = startCol + i;
                const cell = dayHeaderRow.getCell(currentCol);
                const cellText = getCellText(cell).trim();

                // Find the day header (e.g., '2ª') and map it to the internal name (e.g., 'terca')
                if (DAY_HEADER_MAP[cellText]) {
                    dayColMap[DAY_HEADER_MAP[cellText]] = currentCol;
                }
            }

            const expectedDays = Object.keys(DAY_HEADER_MAP).length; // 5 dias
            if (Object.keys(dayColMap).length < expectedDays) {
                console.warn(`Apenas ${Object.keys(dayColMap).length} de ${expectedDays} dias foram mapeados para ${profInfo.name} [${period}]`);
            }

            console.log(`Mapeamento de colunas para ${profInfo.name} [${period}]:`, dayColMap);

            // 4. Read the availability robustly by reading the 'Aulas' column first.
            const aulasColumn = startCol - 1; // FIX: The 'Aulas' column is one column before the period title/day headers.
            const excelDataRowsPerPeriod = 6;

            console.log(`\n=== Processando período ${period} para ${profInfo.name} ===`);
            console.log(`Coluna inicial (dias): ${startCol}, Coluna 'Aulas': ${aulasColumn}`);
            console.log(`Linha do cabeçalho dos dias: ${dayHeaderRow.number}`);
            console.log(`Horários disponíveis no período:`, horarios);

            for (let i = 0; i < excelDataRowsPerPeriod; i++) {
                const dataRow = worksheet.getRow(dayHeaderRow.number + 1 + i);
                
                // Read the 'Aulas' column to determine the horario index
                const aulaCell = dataRow.getCell(aulasColumn);
                const aulaText = getCellText(aulaCell).trim();
                
                const match = aulaText.match(/^(\d+)/);

                if (match) {
                    const horarioIndex = parseInt(match[1], 10) - 1;

                    if (horarioIndex >= 0 && horarioIndex < horarios.length) {
                        const horario = horarios[horarioIndex];
                        
                        for (const day in dayColMap) {
                            const col = dayColMap[day];
                            const cell = dataRow.getCell(col);
                            const cellText = getCellText(cell).trim();
                            
                            if (cellText.toLowerCase() === 'x') {
                                if (!availability[day].includes(horario)) {
                                    availability[day].push(horario);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        const totalSlots = Object.values(availability).reduce((acc, arr) => acc + arr.length, 0);
        console.log(`Disponibilidades encontradas para ${profInfo.name}: ${totalSlots} horários.`);
        results.push({ name: profInfo.name, availability });
    }
    
    console.log("Análise finalizada.", results);
    return results;
};


/**
 * Generates an Excel template file that matches the specified horizontal layout,
 * making it easy for users to fill in their availability data correctly.
 */
export const generateAvailabilityTemplate = async (): Promise<ExcelJS.Workbook> => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Disponibilidade');
  
    // --- Styles ---
    const headerFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11, bold: true };
    const titleFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 14, bold: true };
    const centerAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' };
    const border: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    // --- Column Layout ---
    const periodsLayout = {
        manha: { start: 2, title: 'Dias da Semana Manhã' }, // B
        tarde: { start: 10, title: 'Dias da Semana Tarde' }, // J
        noite: { start: 18, title: 'Dias da Semana Noite' }, // R
    };
    const colsPerTable = 7; // Aulas + 6 days
    const totalCols = periodsLayout.noite.start + colsPerTable - 1;

    // --- Main Headers ---
    sheet.mergeCells(3, 2, 3, totalCols);
    const mainTitle = sheet.getCell(3, 2);
    mainTitle.value = "RELATÓRIO DE DISPONIBILIDADES DOS DOCENTES";
    mainTitle.font = titleFont;
    mainTitle.alignment = centerAlign;

    sheet.mergeCells(4, 2, 4, totalCols);
    sheet.getCell(4, 2).value = "Semestre/ano: 1/2025";
    sheet.getCell(4, 2).font = headerFont;
    
    // --- Professor Block ---
    const createProfessorBlock = (startRow: number) => {
        sheet.mergeCells(startRow, 2, startRow, totalCols);
        const docentCell = sheet.getCell(startRow, 2);
        docentCell.value = {
            richText: [
                { text: 'Docente: ', font: { name: 'Calibri', size: 12, bold: true } },
                { text: 'NOME COMPLETO DO DOCENTE EM MAIÚSCULAS', font: { name: 'Calibri', size: 12, bold: true } }
            ]
        };
        
        const tableTitleRow = startRow + 2;
        const headerRow = startRow + 3;
        const dataStartRow = startRow + 4;
        
        // --- Table Creation ---
        Object.values(periodsLayout).forEach(period => {
            // Table Title
            sheet.mergeCells(tableTitleRow, period.start, tableTitleRow, period.start + colsPerTable - 1);
            const periodTitleCell = sheet.getCell(tableTitleRow, period.start);
            periodTitleCell.value = period.title;
            periodTitleCell.font = headerFont;
            periodTitleCell.alignment = centerAlign;

            // Day Headers
            const headers = ['Aulas', '2ª', '3ª', '4ª', '5ª', '6ª', 'Sáb'];
            headers.forEach((header, i) => {
                const cell = sheet.getCell(headerRow, period.start + i);
                cell.value = header;
                cell.font = headerFont;
                cell.alignment = centerAlign;
                cell.border = border;
            });

            // Data Rows (1ª to 6ª)
            for (let i = 0; i < 6; i++) {
                const row = dataStartRow + i;
                // 'Aulas' column
                const aulaCell = sheet.getCell(row, period.start);
                aulaCell.value = `${i + 1}ª`;
                aulaCell.font = headerFont;
                aulaCell.alignment = centerAlign;
                aulaCell.border = border;
                
                // Day columns
                for (let j = 1; j < colsPerTable; j++) {
                    const dataCell = sheet.getCell(row, period.start + j);
                    dataCell.border = border;
                    dataCell.alignment = centerAlign;
                    // Add a placeholder 'X' for demonstration
                    if (period.start === periodsLayout.manha.start && i < 2 && j < 3) {
                       dataCell.value = 'X';
                    }
                }
            }
        });
        return dataStartRow + 6; // Return the next available row
    };

    let nextRow = createProfessorBlock(5);
    
    sheet.mergeCells(nextRow + 1, 2, nextRow + 1, totalCols);
    const noteCell = sheet.getCell(nextRow + 1, 2);
    noteCell.value = 'Para adicionar mais professores, copie o bloco acima (linhas 5 a 15) e cole abaixo, depois preencha os dados.';
    noteCell.font = { italic: true, color: { argb: 'FF666666' }};

    // --- Column Widths ---
    sheet.getColumn(1).width = 2; // Spacer
    sheet.getColumn(9).width = 2; // Spacer
    sheet.getColumn(17).width = 2; // Spacer

    Object.values(periodsLayout).forEach(period => {
        sheet.getColumn(period.start).width = 8; // Aulas
        for (let i = 1; i < colsPerTable; i++) {
            sheet.getColumn(period.start + i).width = 5; // Days
        }
    });
  
    return workbook;
  };
