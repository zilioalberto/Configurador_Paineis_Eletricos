from django.db import migrations, models

import core.choices


def preencher_strings_vazias(apps, schema_editor):
    projeto = apps.get_model("projetos", "Projeto")
    for field_name in (
        "tipo_conexao_alimentacao_neutro",
        "tipo_conexao_alimentacao_terra",
        "familia_plc",
        "tipo_climatizacao",
        "tipo_seccionamento",
    ):
        projeto.objects.filter(**{f"{field_name}__isnull": True}).update(**{field_name: ""})


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(preencher_strings_vazias, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="projeto",
            name="familia_plc",
            field=models.CharField(
                blank=True,
                default="",
                help_text=(
                    "Família do PLC (catálogo EspecificacaoPLC.familia), quando o projeto possui PLC."
                ),
                max_length=100,
            ),
        ),
        migrations.AlterField(
            model_name="projeto",
            name="tipo_climatizacao",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoClimatizacaoPainelChoices.choices,
                default="",
                help_text="Tipo de climatização do painel, caso possua.",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="projeto",
            name="tipo_conexao_alimentacao_neutro",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoConexaoAlimetacaoChoices.choices,
                default="",
                help_text="Tipo de conexão do neutro da alimentação.",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="projeto",
            name="tipo_conexao_alimentacao_terra",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoConexaoAlimetacaoChoices.choices,
                default="",
                help_text="Tipo de conexão do terra da alimentação.",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="projeto",
            name="tipo_seccionamento",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoSeccionamentoChoices.choices,
                default=core.choices.TipoSeccionamentoChoices.SECCIONADORA,
                help_text="Tipo de seccionamento geral.",
                max_length=30,
            ),
        ),
    ]
