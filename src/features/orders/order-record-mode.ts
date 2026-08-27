import type { OrderOperationalPeriod } from "@/features/orders/hooks/use-order-search";

export type OrderRecordMode = "operational" | "investigation";

type EmptyStateContext = {
  filterSummary: string;
  searchTerm: string;
};

export type OrderRecordModeConfig = {
  defaultPeriod: OrderOperationalPeriod;
  heading: string;
  description: string;
  loadingMessage: string;
  loadErrorMessage: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHelpIdle: string;
  searchHelpLoading: string;
  emptyStateTitle: (context: EmptyStateContext) => string;
  emptyStateDescription: (context: EmptyStateContext) => string;
  detailTitle: (orderId?: string | number | null) => string;
  detailDescription: string;
  showStatusActions: boolean;
  showPrintAction: boolean;
  showEditAction: boolean;
  showEditBlockedNotice: boolean;
};

const ORDER_RECORD_MODE_CONFIG: Record<OrderRecordMode, OrderRecordModeConfig> = {
  operational: {
    defaultPeriod: "today",
    heading: "Registo operacional",
    description:
      "Localize encomendas existentes por critérios operacionais e abra o registo certo para revisão antes de qualquer correção.",
    loadingMessage: "A carregar registo operacional de encomendas...",
    loadErrorMessage:
      "Não foi possível carregar o registo operacional. Verifique a sessão e a disponibilidade do backend.",
    searchLabel: "Nome ou telefone do cliente",
    searchPlaceholder: "Buscar por nome ou telefone",
    searchHelpIdle:
      "Digite o nome ou telefone do cliente e clique em Buscar para localizar a encomenda certa.",
    searchHelpLoading: "A procurar encomendas por nome ou telefone no backend...",
    emptyStateTitle: ({ searchTerm }) =>
      searchTerm.trim().length > 0
        ? "Nenhuma encomenda encontrada"
        : "Não existem encomendas para os filtros ativos.",
    emptyStateDescription: ({ filterSummary, searchTerm }) =>
      searchTerm.trim().length > 0
        ? `Não encontrámos resultados para "${searchTerm}". Ajuste o nome ou telefone do cliente e tente novamente.`
        : `Não encontrámos encomendas para os critérios: ${filterSummary}. Ajuste os filtros operacionais para continuar a triagem.`,
    detailTitle: (orderId) =>
      orderId != null ? `Encomenda #${orderId}` : "Detalhe da encomenda",
    detailDescription:
      "Consulte o registo atual antes de avançar para revisão ou correção.",
    showStatusActions: true,
    showPrintAction: true,
    showEditAction: true,
    showEditBlockedNotice: true,
  },
  investigation: {
    defaultPeriod: "all",
    heading: "Investigação de encomendas",
    description:
      "Pesquise no universo pesquisável de encomendas administrativas e abra o detalhe necessário para análise sem sair deste contexto.",
    loadingMessage: "A carregar investigação de encomendas...",
    loadErrorMessage:
      "Não foi possível carregar a investigação de encomendas. Verifique a sessão e a disponibilidade do backend.",
    searchLabel: "Nome ou telefone do cliente",
    searchPlaceholder: "Buscar por nome ou telefone",
    searchHelpIdle:
      "Digite o nome ou telefone do cliente e clique em Buscar para pesquisar nas encomendas administrativas.",
    searchHelpLoading: "A pesquisar encomendas por nome ou telefone no backend...",
    emptyStateTitle: ({ searchTerm }) =>
      searchTerm.trim().length > 0
        ? "Nenhuma encomenda encontrada para investigação"
        : "Nenhuma encomenda corresponde aos critérios atuais.",
    emptyStateDescription: ({ filterSummary, searchTerm }) =>
      searchTerm.trim().length > 0
        ? `Não encontrámos resultados para "${searchTerm}" no universo pesquisável de encomendas administrativas. Ajuste o nome ou telefone do cliente e tente novamente.`
        : `Não encontrámos encomendas no universo pesquisável para os critérios: ${filterSummary}. Ajuste a pesquisa ou os filtros e tente novamente.`,
    detailTitle: (orderId) =>
      orderId != null
        ? `Detalhe da investigação · Encomenda #${orderId}`
        : "Detalhe da investigação",
    detailDescription:
      "Consulte o detalhe necessário para análise sem expor ações de correção ou transição nesta etapa.",
    showStatusActions: false,
    showPrintAction: false,
    showEditAction: false,
    showEditBlockedNotice: false,
  },
};

export function getOrderRecordModeConfig(
  mode: OrderRecordMode = "operational",
) {
  return ORDER_RECORD_MODE_CONFIG[mode];
}
