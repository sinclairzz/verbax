from decimal import Decimal
import pytest
from pydantic import ValidationError
from app.engine import CalculationInput, calculate, VERSION


@pytest.mark.parametrize('rule,patch,expected',[
    ('saldo_salario',{'salario_base':'3000','dias_trabalhados':30},'3000.00'),
    ('saldo_salario',{'salario_base':'3000','dias_trabalhados':12},'1200.00'),
    ('aviso_previo',{'salario_base':'3000','anos_completos':0},'3000.00'),
    ('aviso_previo',{'salario_base':'3000','anos_completos':1},'3000.00'),
    ('aviso_previo',{'salario_base':'3000','anos_completos':5},'4200.00'),
    ('aviso_previo',{'salario_base':'3000','anos_completos':20},'8700.00'),
    ('aviso_previo',{'salario_base':'3000','anos_completos':21},'9000.00'),
    ('aviso_previo',{'salario_base':'3000','anos_completos':30},'9000.00'),
    ('ferias',{'salario_base':'3000','meses_periodo':12},'4000.00'),
    ('ferias',{'salario_base':'3000','meses_periodo':6},'2000.00'),
    ('decimo_terceiro',{'salario_base':'2400','meses_no_ano':12},'2400.00'),
    ('decimo_terceiro',{'salario_base':'2400','meses_no_ano':4},'800.00'),
    ('fgts_multa',{'total_fgts_depositado':'10000'},'4000.00'),
],ids=['saldo_mes_inteiro','saldo_12_dias','aviso_0_anos','aviso_1_ano','aviso_5_anos','aviso_20_anos','aviso_21_anos','aviso_teto_30_anos','ferias_12_meses','ferias_6_meses','decimo_12_meses','decimo_4_meses','multa_10000'])
def test_known_vectors(input_data,rule,patch,expected):
    result = calculate(CalculationInput(**(input_data|patch)))
    row = next(r for r in result['resultados'] if r['verba']==rule)
    assert row['valor']==expected
    assert row['versao_regra']==VERSION
    assert 'confirmar' in row['fundamento']
    assert all(key in row for key in ('formula','parametros','snapshot_entrada','data_calculo'))


def test_vector_11_fgts_5000_is_possible_difference(input_data):
    result=calculate(CalculationInput(**(input_data|{'total_fgts_depositado':'5000'})))
    row=next(r for r in result['resultados'] if r['verba']=='fgts_multa')
    assert row['nivel_confianca']=='possivel_diferenca'
    assert row['valor']=='2000.00'


def test_salary_uses_thirty_day_divisor_for_long_month(input_data):
    result = calculate(CalculationInput(**(input_data|{
        'salario_base':'3000', 'dias_no_mes':31, 'dias_trabalhados':10,
    })))
    row = next(r for r in result['resultados'] if r['verba']=='saldo_salario')
    assert row['valor']=='1000.00'


def test_decimal_rounding_once_per_line(input_data):
    result=calculate(CalculationInput(**(input_data|{'salario_base':'1234.57','dias_no_mes':31,'dias_trabalhados':11})))
    assert result['resultados'][0]['valor']=='452.68'
    assert Decimal(result['total_devido'])==sum(Decimal(row['valor']) for row in result['resultados'])


def test_absent_paid_breakdown_is_pending_not_zero(input_data):
    result=calculate(CalculationInput(**input_data))
    assert all(row['valor_pago'] is None and row['diferenca'] is None for row in result['divergencias'])


def test_overpayment_keeps_negative_difference(input_data):
    result=calculate(CalculationInput(**(input_data|{'valor_pago':'999999.99'})))
    assert Decimal(result['diferenca'])<0


@pytest.mark.parametrize('patch',[{'salario_base':'-1'},{'salario_base':'NaN'},{'salario_base':'0'},{'salario_base':'1.001'},{'dias_no_mes':0},{'dias_trabalhados':31},{'meses_periodo':13},{'meses_no_ano':-1},{'anos_completos':-1}])
def test_rejects_invalid_inputs(input_data,patch):
    with pytest.raises(ValidationError):CalculationInput(**(input_data|patch))


def test_paid_breakdown_must_reconcile(input_data):
    with pytest.raises(ValidationError):CalculationInput(**(input_data|{'pagos_por_verba':{'saldo_salario':'2'}}))
