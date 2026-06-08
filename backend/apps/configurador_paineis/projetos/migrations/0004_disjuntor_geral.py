"""Campos de disjuntor geral e migração de projetos com DCM como seccionamento."""

from django.db import migrations, models


def migrar_disjuntor_caixa_moldada_de_seccionamento(apps, schema_editor):
    Projeto = apps.get_model("projetos", "ProjetoConfigurador")
    for projeto in Projeto.objects.filter(tipo_seccionamento="DISJUNTOR_CAIXA_MOLDADA"):
        projeto.possui_disjuntor_geral = True
        projeto.tipo_disjuntor_geral = "DISJUNTOR_CAIXA_MOLDADA"
        projeto.possui_seccionamento = False
        projeto.tipo_seccionamento = "NENHUM"
        projeto.save(
            update_fields=[
                "possui_disjuntor_geral",
                "tipo_disjuntor_geral",
                "possui_seccionamento",
                "tipo_seccionamento",
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0003_rename_projeto_configurador"),
    ]

    operations = [
        migrations.AddField(
            model_name="projetoconfigurador",
            name="possui_disjuntor_geral",
            field=models.BooleanField(
                default=False,
                help_text="Indica se o projeto possui disjuntor geral de proteção.",
            ),
        ),
        migrations.AddField(
            model_name="projetoconfigurador",
            name="tipo_disjuntor_geral",
            field=models.CharField(
                blank=True,
                choices=[
                    ("MINIDISJUNTOR", "Minidisjuntor"),
                    ("DISJUNTOR_CAIXA_MOLDADA", "Disjuntor caixa moldada"),
                ],
                default="",
                help_text=(
                    "Tipo de disjuntor geral (minidisjuntor ou caixa moldada), "
                    "quando aplicável."
                ),
                max_length=30,
            ),
        ),
        migrations.RunPython(
            migrar_disjuntor_caixa_moldada_de_seccionamento,
            migrations.RunPython.noop,
        ),
    ]
