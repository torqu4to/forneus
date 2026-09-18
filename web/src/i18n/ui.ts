/**
 * Message catalogs.
 *
 * These mirror `forneus_core/locales/*.json` from the Python core. Keys are
 * shared on purpose: a notice the API emits as `notice.amigatos.provisional_tier`
 * resolves here with the same key, so the backend never sends prose.
 *
 * Adding a key to one locale and not the other is a bug — `missingKeys()`
 * below is what a test or a build step checks.
 */

export const LOCALES = ['pt', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt';

/** Maps our short URL segment to the tag the core and `<html lang>` use. */
export const LOCALE_TAG: Record<Locale, string> = {
  pt: 'pt-BR',
  en: 'en-US',
};

export const LOCALE_NAME: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
};

export const ui = {
  pt: {
    'site.tagline': 'Ferramentas de otimização para Tree of Savior Neo',
    'nav.tools': 'Ferramentas',
    /* Short nav labels. These are NOT derived from the tool titles: the
       titles differ in shape per language ("Otimizador de amigatos" vs
       "Catpal optimizer"), and trimming a prefix produced two identical
       "optimizer" entries in English. */
    'nav.tool.amigatos': 'Amigatos',
    'nav.tool.fantasmas': 'Fantasmas',
    'nav.tool.florais': 'Florais',
    'nav.data': 'Sobre os dados',
    'nav.signin': 'Entrar',
    'nav.account': 'Conta',
    'nav.signout': 'Sair',

    /* ── contas ────────────────────────────────────────────────── */
    'auth.title': 'Entrar',
    'auth.why': 'Entrar guarda suas equipes na conta, para você recuperá-las em qualquer aparelho. Sem entrar, elas ficam salvas só neste navegador.',
    'auth.discord': 'Entrar com Discord',
    'auth.google': 'Entrar com Google',
    'auth.signed_in_as': 'Conectado como {name}',
    'auth.syncing': 'Sincronizando suas equipes…',
    'auth.merged': '{count} equipe(s) deste navegador foram enviadas para sua conta.',
    'auth.merge_conflict': '{count} equipe(s) existiam nos dois lugares; mantivemos a versão mais recente.',
    'auth.local_only': 'Suas equipes estão salvas apenas neste navegador.',

    'error.accounts.unavailable': 'Entrar não está disponível nesta versão do site.',
    'error.signin.failed': 'Não foi possível iniciar o login. Tente de novo.',
    'error.profile.save_failed': 'Não foi possível salvar. Sua equipe continua neste navegador.',
    'error.profile.offline': 'Sua conta está indisponível agora. Mostrando as equipes deste navegador.',

    /* ── perfis ────────────────────────────────────────────────── */
    'profile.heading': 'Minhas equipes',
    'profile.none': 'Você ainda não salvou nenhuma equipe.',
    'profile.new': 'Nova equipe',
    'profile.name': 'Nome da equipe',
    'profile.name.placeholder': 'Ex.: Equipe principal',
    'profile.save': 'Salvar',
    'profile.delete': 'Excluir',
    'profile.delete.confirm': 'Excluir "{name}"? Isso não pode ser desfeito.',
    'profile.saved': 'Equipe salva.',
    'profile.add_catpal': 'Adicionar linha',
    'profile.remove_catpal': 'Remover linha',
    'profile.catpal_level': 'Nível atual',
    'profile.qty': 'Quantidade',
    'profile.count': '{count} de {max} amigatos',
    'profile.full': 'Equipe completa: {max} amigatos.',
    'profile.empty_team': 'Informe quantos amigatos você tem de cada tipo e nível.',

    /* ── comparador ────────────────────────────────────────────── */
    'compare.heading': 'Manter ou redistribuir?',
    'compare.lead': 'Informe quanta Fish Jelly nova você conseguiu desde a última vez. Comparamos gastar só ela contra resetar tudo e redistribuir do zero.',
    'compare.new_jelly': 'Fish Jelly nova',
    'compare.run': 'Comparar',
    'compare.keep': 'Manter os níveis atuais',
    'compare.keep.desc': 'Gasta apenas a Jelly nova. Nada é resetado.',
    'compare.redistribute': 'Resetar e redistribuir',
    'compare.redistribute.desc': 'Recupera tudo que já está investido e resolve a equipe inteira de novo.',
    'compare.current_power': 'Poder efetivo hoje',
    'compare.invested': 'Já investido',
    'compare.gain': 'Ganho',
    'compare.recommended': 'Recomendado',
    'compare.no_change': 'Nenhuma mudança',
    'compare.changes': '{count} amigato(s) mudam de nível',
    'compare.tie': 'Os dois cenários dão o mesmo poder — manter é mais simples.',
    'compare.reset_warning': 'Resetar é irreversível no jogo. Confira os números antes.',
    'compare.col.from': 'De',
    'compare.col.to': 'Para',
    'compare.col.change': 'Jelly',

    'hero.eyebrow': 'Tree of Savior Neo',
    'hero.title.1': 'Gaste seus recursos',
    'hero.title.2': 'onde eles rendem mais',
    'hero.lead':
      'Calculadoras de otimização para TOSN. Você informa o que tem; elas devolvem a distribuição exata — não um chute, não uma heurística.',
    'hero.cta': 'Abrir otimizador de amigatos',
    'hero.noaccount': 'Sem conta · sem instalação',
    'hero.sample': 'Exemplo de saída',

    'tools.heading': 'Ferramentas',
    'tools.count': '{available} disponível · {planned} em desenvolvimento',
    'tools.open': 'Abrir',
    'tools.soon': 'Em breve',

    'tool.amigatos.title': 'Otimizador de amigatos',
    'tool.amigatos.description':
      'Distribuição ótima de Fish Jelly entre os amigatos dos assist slots.',
    'tool.fantasmas.title': 'Otimizador de fantasmas',
    'tool.fantasmas.description':
      'Em coleta de dados. Modelagem do problema ainda em definição.',
    'tool.florais.title': 'Guardiões florais',
    'tool.florais.description': 'Escopo ainda não definido.',

    'how.back': 'Voltar ao otimizador',
    'how.open.tool': 'Abrir o otimizador',
    'how.open.guide': 'Como usar',
    'how.note.label': 'Importante',
    'how.note.text': 'O resultado usa os valores de Fish Jelly e poder atualmente catalogados. Confira os números no jogo antes de confirmar uma evolução.',
    'how.amigatos.kicker': 'Guia rápido · Amigatos',
    'how.amigatos.title': 'Como usar o otimizador de amigatos',
    'how.amigatos.description': 'Aprenda a informar sua equipe e encontrar a melhor distribuição de Fish Jelly.',
    'how.amigatos.intro': 'Informe o que você tem nos assist slots, quanto de Fish Jelly está disponível e deixe o Forneus calcular a distribuição ótima.',
    'how.amigatos.step1.title': 'Conte sua equipe',
    'how.amigatos.step1.text': 'Em Sua equipe, informe quantos amigatos você possui de cada categoria. A soma deve respeitar o limite de assist slots.',
    'how.amigatos.step2.title': 'Informe a Jelly',
    'how.amigatos.step2.text': 'Digite o total de Fish Jelly disponível em unidades r1. Silverleaf e Dried Fish não entram no cálculo por enquanto.',
    'how.amigatos.step3.title': 'Calcule a distribuição',
    'how.amigatos.step3.text': 'Clique em Calcular. O resultado mostra o nível recomendado para cada amigato, o poder efetivo, o custo e o restante.',
    'how.amigatos.step4.title': 'Confira antes de evoluir',
    'how.amigatos.step4.text': 'Use a tabela como plano de evolução. Os valores atuais consideram os dados catalogados no tier máximo 6/6.',
    'share.heading': 'Compartilhar equipe',
    'share.help': 'Gere um link com as quantidades e a Jelly informadas. Nenhum dado é enviado para um servidor.',
    'share.button': 'Copiar link da equipe',
    'share.copied': 'Link copiado.',
    'share.loaded': 'Equipe carregada a partir do link compartilhado.',

    'why.1.label': '01 · Resultado exato',
    'why.1.text':
      'O problema é um knapsack de múltipla escolha, resolvido por programação dinâmica. Para os dados fornecidos, o resultado é ótimo — não uma aproximação gulosa.',
    'why.2.label': '02 · Dados com procedência',
    'why.2.text':
      'Cada tabela carrega o tier em que foi capturada. Onde o dado é provisório, o aviso aparece junto do resultado — não escondido num rodapé.',
    'why.3.label': '03 · Seus números saem daqui',
    'why.3.text':
      'Todo resultado exporta em CSV e JSON, com os mesmos avisos embutidos. Nada fica preso na página.',

    'form.team': 'Sua equipe',
    'form.budget': 'Fish Jelly disponível',
    'form.budget.unit': 'em unidades r1',
    'form.budget.help': 'Converta tudo para r1 no jogo antes de informar o total.',
    'form.submit': 'Calcular',
    'form.profile': 'Perfil',
    'form.profile.current': 'Equipe principal',
    'form.profile.new': 'Novo',
    'form.profile.help':
      'Perfis salvos ficam neste navegador. Contas com sincronização chegam numa fase futura.',
    'form.effectiveness': '{rate}% do poder',

    'result.heading': 'Distribuição recomendada',
    'result.power': 'Poder efetivo',
    'result.spent': 'Jelly usada',
    'result.leftover': 'Restante',
    'result.col.entity': 'Amigato',
    'result.col.level': 'Nível',
    'result.col.cost': 'Jelly',
    'result.col.power': 'Poder efetivo',
    'result.grouped': 'Linhas idênticas aparecem agrupadas com ×N.',
    'result.costnote':
      'A coluna Jelly mostra o custo de evolução por amigato. O total utilizado também inclui eventuais custos de entrada.',

    'export.heading': 'Exportar',
    'provenance.heading': 'Procedência',

    'notice.tag': 'Aviso',
    'notice.tag.error': 'Erro',

    /* States of the calculate button and of a result that no longer matches
       what is typed in the form. */
    'state.calculating': 'Calculando…',
    'state.stale': 'Os dados mudaram. Calcule de novo.',
    'state.done': 'Cálculo concluído.',
    'state.empty': 'Nenhum amigato informado. Toda a Jelly continua disponível.',

    /* Failures that have no key of their own coming from the API. */
    'error.network': 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
    'error.unexpected': 'Algo deu errado no servidor. Tente de novo em instantes.',
    'error.aborted': 'Cálculo cancelado.',
    'error.rate_limited': 'Muitas requisições. Tente de novo em {seconds}s.',
    'error.payload.invalid': 'Envie valores válidos.',
    'error.category.unknown': 'Categoria de amigato desconhecida.',
    'error.counts.range': 'As quantidades devem ser inteiros entre 0 e {max}.',
    'error.team.too_large': 'A equipe aceita até {max} amigatos no total.',
    'error.jelly.range': 'Informe Jelly inteira entre 0 e {max}.',
    'error.jelly.insufficient': 'Jelly insuficiente para o custo de entrada da equipe.',
    'notice.amigatos.currencies_excluded':
      'Silverleaf e Dried Fish não são considerados; o resultado é ótimo apenas para Fish Jelly e estas tabelas.',
    'notice.amigatos.provisional_tier': '{display_name} usa dados do tier {captured}/{max}.',

    'footer.independent': 'forneus.wiki · projeto independente, sem vínculo com a IMC Games',
    'footer.check': 'Confira os dados no jogo antes de gastar seus recursos.',
  },

  en: {
    'site.tagline': 'Optimization tools for Tree of Savior Neo',
    'nav.tools': 'Tools',
    'nav.tool.amigatos': 'Catpals',
    'nav.tool.fantasmas': 'Ghosts',
    'nav.tool.florais': 'Guardians',
    'nav.data': 'About the data',
    'nav.signin': 'Sign in',
    'nav.account': 'Account',
    'nav.signout': 'Sign out',

    'auth.title': 'Sign in',
    'auth.why': 'Signing in keeps your teams on your account, so you can pick them up on any device. Without signing in, they stay in this browser only.',
    'auth.discord': 'Sign in with Discord',
    'auth.google': 'Sign in with Google',
    'auth.signed_in_as': 'Signed in as {name}',
    'auth.syncing': 'Syncing your teams…',
    'auth.merged': '{count} team(s) from this browser were uploaded to your account.',
    'auth.merge_conflict': '{count} team(s) existed in both places; the newer version was kept.',
    'auth.local_only': 'Your teams are saved in this browser only.',

    'error.accounts.unavailable': 'Signing in is not available in this build.',
    'error.signin.failed': 'Could not start sign-in. Try again.',
    'error.profile.save_failed': 'Could not save. Your team is still in this browser.',
    'error.profile.offline': 'Your account is unavailable right now. Showing this browser\'s teams.',

    'profile.heading': 'My teams',
    'profile.none': 'You have not saved a team yet.',
    'profile.new': 'New team',
    'profile.name': 'Team name',
    'profile.name.placeholder': 'e.g. Main team',
    'profile.save': 'Save',
    'profile.delete': 'Delete',
    'profile.delete.confirm': 'Delete "{name}"? This cannot be undone.',
    'profile.saved': 'Team saved.',
    'profile.add_catpal': 'Add row',
    'profile.remove_catpal': 'Remove row',
    'profile.catpal_level': 'Current level',
    'profile.qty': 'Quantity',
    'profile.count': '{count} of {max} catpals',
    'profile.full': 'Team is full: {max} catpals.',
    'profile.empty_team': 'Enter how many catpals you have of each type and level.',

    'compare.heading': 'Keep or redistribute?',
    'compare.lead': 'Enter how much new Fish Jelly you have earned since last time. We compare spending only that against resetting everything and redistributing from scratch.',
    'compare.new_jelly': 'New Fish Jelly',
    'compare.run': 'Compare',
    'compare.keep': 'Keep current levels',
    'compare.keep.desc': 'Spends only the new Jelly. Nothing is reset.',
    'compare.redistribute': 'Reset and redistribute',
    'compare.redistribute.desc': 'Reclaims everything already invested and solves the whole team again.',
    'compare.current_power': 'Effective power today',
    'compare.invested': 'Already invested',
    'compare.gain': 'Gain',
    'compare.recommended': 'Recommended',
    'compare.no_change': 'No change',
    'compare.changes': '{count} catpal(s) change level',
    'compare.tie': 'Both scenarios give the same power — keeping is simpler.',
    'compare.reset_warning': 'Resetting is irreversible in game. Check the numbers first.',
    'compare.col.from': 'From',
    'compare.col.to': 'To',
    'compare.col.change': 'Jelly',

    'hero.eyebrow': 'Tree of Savior Neo',
    'hero.title.1': 'Spend your resources',
    'hero.title.2': 'where they pay off most',
    'hero.lead':
      'Optimization calculators for TOSN. You tell them what you have; they return the exact allocation — not a guess, not a heuristic.',
    'hero.cta': 'Open catpal optimizer',
    'hero.noaccount': 'No account · no install',
    'hero.sample': 'Sample output',

    'tools.heading': 'Tools',
    'tools.count': '{available} available · {planned} in development',
    'tools.open': 'Open',
    'tools.soon': 'Soon',

    'tool.amigatos.title': 'Catpal optimizer',
    'tool.amigatos.description':
      'Optimal Fish Jelly allocation across the catpals in your assist slots.',
    'tool.fantasmas.title': 'Ghost optimizer',
    'tool.fantasmas.description':
      'Collecting data. How to model the problem is still being decided.',
    'tool.florais.title': 'Floral guardians',
    'tool.florais.description': 'Scope not defined yet.',

    'how.back': 'Back to optimizer',
    'how.open.tool': 'Open the optimizer',
    'how.open.guide': 'How to use',
    'how.note.label': 'Important',
    'how.note.text': 'The result uses the Fish Jelly and power values currently catalogued. Check the numbers in game before confirming an upgrade.',
    'how.amigatos.kicker': 'Quick guide · Catpals',
    'how.amigatos.title': 'How to use the catpal optimizer',
    'how.amigatos.description': 'Learn how to enter your team and find the best Fish Jelly allocation.',
    'how.amigatos.intro': 'Enter what you have in your assist slots, how much Fish Jelly is available, and let Forneus calculate the optimal allocation.',
    'how.amigatos.step1.title': 'Count your team',
    'how.amigatos.step1.text': 'Under Your team, enter how many catpals you have in each category. The total must fit your assist slots.',
    'how.amigatos.step2.title': 'Enter your Jelly',
    'how.amigatos.step2.text': 'Enter the total Fish Jelly available in r1 units. Silverleaf and Dried Fish are not included in the calculation yet.',
    'how.amigatos.step3.title': 'Calculate the allocation',
    'how.amigatos.step3.text': 'Click Calculate. The result shows the recommended level for each catpal, effective power, cost, and leftover.',
    'how.amigatos.step4.title': 'Check before upgrading',
    'how.amigatos.step4.text': 'Use the table as your upgrade plan. Current values use the catalogued maximum tier, 6/6.',
    'share.heading': 'Share team',
    'share.help': 'Create a link with the entered quantities and Jelly. No data is sent to a server.',
    'share.button': 'Copy team link',
    'share.copied': 'Link copied.',
    'share.loaded': 'Team loaded from the shared link.',

    'why.1.label': '01 · Exact result',
    'why.1.text':
      'The problem is a multiple-choice knapsack, solved with dynamic programming. For the given data the result is optimal — not a greedy approximation.',
    'why.2.label': '02 · Data with provenance',
    'why.2.text':
      'Every table carries the tier it was captured at. Where the data is provisional, the caveat sits next to the result — not buried in a footer.',
    'why.3.label': '03 · Your numbers leave with you',
    'why.3.text':
      'Every result exports to CSV and JSON, caveats included. Nothing is trapped in the page.',

    'form.team': 'Your team',
    'form.budget': 'Fish Jelly available',
    'form.budget.unit': 'in r1 units',
    'form.budget.help': 'Convert everything to r1 in game before entering the total.',
    'form.submit': 'Calculate',
    'form.profile': 'Profile',
    'form.profile.current': 'Main team',
    'form.profile.new': 'New',
    'form.profile.help':
      'Saved profiles live in this browser. Accounts with sync arrive in a later phase.',
    'form.effectiveness': '{rate}% of power',

    'result.heading': 'Recommended allocation',
    'result.power': 'Effective power',
    'result.spent': 'Jelly spent',
    'result.leftover': 'Leftover',
    'result.col.entity': 'Catpal',
    'result.col.level': 'Level',
    'result.col.cost': 'Jelly',
    'result.col.power': 'Effective power',
    'result.grouped': 'Identical rows are grouped as ×N.',
    'result.costnote':
      'The Jelly column shows each catpal’s leveling cost. The total spent also includes any entry costs.',

    'export.heading': 'Export',
    'provenance.heading': 'Provenance',

    'notice.tag': 'Note',
    'notice.tag.error': 'Error',

    'state.calculating': 'Calculating…',
    'state.stale': 'The inputs changed. Calculate again.',
    'state.done': 'Calculation complete.',
    'state.empty': 'No catpals entered. All Jelly stays available.',

    'error.network': 'Could not reach the server. Check your connection and try again.',
    'error.unexpected': 'Something went wrong on the server. Try again shortly.',
    'error.aborted': 'Calculation cancelled.',
    'error.rate_limited': 'Too many requests. Try again in {seconds}s.',
    'error.payload.invalid': 'Send valid values.',
    'error.category.unknown': 'Unknown catpal category.',
    'error.counts.range': 'Quantities must be integers between 0 and {max}.',
    'error.team.too_large': 'A team supports at most {max} catpals in total.',
    'error.jelly.range': 'Provide an integer Jelly amount between 0 and {max}.',
    'error.jelly.insufficient': 'Not enough Jelly to cover the team entry cost.',
    'notice.amigatos.currencies_excluded':
      'Silverleaf and Dried Fish are not modeled; the result is optimal for Fish Jelly and these tables only.',
    'notice.amigatos.provisional_tier': '{display_name} uses tier {captured}/{max} data.',

    'footer.independent': 'forneus.wiki · independent project, not affiliated with IMC Games',
    'footer.check': 'Check the data in game before spending your resources.',
  },
} as const;

export type UIKey = keyof (typeof ui)['pt'];

/** Keys present in the default catalog but missing from `locale`. */
export function missingKeys(locale: Locale): string[] {
  const base = Object.keys(ui[DEFAULT_LOCALE]);
  const other = new Set(Object.keys(ui[locale]));
  return base.filter((key) => !other.has(key));
}
