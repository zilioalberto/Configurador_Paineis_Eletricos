from composicao_painel.models import PendenciaItem
from composicao_painel.services.sugestoes.contatoras import gerar_sugestoes_contatoras
from composicao_painel.services.sugestoes.disjuntores_motor import gerar_sugestoes_disjuntores_motor
from composicao_painel.services.sugestoes.seccionadoras import gerar_sugestao_seccionamento

from core.choices import CategoriaProdutoNomeChoices, StatusPendenciaChoices


MAPA_FUNCOES_PENDENCIAS = {
    CategoriaProdutoNomeChoices.CONTATORA: gerar_sugestoes_contatoras,
    CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR: gerar_sugestoes_disjuntores_motor,
    CategoriaProdutoNomeChoices.SECCIONADORA: gerar_sugestao_seccionamento,
    #CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA: gerar_sugestao_seccionamento,
}


def reavaliar_pendencias_projeto(projeto):
    if projeto is None:
        raise ValueError("Projeto não informado.")

    pendencias_abertas = PendenciaItem.objects.filter(
        projeto=projeto,
        status=StatusPendenciaChoices.ABERTA,
        categoria_produto__isnull=False,
    )

    categorias_pendentes = list(
        pendencias_abertas.values_list("categoria_produto", flat=True).distinct()
    )

    resultado = {
        "projeto_id": projeto.id,
        "categorias_encontradas": categorias_pendentes,
        "categorias_reavaliadas": [],
        "categorias_nao_mapeadas": [],
        "erros": [],
    }

    for categoria in categorias_pendentes:
        funcao = MAPA_FUNCOES_PENDENCIAS.get(categoria)

        if not funcao:
            resultado["categorias_nao_mapeadas"].append(categoria)
            continue

        try:
            funcao(projeto)
            resultado["categorias_reavaliadas"].append(categoria)
        except Exception as exc:
            resultado["erros"].append(
                {
                    "categoria_produto": categoria,
                    "erro": str(exc),
                }
            )

    return resultado