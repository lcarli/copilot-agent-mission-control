# Revisão do conteúdo em português do Brasil

**Status:** Aprovado  
**Revisão:** 25 de setembro de 2026  
**Escopo:** Conteúdo para participantes, controles do instrutor, interface do
centro de comando, narrativa da campanha, missões, mídia, narração, legendas e
metadados de acessibilidade.

## Decisões terminológicas

- Usar **agente** somente para o comportamento de software limitado que as
  pessoas participantes constroem.
- Usar **evidência** para uma observação rastreável e **fundamentação** para a
  ligação explícita entre uma afirmação e essa evidência.
- Usar **ferramenta** para operações externas dos simuladores e
  **transferência** para encaminhamentos estruturados entre especialistas.
- Usar **aprovação humana** nas instruções, em vez da expressão inglesa
  “human in the loop”.
- Descrever **recuperação** como progresso mensurável baseado em evidências,
  nunca como garantia de que todos os riscos terminaram.
- Preservar exatamente `Port Azure`, `Mission Commander`, `Maya Chen`,
  `Jules Martin`, `Aurora` e o nome da interface `Mission Control`.

## Ajustes de naturalidade

- Substituímos empréstimos desnecessários por **painel**, **tela ampla**,
  **estado** e **ciclo**.
- Mantivemos construções inclusivas no plural, evitando gênero desnecessário
  para unidades, participantes, moradores e agentes de software.
- Preferimos frases operacionais diretas, sem tradução literal da ordem das
  palavras em inglês.

## Revisão de acessibilidade

- Informações essenciais não dependem apenas de cor, áudio ou movimento.
- Vídeos narrados possuem legendas sincronizadas em português do Brasil.
- Variantes com movimento e intensidade sensorial reduzidos estão explícitas.
- A linguagem de emergência comunica urgência sem pânico, culpa ou
  sensacionalismo.

## Superfícies revisadas

- `apps/command-center/src/messages.ts`
- `apps/participant-cli/src/translations.ts`
- `campaigns/operation-lighthouse/src/narrative.ts`
- `campaigns/operation-lighthouse/src/missions/`
- `campaigns/operation-lighthouse/media/localization/pt-BR.json`
- `campaigns/operation-lighthouse/media/captions/*.pt-BR.vtt`

Não restam problemas bloqueadores na localização em português do Brasil.
