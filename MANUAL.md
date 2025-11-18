# Manual do Usuário - Grade de Horários Modular

Bem-vindo ao Manual do Usuário da aplicação Grade de Horários Modular. Este guia foi projetado para ajudá-lo a entender e utilizar todas as funcionalidades da ferramenta para criar e gerenciar grades de horários escolares de forma eficiente.

## 1. Introdução

Esta aplicação é uma ferramenta poderosa para auxiliar na complexa tarefa de montar grades de horários escolares, especialmente em instituições com modalidades de ensino regular (integrado) e modular. Ela funciona inteiramente no seu navegador, salvando os dados localmente no seu computador (ou em nuvem, se configurado), e fornece alertas visuais em tempo real para ajudar a identificar possíveis conflitos.

### 1.1. Principais Características
- **Painel de Controle (Dashboard):** Uma visão geral estratégica com estatísticas de preenchimento, carga horária de professores e distribuição de aulas.
- **Duas Grades Independentes:** Gerencie horários para turmas regulares e modulares em grades separadas e visualmente distintas.
- **Gerenciamento Completo:** Cadastre cursos, turmas, disciplinas, professores e suas atribuições através de uma interface intuitiva.
- **Montagem Visual Drag & Drop:** Arraste e solte aulas do painel de atribuições diretamente para a grade, ou mova aulas já alocadas.
- **Alertas Inteligentes:** O sistema colore as aulas na grade para indicar conflitos como choque de horário de professores, desrespeito à disponibilidade, excesso de aulas diárias e quebra de interstício.
- **Flexibilidade Total:** Os alertas são guias visuais, não bloqueios. Você tem o controle final para alocar as aulas como for necessário.
- **Importação e Exportação:** Comece rapidamente importando dados de sistemas legados (HTML do SIG-URH) e exporte seu trabalho em múltiplos formatos: JSON (backup), CSV, XLSX (planilhas formatadas) e PDF.
- **Visualização e Exportação por Professor:** Consulte e exporte o horário individual de cada professor em formato PDF ou XLSX.
- **Ferramentas de Produtividade:** "Modo Foco" para destacar aulas de um professor, filtros de visibilidade avançados e atalhos de teclado para agilizar o trabalho.

---

## 2. Primeiros Passos: O Fluxo de Trabalho Recomendado

Para obter os melhores resultados, siga esta sequência de passos:

1.  **Reúna as Informações:** Antes de começar, tenha em mãos a lista de cursos, turmas, disciplinas, professores e suas disponibilidades.
2.  **Acesse o Módulo de Gerenciamento:** Clique no botão `Gerenciamento` na barra de ferramentas superior.
3.  **Importe ou Cadastre os Dados:**
    *   **Opção A (Recomendada):** Use a aba `Importar SIG (HTML)` para carregar os dados a partir de um arquivo do SIG.
    *   **Opção B (Manual):** Cadastre manualmente, seguindo a ordem: Cursos -> Turmas -> Disciplinas -> Professores -> Atribuições.
4.  **Acesse o Módulo de Grade:** Com os dados inseridos, clique em `Grade`.
5.  **Monte os Horários:** Use o painel lateral para arrastar as aulas para a grade, observando os alertas visuais.
6.  **Analise o Progresso:** Use o `Painel` para ver gráficos de preenchimento e identificar pendências.
7.  **Consulte e Exporte:** Use o módulo `Professor` e os botões de exportação para gerar relatórios e compartilhar os horários.

---

## 3. A Interface Principal: Barra de Ferramentas (Toolbar)

É o seu centro de comando, localizado no topo da tela:

- **Navegação Principal:** Botões para alternar entre as telas de `Painel`, `Grade`, `Gerenciamento` e `Professor`.
- **Modo Foco (Tela de Grade):** Uma chave para ligar/desligar o "Modo Foco". Quando ativo, ao passar o mouse sobre uma aula, ele destaca todas as outras aulas do mesmo professor e os horários válidos para movê-la.
- **Status e Usuários:** Indica se os dados estão salvos ("Salvo", "Salvando...") e mostra usuários online (se conectado ao Firebase).
- **Carregar Dados de Exemplo:** Preenche a aplicação com um conjunto de dados fictícios para teste. **Atenção:** Substitui seus dados atuais.
- **Apagar Dados:** Limpa completamente todos os dados da aplicação. **Atenção:** Ação irreversível.
- **Desfazer/Refazer:** Permite voltar ou avançar nas suas últimas ações (atalhos: `Ctrl+Z` / `Ctrl+Y`).
- **Importar JSON:** Carrega um arquivo de backup (`.json`) previamente salvo.
- **Exportar JSON:** Salva o estado completo da aplicação. Ideal para backups.
- **Exportar CSV:** Exporta a grade bruta em formato de texto separado por vírgulas.
- **Exportar Grades (XLSX):** Gera um arquivo Excel formatado com as grades Regular e Modular.
- **Exportar Grade (PDF):** Gera um arquivo PDF da grade atualmente visível, otimizado para impressão A3.

---

## 4. Painel de Controle (Dashboard)

O Painel é a tela inicial que fornece uma visão macro do seu trabalho.

- **KPIs Gerais:** Cartões no topo mostram a porcentagem total de preenchimento da grade, alertas críticos (conflitos de horário), número de professores ativos e total de turmas.
- **Gráfico de Alertas:** Mostra a distribuição dos tipos de problemas encontrados (ex: Interstício, Indisponibilidade), ajudando a focar na resolução de problemas.
- **Carga Horária dos Professores:** Um ranking dos professores com mais aulas. Barras amarelas indicam carga alta (>6 aulas) e vermelhas indicam sobrecarga (>8 aulas).
- **Status por Turma:** Lista o progresso de alocação de aulas para cada turma individualmente.
- **Ocupação por Período:** Gráfico comparativo de aulas na Manhã, Tarde e Noite.
- **Insights Rápidos:** Listas automáticas de "Disciplinas Sem Atribuição" e "Professores Sem Aulas", facilitando a identificação de cadastros incompletos.

---

## 5. Módulo de Gerenciamento: A Base de Dados

Esta seção é onde você alimenta o sistema com todas as informações necessárias.

### 5.1. Importação Rápida (SIG HTML)
1.  Vá para `Gerenciamento > Importar SIG (HTML)`.
2.  Selecione o arquivo HTML salvo da página "Consultar Quadros" do SIG.
3.  Clique em `Analisar Arquivo`.
4.  **Validação:** Verifique a lista de turmas e marque a caixa ao lado de cada uma que deve ser considerada **Modular**.
5.  Clique em `Confirmar e Importar`.

### 5.2. Cadastro Manual
Se não tiver um arquivo para importar, cadastre tudo manualmente nas respectivas abas:
1.  **Cursos:** O nível mais alto da organização.
2.  **Turmas:** Associe a um curso, defina o período e se é **Modular**.
3.  **Disciplinas:** Associe a uma turma. Defina carga horária e se possui **Divisão**.
4.  **Professores:** Cadastre nomes e defina a **Disponibilidade** clicando na grade de horários (você pode marcar horários individuais, dias inteiros ou períodos).
5.  **Atribuições:** Atribua um ou mais professores para cada disciplina.

---

## 6. Módulo de Grade: Montando o Horário

O coração da aplicação, onde você organiza as aulas no tempo.

### 6.1. Ações na Grade
- **Adicionar Aulas:** Arraste uma aula do painel lateral direito para um espaço vazio na grade.
- **Mover Aulas:** Arraste uma aula já alocada para outro espaço. Se o destino estiver ocupado, as aulas serão trocadas.
- **Remover Aulas:** Arraste uma aula da grade de volta para o painel lateral, ou clique nela e pressione a tecla `Delete`.
- **Menu de Contexto:** Clique com o botão direito em uma aula para `Copiar` ou `Recortar`, e em outro espaço para `Colar`.

### 6.2. Entendendo os Alertas Visuais
-   <span style="color: green;">**Fundo Padrão:**</span> Válido.
-   <span style="color: #FBBF24;">**Amarelo:**</span> Fora de Disponibilidade do professor.
-   <span style="color: #F97316;">**Laranja:**</span> Excesso de Aulas (>8 no dia).
-   <span style="color: #DC2626;">**Vermelho:**</span> Interstício < 11h entre dias de trabalho.
-   <span style="color: #A855F7;">**Roxo:**</span> Conflito de Divisão (um dos professores indisponível).
-   <span style="color: #DB2777;">**Rosa:**</span> Conflito de Horário (Crítico). Professor em duas turmas ao mesmo tempo.
-   <span style="color: #3B82F6;">**Azul:**</span> Troca de Turma. A disciplina está em uma turma diferente da original.

---

## 7. Módulo de Professor: Consulta e Exportação

1.  Vá para a tela de **Professor**.
2.  Selecione um professor na lista ou busca.
3.  Visualize a grade individual, carga diária e total semanal.
4.  **Exportar Selecionado:** Botões para baixar o horário em PDF ou XLSX.
5.  **Exportar Todos (ZIP):** Baixa um arquivo compactado com os horários de todos os professores em PDF.

---

## 8. Dicas e FAQ

- **Como faço backup?** Use o botão `Exportar JSON` na barra superior regularmente.
- **Minha turma Modular apareceu na aba Regular.** Vá em `Gerenciamento > Turmas`, edite a turma e marque "Turma Modular?".
- **Disciplina Dividida:** Em `Gerenciamento > Disciplinas`, marque "Divisão" e defina o nº de professores. Em `Atribuições`, selecione os professores. Na `Grade`, a célula será dividida automaticamente ao arrastar a aula.