import re
import csv

def limpar_empregador(nome):
    """Limpa e padroniza o nome do empregador"""
    if not nome:
        return ""
    nome = re.sub(r'\s+', ' ', nome)
    nome = re.sub(r'(^|\s)\d{2,4}(\s|$)', ' ', nome)  # remove anos e números isolados
    nome = nome.replace('LIDA', 'LTDA')
    nome = nome.replace('LID A', 'LTDA')
    nome = nome.replace('S A', 'S.A.')
    nome = nome.replace('S/A', 'S.A.')
    nome = nome.replace('SA ', 'S.A. ')
    nome = nome.replace('S A.', 'S.A.')
    nome = re.sub(r'\s{2,}', ' ', nome).strip()

    # Corrige nomes conhecidos
    substituicoes = {
        "ECE BEBIDAS": "ECE BEBIDAS LTDA",
        "PCE BEBIDAS": "PCE BEBIDAS LTDA",
        "AMBEV BRASIL": "AMBEV BRASIL BEBIDAS S.A.",
        "GERACAO RECURSOS HUMANOS": "GERACAO RECURSOS HUMANOS LTDA",
        "SOLAE": "SOLAE DO BRASIL INDUSTRIA E COMERCIO",
        "SANTISTA": "SANTISTA ALIMENTOS S/A",
        "BUNGE": "BUNGE ALIMENTOS S/A",
        "STEMAC": "STEMAC SA GRUPOS GERADORES",
        "AUTOGERADORA": "AUTOGERADORA COMERCIO",
        "INSTALSYSTEM": "INSTALSYSTEM ENGENHARIA",
        "INSTALADORA ELETRICA MERCURIO": "INSTALADORA ELETRICA MERCURIO LTDA",
        "KAISER BRASIL": "CERVEJARIAS KAISER BRASIL LTDA",
    }
    for chave, valor in substituicoes.items():
        if chave in nome:
            nome = valor
            break
    return nome.strip()

def extrair_periodos_inss(texto):
    periodos = []
    linhas = texto.splitlines()
    i = 0
    total = len(linhas)

    while i < total:
        linha = linhas[i].strip()
        m = re.search(r'(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})', linha)
        if m:
            inicio, fim = m.groups()
            empregador, tipo = "", ""

            # Monta bloco de contexto (até 5 linhas seguintes)
            bloco = " ".join(linhas[i:i+6])
            bloco = re.sub(r'\s+', ' ', bloco)

            # Caso especial: TEMPO EM BENEFICIO
            if re.search(r'TEMPO\s+EM\s+BENEFICIO', bloco, re.IGNORECASE):
                empregador = "TEMPO EM BENEFICIO"
            else:
                emp_match = re.search(
                    r'([A-Z0-9\s\.\-&]+?(?:S\.A\.|S/A|LTDA|LIDA|COMERCIO|INDUSTRIA|ENGENHARIA|ALIMENTOS|BEBIDAS|GERADORES|MERCURIO|AUTOGERADORA|SOLAE|SANTISTA|BUNGE|STEMAC|KAISER))',
                    bloco
                )
                if emp_match:
                    empregador = emp_match.group(1)

            # Busca tipo de documento nas linhas próximas
            for j in range(i, min(i+8, total)):
                linha_doc = linhas[j].strip()
                tipo_match = re.search(r'Tipo\s+de\s+documento\s*[:\-]?\s*([A-Z]+)', linha_doc, re.IGNORECASE)
                if tipo_match:
                    tipo = tipo_match.group(1).upper()
                    break
                # Caso "desde" apareça no lugar do tipo (para TEMPO EM BENEFICIO)
                if re.search(r'desde', linha_doc, re.IGNORECASE) and not tipo:
                    tipo = "DESDE"

            if empregador:
                empregador = limpar_empregador(empregador)

            # Só salva se tipo estiver identificado
            if tipo:
                periodos.append({
                    "inicio": inicio,
                    "fim": fim,
                    "empregador": empregador,
                    "tipo_documento": tipo
                })
        i += 1

    return periodos

# --- Execução ---
with open("novo.txt", "r", encoding="utf-8") as f:
    texto = f.read()

periodos = extrair_periodos_inss(texto)

with open("periodos_inss.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=["inicio", "fim", "empregador", "tipo_documento"])
    writer.writeheader()
    writer.writerows(periodos)

print(f"✓ {len(periodos)} períodos gravados em 'periodos_inss.csv'")
