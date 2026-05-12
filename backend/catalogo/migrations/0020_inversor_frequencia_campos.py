from django.db import migrations, models

from core.choices.eletrica import NumeroFasesChoices, TensaoChoices


def _copy_tensao_saida_da_entrada(apps, schema_editor):
    EspecificacaoInversorFrequencia = apps.get_model(
        "catalogo", "EspecificacaoInversorFrequencia"
    )
    for row in EspecificacaoInversorFrequencia.objects.all().only(
        "id", "tensao_entrada_v", "tensao_saida_v"
    ):
        if row.tensao_entrada_v is not None:
            EspecificacaoInversorFrequencia.objects.filter(pk=row.pk).update(
                tensao_saida_v=row.tensao_entrada_v
            )


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0019_especificacao_ihm_campos"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaoinversorfrequencia",
            old_name="tensao_alimentacao_nominal_v",
            new_name="tensao_entrada_v",
        ),
        migrations.AddField(
            model_name="especificacaoinversorfrequencia",
            name="numero_fases_entrada",
            field=models.IntegerField(
                choices=NumeroFasesChoices.choices,
                default=NumeroFasesChoices.TRIFASICO,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoinversorfrequencia",
            name="tensao_saida_v",
            field=models.IntegerField(
                choices=TensaoChoices.choices,
                default=TensaoChoices.V380,
            ),
        ),
        migrations.RunPython(
            _copy_tensao_saida_da_entrada,
            _noop,
        ),
        migrations.AddField(
            model_name="especificacaoinversorfrequencia",
            name="protocolo_comunicacao",
            field=models.CharField(
                blank=True,
                help_text="Ex.: Modbus RTU, Profinet, EtherNet/IP.",
                max_length=50,
            ),
        ),
    ]
