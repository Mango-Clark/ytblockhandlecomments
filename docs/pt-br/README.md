<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# 📌 YouTube Comment Blocker — v1.5.4

[English (US)](../../README.md) | [한국어](../ko-kr/README.md) | [日本語](../ja-jp/README.md) | [Deutsch](../de-de/README.md) | [简体中文](../zh-cn/README.md) | [繁體中文](../zh-tw/README.md) | [Français](../fr-fr/README.md) | [Português (Brasil)](README.md) | [Русский](../ru-ru/README.md) | [Bahasa Indonesia](../id-id/README.md)

Um script Tampermonkey que oculta comentários do YouTube por canal em vídeos e Shorts. Gerencie regras de identificador, UCID e regex com automação configurável e armazenamento local.

## Instalação e uso

1. Instale o [Tampermonkey](https://www.tampermonkey.net/).
2. Abra a URL abaixo ou cole `ytblockhandlecomments.js` em um novo script.
3. Em um vídeo ou Short, clique com o botão direito no identificador do autor ou use o menu `⋯` para bloquear/desbloquear o canal.
4. Abra o menu do script no Tampermonkey para gerenciar bloqueios, configurações ou idioma.

<https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## Recursos

- **Bloqueio:** regras de identificador por padrão, pares UCID opcionais, regex independentes e diferenciação de maiúsculas. Só interações com autores de comentários são ampliadas.
- **Comentários e automação:** ocultar, marcador cinza ou clique para revelar; não gostei automático, inclusão por regex e palavras-chave no texto, identificadores ou rótulos fixados. Nós reutilizados são processados novamente.
- **Lista de bloqueios:** pesquisa, filtros por tipo/tag, seleção, ações em lote e importação/exportação JSON ou texto. Resultados regex podem ser contados, selecionados, expandidos e paginados sem reconstruir a lista.
- **Configurações:** oito seções: correspondência, comentários, automação, pares, chave API, exibição/tema, logs/diagnóstico e redefinição. Em telas estreitas, a navegação fica no topo. Alterações são salvas automaticamente e os padrões são indicados.
- **Aparência:** cinco tamanhos de texto/interface e temas claro, escuro, sistema, invertido, YouTube ou personalizado. A sincronização usa o estado escuro nativo do YouTube; as cores afetam apenas o script.
- **Desempenho:** correspondência em cache e busca limitada de contêineres de comentários. São 100 itens por página; o modo de baixo desempenho usa 50, lotes menores, busca adiada e pares manuais um por vez. Consultas ignoradas não são repetidas.
- **Logs:** saídas local e console separadas, nível, retenção, prefixo, fuso e horários ISO/personalizados, teste, download, limpeza confirmada e detalhes V0–V5. Valores sensíveis são ocultados; não registra cada comentário.
- **Estado:** rascunhos, pesquisa, filtros, seleção, página e rolagem são preservados na navegação e troca de idioma. Navegação SPA reinicia observadores temporários; diálogos gerenciam o foco.

## Pares UCID

1. O bloqueio é imediato. A criação de pares está ativa por padrão e roda de forma assíncrona; falhas preservam bloqueios e vínculos.
2. A criação resolve **identificador → UCID** e salva o par e uma regra `id`. A atualização resolve **UCID → identificador atual**, mantém o UCID e substitui o antigo. Sem UCID, usa o caminho de criação.
3. Configure criação, atualização e pareamento imediato separadamente: página, API oficial ou página com API em caso de falha. Página dispensa chave; requisições API exigem chave salva.
4. Para correspondência UCID, ative detecção e regras de pares. Use modo de identificador até a regra existir. Pares por palavras-chave usam a política de criação; o modo de baixo desempenho permite ações manuais.
5. Escolha o intervalo ou segundos personalizados (mínimo um). Padrões: 10 minutos para página e uma semana para API. Atualização geral respeita o intervalo; itens selecionados forçam consulta.
6. Execute operações na lista. Confira status, resultados, filtros, ordenação, cópia/exportação de falhas, progresso e aviso na página. Testes de chave orientam sobre falhas repetidas de cota.
7. A página fornece metadados do próprio canal. Atualizações API exigem UCID correspondente e URL `@handle`. Dados ausentes, conflitos, cancelamento e falhas preservam os vínculos.

## Idiomas

Interface e README suportam `en-us`, `ko-kr`, `ja-jp`, `de-de`, `zh-cn`, `zh-tw`, `fr-fr`, `pt-br`, `ru-ru` e `id-id`. Escolha em Configurações → Exibição/tema ou no menu Tampermonkey. A escolha salva tem prioridade; o automático segue o navegador e depois `en-us`.

Variantes regionais usam o idioma disponível (`en-GB` → `en-us`, `pt-PT` → `pt-br`). Chinês: Hans/CN/SG → `zh-cn`, Hant/TW/HK/MO → `zh-tw`; `zh` usa simplificado. Escolhas antigas `en`/`ko` continuam válidas. Wiki e changelog permanecem inglês/coreano; outros guias mantêm seus idiomas.

## Armazenamento e privacidade

- `blocked_v2`: regras `handle`, `id` (UCID), `regex`. Formatos JSON/texto preservados, incluindo `/pattern/flags`.
- `pair_meta_v1`: vínculos UCID e verificações; `app_settings_v1`: configurações; `youtube_data_api_v3_config`: chave, testes e cota; `lang`: idioma.
- Pares e chaves não entram na importação/exportação. Chaves ficam locais e são enviadas apenas em solicitações à API oficial. Logs baixados usam UTC ISO; o navegador controla o destino.
- A sincronização usa revisões e marcas de exclusão para unir inclusões sem restaurar regras/logs apagados. Falhas de leitura bloqueiam gravações; rejeições preservam dados anteriores.
- Listas antigas migram somente sem dados atuais válidos. UID vira UCID preservando chaves, revisões, exclusões e horários. Recarregue abas com versões antigas após atualizar.
- Esquemas, tokens de horário e detalhes estão na Wiki abaixo.

## Padrões

- Identificadores, ocultação completa, não gostei desligado e pares imediatos ligados. As três políticas usam páginas na nova instalação.
- Texto/interface nível 3; nível 2 é o tamanho antigo. Diagnóstico V3; V0/V1 sem dados, V2 1 campo, V3 3, V4 6, V5 10.
- Modo de baixo desempenho e logs desligados. Palavras-chave ignoram maiúsculas, verificam texto por padrão e não agem antes da ativação.
- Atualizações preservam configurações e intervalos personalizados. Trocar consulta ou idioma não redefine regras nem rascunhos.

## Limites e observações

- Consulta por página não é documentada e pode falhar após mudanças HTML. A API usa cota; regras UCID são comparadas localmente. Testes usam um canal público fixo.
- Identificadores antigos podem estar em minúsculas; salve novamente para garantir a capitalização. Regex verifica identificadores; palavras-chave só os campos escolhidos.
- Regex valida comprimento, flags e complexidade; alvos limitados a 128 caracteres. Comentários são tratados só em vídeos/Shorts compatíveis; aviso de pares só em vídeos.
- Respostas YouTube/API, conteúdo do usuário, identificadores, campos de protocolo e logs de máquina não são traduzidos. Players incorporados são excluídos; só permissões listadas são usadas.

## Documentação

- Wiki: [English](../WIKI.md) / [한국어](../ko-kr/WIKI.md)
- Changelog: [English](../CHANGELOG.md) / [한국어](../ko-kr/CHANGELOG.md)
- Guia de contribuição: [English](../../CONTRIBUTING.md) / [한국어](../ko-kr/CONTRIBUTING.md)
- [TODO](../TODO.md) / [Auxiliar de revisão](../ABOUT.md)

## Desenvolvimento e verificação

- Trabalhe em `dev`, editando TypeScript em `src/`. Números orientam leitura; imports ES determinam execução. Armazenamento: `03a-gm-backed-store.ts`; gerenciador: `12a`–`12e`.
- Edite `src/template/`, não arquivos gerados. `npm run build` regenera todos os READMEs e `ytblockhandlecomments.js` compacto em uma transação; Tampermonkey carrega apenas o script raiz.
- Mantenha dez catálogos e READMEs alinhados. `en.ts` define mensagens; `locales.ts`, nomes, caminhos e contribuidores; `i18n-mason.toml`, o escopo. Preserve parâmetros e texto de máquina.
- `npm run verify` executa lint, lint Markdown, tipos, testes determinísticos `node:test`, build e verificação de gerados. Comandos separados continuam disponíveis; relate verificações omitidas.
- Faça commit de fontes e gerados juntos com Conventional Commits e revisão independente. Versão e push exigem autorização. Releases usam `npm run bump:version -- <MAJOR.MINOR.PATCH>`.

```sh
npm run lint
npm run lint:markdown
npm run typecheck
npm run build
npm run check:build
npm run verify
```

Futura cobertura opcional de navegador fica separada; testes não exigem sessão real do YouTube.

## Contribuidores de tradução

- 한국어 - Mango-Clark
- 日本語 - GPT-6.1 Sol
- Deutsch - GPT-6.1 Sol
- 简体中文 - GPT-6.1 Sol
- 繁體中文 - GPT-6.1 Sol
- Français - GPT-6.1 Sol
- Português (Brasil) - GPT-6.1 Sol
- Русский - GPT-6.1 Sol
- Bahasa Indonesia - GPT-6.1 Sol

## Autor

- **Mango_Clark**
- Licença: MIT
