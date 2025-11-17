import { AppState, Curso, Disciplina, Professor, Turma, Atribuicao, Periodo } from '../types';

// Helper to normalize period names from Portuguese to the app's enum
const normalizePeriodo = (periodoStr: string): Periodo => {
  const lower = periodoStr.toLowerCase();
  if (lower.includes('manhã')) return 'manha';
  if (lower.includes('tarde')) return 'tarde';
  if (lower.includes('noite')) return 'noite';
  return 'manha'; // Default fallback
};

// Helper to generate a consistent, unique ID from a name string
// A simple hash function to make IDs more stable across imports if names are the same
const generateId = (name: string, prefix: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const sanitized = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}-${sanitized.substring(0, 30)}-${Math.abs(hash).toString(36)}`;
};


export const parseSIGHTML = (htmlString: string): Partial<AppState> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const cursosMap: Map<string, Curso> = new Map();
    const turmasMap: Map<string, Turma> = new Map();
    const disciplinasMap: Map<string, Disciplina> = new Map();
    const professoresMap: Map<string, Professor> = new Map();
    const atribuicoes: Atribuicao[] = [];
    
    // Keywords that identify a "Regular" class. Anything else is considered "Modular".
    const regularKeywords = ['ensino médio', 'mtec', 'novotec', 'integrado'];

    const getOrCreateProfessor = (name: string): Professor => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            // This should not happen for a valid assignment, but as a safeguard
             if (!professoresMap.has('Vago')) {
                professoresMap.set('Vago', { id: 'p-vago', nome: 'Vago', disponibilidade: {} });
             }
             return professoresMap.get('Vago')!;
        }
        if (!professoresMap.has(trimmedName)) {
            const newProfessor: Professor = {
                id: generateId(trimmedName, 'p'),
                nome: trimmedName,
                disponibilidade: {} // Disponibilidade needs to be set manually later
            };
            professoresMap.set(trimmedName, newProfessor);
        }
        return professoresMap.get(trimmedName)!;
    }
    
    // Iterate over each 'turma' header row
    doc.querySelectorAll('tr.success').forEach(turmaHeaderRow => {
        const headerContent = turmaHeaderRow.textContent || '';
        
        // Robustly extract turma details using specific searches
        const strongElements = Array.from(turmaHeaderRow.querySelectorAll('strong'));
        const bElements = Array.from(turmaHeaderRow.querySelectorAll('b'));
        
        const findTextAfterNode = (label: string, nodes: (HTMLElement | null)[]): string | null => {
            for (const node of nodes) {
                if (node && node.previousSibling?.textContent?.includes(label)) {
                    return node.textContent?.trim() || null;
                }
            }
            return null;
        }
        
        const cursoNomeBruto = findTextAfterNode('Curso:', bElements) || 'Curso Desconhecido';
        
        // A class is "Modular" if its course name does NOT contain any of the regular keywords.
        const isModular = !regularKeywords.some(keyword => cursoNomeBruto.toLowerCase().includes(keyword));
        
        const cursoNome = cursoNomeBruto.replace(/\s*\(.*?\)\s*/g, ' ').trim();

        const turmaNome = findTextAfterNode('Turma:', strongElements);
        const periodoStr = findTextAfterNode('Período:', strongElements);
        
        if (!turmaNome || !periodoStr) return; // Skip if essential turma info is missing

        // Get or create Curso
        if (!cursosMap.has(cursoNome)) {
            cursosMap.set(cursoNome, { id: generateId(cursoNome, 'c'), nome: cursoNome });
        }
        const curso = cursosMap.get(cursoNome)!;

        // Get or create Turma
        const turmaKey = `${curso.nome}-${turmaNome}`;
        if (!turmasMap.has(turmaKey)) {
            turmasMap.set(turmaKey, {
                id: generateId(turmaKey, 't'),
                cursoId: curso.id,
                nome: turmaNome,
                periodo: normalizePeriodo(periodoStr),
                isModular: isModular,
            });
        }
        const turma = turmasMap.get(turmaKey)!;

        // Find the associated disciplines table
        const disciplinesTable = turmaHeaderRow.nextElementSibling?.querySelector('table.table-condensed');
        if (!disciplinesTable) return;

        const disciplineRows = Array.from(disciplinesTable.querySelectorAll('tbody > tr:not(.warning)'));
        
        // Map to group discipline rows by name within the same class
        const disciplinesDataMap = new Map<string, { rows: Element[], aulasSemanais: number }>();

        disciplineRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 7) return;

            const nomeDisciplinaEl = cells[0].querySelector('a');
            if (!nomeDisciplinaEl) return;

            const nomeBruto = (nomeDisciplinaEl.textContent || '').trim();
            const nomeSemPrefixo = nomeBruto.replace(/^\(\d+\)_/, '').trim();
            const nomeLimpo = nomeSemPrefixo.replace(/\s*\(.*?\)\s*/g, ' ').trim();

            const aulasValue = parseFloat((cells[4].textContent || '0').replace(',', '.'));
            const aulasSemanais = isModular ? aulasValue : Math.round(aulasValue);

            if (!disciplinesDataMap.has(nomeLimpo)) {
                disciplinesDataMap.set(nomeLimpo, { rows: [], aulasSemanais });
            }
            const data = disciplinesDataMap.get(nomeLimpo)!;
            data.rows.push(row);
        });

        // Process the grouped data to create disciplines and attributions
        disciplinesDataMap.forEach((data, nomeLimpo) => {
            const { rows, aulasSemanais } = data;
            if (rows.length === 0) return;

            const isDividida = rows.length > 1;

            const professoresDaDisciplina: string[] = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                const professorMinistrandoNome = (cells[6].textContent || '').trim();
                professoresDaDisciplina.push(getOrCreateProfessor(professorMinistrandoNome).id);
            });

            const disciplinaKey = `${turma.id}-${nomeLimpo}`;
            if (!disciplinasMap.has(disciplinaKey)) {
                const newDisciplina: Disciplina = {
                    id: generateId(disciplinaKey, 'd'),
                    turmaId: turma.id,
                    nome: nomeLimpo,
                    aulasSemanais: aulasSemanais,
                    divisao: isDividida,
                    numProfessores: rows.length, // Correctly set to the number of professors/rows
                };
                disciplinasMap.set(disciplinaKey, newDisciplina);
            }

            const disciplina = disciplinasMap.get(disciplinaKey)!;

            if (professoresDaDisciplina.length > 0) {
                const existingAtribuicao = atribuicoes.find(a => a.disciplinaId === disciplina.id);
                if (!existingAtribuicao) {
                    atribuicoes.push({
                        disciplinaId: disciplina.id,
                        professores: professoresDaDisciplina.filter(pId => pId !== 'p-vago')
                    });
                }
            }
        });
    });

    const finalProfessores = Array.from(professoresMap.values());

    return {
        ano: new Date().getFullYear(),
        cursos: Array.from(cursosMap.values()),
        turmas: Array.from(turmasMap.values()),
        disciplinas: Array.from(disciplinasMap.values()),
        professores: finalProfessores,
        atribuicoes: atribuicoes,
        grade: [], // Grade is always cleared on import
        alertas: [],
    };
};