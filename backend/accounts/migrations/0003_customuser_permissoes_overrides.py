from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_expand_tipo_usuario_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="permissoes_extras",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Permissões adicionais concedidas especificamente a este utilizador.",
                verbose_name="permissões extras",
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="permissoes_negadas",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Permissões removidas especificamente para este utilizador.",
                verbose_name="permissões negadas",
            ),
        ),
    ]
