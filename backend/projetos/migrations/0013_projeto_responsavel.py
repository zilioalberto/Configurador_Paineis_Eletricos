from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projetos", "0012_projeto_rastreabilidade"),
    ]

    operations = [
        migrations.AddField(
            model_name="projeto",
            name="responsavel",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="projetos_responsavel",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
