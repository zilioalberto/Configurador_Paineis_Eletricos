from django.db import migrations

CHAVE = "configurador.degraus_margem_bitola_condutores"
DESCRICAO = (
    "Margem sobre o mínimo normativo (tabela Iz) no dimensionamento de condutores: "
    "0 = bitola mínima; 1 = uma bitola comercial acima (ex.: 4 → 6 mm²)."
)


def criar_parametro(apps, schema_editor):
    ParametroConfiguracao = apps.get_model("configuracoes_erp", "ParametroConfiguracao")
    ParametroConfiguracao.objects.get_or_create(
        chave=CHAVE,
        defaults={"valor": "1", "descricao": DESCRICAO},
    )


def reverter(apps, schema_editor):
    ParametroConfiguracao = apps.get_model("configuracoes_erp", "ParametroConfiguracao")
    ParametroConfiguracao.objects.filter(chave=CHAVE).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("configuracoes_erp", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(criar_parametro, reverter),
    ]
