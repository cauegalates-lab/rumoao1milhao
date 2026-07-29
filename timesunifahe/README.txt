PAINEL DE EQUIPES — TOTAIS DAS BAIAS PELO APP SCRIPT

ARQUIVOS
- index.html: mostra os valores individuais e os totais recebidos do Apps Script.
- assets/: logos das equipes e símbolo da UNIFAHE.
- app-script-completo.gs: código completo do Google Apps Script, incluindo R2, equipes, crescimento e meta de 1 milhão.

COMO FUNCIONA AGORA
1. O Apps Script lê as vendas da aba Vendas.
2. Soma o faturamento de cada vendedor.
3. Usa CONFIG_MEMBROS_EQUIPES para formar as baias.
4. Calcula o realizado de cada baia no próprio Apps Script.
5. Envia ao index os vendedores, membros, metas, totais das baias e total geral das baias.
6. O index apenas exibe os valores recebidos; não recalcula o realizado das baias.

COMO ALTERAR OS MEMBROS DAS BAIAS
1. Abra app-script-completo.gs.
2. Localize CONFIG_MEMBROS_EQUIPES.
3. Edite `semana1` para a composição da primeira semana.
4. Edite `padrao` para as semanas 2 a 5 e para a visão mensal.
5. Os nomes exibidos no painel também vêm dessa configuração.

COMO ALTERAR AS METAS
1. Localize CONFIG_METAS_EQUIPES.
2. Altere semana1, semana2, semana3, semana4 e semana5.
3. No modo MÊS, a meta é a soma automática das cinco semanas.
4. Para usar uma meta mensal fixa, adicione mes: VALOR dentro da equipe.

DEPOIS DE ALTERAR O APP SCRIPT
Implantar > Gerenciar implantações > Editar > Nova versão > Implantar.
A URL atual pode continuar a mesma.

ARQUIVOS PARA ATUALIZAR
- No Google Apps Script: substitua o código pelo conteúdo de app-script-completo.gs e faça uma nova implantação.
- No GitHub: substitua o index.html.

COLUNAS LIDAS DA ABA VENDAS
B: dia
C: mês
D: ano
E: vendedor
T: valor total da venda
