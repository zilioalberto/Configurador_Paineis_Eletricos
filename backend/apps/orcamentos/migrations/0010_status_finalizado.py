from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orcamentos", "0009_orcamentoitem_servico"),
    ]

    operations = [
        migrations.AlterField(
            model_name="orcamento",
            name="status",
            field=models.CharField(
                choices=[
                    ("RASCUNHO", "Rascunho"),
                    ("FINALIZADO", "Finalizado"),
                    ("ENVIADO", "Enviado"),
                    ("APROVADO", "Aprovado"),
                    ("REJEITADO", "Rejeitado"),
                    ("CANCELADO", "Cancelado"),
                ],
                db_index=True,
                default="RASCUNHO",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="orcamentosnapshot",
            name="status_orcamento",
            field=models.CharField(
                choices=[
                    ("RASCUNHO", "Rascunho"),
                    ("FINALIZADO", "Finalizado"),
                    ("ENVIADO", "Enviado"),
                    ("APROVADO", "Aprovado"),
                    ("REJEITADO", "Rejeitado"),
                    ("CANCELADO", "Cancelado"),
                ],
                max_length=20,
            ),
        ),
    ]
