from django.db import transaction
from django.core.exceptions import ValidationError

from composicao_painel.models import SugestaoItem
from composicao_painel.services.sugestoes.seccionamento import (
    gerar_sugestao_seccionamento,
)


ETAPAS_GERACAO = [
    ("SECCIONAMENTO", gerar_sugestao_seccionamento),
]


def limpar_sugestoes_projeto(projeto):
    SugestaoItem.objects.filter(projeto=projeto).delete()


@transaction.atomic
def gerar_sugestoes_painel(projeto, limpar_antes=False):
    if projeto is None:
        raise ValidationError("Projeto não informado.")

    if limpar_antes:
        limpar_sugestoes_projeto(projeto)

    sugestoes_geradas = []
    erros = []

    for nome_etapa, funcao_geradora in ETAPAS_GERACAO:
        try:
            sugestao = funcao_geradora(projeto)
            if sugestao is not None:
                sugestoes_geradas.append(sugestao)
        except Exception as exc:
            erros.append(
                {
                    "etapa": nome_etapa,
                    "erro": str(exc),
                }
            )

    return {
        "projeto_id": projeto.id,
        "total_sugestoes": len(sugestoes_geradas),
        "sugestoes": sugestoes_geradas,
        "erros": erros,
    }