from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("orcamentos", "0005_revisoes_configurador_painel"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="sequenciapropostamensal",
            table="orcamento_sequencia_mensal",
        ),
        migrations.AlterModelTable(
            name="configuracaomargemcliente",
            table="orcamento_margem_cliente",
        ),
        migrations.AlterModelTable(
            name="orcamento",
            table="orcamento",
        ),
        migrations.AlterModelTable(
            name="orcamentoconfiguradorpainel",
            table="orcamento_configurador_painel",
        ),
        migrations.AlterModelTable(
            name="orcamentoitem",
            table="orcamento_item",
        ),
    ]
