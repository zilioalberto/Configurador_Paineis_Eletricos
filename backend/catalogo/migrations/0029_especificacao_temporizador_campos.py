from decimal import Decimal

from django.db import migrations, models

from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    TipoFuncaoTemporizadorChoices,
    TipoMontagemTemporizadorChoices,
    TipoTemporizadorChoices,
    UnidadeTempoChoices,
)


def _map_modo_para_tipo_montagem(modo: str) -> str:
    TM = TipoMontagemTemporizadorChoices
    if modo == TM.TRILHO_DIN:
        return TM.TRILHO_DIN
    if modo == TM.PORTA:
        return TM.PORTA
    if modo == TM.PLACA:
        return TM.PLACA
    return TM.OUTRO


def _backfill_temporizador(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoTemporizador")
    UTC = UnidadeTempoChoices
    for row in Model.objects.all():
        tipo_m = _map_modo_para_tipo_montagem(row.modo_montagem or "")
        updates = {"tipo_montagem": tipo_m}
        if row.faixa_tempo_maxima_s:
            tx_max = Decimal(str(row.faixa_tempo_maxima_s))
            updates["tempo_maximo"] = tx_max
            updates["tempo_minimo"] = (
                Decimal("0.10") if tx_max >= Decimal("1") else Decimal("0.01")
            )
            updates["unidade_tempo"] = UTC.SEGUNDOS
        Model.objects.filter(pk=row.pk).update(**updates)


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0028_especificacao_switch_rede_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="tipo_temporizador",
            field=models.CharField(
                choices=TipoTemporizadorChoices.choices,
                default=TipoTemporizadorChoices.ELETRONICO,
                help_text="Tipo construtivo do temporizador.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="tipo_funcao",
            field=models.CharField(
                choices=TipoFuncaoTemporizadorChoices.choices,
                default=TipoFuncaoTemporizadorChoices.ATRASO_ENERGIZACAO,
                help_text="Função do temporizador.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="multifuncao",
            field=models.BooleanField(
                default=False,
                help_text="Indica se possui múltiplas funções configuráveis.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="corrente_contato_a",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("10.00"),
                help_text="Corrente suportada nos contatos.",
                max_digits=6,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="quantidade_contatos",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="possui_contato_reversivel",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="tempo_minimo",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.10"),
                help_text="Tempo mínimo ajustável.",
                max_digits=8,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="tempo_maximo",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("3600.00"),
                help_text="Tempo máximo ajustável.",
                max_digits=8,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="unidade_tempo",
            field=models.CharField(
                choices=UnidadeTempoChoices.choices,
                default=UnidadeTempoChoices.SEGUNDOS,
                help_text="Unidade principal de ajuste de tempo.",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="precisao_percentual",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Precisão do temporizador.",
                max_digits=5,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="tipo_montagem",
            field=models.CharField(
                blank=True,
                choices=TipoMontagemTemporizadorChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="possui_led_indicacao",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="grau_protecao_ip",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name="especificacaotemporizador",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RunPython(_backfill_temporizador, _noop),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="modo_montagem",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="faixa_tempo_maxima_s",
        ),
        migrations.AlterField(
            model_name="especificacaotemporizador",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                choices=TensaoChoices.choices,
                help_text="Tensão de alimentação.",
            ),
        ),
    ]
