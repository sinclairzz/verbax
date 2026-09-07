export type RuleKey =
  | "saldo_salario"
  | "aviso_previo"
  | "ferias"
  | "decimo_terceiro"
  | "fgts_multa";
export type CalculationInput = {
  salario_base: string;
  dias_no_mes: number;
  dias_trabalhados: number;
  anos_completos: number;
  meses_periodo: number;
  meses_no_ano: number;
  total_fgts_depositado: string;
  valor_pago: string;
  pagos_por_verba?: Record<RuleKey, string>;
  motivo: "sem_justa_causa";
  aviso: "indenizado";
};
export type RuleResult = {
  verba: RuleKey;
  nome: string;
  valor: string;
  nivel_confianca: string;
  formula?: string;
  parametros?: Record<string, string | number>;
  fundamento?: string;
  fonte_url?: string;
  versao_regra?: string;
  data_calculo?: string;
  snapshot_entrada?: CalculationInput;
};
export type Calculation = {
  resultados: RuleResult[];
  divergencias: {
    verba: RuleKey;
    nome: string;
    valor_devido: string;
    valor_pago: string | null;
    diferenca: string | null;
  }[];
  total_devido: string;
  total_pago: string;
  diferenca: string;
  data_calculo: string;
  versao_motor: string;
  aviso: string;
  escopo: string;
};
export type Case = {
  id: string;
  nome: string;
  cpf_mascarado: string;
  dados: {
    cargo: string;
    admissao: string;
    demissao: string;
    empregador: string;
  };
  criado_em: string;
  completo: boolean;
  calculo: Calculation;
};
export type User = {
  id: string;
  nome: string;
  email: string;
  modo: "trabalhador";
  plano: string;
  historico_completo: boolean;
  caso_avulso_id: string | null;
};
export type PublicConfig = {
  pagamentos_configurados: boolean;
  sandbox: boolean;
  support_email: string;
  operator_name: string;
  operator_document: string;
};
export type Billing = {
  plano: string;
  status: string;
  proxima_cobranca: string | null;
  acesso_ate: string | null;
  cancelar_ao_final: boolean;
  caso_avulso_id: string | null;
  pagamentos: {
    id: string;
    plano: string;
    valor_centavos: number;
    status: string;
    pago_em: string | null;
    sandbox: boolean;
    reembolsavel: boolean;
    prazo_reembolso: string | null;
  }[];
};
