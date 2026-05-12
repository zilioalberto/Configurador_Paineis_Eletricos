from django.db import migrations, models

from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    TipoContatoChoices,
    TipoMontagemReleChoices,
    TipoReleInterfaceChoices,
)


def _backfill_rele_interface(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoReleInterface")
    TC = TipoContatoChoices
    TR = TipoMontagemReleChoices
    for row in Model.objects.all():
        na = row.contatos_aux_na or 0
        nf = row.contatos_aux_nf or 0
        total = na + nf
        qtd = max(1, total)
        if na > 0 and nf > 0:
            tipo_c = TC.REVERSIVEL
        elif nf > 0:
            tipo_c = TC.NF
        else:
            tipo_c = TC.NA
        modo = row.modo_montagem or ""
        if modo == TR.TRILHO_DIN:
            tm = TR.TRILHO_DIN
        elif modo == TR.PLACA:
            tm = TR.PLACA
        else:
            tm = TR.OUTRO
        Model.objects.filter(pk=row.pk).update(
            quantidade_contatos=qtd,
            tipo_contato=tipo_c,
            tipo_montagem=tm,
        )


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0024_especificacao_plc_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="tipo_rele",
            field=models.CharField(
                choices=TipoReleInterfaceChoices.choices,
                default=TipoReleInterfaceChoices.ELETROMECANICO,
                help_text="Tipo do relé (eletromecânico ou estado sólido).",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="corrente_bobina_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                help_text="Corrente consumida pela bobina.",
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="quantidade_contatos",
            field=models.PositiveIntegerField(
                default=1,
                help_text="Número de contatos disponíveis.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="tipo_contato",
            field=models.CharField(
                choices=TipoContatoChoices.choices,
                default=TipoContatoChoices.NA,
                help_text="Tipo de contato do relé.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="tensao_contato_v",
            field=models.IntegerField(
                choices=TensaoChoices.choices,
                default=TensaoChoices.V220,
                help_text="Tensão máxima suportada no contato.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="possui_base",
            field=models.BooleanField(
                default=False,
                help_text="Indica se o relé possui base (soquete).",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="possui_led_indicacao",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="possui_protecao_sobretensao",
            field=models.BooleanField(
                default=False,
                help_text="Ex.: diodo, varistor ou RC interno.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="tipo_montagem",
            field=models.CharField(
                blank=True,
                choices=TipoMontagemReleChoices.choices,
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="tempo_acionamento_ms",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="tempo_desligamento_ms",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoreleinterface",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RunPython(_backfill_rele_interface, _noop),
        migrations.RenameField(
            model_name="especificacaoreleinterface",
            old_name="tensao_comando_v",
            new_name="tensao_bobina_v",
        ),
        migrations.RenameField(
            model_name="especificacaoreleinterface",
            old_name="corrente_nominal_contato_a",
            new_name="corrente_contato_a",
        ),
        migrations.AlterField(
            model_name="especificacaoreleinterface",
            name="corrente_contato_a",
            field=models.DecimalField(
                decimal_places=2,
                help_text="Corrente máxima suportada pelo contato.",
                max_digits=6,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoreleinterface",
            name="tensao_bobina_v",
            field=models.IntegerField(
                choices=TensaoChoices.choices,
                help_text="Tensão da bobina (ex.: 24 Vcc, 220 Vac).",
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="contatos_aux_na",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="contatos_aux_nf",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="modo_montagem",
        ),
    ]
