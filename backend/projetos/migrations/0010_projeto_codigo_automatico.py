from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0009_alter_projeto_tensao_nominal"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjetoCodigoMensal",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("ano", models.PositiveIntegerField()),
                ("mes", models.PositiveSmallIntegerField()),
                ("ultimo_sequencial", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Sequência mensal de código de projeto",
                "verbose_name_plural": "Sequências mensais de código de projeto",
            },
        ),
        migrations.AddConstraint(
            model_name="projetocodigomensal",
            constraint=models.UniqueConstraint(
                fields=("ano", "mes"),
                name="uq_projetos_codigomensal_ano_mes",
            ),
        ),
        migrations.AlterField(
            model_name="projeto",
            name="codigo",
            field=models.CharField(
                blank=True,
                help_text="Gerado automaticamente no formato MMnnn-AA (mês + sequencial + ano) ao criar.",
                max_length=50,
                unique=True,
            ),
        ),
    ]
