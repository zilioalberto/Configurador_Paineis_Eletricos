"""Geração dos textos comerciais padrão para a oferta ao cliente."""
from __future__ import annotations

from django.db import transaction

from apps.orcamentos.models import (
    Orcamento,
    OrcamentoOfertaBloco,
    OrigemItemOrcamentoChoices,
    PerfilOfertaChoices,
    TipoBlocoOfertaChoices,
    TipoItemOrcamentoChoices,
)


def _bullet_lines(valores: list[str], fallback: str) -> str:
    from apps.orcamentos.services.formatacao_oferta import formatar_descricao_item_oferta

    linhas = [formatar_descricao_item_oferta(valor) for valor in valores if valor.strip()]
    if not linhas:
        return fallback
    return "\n".join(f"- {linha};" for linha in linhas)


def _nome_proprio_empresa(valor: str | None) -> str:
    from apps.orcamentos.services.formatacao_oferta import nome_proprio_empresa

    texto = nome_proprio_empresa(valor)
    return texto if texto else "cliente"


def _cliente_nome(orcamento: Orcamento) -> str:
    if orcamento.cliente_id:
        return _nome_proprio_empresa(orcamento.cliente.razao_social)
    return _nome_proprio_empresa(orcamento.cliente_referencia)


def _itens_descricao(orcamento: Orcamento, tipo: str) -> list[str]:
    return list(
        orcamento.itens.filter(tipo=tipo).order_by("ordem", "id").values_list("descricao", flat=True)
    )


def _valor_decimal_curto(valor) -> str:
    if valor is None:
        return ""
    normalized = valor.normalize()
    if normalized == normalized.to_integral():
        return str(normalized.quantize(type(valor)("1")))
    return format(normalized, "f")


def _texto_fases(numero_fases: int | None) -> str:
    if numero_fases == 1:
        return "monofásico"
    if numero_fases == 2:
        return "bifásico"
    if numero_fases == 3:
        return "trifásico"
    return "conforme especificação"


def _texto_potencia(valor, unidade: str) -> str:
    valor_fmt = _valor_decimal_curto(valor)
    if not valor_fmt:
        return ""
    return f" com potência de {valor_fmt} {unidade}"


def _label_choice(obj, field_name: str) -> str:
    getter = getattr(obj, f"get_{field_name}_display", None)
    if callable(getter):
        return str(getter()).strip().lower()
    return str(getattr(obj, field_name, "") or "").replace("_", " ").lower()


def _label_sinal_analogico(obj, field_name: str = "tipo_sinal_analogico") -> str:
    label = _label_choice(obj, field_name)
    return (
        label.replace(" ma", " mA")
        .replace("ma", "mA")
        .replace(" vcc", " VCC")
        .replace("vcc", "VCC")
    )


def _texto_acionamento_motor(tipo_partida: str) -> str:
    mapa = {
        "DIRETA": "contatora",
        "ESTRELA_TRIANGULO": "partida estrela-triângulo",
        "SOFT_STARTER": "soft starter",
        "INVERSOR": "inversor de frequência",
        "SERVO_DRIVE": "servo drive",
    }
    return mapa.get(tipo_partida, tipo_partida.replace("_", " ").lower())


def _texto_protecao(label: str) -> str:
    protecao = label.strip().lower()
    if protecao == "fusível ultrarrápido":
        return "fusíveis ultrarrápidos"
    if protecao == "fusível":
        return "fusíveis"
    return protecao


def _texto_tensao(tensao: int | None, tipo_corrente: str = "") -> str:
    if not tensao:
        return ""
    corrente = tipo_corrente.strip().upper()
    sufixo = f" {corrente}" if corrente else ""
    return f"{tensao} V{sufixo}"


def _texto_io_carga(carga) -> str:
    partes = []
    if carga.quantidade_entradas_digitais:
        partes.append(f"{carga.quantidade_entradas_digitais} entrada(s) digital(is)")
    if carga.quantidade_entradas_analogicas:
        partes.append(f"{carga.quantidade_entradas_analogicas} entrada(s) analógica(s)")
    if carga.quantidade_saidas_digitais:
        partes.append(f"{carga.quantidade_saidas_digitais} saída(s) digital(is)")
    if carga.quantidade_saidas_analogicas:
        partes.append(f"{carga.quantidade_saidas_analogicas} saída(s) analógica(s)")
    if carga.quantidade_entradas_rapidas:
        partes.append(f"{carga.quantidade_entradas_rapidas} entrada(s) rápida(s)")
    if not partes:
        return ""
    return ", contemplando " + ", ".join(partes)


def _texto_escopo_motor(carga) -> str | None:
    motor = getattr(carga, "motor", None)
    if not motor:
        return None

    fases = _texto_fases(motor.numero_fases)
    potencia = _texto_potencia(
        motor.potencia_corrente_valor,
        motor.potencia_corrente_unidade,
    )
    acionamento = _texto_acionamento_motor(motor.tipo_partida)
    protecao = _texto_protecao(_label_choice(motor, "tipo_protecao"))
    return (
        f"Acionamento de motor elétrico {fases}{potencia} via {acionamento} "
        f"e proteção via {protecao}."
    )


def _texto_escopo_resistencia(carga) -> str | None:
    resistencia = getattr(carga, "resistencia", None)
    if not resistencia:
        return None

    fases = _texto_fases(resistencia.numero_fases)
    potencia = _texto_potencia(resistencia.potencia_kw, "kW")
    acionamento = _label_choice(resistencia, "tipo_acionamento")
    protecao = _texto_protecao(_label_choice(resistencia, "tipo_protecao"))
    return (
        f"Acionamento de banco de resistência {fases}{potencia} via {acionamento} "
        f"e proteção via {protecao}."
    )


def _texto_escopo_valvula(carga) -> str | None:
    valvula = getattr(carga, "valvula", None)
    if not valvula:
        return None

    tipo = _label_choice(valvula, "tipo_valvula")
    tensao = _texto_tensao(valvula.tensao_alimentacao, valvula.tipo_corrente)
    vias_posicoes = ""
    if valvula.quantidade_vias and valvula.quantidade_posicoes:
        vias_posicoes = f" {valvula.quantidade_vias}/{valvula.quantidade_posicoes} vias/posições"
    solenoides = f" com {valvula.quantidade_solenoides} solenoide(s)"
    retorno = " e retorno por mola" if valvula.retorno_mola else ""
    feedback = " com feedback de posição" if valvula.possui_feedback else ""
    acionamento = _label_choice(valvula, "tipo_acionamento")
    protecao = _texto_protecao(_label_choice(valvula, "tipo_protecao"))
    alimentacao = f" em {tensao}" if tensao else ""
    return (
        f"Acionamento de válvula {tipo}{vias_posicoes}{solenoides}{retorno}{feedback}"
        f"{alimentacao} via {acionamento} e proteção via {protecao}."
    )


def _texto_sensor_digital(sensor) -> str:
    detalhes = []
    if sensor.pnp:
        detalhes.append("PNP")
    if sensor.npn:
        detalhes.append("NPN")
    if sensor.normalmente_aberto:
        detalhes.append("NA")
    if sensor.normalmente_fechado:
        detalhes.append("NF")
    return f" ({', '.join(detalhes)})" if detalhes else ""


def _texto_escopo_sensor(carga) -> str | None:
    sensor = getattr(carga, "sensor", None)
    if not sensor:
        return None

    tipo = _label_choice(sensor, "tipo_sensor")
    sinal = _label_choice(sensor, "tipo_sinal")
    sinal_analogico = _label_sinal_analogico(sensor)
    tensao = _texto_tensao(sensor.tensao_alimentacao, sensor.tipo_corrente)
    fios = f", {sensor.quantidade_fios} fios" if sensor.quantidade_fios else ""
    faixa = f", faixa {sensor.range_medicao}" if sensor.range_medicao else ""
    analogico = f" {sinal_analogico}" if sinal_analogico else ""
    alimentacao = f", alimentação {tensao}" if tensao else ""
    return (
        f"Monitoramento por sensor {tipo} com sinal {sinal}{analogico}"
        f"{_texto_sensor_digital(sensor)}{alimentacao}{fios}{faixa}{_texto_io_carga(carga)}."
    )


def _texto_escopo_transdutor(carga) -> str | None:
    transdutor = getattr(carga, "transdutor", None)
    if not transdutor:
        return None

    tipo = _label_choice(transdutor, "tipo_transdutor")
    sinal = _label_sinal_analogico(transdutor)
    tensao = _texto_tensao(transdutor.tensao_alimentacao, transdutor.tipo_corrente)
    faixa = f", faixa {transdutor.faixa_medicao}" if transdutor.faixa_medicao else ""
    precisao = f", precisão {transdutor.precisao}" if transdutor.precisao else ""
    fios = f", {transdutor.quantidade_fios} fios" if transdutor.quantidade_fios else ""
    alimentacao = f", alimentação {tensao}" if tensao else ""
    return (
        f"Medição por transdutor de {tipo} com sinal {sinal}{faixa}{precisao}"
        f"{alimentacao}{fios}{_texto_io_carga(carga)}."
    )


def _texto_escopo_generico(carga) -> str:
    tipo = str(carga.get_tipo_display()).lower() if hasattr(carga, "get_tipo_display") else carga.tipo.lower()
    descricao = (carga.descricao or tipo).lower()
    return f"Fornecimento e integração de {tipo} para {descricao}{_texto_io_carga(carga)}."


def _escopo_cargas_configurador(orcamento: Orcamento) -> list[str]:
    textos: list[str] = []
    paineis = (
        orcamento.configuradores_painel.select_related("projeto_configurador")
        .filter(projeto_configurador__isnull=False)
        .order_by("ordem", "id")
    )
    for painel in paineis:
        cargas = (
            painel.projeto_configurador.cargas.filter(ativo=True)
            .select_related("motor", "resistencia", "valvula", "sensor", "transdutor")
            .order_by("tag", "id")
        )
        for carga in cargas:
            texto = None
            if carga.tipo == "MOTOR":
                texto = _texto_escopo_motor(carga)
            elif carga.tipo == "RESISTENCIA":
                texto = _texto_escopo_resistencia(carga)
            elif carga.tipo == "VALVULA":
                texto = _texto_escopo_valvula(carga)
            elif carga.tipo == "SENSOR":
                texto = _texto_escopo_sensor(carga)
            elif carga.tipo == "TRANSDUTOR":
                texto = _texto_escopo_transdutor(carga)
            elif carga.tipo == "TRANSMISSOR":
                texto = _texto_escopo_generico(carga)
            if texto:
                textos.append(f"{carga.tag} - {texto}")
    return textos


def _escopo_fornecimento_solucao(orcamento: Orcamento, cliente: str, escopo: str) -> str:
    cargas = _escopo_cargas_configurador(orcamento)
    if not cargas:
        return f"Nesta oferta estamos considerando o fornecimento de {escopo} para {cliente}."

    resumo = f"Nesta oferta estamos considerando o fornecimento de {escopo} para {cliente}, contemplando:"
    return f"{resumo}\n{_bullet_lines(cargas, '')}"


def _itens_configurador_por_painel(orcamento: Orcamento) -> list[str]:
    linhas = []
    paineis = orcamento.configuradores_painel.order_by("ordem", "id")
    for painel in paineis:
        itens = list(
            painel.itens.filter(
                origem=OrigemItemOrcamentoChoices.CONFIGURADOR,
                tipo=TipoItemOrcamentoChoices.PRODUTO,
            )
            .order_by("ordem", "id")
            .values_list("descricao", flat=True)
        )
        if itens:
            linhas.append(f"{painel.descricao_painel}: " + "; ".join(itens))
    return linhas


def _blocos_solucao_completa(orcamento: Orcamento) -> list[dict]:
    produtos = _itens_descricao(orcamento, TipoItemOrcamentoChoices.PRODUTO)
    servicos = _itens_descricao(orcamento, TipoItemOrcamentoChoices.SERVICO)
    cliente = _cliente_nome(orcamento)
    escopo = (orcamento.descricao or "").strip() or orcamento.titulo
    itens_fornecimento = _itens_configurador_por_painel(orcamento) or produtos

    return [
        {
            "tipo": TipoBlocoOfertaChoices.INTRODUCAO,
            "titulo": "Apresentação",
            "conteudo": (
                "Em resposta ao seu pedido de cotação, temos o prazer de enviar nossa "
                "oferta técnica e comercial correspondente."
            ),
        },
        {
            "tipo": TipoBlocoOfertaChoices.ESCOPO,
            "titulo": "Escopo de fornecimento",
            "conteudo": _escopo_fornecimento_solucao(orcamento, cliente, escopo),
        },
        {
            "tipo": TipoBlocoOfertaChoices.ITENS_FORNECIMENTO,
            "titulo": "Itens considerados",
            "conteudo": _bullet_lines(
                itens_fornecimento,
                "Estamos considerando o fornecimento dos materiais descritos na composição da proposta.",
            ),
        },
        {
            "tipo": TipoBlocoOfertaChoices.SERVICOS,
            "titulo": "Serviços considerados",
            "conteudo": _bullet_lines(
                servicos,
                "Além dos materiais, quando aplicável, estão considerados serviços de engenharia, programação e apoio técnico.",
            ),
        },
        {
            "tipo": TipoBlocoOfertaChoices.EXCLUSOES,
            "titulo": "Exclusões",
            "conteudo": (
                "Não estamos considerando instalações em campo, materiais de infraestrutura, "
                "adequações civis, fretes especiais ou itens não descritos expressamente nesta oferta."
            ),
        },
        {
            "tipo": TipoBlocoOfertaChoices.PRAZO_ENTREGA,
            "titulo": "Prazo de entrega",
            "conteudo": "A combinar, conforme disponibilidade de materiais e aprovação comercial.",
        },
        {
            "tipo": TipoBlocoOfertaChoices.CONDICOES_PAGAMENTO,
            "titulo": "Condições de pagamento",
            "conteudo": "Condições de pagamento a combinar na confirmação do pedido de compra.",
        },
        {
            "tipo": TipoBlocoOfertaChoices.CONDICOES_GERAIS,
            "titulo": "Condições gerais",
            "conteudo": (
                "Faturamento condicionado à análise de crédito. Impostos inclusos no orçamento. "
                "A validade desta proposta segue a data indicada no cabeçalho da oferta."
            ),
        },
        {
            "tipo": TipoBlocoOfertaChoices.GARANTIA,
            "titulo": "Garantia",
            "conteudo": (
                "Para mão de obra, garantia de 90 dias. Para equipamentos fornecidos, garantia "
                "contra defeitos conforme condições do fabricante e termos gerais da ZFW Engenharia."
            ),
        },
    ]


def _blocos_materiais(orcamento: Orcamento) -> list[dict]:
    return [
        {
            "tipo": TipoBlocoOfertaChoices.INTRODUCAO,
            "titulo": "Apresentação",
            "conteudo": (
                "Em atenção à sua consulta, temos o prazer de apresentar nossa oferta "
                "técnica e comercial para o fornecimento dos materiais listados no investimento."
            ),
        },
        {
            "tipo": TipoBlocoOfertaChoices.PRAZO_ENTREGA,
            "titulo": "Prazo de entrega",
            "conteudo": "Conforme disponibilidade dos itens indicados no investimento.",
        },
        {
            "tipo": TipoBlocoOfertaChoices.CONDICOES_PAGAMENTO,
            "titulo": "Condições de pagamento",
            "conteudo": "Condições de pagamento a combinar. Pedido mínimo de R$ 500,00.",
        },
        {
            "tipo": TipoBlocoOfertaChoices.CONDICOES_GERAIS,
            "titulo": "Condições gerais",
            "conteudo": (
                "Os preços mencionados na proposta são para entrega por conta do destinatário. "
                "Impostos inclusos no orçamento. Faturamento condicionado à análise de crédito."
            ),
        },
        {
            "tipo": TipoBlocoOfertaChoices.GARANTIA,
            "titulo": "Garantia",
            "conteudo": (
                "Para que a garantia seja aplicada será realizada uma análise técnica do produto. "
                "A garantia limita-se a reparar ou substituir os itens defeituosos de fornecimento."
            ),
        },
    ]


def blocos_padrao_para_perfil(orcamento: Orcamento, perfil: str | None = None) -> list[dict]:
    perfil = perfil or orcamento.perfil_oferta or PerfilOfertaChoices.MATERIAIS
    if perfil == PerfilOfertaChoices.SOLUCAO_COMPLETA:
        return _blocos_solucao_completa(orcamento)
    return _blocos_materiais(orcamento)


@transaction.atomic
def gerar_blocos_padrao_oferta(orcamento: Orcamento, *, perfil: str | None = None) -> list[OrcamentoOfertaBloco]:
    if not orcamento.editavel:
        raise ValueError("Apenas propostas em rascunho podem receber blocos padrão.")

    perfil = perfil or orcamento.perfil_oferta
    if perfil and perfil != orcamento.perfil_oferta:
        orcamento.perfil_oferta = perfil
        orcamento.save(update_fields=("perfil_oferta", "atualizado_em"))

    OrcamentoOfertaBloco.objects.filter(orcamento=orcamento, editavel=True).delete()
    criados = []
    for ordem, bloco in enumerate(blocos_padrao_para_perfil(orcamento, perfil)):
        criados.append(
            OrcamentoOfertaBloco.objects.create(
                orcamento=orcamento,
                ordem=ordem,
                tipo=bloco["tipo"],
                titulo=bloco["titulo"],
                conteudo=bloco["conteudo"],
            )
        )
    return criados
