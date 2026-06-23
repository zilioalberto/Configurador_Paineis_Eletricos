"""Conciliação de holerites importados com colaboradores do módulo RH."""
from __future__ import annotations

import re
import unicodedata
from decimal import Decimal
from difflib import SequenceMatcher

from apps.fiscal.models_obrigacoes import HoleriteCompetencia, PacoteObrigacaoFiscal
from apps.rh.models import Colaborador

LIMIAR_VINCULO_AUTOMATICO = Decimal("0.95")
LIMIAR_SUGESTAO = Decimal("0.88")


def limpar_nome_holerite(nome: str) -> str:
    return re.sub(r"\s+", " ", (nome or "").strip())


def normalizar_nome_comparacao(nome: str) -> str:
    s = unicodedata.normalize("NFKD", limpar_nome_holerite(nome).upper())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^A-Z]", "", s)


def _normalizar_cpf(cpf: str) -> str:
    return re.sub(r"\D", "", cpf or "")


def _score_nome(nome_holerite: str, nome_colaborador: str) -> float:
    a = normalizar_nome_comparacao(nome_holerite)
    b = normalizar_nome_comparacao(nome_colaborador)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    a_ns = limpar_nome_holerite(nome_holerite).upper().replace(" ", "")
    b_ns = limpar_nome_holerite(nome_colaborador).upper().replace(" ", "")
    if a_ns == b_ns:
        return 0.98
    shorter, longer = (a, b) if len(a) < len(b) else (b, a)
    if shorter in longer and len(shorter) >= max(8, int(len(longer) * 0.65)):
        return 0.92
    return float(SequenceMatcher(None, a, b).ratio())


def buscar_colaborador_por_cpf(cpf: str) -> Colaborador | None:
    cpf_norm = _normalizar_cpf(cpf)
    if len(cpf_norm) != 11:
        return None
    colaborador = (
        Colaborador.objects.filter(documento=cpf_norm)
        .order_by("-ativo", "nome")
        .first()
    )
    if colaborador:
        return colaborador
    return (
        Colaborador.objects.filter(documento__icontains=cpf_norm)
        .order_by("-ativo", "nome")
        .first()
    )


def melhor_colaborador_por_nome(
    nome: str,
    *,
    cpf: str = "",
) -> tuple[Colaborador | None, float, str]:
    por_cpf = buscar_colaborador_por_cpf(cpf)
    if por_cpf:
        return por_cpf, 1.0, "cpf"

    candidatos = list(Colaborador.objects.filter(ativo=True).order_by("nome"))
    melhor: Colaborador | None = None
    melhor_score = 0.0
    for colab in candidatos:
        score = _score_nome(nome, colab.nome)
        if score > melhor_score:
            melhor_score = score
            melhor = colab
    return melhor, melhor_score, "nome"


def sugerir_colaborador(holerite: HoleriteCompetencia) -> Colaborador | None:
    if holerite.colaborador_id:
        return holerite.colaborador

    colaborador, score, via = melhor_colaborador_por_nome(holerite.nome, cpf=holerite.cpf)
    if via == "cpf":
        return colaborador
    if colaborador and score >= float(LIMIAR_VINCULO_AUTOMATICO):
        return colaborador
    if colaborador and score >= float(LIMIAR_SUGESTAO):
        return colaborador
    return None


def valores_from_parsed(item: dict) -> dict[str, Decimal]:
    return {
        "proventos": Decimal(str(item.get("proventos") or "0")),
        "desconto_inss": Decimal(str(item.get("desconto_inss") or "0")),
        "base_fgts": Decimal(str(item.get("base_fgts") or "0")),
        "fgts_mes": Decimal(str(item.get("fgts_mes") or "0")),
        "total_liquido": (
            Decimal(str(item["total_liquido"]))
            if item.get("total_liquido") not in (None, "")
            else None
        ),
    }


def _serializar_valores(valores: dict[str, Decimal | None]) -> dict[str, str | None]:
    return {
        chave: (str(valor) if valor is not None else None)
        for chave, valor in valores.items()
    }


def aplicar_valores_ao_holerite(holerite: HoleriteCompetencia, valores: dict[str, Decimal | None]) -> None:
    holerite.proventos = valores.get("proventos") or Decimal("0")
    holerite.desconto_inss = valores.get("desconto_inss") or Decimal("0")
    holerite.base_fgts = valores.get("base_fgts") or Decimal("0")
    holerite.fgts_mes = valores.get("fgts_mes") or Decimal("0")
    holerite.total_liquido = valores.get("total_liquido")


def aplicar_valores_pendentes(holerite: HoleriteCompetencia) -> bool:
    extra = dict(holerite.dados_extra or {})
    pendentes = extra.get("valores_pendentes")
    if not pendentes or not holerite.colaborador_id:
        return False

    valores = {
        "proventos": Decimal(str(pendentes.get("proventos") or "0")),
        "desconto_inss": Decimal(str(pendentes.get("desconto_inss") or "0")),
        "base_fgts": Decimal(str(pendentes.get("base_fgts") or "0")),
        "fgts_mes": Decimal(str(pendentes.get("fgts_mes") or "0")),
        "total_liquido": (
            Decimal(str(pendentes["total_liquido"]))
            if pendentes.get("total_liquido") not in (None, "")
            else None
        ),
    }
    aplicar_valores_ao_holerite(holerite, valores)
    extra["valores_aplicados"] = True
    extra.pop("aviso_rh", None)
    extra.pop("colaborador_sugerido_id", None)
    extra.pop("colaborador_sugerido_nome", None)
    holerite.dados_extra = extra
    holerite.save(
        update_fields=[
            "proventos",
            "desconto_inss",
            "base_fgts",
            "fgts_mes",
            "total_liquido",
            "dados_extra",
        ]
    )
    return True


def zerar_valores_holerite(holerite: HoleriteCompetencia) -> None:
    aplicar_valores_ao_holerite(
        holerite,
        {
            "proventos": Decimal("0"),
            "desconto_inss": Decimal("0"),
            "base_fgts": Decimal("0"),
            "fgts_mes": Decimal("0"),
            "total_liquido": None,
        },
    )


def importar_holerite_item(
    pacote: PacoteObrigacaoFiscal,
    item: dict,
) -> tuple[HoleriteCompetencia, dict]:
    """Cria holerite importado aplicando valores somente com colaborador cadastrado."""
    cpf = item.get("cpf") or ""
    nome_pdf = limpar_nome_holerite(item.get("nome") or "")
    valores = valores_from_parsed(item)
    colaborador, score, via = melhor_colaborador_por_nome(nome_pdf, cpf=cpf)

    extra = dict(item)
    extra["nome_pdf"] = nome_pdf
    extra["valores_pendentes"] = _serializar_valores(valores)
    aviso = ""
    vinculo_automatico = False

    holerite = HoleriteCompetencia(
        pacote=pacote,
        cpf=cpf,
        nome=nome_pdf,
        tipo=item.get("tipo") or "OUTRO",
        dados_extra=extra,
    )
    zerar_valores_holerite(holerite)

    if via == "cpf" and colaborador:
        holerite.colaborador = colaborador
        holerite.nome = colaborador.nome
        aplicar_valores_ao_holerite(holerite, valores)
        extra["valores_aplicados"] = True
        extra.pop("aviso_rh", None)
        status = "VINCULADO"
        vinculo_automatico = True
    elif colaborador and score >= float(LIMIAR_VINCULO_AUTOMATICO):
        holerite.colaborador = colaborador
        holerite.nome = colaborador.nome
        aplicar_valores_ao_holerite(holerite, valores)
        extra["valores_aplicados"] = True
        status = "VINCULADO"
        vinculo_automatico = True
    elif colaborador and score >= float(LIMIAR_SUGESTAO):
        extra["colaborador_sugerido_id"] = str(colaborador.id)
        extra["colaborador_sugerido_nome"] = colaborador.nome
        extra["valores_aplicados"] = False
        aviso = (
            f"Confirme o colaborador correto: {colaborador.nome}. "
            "Os valores do PDF só entram na conciliação após vincular no RH."
        )
        status = "SUGESTAO"
    else:
        extra["valores_aplicados"] = False
        aviso = (
            f"Colaborador «{nome_pdf}» não cadastrado no RH. "
            "Cadastre em ERP → RH ou vincule manualmente em Editar."
        )
        status = "SEM_CADASTRO"

    if aviso:
        extra["aviso_rh"] = aviso
    holerite.dados_extra = extra
    holerite.save()

    return holerite, {
        "status": status,
        "aviso": aviso,
        "colaborador_id": str(colaborador.id) if colaborador else None,
        "colaborador_nome": colaborador.nome if colaborador else None,
        "score": score,
        "vinculo_automatico": vinculo_automatico,
    }


def holerites_com_valores_aplicados(pacote: PacoteObrigacaoFiscal):
    return pacote.holerites.filter(colaborador__isnull=False, dados_extra__valores_aplicados=True)


def holerites_para_conciliacao(pacote: PacoteObrigacaoFiscal) -> list[HoleriteCompetencia]:
    validos: list[HoleriteCompetencia] = []
    for holerite in pacote.holerites.filter(colaborador__isnull=False):
        extra = holerite.dados_extra or {}
        if extra.get("valores_aplicados") is False:
            continue
        validos.append(holerite)
    return validos


def vincular_holerite(holerite: HoleriteCompetencia, colaborador: Colaborador | None) -> None:
    holerite.colaborador = colaborador
    if colaborador:
        holerite.nome = colaborador.nome
        if not aplicar_valores_pendentes(holerite):
            extra = dict(holerite.dados_extra or {})
            extra["valores_aplicados"] = True
            extra.pop("aviso_rh", None)
            holerite.dados_extra = extra
            holerite.save(update_fields=["colaborador", "nome", "dados_extra"])
            return
    holerite.save(update_fields=["colaborador", "nome"])


def _gerar_matricula(pacote: PacoteObrigacaoFiscal, holerite: HoleriteCompetencia, indice: int) -> str:
    cpf_norm = _normalizar_cpf(holerite.cpf)
    if len(cpf_norm) >= 6:
        base = f"HOL{cpf_norm[-6:]}"
    else:
        comp = pacote.competencia.replace("-", "")
        base = f"HOL{comp}{indice:02d}"

    matricula = base
    seq = 1
    while Colaborador.objects.filter(matricula=matricula).exists():
        matricula = f"{base}-{seq}"
        seq += 1
    return matricula


def criar_colaborador_de_holerite(
    pacote: PacoteObrigacaoFiscal,
    holerite: HoleriteCompetencia,
    *,
    indice: int = 1,
) -> Colaborador:
    nome = limpar_nome_holerite(holerite.nome) or "Colaborador"
    colaborador = Colaborador.objects.create(
        matricula=_gerar_matricula(pacote, holerite, indice),
        nome=nome,
        documento=_normalizar_cpf(holerite.cpf),
        ativo=True,
        observacoes=f"Criado automaticamente a partir do holerite {pacote.competencia}.",
    )
    vincular_holerite(holerite, colaborador)
    return colaborador


def _registrar_sugestao_holerite(holerite, extra: dict, colaborador, score: float) -> str:
    aviso = extra.get("aviso_rh") or ""
    sugerido_nome = extra.get("colaborador_sugerido_nome")
    if colaborador and score >= float(LIMIAR_SUGESTAO) and not sugerido_nome:
        extra["colaborador_sugerido_id"] = str(colaborador.id)
        extra["colaborador_sugerido_nome"] = colaborador.nome
        extra["aviso_rh"] = (
            f"Confirme o colaborador correto: {colaborador.nome}. "
            "Os valores do PDF só entram na conciliação após vincular no RH."
        )
        holerite.dados_extra = extra
        holerite.save(update_fields=["dados_extra"])
        aviso = extra["aviso_rh"]
    return aviso


def _processar_holerite_rh(holerite) -> tuple[bool, bool, dict | None]:
    """Retorna (vinculado, auto_vinculado, pendente)."""
    extra = holerite.dados_extra or {}
    if holerite.colaborador_id and extra.get("valores_aplicados"):
        return True, False, None
    if holerite.colaborador_id and aplicar_valores_pendentes(holerite):
        return True, False, None

    colaborador, score, via = melhor_colaborador_por_nome(holerite.nome, cpf=holerite.cpf)
    if via == "cpf" and colaborador:
        vincular_holerite(holerite, colaborador)
        return True, True, None
    if colaborador and score >= float(LIMIAR_VINCULO_AUTOMATICO):
        vincular_holerite(holerite, colaborador)
        return True, True, None

    aviso = _registrar_sugestao_holerite(holerite, extra, colaborador, score)
    pendente = {
        "id": holerite.id,
        "nome": holerite.nome,
        "cpf": holerite.cpf,
        "aviso": aviso,
        "colaborador_sugerido_nome": extra.get("colaborador_sugerido_nome"),
    }
    return False, False, pendente


def conciliar_holerites_rh_pacote(pacote: PacoteObrigacaoFiscal) -> dict:
    holerites = list(pacote.holerites.select_related("colaborador").order_by("nome"))
    vinculados = 0
    auto_vinculados = 0
    pendentes: list[dict] = []

    for holerite in holerites:
        vinculado, auto, pendente = _processar_holerite_rh(holerite)
        if vinculado:
            vinculados += 1
            if auto:
                auto_vinculados += 1
        elif pendente is not None:
            pendentes.append(pendente)

    return {
        "total": len(holerites),
        "vinculados": vinculados,
        "auto_vinculados": auto_vinculados,
        "pendentes": pendentes,
        "pendentes_count": len(pendentes),
    }


def criar_colaboradores_holerites_faltantes(
    pacote: PacoteObrigacaoFiscal,
    *,
    holerite_id: int | None = None,
) -> dict:
    qs = pacote.holerites.filter(colaborador__isnull=True).order_by("nome")
    if holerite_id is not None:
        qs = qs.filter(id=holerite_id)

    criados: list[dict] = []
    for indice, holerite in enumerate(qs, start=1):
        existente, score, via = melhor_colaborador_por_nome(holerite.nome, cpf=holerite.cpf)
        if existente and (via == "cpf" or score >= float(LIMIAR_VINCULO_AUTOMATICO)):
            vincular_holerite(holerite, existente)
            criados.append(
                {
                    "holerite_id": holerite.id,
                    "colaborador_id": str(existente.id),
                    "colaborador_nome": existente.nome,
                    "criado": False,
                    "vinculado": True,
                }
            )
            continue

        colaborador = criar_colaborador_de_holerite(pacote, holerite, indice=indice)
        criados.append(
            {
                "holerite_id": holerite.id,
                "colaborador_id": str(colaborador.id),
                "colaborador_nome": colaborador.nome,
                "colaborador_matricula": colaborador.matricula,
                "criado": True,
                "vinculado": True,
            }
        )

    return {
        "processados": len(criados),
        "criados": sum(1 for item in criados if item["criado"]),
        "vinculados": sum(1 for item in criados if item["vinculado"]),
        "itens": criados,
    }
