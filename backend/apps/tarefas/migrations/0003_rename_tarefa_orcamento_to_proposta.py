from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("tarefas", "0002_tarefa_horas_estipuladas"),
    ]

    operations = [
        migrations.RenameField(
            model_name="tarefa",
            old_name="orcamento_referencia",
            new_name="proposta_referencia",
        ),
    ]
