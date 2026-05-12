from django.db import models


class OrigemMercadoriaICMSChoices(models.TextChoices):
    """Origem da mercadoria (tag `orig` do ICMS na NF-e)."""

    NACIONAL = "0", "Nacional — exceto 3, 4, 5 e 8"
    ESTRANGEIRA_IMPORTACAO_DIRETA = "1", "Estrangeira — importação direta (exceto 6)"
    ESTRANGEIRA_MERCADO_INTERNO = "2", "Estrangeira — mercado interno (exceto 7)"
    NACIONAL_IMPORTACAO_40_70 = "3", "Nacional — importação >40% e ≤70%"
    NACIONAL_PROCESSOS_BASICOS = "4", "Nacional — processos produtivos básicos"
    NACIONAL_IMPORTACAO_LE_40 = "5", "Nacional — importação ≤40%"
    ESTRANGEIRA_IMPORT_SEM_SIMILAR = "6", "Estrangeira — importação direta sem similar nacional"
    ESTRANGEIRA_ADQUIRIDA_SEM_SIMILAR = "7", "Estrangeira — mercado interno sem similar nacional"
    NACIONAL_IMPORTACAO_GT_70 = "8", "Nacional — importação >70%"
