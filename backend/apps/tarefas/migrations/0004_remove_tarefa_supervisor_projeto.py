from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("tarefas", "0003_rename_tarefa_orcamento_to_proposta"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="tarefa",
            name="supervisor",
        ),
        migrations.RemoveField(
            model_name="tarefa",
            name="projeto",
        ),
    ]
