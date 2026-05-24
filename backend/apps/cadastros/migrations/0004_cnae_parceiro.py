import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0003_cnpj_receita_socios"),
    ]

    operations = [
        migrations.CreateModel(
            name="CnaeParceiro",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("ordem", models.PositiveSmallIntegerField(default=0)),
                ("codigo", models.CharField(max_length=7)),
                ("descricao", models.CharField(blank=True, max_length=255)),
                ("principal", models.BooleanField(default=False)),
                (
                    "parceiro",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cnaes",
                        to="cadastros.parceirocomercial",
                    ),
                ),
            ],
            options={
                "verbose_name": "CNAE do parceiro",
                "verbose_name_plural": "CNAEs do parceiro",
                "db_table": "cadastros_parceiro_cnae",
                "ordering": ("parceiro_id", "-principal", "ordem", "codigo"),
            },
        ),
    ]
