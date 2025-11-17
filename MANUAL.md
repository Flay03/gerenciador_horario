# Manual do Usuário - Grade de Horários Modular

Bem-vindo ao Manual do Usuário da aplicação Grade de Horários Modular. Este guia foi projetado para ajudá-lo a entender e utilizar todas as funcionalidades da ferramenta para criar e gerenciar grades de horários escolares de forma eficiente.

## 1. Introdução

Esta aplicação é uma ferramenta poderosa para auxiliar na complexa tarefa de montar grades de horários escolares, especialmente em instituições com modalidades de ensino regular (integrado) e modular. Ela funciona inteiramente no seu navegador, salvando os dados localmente no seu computador (ou em nuvem, se configurado), e fornece alertas visuais em tempo real para ajudar a identificar possíveis conflitos, sem nunca bloquear suas ações.

### 1.1. Principais Características
- **Duas Grades Independentes:** Gerencie horários para turmas regulares e modulares em grades separadas e visualmente distintas.
- **Gerenciamento Completo:** Cadastre cursos, turmas, disciplinas, professores e suas atribuições através de uma interface intuitiva.
- **Montagem Visual Drag & Drop:** Arraste e solte aulas do painel de atribuições diretamente para a grade, ou mova aulas já alocadas.
- **Alertas Inteligentes:** O sistema colore as aulas na grade para indicar conflitos como choque de horário de professores, desrespeito à disponibilidade, excesso de aulas diárias e quebra de interstício.
- **Flexibilidade Total:** Os alertas são guias visuais, não bloqueios. Você tem o controle final para alocar as aulas como for necessário.
- **Importação e Exportação:** Comece rapidamente importando dados de sistemas legados (HTML do SIG-URH) e exporte seu trabalho em múltiplos formatos: JSON (backup), CSV, XLSX (planilhas formatadas) e PDF.
- **Visualização e Exportação por Professor:** Consulte e exporte o horário individual de cada professor em formato PDF ou XLSX, ou exporte todos de uma vez em um arquivo ZIP.
- **Ferramentas de Produtividade:** "Modo Foco" para destacar aulas de um professor, filtros de visibilidade avançados e atalhos de teclado para agilizar o trabalho.

---

## 2. Primeiros Passos: O Fluxo de Trabalho Recomendado

Para obter os melhores resultados, siga esta sequência de passos:

1.  **Reúna as Informações:** Antes de começar, tenha em mãos a lista de cursos, turmas, disciplinas (com suas cargas horárias), professores e suas disponibilidades.
2.  **Acesse o Módulo de Gerenciamento:** Clique no botão `Gerenciamento` na barra de ferramentas superior.
3.  **Importe ou Cadastre os Dados:**
    *   **Opção A (Recomendada):** Use a aba `Importar (HTML)` para carregar os dados a partir de um arquivo do SIG.
    *   **Opção B (Manual):** Cadastre manualmente, seguindo a ordem: Cursos -> Turmas -> Disciplinas -> Professores -> Atribuições.
4.  **Acesse o Módulo de Grade:** Com os dados inseridos, clique em `Grade`.
5.  **Monte os Horários:** Use o painel lateral para arrastar as aulas para a grade, observando os alertas visuais.
6.  **Consulte e Exporte:** Use o módulo `Professor` e os botões de exportação para gerar relatórios e compartilhar os horários.

---

## 3. A Interface Principal: Barra de Ferramentas (Toolbar)

É o seu centro de comando, contendo:

- **Navegação Principal:** Botões para alternar entre as telas de `Grade`, `Gerenciamento` e `Professor`.
- **Modo Foco (Apenas na tela de Grade):** Uma chave para ligar/desligar o "Modo Foco". Quando ativo, ao passar o mouse sobre uma aula, ele destaca todas as outras aulas do mesmo professor e os horários válidos para movê-la, facilitando a visualização de conflitos.
- **Preencher Grade (Teste):** Um botão experimental que preenche aleatoriamente os espaços vazios da grade com as aulas restantes. Útil para testes rápidos.
- **Carregar Dados de Exemplo:** Preenche a aplicação com um conjunto de dados fictícios. **Atenção:** Isso substituirá todos os dados atuais.
- **Apagar Dados:** Limpa completamente todos os dados da aplicação. **Atenção:** Ação irreversível.
- **Desfazer/Refazer (Undo/Redo):** Permite voltar ou avançar nas suas últimas ações (atalhos: `Ctrl+Z` / `Ctrl+Y`).
- **Importar JSON:** Carrega um arquivo de backup (`.json`) previamente salvo.
- **Exportar JSON:** Salva o estado completo da aplicação. Ideal para backups.
- **Exportar CSV:** Exporta a grade de horários em um formato simples de planilha.
- **Exportar Grades (XLSX):** Gera um arquivo Excel (`.xlsx`) com as grades regular e modular formatadas, prontas para impressão e distribuição.
- **Exportar Grade (PDF):** Gera um arquivo PDF (`.pdf`) da grade atualmente visível (Regular ou Modular), formatado para impressão em múltiplas páginas no formato A3.
- **Indicador de Salvamento:** Mostra o status do salvamento, que é automático.

---

## 4. Módulo de Gerenciamento: A Base de Dados

Esta seção é onde você alimenta o sistema com todas as informações necessárias.

### 4.1. Importação Rápida (SIG HTML)
Esta é a maneira mais rápida de começar.
1.  Vá para `Gerenciamento > Importar (HTML)`.
2.  Selecione o arquivo HTML salvo da página "Consultar Quadros" do SIG.
3.  Clique em `Analisar Arquivo`. O sistema mostrará um resumo dos dados encontrados.
4.  **Passo Crucial - Validação:** Na tela de validação, verifique a lista de turmas e marque a caixa ao lado de cada uma que deve ser considerada **Modular**. Turmas não marcadas serão tratadas como Regular (Ensino Médio, MTec, etc.). A precisão nesta etapa é fundamental para a correta separação das grades.
5.  Clique em `Confirmar e Importar`.

### 4.2. Cadastro Manual
Se não tiver um arquivo para importar, cadastre tudo manualmente, seguindo esta ordem:
1.  **Cursos:** O nível mais alto da organização (ex: "Mecatrônica", "Administração").
2.  **Turmas:** Associe cada turma a um curso. Defina o nome (ex: "1 MT - Manhã"), o período (Manhã, Tarde, Noite) e se ela é **Modular**.
3.  **Disciplinas:** Associe cada disciplina a uma turma. Informe a carga horária semanal e se ela possui **Divisão**.
4.  **Professores:** Cadastre os professores e defina sua **Disponibilidade** usando a grade visual. Você pode marcar/desmarcar horários individuais, dias inteiros ou todos os dias para um mesmo horário.
5.  **Atribuições:** Conecte tudo! Nesta tela, você atribui um ou mais professores para cada disciplina. Se uma disciplina foi marcada como "Divisão", você poderá selecionar o número correspondente de professores.
6.  **(Opcional) Gerenciar Grupos BNCC:** Se houver disciplinas com o mesmo nome em turmas diferentes (ex: "Língua Portuguesa" no 1º e 2º ano), você pode agrupá-las. Isso permite trocas de aulas entre essas turmas na grade.

---

## 5. Módulo de Grade: Montando o Horário

Com os dados cadastrados, é hora de montar a grade.

### 5.1. Ações na Grade
- **Adicionar Aulas:** Arraste uma aula do painel lateral direito para um espaço vazio na grade.
- **Mover Aulas:** Arraste uma aula já alocada para outro espaço. Se o destino estiver ocupado, as aulas serão trocadas.
- **Remover Aulas:** Arraste uma aula da grade de volta para o painel lateral, ou clique nela e pressione a tecla `Delete`.
- **Copiar/Colar:** Clique com o botão direito em uma aula para `Copiar` ou `Recortar`, e em outro espaço para `Colar`. Atalhos de teclado (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`) também funcionam.

### 5.2. Entendendo os Alertas Visuais
A legenda completa fica na parte inferior da tela.
-   <span style="color: green;">**Fundo Padrão:**</span> Válido. Nenhuma irregularidade.
-   <span style="color: #FBBF24;">**Amarelo:**</span> Fora de Disponibilidade.
-   <span style="color: #F97316;">**Laranja:**</span> Excesso de Aulas (>8 no dia).
-   <span style="color: #DC2626;">**Vermelho:**</span> Interstício < 11h. Menos de 11h de descanso entre dias.
-   <span style="color: #A855F7;">**Roxo:**</span> Conflito de Divisão. Um dos professores está indisponível.
-   <span style="color: #DB2777;">**Rosa:**</span> Conflito de Horário do Professor (Alerta Crítico). Professor em duas turmas ao mesmo tempo.
-   <span style="color: #3B82F6;">**Azul:**</span> Troca de Turma Inválida. A disciplina está em uma turma que não é a sua (e não é uma troca BNCC válida).

### 5.3. Ferramentas de Produtividade
- **Painel Lateral:** Use a busca para encontrar professores rapidamente ou filtre a lista de atribuições por turma.
- **Modo Foco:** Ative para destacar as aulas de um professor ao passar o mouse sobre uma delas, facilitando a reorganização.
- **Filtros de Visibilidade:** Clique em "Exibir Opções de Visualização" para ocultar/mostrar períodos, cursos ou turmas específicas, limpando a grade para focar no que é importante.

---

## 6. Módulo de Professor: Consulta e Exportação

Esta tela é ideal para conferência e para gerar relatórios individuais.
1.  Vá para a tela de **Professor**.
2.  Use a busca ou o menu para selecionar um professor.
3.  A grade de horários completa daquele professor será exibida, com a carga horária diária e semanal calculada.
4.  **Exportar Selecionado (PDF/XLSX):** Gera um arquivo do horário do professor atualmente selecionado.
5.  **Exportar Todos (ZIP):** Gera um arquivo `.zip` contendo os PDFs dos horários de todos os professores que têm aulas alocadas na grade.

---

## 7. Gerenciamento de Dados

- **Salvamento:** O sistema salva suas alterações automaticamente no armazenamento local do navegador (ou no Firebase, se habilitado).
- **Backups (JSON):** Use a função `Exportar JSON` regularmente para criar arquivos de backup do seu trabalho. Guarde-os em um local seguro. Você pode restaurar um backup a qualquer momento usando `Importar JSON`.
- **Dados de Exemplo e Limpeza:** As opções `Carregar Dados de Exemplo` e `Apagar Dados` são úteis, mas use com cuidado, pois são ações destrutivas que não podem ser desfeitas.

---

## 8. Perguntas Frequentes (FAQ)

- **Minha importação do SIG falhou. O que fazer?**
  > Certifique-se de que o arquivo HTML foi salvo corretamente da página "Consultar Quadros" e que não foi modificado. Tente salvá-lo novamente.

- **Uma turma deveria ser Modular, mas aparece na Grade Regular. Como corrijo?**
  > Vá em `Gerenciamento > Turmas`, edite a turma em questão e marque a caixa de seleção "Turma Modular?".

- **Como faço para um professor dar aula em duas turmas ao mesmo tempo (disciplina dividida)?**
  > Em `Gerenciamento > Disciplinas`, edite a disciplina, marque a caixa "Divisão de turma?" e defina o número de professores. Depois, em `Gerenciamento > Atribuições`, atribua os professores a essa disciplina.

- **Como faço um backup do meu trabalho?**
  > Clique no botão `Exportar JSON` na barra de ferramentas superior. Salve o arquivo `.json` em um local seguro.
