# Modular Timetable Scheduler

Este é um aplicativo web para auxiliar na criação manual de grades de horários escolares, com suporte para modalidades de ensino regular (integrado) e modular. Ele funciona inteiramente no navegador, utiliza o localStorage para persistência de dados (com suporte opcional ao Firebase para colaboração em tempo real) e fornece alertas visuais para violações de regras sem bloquear as ações do usuário.

## Core Features

-   **Gerenciamento de Dados:** CRUD completo para Cursos, Turmas, Disciplinas, Professores e Atribuições.
-   **Grades Duplas:** Interface com abas para gerenciar separadamente a Grade Regular e a Grade Modular.
-   **Montagem Visual:** Arraste e solte aulas do painel lateral para a grade. Mova e troque aulas com facilidade.
-   **Validação em Tempo Real:** Células codificadas por cores fornecem feedback instantâneo sobre conflitos de horário de professores, disponibilidade, excesso de aulas, quebra de interstício, etc.
-   **Visualização por Professor:** Uma visualização dedicada para ver e exportar o horário de um professor específico.
-   **Importação e Exportação:**
    -   Importe dados de um HTML do sistema SIG-URH.
    -   Exporte e importe o estado completo da aplicação como JSON para backups.
    -   Exporte grades de horários para CSV, PDF (formatado para impressão A3) e XLSX (formatado para distribuição).
    -   Exporte horários de professores individualmente (PDF/XLSX) ou em lote (ZIP de PDFs).
-   **Ferramentas de Produtividade:** Modo Foco, filtros de visibilidade, atalhos de teclado (Copiar/Colar/Recortar/Deletar), Undo/Redo.
-   **Colaboração (Opcional):** Suporte para integração com Firebase para autenticação, salvamento em nuvem e visualização de presença de usuários em tempo real.

## Tech Stack

-   **Frontend:** React, TypeScript, Tailwind CSS
-   **Build Tool:** Vite
-   **Desktop:** Electron (opcional, para empacotar como um aplicativo de desktop)
-   **Backend (Opcional):** Firebase (Authentication, Firestore)
-   **Exportação:** `jspdf`, `exceljs`, `jszip`

## Project Structure

```
/
├── components/         # Componentes React reutilizáveis
│   ├── management/     # Componentes para a página de gerenciamento
│   ├── Sidebar/        # Componentes do painel lateral da grade
│   ├── TimetableGrid/  # Componentes da grade de horários
│   └── ...
├── context/            # Contexto React para gerenciamento de estado global
├── pages/              # Componentes de página de nível superior (Gerenciamento, Professor)
├── services/           # Lógica de negócios (validação, importação, exportação)
├── types/              # Definições de tipos TypeScript
├── utils/              # Funções de utilidade
├── App.tsx             # Componente principal da aplicação
├── index.tsx           # Ponto de entrada do React
├── firebaseConfig.ts   # Configuração do Firebase
└── config.ts           # Configurações globais (ex: habilitar/desabilitar Firebase)
```

## Getting Started (For Developers)

### Prerequisites

-   Node.js (versão 18 ou superior)
-   NPM ou Yarn

### Installation

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/seu-usuario/gerenciador-horario.git
cd gerenciador-horario
npm install
```

### Running the Web App (Vite)

Para iniciar o servidor de desenvolvimento local:

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173` (ou outra porta, se a 5173 estiver em uso).

### Running the Desktop App (Electron)

Para iniciar a versão de desktop do aplicativo:

```bash
npm start
```

## Configuration

### Firebase Integration

Por padrão, a integração com o Firebase está desabilitada e o aplicativo usa o `localStorage` do navegador para salvar os dados.

-   Para habilitar o Firebase, altere a flag em `src/config.ts`:
    ```typescript
    // src/config.ts
    export const FIREBASE_ENABLED = true;
    ```
-   Você precisará preencher suas próprias credenciais do Firebase em `src/firebaseConfig.ts`.
-   Para que o Login com Google funcione, você deve adicionar o domínio de desenvolvimento (`localhost`) e o de produção aos "domínios autorizados" na seção de Autenticação do seu console do Firebase.

### Vite Base Path

Se você for hospedar a aplicação em um subdiretório (por exemplo, `https://seu-usuario.github.io/gerenciador-horario/`), você deve configurar o caminho base em `vite.config.js`:

```javascript
// vite.config.js
export default defineConfig({
  // ...
  base: '/gerenciador-horario/', 
});
```

## Building for Production

### Web App

Para criar uma compilação otimizada para produção:

```bash
npm run build
```

Os arquivos estáticos serão gerados no diretório `dist/`.

### Desktop App (Electron)

Para empacotar o aplicativo para sua plataforma atual (Windows, macOS, Linux):

```bash
npm run package
```

Os instaladores serão criados no diretório `release/`.

## License

Este projeto não possui uma licença definida. Todos os direitos são reservados.
