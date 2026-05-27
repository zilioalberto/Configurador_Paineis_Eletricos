from django.db import migrations


PARAMETROS = (
    (
        "orcamentos.catalogo_preco_validade_dias",
        "30",
        "Quantidade de dias em que o preço de catálogo é considerado válido para finalizar ofertas.",
    ),
    (
        "orcamentos.bloquear_finalizacao_preco_desatualizado",
        "true",
        "Quando verdadeiro, bloqueia a finalização da oferta se houver preço de catálogo vencido.",
    ),
)


def criar_parametros(apps, schema_editor):
    ParametroConfiguracao = apps.get_model("configuracoes_erp", "ParametroConfiguracao")
    for chave, valor, descricao in PARAMETROS:
        ParametroConfiguracao.objects.get_or_create(
            chave=chave,
            defaults={"valor": valor, "descricao": descricao},
        )


def remover_parametros(apps, schema_editor):
    ParametroConfiguracao = apps.get_model("configuracoes_erp", "ParametroConfiguracao")
    ParametroConfiguracao.objects.filter(chave__in=[p[0] for p in PARAMETROS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("configuracoes_erp", "0002_parametro_configurador_margem_bitola"),
    ]

    operations = [
        migrations.RunPython(criar_parametros, remover_parametros),
    ]
