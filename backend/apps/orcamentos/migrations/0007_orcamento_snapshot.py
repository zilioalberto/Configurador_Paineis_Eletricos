from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("orcamentos", "0006_rename_orcamento_tables"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrcamentoSnapshot",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status_orcamento", models.CharField(choices=[("RASCUNHO", "Rascunho"), ("ENVIADO", "Enviado"), ("APROVADO", "Aprovado"), ("REJEITADO", "Rejeitado"), ("CANCELADO", "Cancelado")], max_length=20)),
                ("codigo", models.CharField(max_length=48)),
                ("dados", models.JSONField()),
                ("itens", models.JSONField()),
                ("total", models.DecimalField(decimal_places=4, default=0, max_digits=18)),
                ("gerado_em", models.DateTimeField(auto_now_add=True)),
                ("gerado_por", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orcamentos_snapshots_gerados", to=settings.AUTH_USER_MODEL, verbose_name="gerado por")),
                ("orcamento", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="snapshot_envio", to="orcamentos.orcamento")),
            ],
            options={
                "db_table": "orcamento_snapshot",
                "ordering": ("-gerado_em",),
            },
        ),
    ]
