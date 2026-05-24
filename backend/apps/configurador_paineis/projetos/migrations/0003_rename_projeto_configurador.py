# Renomeia Projeto → ProjetoConfigurador e tabelas explícitas no domínio CPQ

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projetos", "0002_remove_null_from_optional_charfields"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Projeto",
            new_name="ProjetoConfigurador",
        ),
        migrations.AlterModelTable(
            name="projetoconfigurador",
            table="configurador_projeto",
        ),
        migrations.RenameModel(
            old_name="ProjetoEvento",
            new_name="ProjetoConfiguradorEvento",
        ),
        migrations.RenameField(
            model_name="projetoconfiguradorevento",
            old_name="projeto",
            new_name="projeto_configurador",
        ),
        migrations.AlterModelTable(
            name="projetoconfiguradorevento",
            table="configurador_projeto_evento",
        ),
        migrations.AlterField(
            model_name="projetoconfiguradorevento",
            name="usuario",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="projeto_configurador_eventos",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
