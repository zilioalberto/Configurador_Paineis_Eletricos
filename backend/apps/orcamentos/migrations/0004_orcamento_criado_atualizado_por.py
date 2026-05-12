import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("orcamentos", "0003_orcamentoitem_produto_ipi"),
    ]

    operations = [
        migrations.AddField(
            model_name="orcamento",
            name="atualizado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="orcamentos_atualizados",
                to=settings.AUTH_USER_MODEL,
                verbose_name="ultima alteracao por",
            ),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="criado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="orcamentos_criados",
                to=settings.AUTH_USER_MODEL,
                verbose_name="criado por",
            ),
        ),
    ]
