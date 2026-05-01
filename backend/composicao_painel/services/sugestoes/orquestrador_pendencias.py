from composicao_painel.models import PendenciaItem
from composicao_painel.services.sugestoes.contatoras import reprocessar_contatora_para_carga
from composicao_painel.services.sugestoes.disjuntores_motor import (
    reprocessar_disjuntor_motor_para_carga,
)
from composicao_painel.services.sugestoes.rele_sobrecarga import (
    reprocessar_rele_sobrecarga_para_carga,
)
from composicao_painel.services.sugestoes.fusivel import reprocessar_fusivel_para_carga
from composicao_painel.services.sugestoes.minidisjuntores import (
    reprocessar_minidisjuntores_para_carga,
)
from composicao_painel.services.sugestoes.soft_starter import (
    reprocessar_soft_starter_para_carga,
)
from composicao_painel.services.sugestoes.inversores_frequencia import (
    reprocessar_inversores_frequencia_para_carga,
)
from composicao_painel.services.sugestoes.reles_estado_solido import (
    reprocessar_rele_estado_solido_para_carga,
)
from composicao_painel.services.sugestoes.reles_interface import (
    reprocessar_rele_interface_para_carga,
)
from composicao_painel.services.sugestoes.bornes import (
    reprocessar_bornes_para_carga,
)
from composicao_painel.services.sugestoes.seccionadoras import (
    reprocessar_seccionamento_para_pendencia,
)

from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
)
from core.choices.cargas import TipoCargaChoices


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
                pendencia.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.SOFT_STARTER
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de soft starter sem carga vinculada.",
                        }
                    )
                    continue
                reprocessar_soft_starter_para_carga(projeto, pendencia.carga)

            elif (
                pendencia.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de inversor de frequência sem carga vinculada.",
                        }
                    )
                    continue
                reprocessar_inversores_frequencia_para_carga(
                    projeto, pendencia.carga
                )

            elif (
                pendencia.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de relé de estado sólido sem carga vinculada.",
                        }
                    )
                    continue
                if pendencia.carga.tipo != TipoCargaChoices.RESISTENCIA:
                    resultado["categorias_nao_mapeadas"].append(
                        f"{pendencia.parte_painel}:{pendencia.categoria_produto}"
                    )
                    continue
                reprocessar_rele_estado_solido_para_carga(
                    projeto, pendencia.carga
                )

            elif (
                pendencia.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.RELE_INTERFACE
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de relé de interface sem carga vinculada.",
                        }
                    )
                    continue
                if pendencia.carga.tipo not in (
                    TipoCargaChoices.VALVULA,
                    TipoCargaChoices.RESISTENCIA,
                ):
                    resultado["categorias_nao_mapeadas"].append(
                        f"{pendencia.parte_painel}:{pendencia.categoria_produto}"
                    )
                    continue
                reprocessar_rele_interface_para_carga(projeto, pendencia.carga)

            elif (
                pendencia.parte_painel == PartesPainelChoices.BORNES
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.BORNE
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de borne sem carga vinculada.",
                        }
                    )
                    continue
                if pendencia.carga.tipo != TipoCargaChoices.VALVULA:
                    resultado["categorias_nao_mapeadas"].append(
                        f"{pendencia.parte_painel}:{pendencia.categoria_produto}"
                    )
                    continue
                reprocessar_bornes_para_carga(projeto, pendencia.carga)

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

            elif (
                pendencia.parte_painel == PartesPainelChoices.PROTECAO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.MINIDISJUNTOR
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de minidisjuntor sem carga vinculada.",
                        }
                    )
                    continue
                if pendencia.carga.tipo not in (
                    TipoCargaChoices.MOTOR,
                    TipoCargaChoices.RESISTENCIA,
                ):
                    resultado["categorias_nao_mapeadas"].append(
                        f"{pendencia.parte_painel}:{pendencia.categoria_produto}"
                    )
                    continue
                reprocessar_minidisjuntores_para_carga(projeto, pendencia.carga)

            elif (
                pendencia.parte_painel == PartesPainelChoices.PROTECAO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.RELE_SOBRECARGA
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de relé de sobrecarga sem carga vinculada.",
                        }
                    )
                    continue
                reprocessar_rele_sobrecarga_para_carga(projeto, pendencia.carga)

            elif (
                pendencia.parte_painel == PartesPainelChoices.PROTECAO_CARGA
                and pendencia.categoria_produto
                == CategoriaProdutoNomeChoices.FUSIVEL
            ):
                if pendencia.carga_id is None:
                    resultado["erros"].append(
                        {
                            "categoria_produto": pendencia.categoria_produto,
                            "erro": "Pendência de fusível sem carga vinculada.",
                        }
                    )
                    continue
                reprocessar_fusivel_para_carga(projeto, pendencia.carga)

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
