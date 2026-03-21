from __future__ import annotations

from typing import List, Optional

from composicao_painel.models import ConjuntoPainel
from core.choices.paineis import PartesPainelChoices


CONJUNTOS_PADRAO = [
    (PartesPainelChoices.ENTRADA_PRINCIPAL, 10, "Entrada principal do painel"),
    (PartesPainelChoices.POTENCIA, 20, "Circuitos de potência"),
    (PartesPainelChoices.COMANDO, 30, "Circuitos de comando"),
    (PartesPainelChoices.BOTOEIRAS, 40, "Botoeiras e comandos externos"),
    (PartesPainelChoices.AUTOMACAO, 50, "Itens de automação"),
    (PartesPainelChoices.BORNES, 60, "Bornes e distribuição"),
    (PartesPainelChoices.CANALETAS, 70, "Canaletas"),
    (PartesPainelChoices.CLIMATIZACAO, 80, "Climatização e ventilação"),
    (PartesPainelChoices.ILUMINACAO, 90, "Iluminação interna"),
    (PartesPainelChoices.TOMADA_SERVICO, 100, "Tomada de serviço"),
    (PartesPainelChoices.ESTRUTURA, 110, "Estrutura do painel"),
    (PartesPainelChoices.IDENTIFICACAO, 120, "Identificação e sinalização"),
    (PartesPainelChoices.ACESSORIOS, 130, "Acessórios diversos"),
    (PartesPainelChoices.OUTROS, 999, "Outros"),
]


def obter_ou_criar_conjunto(
    projeto,
    nome_conjunto: str,
    ordem: int = 0,
    descricao: str = "",
) -> ConjuntoPainel:
    conjunto, criado = ConjuntoPainel.objects.get_or_create(
        projeto=projeto,
        nome=nome_conjunto,
        defaults={
            "ordem": ordem,
            "descricao": descricao,
        },
    )

    alterado = False

    if not criado:
        if ordem and conjunto.ordem != ordem:
            conjunto.ordem = ordem
            alterado = True

        if descricao and conjunto.descricao != descricao:
            conjunto.descricao = descricao
            alterado = True

        if alterado:
            conjunto.save(update_fields=["ordem", "descricao"])

    return conjunto


def garantir_conjuntos_padrao(projeto) -> List[ConjuntoPainel]:
    conjuntos = []

    for nome, ordem, descricao in CONJUNTOS_PADRAO:
        conjunto = obter_ou_criar_conjunto(
            projeto=projeto,
            nome_conjunto=nome,
            ordem=ordem,
            descricao=descricao,
        )
        conjuntos.append(conjunto)

    return conjuntos


def obter_conjunto_por_nome(
    projeto,
    nome_conjunto: str,
) -> Optional[ConjuntoPainel]:
    return (
        ConjuntoPainel.objects.filter(
            projeto=projeto,
            nome=nome_conjunto,
        )
        .order_by("ordem", "id")
        .first()
    )


def obter_ou_criar_conjunto_por_nome(
    projeto,
    nome_conjunto: str,
) -> ConjuntoPainel:
    mapa = {nome: (ordem, descricao) for nome, ordem, descricao in CONJUNTOS_PADRAO}
    ordem, descricao = mapa.get(nome_conjunto, (999, ""))

    return obter_ou_criar_conjunto(
        projeto=projeto,
        nome_conjunto=nome_conjunto,
        ordem=ordem,
        descricao=descricao,
    )


def listar_conjuntos_projeto(projeto) -> List[ConjuntoPainel]:
    return list(
        ConjuntoPainel.objects.filter(projeto=projeto)
        .order_by("ordem", "id")
    )


def normalizar_ordem_conjuntos(projeto) -> None:
    mapa_ordem = {nome: ordem for nome, ordem, _ in CONJUNTOS_PADRAO}

    conjuntos = ConjuntoPainel.objects.filter(projeto=projeto)

    for conjunto in conjuntos:
        ordem_correta = mapa_ordem.get(conjunto.nome)

        if ordem_correta is not None and conjunto.ordem != ordem_correta:
            conjunto.ordem = ordem_correta
            conjunto.save(update_fields=["ordem"])


def remover_conjuntos_vazios(projeto) -> int:
    removidos = 0

    conjuntos = ConjuntoPainel.objects.filter(projeto=projeto)

    for conjunto in conjuntos:
        possui_itens = conjunto.itens.exists()
        possui_sugestoes = conjunto.sugestoes.exists()

        if not possui_itens and not possui_sugestoes:
            conjunto.delete()
            removidos += 1

    return removidos