from io import BytesIO
from decimal import Decimal
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from .engine import DISCLAIMER

INK = colors.HexColor('#101525')
GOLD = colors.HexColor('#a77c2a')
GRAY = colors.HexColor('#596170')


def brl(value):
    amount = f'{Decimal(value):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'R$ {amount}'


def build_pdf(case: dict) -> bytes:
    output = BytesIO()
    styles = {
        'title': ParagraphStyle('title', fontName='Helvetica', fontSize=34, leading=39, textColor=INK, spaceAfter=18),
        'h': ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=17, leading=22, textColor=INK, spaceBefore=14, spaceAfter=12),
        'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=15, textColor=INK, spaceAfter=9),
        'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8, leading=12, textColor=GRAY, spaceAfter=6),
        'label': ParagraphStyle('label', fontName='Helvetica-Bold', fontSize=9, leading=14, textColor=GOLD, spaceAfter=12),
    }
    def p(text, style='body'):
        return Paragraph(escape(str(text)).replace('\n', '<br/>'), styles[style])
    def table(rows, widths):
        result = Table([[p(cell, 'small') for cell in row] for row in rows], colWidths=widths, repeatRows=1, hAlign='LEFT')
        result.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f0ede5')),
            ('LINEBELOW',(0,0),(-1,0),1,GOLD),
            ('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#e2e5e8')),
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
            ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ]))
        return result
    calc = case['calculo']
    data = case['dados']
    items = [Spacer(1,38), p('VERBA.X  /  AUDITORIA TRABALHISTA','label'), Spacer(1,54),
        p('Sua rescisão,\ncom cada valor explicado.','title'),
        p('Relatório de cálculo e comparação','h'),
        p(case['nome']), p(f"CPF: {case['cpf_mascarado']}"),
        p(f"Empregador: {data.get('empregador') or 'Não informado'}"),
        p(f"Cargo: {data['cargo']}"),
        p(f"Período: {data['admissao']} a {data['demissao']}"),
        Spacer(1,24), p(f"Calculado em {calc['data_calculo'][:19]} UTC",'small'),
        p(f"Caso {case['id']} | Motor {calc['versao_motor']}",'small'),
        Spacer(1,32), p('REGRAS ILUSTRATIVAS - FUNDAMENTAÇÃO A CONFIRMAR','label'),
        p(DISCLAIMER), PageBreak(),
        p('01 / Resultado executivo','h'),
        table([['Valor devido pelas regras','Valor pago informado','Diferença apurada'],
            [brl(calc['total_devido']),brl(calc['total_pago']),brl(calc['diferenca'])]], [166,166,167]),
        Spacer(1,16), p('Diferença positiva indica possível valor a receber; negativa indica pagamento superior ao total calculado. Não representa, por si só, dívida reconhecida.'),
        p(calc['escopo']), p('02 / Comparação por verba','h'),
        table([['Verba','Devido','Pago','Diferença']] + [
            [r['nome'],brl(r['valor_devido']),brl(r['valor_pago']) if r['valor_pago'] is not None else 'Não informado',
            brl(r['diferenca']) if r['diferenca'] is not None else 'Pendente'] for r in calc['divergencias']], [190,103,103,103]),
        Spacer(1,14),p('Valores pagos por verba não informados permanecem pendentes. O total pago não é distribuído artificialmente entre as verbas.','small'),
        PageBreak(), p('03 / Memória de cálculo','h')]
    labels = {'salario_base':'Salário base','dias_no_mes':'Dias no mês','dias_trabalhados':'Dias trabalhados',
        'anos_completos':'Anos completos','meses_periodo':'Meses do período de férias','meses_no_ano':'Meses para o 13º',
        'total_fgts_depositado':'FGTS depositado'}
    for index, row in enumerate(calc['resultados']):
        block = [p(f"{index+1:02}  {row['nome']}",'h'), p(brl(row['valor']),'h'),
            p(f"Fórmula: {row['formula']}"),
            p('Parâmetros: ' + '; '.join(f'{labels.get(k,k)} = {v}' for k,v in row['parametros'].items())),
            p(f"Fundamento: {row['fundamento']}"), p(row['fonte_url'],'small'),
            p(f"Confiança: {row['nivel_confianca'].replace('_',' ')} | Regra {row['versao_regra']} | {row['data_calculo'][:19]} UTC",'small')]
        items.append(KeepTogether(block))
        items.append(Spacer(1,12))
    items += [PageBreak(), p('04 / Dados, hipóteses e limites','h'),
        p('FATO: os dados são declarados pelo usuário. Documentos e extratos ainda não foram verificados.'),
        p('CÁLCULO: cinco fórmulas executadas por código determinístico, com números decimais. Arredondamento comercial (ROUND_HALF_UP) para centavos uma vez por verba; o total soma as verbas arredondadas.'),
        p('INTERPRETAÇÃO: análise jurídica por IA, OCR e consulta a convenções coletivas estão em breve. Nenhum modelo de IA calculou os valores deste relatório.'),
        p('Férias: somente os meses proporcionais declarados, acrescidos de 1/3. Férias vencidas e períodos especiais não foram avaliados.'),
        p('13º: somente os meses declarados. A contagem de avos e a projeção do aviso precisam de revisão.'),
        p('FGTS: aplica-se 40% ao saldo informado. Não há auditoria dos depósitos mensais; por isso, a classificação é possível diferença. Confirme os depósitos no extrato do vínculo.'),
        p('INSS, IRRF, descontos, jornada, adicionais e normas coletivas não foram calculados. Compare o total pago bruto das mesmas cinco verbas para evitar diferenças artificiais.'),
        p('Snapshot das entradas usadas','h'),
        table([['Campo','Valor']] + [[labels.get(k,k.replace('_',' ')), str(v)] for k,v in calc['resultados'][0]['snapshot_entrada'].items() if k != 'pagos_por_verba'], [230,269]),
        Spacer(1,20), p(DISCLAIMER)]
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(GOLD)
        canvas.line(48,43,547,43)
        canvas.setFont('Helvetica',8)
        canvas.setFillColor(GRAY)
        canvas.drawString(48,29,'VERBA.X | Análise baseada em dados fornecidos | Fundamentos a confirmar')
        canvas.drawRightString(547,29,str(doc.page))
        canvas.restoreState()
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=48,leftMargin=48,topMargin=46,bottomMargin=62,
        title='VERBA.X - Relatório de auditoria trabalhista', author='VERBA.X')
    doc.build(items,onFirstPage=footer,onLaterPages=footer)
    return output.getvalue()
