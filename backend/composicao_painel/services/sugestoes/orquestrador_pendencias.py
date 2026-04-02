from composicao_painel.models import PendenciaItem
from composicao_painel.services.sugestoes.contatoras import reprocessar_contatora_para_carga
from composicao_painel.services.sugestoes.disjuntores_motor import (
    reprocessar_disjuntor_motor_para_carga,
)
from composicao_painel.services.sugestoes.seccionadoras import (
    reprocessar_seccionamento_para_pendencia,
)

from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
)


def reavaliar_pendencias_projeto(projeto):
    if projeto is None:
        raise ValueError("Projeto não informado.")

    pendencias_abertas = (
        PendenciaItem.objects.filter(
            projeto=projeto,
            status=StatusPendenciaChoices.ABERTA,
            categoria_produto__isnull=False,
        )
        .select_related("carga", "projeto")
        .order_by("ordem", "id")
    )

    pendencias_lista = list(pendencias_abertas)

    categorias_encontradas = sorted(
        {p.categoria_produto for p in pendencias_lista}
    )

    resultado = {
        "projeto_id": projeto.id,
        "pendencias_analisadas": len(pendencias_lista),
        "categorias_encontradas": categorias_encontradas,
        "categorias_reavaliadas": [],
        "escopos_reprocessados": [],
        "categorias_nao_mapeadas": [],
        "erros": [],
    }

    vistos = set()
    categorias_ok = set()

    for pendencia in pendencias_lista:
        carga_id = str(pendencia.carga_id) if pendencia.carga_id else ""
        chave = (
            pendencia.parte_painel,
            pendencia.categoria_produto,
            carga_id,
        )
        if chave in vistos:
            continue
        vistos.add(chave)

        label = f"{pendencia.parte_painel}/{pendencia.categoria_produto}"
        if pendencia.carga_id:
            label += f"/carga={pendencia.carga_id}"

        try:
            if (
                pendencia.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.CONTATORA
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de contatora sem carga vinculada.",
                        }
                    )
                    continue
                reprocessar_contatora_para_carga(projeto, pendencia.carga)

            elif (
                pendencia.parte_painel == PartesPainelChoices.PROTECAO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de disjuntor motor sem carga vinculada.",
                        }
                    )
                    continue
                reprocessar_disjuntor_motor_para_carga(projeto, pendencia.carga)

            elif pendencia.parte_painel == PartesPainelChoices.SECCIONAMENTO:
                reprocessar_seccionamento_para_pendencia(projeto, pendencia)

            else:
                resultado["categorias_nao_mapeadas"].append(
                    f"{pendencia.parte_painel}:{pendencia.categoria_produto}"
                )
                continue

            categorias_ok.add(pendencia.categoria_produto)
            resultado["escopos_reprocessados"].append(label)

        except Exception as exc:
            resultado["erros"].append(
                {
                    "categoria_produto": pendencia.categoria_produto,
                    "erro": str(exc),
                }
            )

    resultado["categorias_reavaliadas"] = sorted(categorias_ok)

    return resultado
