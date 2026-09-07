"""Pure deterministic engine. No AI imports, network calls or binary-float money.

Illustrative rules supplied in the product brief, not legally validated.
Each line rounds once to BRL cents with ROUND_HALF_UP. Total sums rounded lines.
"""
from calendar import monthrange
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP, localcontext
from typing import Annotated, Literal
from pydantic import BaseModel, Field, model_validator

Money = Annotated[Decimal, Field(ge=0, le=Decimal('999999999.99'), max_digits=11, decimal_places=2)]
VERSION = '0.1.0-ilustrativa'
DISCLAIMER = 'Análise baseada nos dados fornecidos. Regras ilustrativas com fundamento a confirmar. Não substitui avaliação jurídica quando necessária.'
RULES = {
    'saldo_salario': ('Saldo de salário', '(salario_base / min(dias_no_mes, 30)) × dias_trabalhados', 'CLT, art. 64 (referência inicial; divisor e aplicabilidade a confirmar)', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm'),
    'aviso_previo': ('Aviso prévio indenizado', '(salario_base / 30) × (30 + min(max(anos_completos − 1, 0) × 3, 60))', 'Lei 12.506/2011, art. 1º (a confirmar)', 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12506.htm'),
    'ferias': ('Férias proporcionais + 1/3', '(salario_base / 12 × meses_periodo) × 4/3', 'CLT, arts. 146 e 147; CF, art. 7º, XVII (a confirmar)', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm'),
    'decimo_terceiro': ('13º salário proporcional', '(salario_base / 12) × meses_no_ano', 'Lei 4.090/1962, art. 1º (a confirmar)', 'https://www.planalto.gov.br/ccivil_03/leis/l4090.htm'),
    'fgts_multa': ('Multa de 40% do FGTS', 'total_fgts_depositado × 0,40', 'Lei 8.036/1990, art. 18, § 1º (a confirmar)', 'https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm'),
}


class CalculationInput(BaseModel):
    salario_base: Money
    dias_no_mes: int = Field(ge=28, le=31)
    dias_trabalhados: int = Field(ge=0, le=31)
    anos_completos: int = Field(ge=0, le=80)
    meses_periodo: int = Field(ge=0, le=12)
    meses_no_ano: int = Field(ge=0, le=12)
    total_fgts_depositado: Money
    valor_pago: Money
    # A paid breakdown is optional; absent items are pending, never invented zeroes.
    pagos_por_verba: dict[str, Money] | None = None
    motivo: Literal['sem_justa_causa'] = 'sem_justa_causa'
    aviso: Literal['indenizado'] = 'indenizado'

    @model_validator(mode='after')
    def validate_input(self):
        if self.salario_base <= 0:
            raise ValueError('Informe um salário maior que zero.')
        if self.dias_trabalhados > self.dias_no_mes:
            raise ValueError('Dias trabalhados não podem superar os dias do mês.')
        if self.pagos_por_verba is not None:
            if set(self.pagos_por_verba) != set(RULES):
                raise ValueError('Informe os valores pagos das cinco verbas ou apenas o total.')
            if sum(self.pagos_por_verba.values(), Decimal(0)) != self.valor_pago:
                raise ValueError('A soma por verba deve corresponder ao total pago.')
        return self


def money(value: Decimal) -> str:
    return str(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def calculate(data: CalculationInput, calculated_at: datetime | None = None) -> dict:
    when = (calculated_at or datetime.now(timezone.utc)).isoformat()
    snapshot = data.model_dump(mode='json')
    with localcontext() as ctx:
        ctx.prec = 40
        salary = data.salario_base
        daily_divisor = min(data.dias_no_mes, 30)
        aviso_days = 30 + min(max(data.anos_completos - 1, 0) * 3, 60)
        values = [
            salary / daily_divisor * data.dias_trabalhados,
            salary / 30 * aviso_days,
            salary / 12 * data.meses_periodo * 4 / 3,
            salary / 12 * data.meses_no_ano,
            data.total_fgts_depositado * Decimal('0.40'),
        ]
    params = [
        ['salario_base', 'dias_no_mes', 'dias_trabalhados'],
        ['salario_base', 'anos_completos'],
        ['salario_base', 'meses_periodo'],
        ['salario_base', 'meses_no_ano'],
        ['total_fgts_depositado'],
    ]
    rows = []
    divergences = []
    for (key, (label, formula, source, url)), value, keys in zip(RULES.items(), values, params):
        rounded = money(value)
        rows.append(dict(verba=key, nome=label, valor=rounded, formula=formula,
            parametros={k: snapshot[k] for k in keys}, fundamento=source, fonte_url=url,
            versao_regra=VERSION, data_calculo=when, snapshot_entrada=snapshot,
            nivel_confianca='possivel_diferenca' if key == 'fgts_multa' else 'calculado'))
        paid = data.pagos_por_verba[key] if data.pagos_por_verba else None
        divergences.append(dict(verba=key, nome=label, valor_devido=rounded,
            valor_pago=money(paid) if paid is not None else None,
            diferenca=money(Decimal(rounded) - paid) if paid is not None else None))
    total = sum((Decimal(r['valor']) for r in rows), Decimal(0))
    return dict(resultados=rows, divergencias=divergences, total_devido=money(total),
        total_pago=money(data.valor_pago), diferenca=money(total-data.valor_pago),
        data_calculo=when, versao_motor=VERSION, aviso=DISCLAIMER,
        escopo='Demissão sem justa causa com aviso indenizado. Valores brutos; sem INSS, IRRF, férias vencidas, reflexos ou normas coletivas. O saldo do FGTS não é somado: somente sua multa de 40%.')


def validate_dates(data: CalculationInput, admission: date, dismissal: date):
    if dismissal < admission:
        raise ValueError('A demissão deve ocorrer na data de admissão ou depois.')
    years = dismissal.year-admission.year-((dismissal.month,dismissal.day)<(admission.month,admission.day))
    if data.anos_completos != years:
        raise ValueError(f'As datas informadas correspondem a {years} anos completos.')
    if data.dias_no_mes != monthrange(dismissal.year, dismissal.month)[1]:
        raise ValueError('Os dias do mês devem corresponder ao mês da demissão.')
    if data.dias_trabalhados > dismissal.day or data.meses_no_ano > dismissal.month:
        raise ValueError('Dias trabalhados ou meses no ano incompatíveis com a demissão.')
