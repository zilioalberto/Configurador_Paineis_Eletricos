from django.db import migrations, models

from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    FamiliaPLCChoices,
    ProtocoloComunicacaoChoices,
    TipoPLCChoices,
)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0023_especificacao_placa_montagem_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoplc",
            name="tipo_plc",
            field=models.CharField(
                choices=TipoPLCChoices.choices,
                default=TipoPLCChoices.COMPACTO,
                help_text="Tipo construtivo ou funcional do PLC.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="familia",
            field=models.CharField(
                blank=True,
                choices=FamiliaPLCChoices.choices,
                help_text="Família ou linha do PLC.",
                max_length=50,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="modelo_cpu",
            field=models.CharField(
                blank=True,
                help_text="Modelo da CPU, por exemplo CPU 1214C DC/DC/DC.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="corrente_alimentacao_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Corrente consumida pelo PLC.",
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="possui_ethernet",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="possui_serial",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="protocolo_principal",
            field=models.CharField(
                blank=True,
                choices=ProtocoloComunicacaoChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="suporta_expansao",
            field=models.BooleanField(
                default=True,
                help_text="Indica se o PLC permite módulos de expansão.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="quantidade_maxima_expansoes",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Quantidade máxima de módulos de expansão suportados.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="possui_webserver",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="suporta_opc_ua",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="suporta_modbus_tcp",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="suporta_profinet",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="suporta_ethernet_ip",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="possui_funcoes_safety",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="possui_funcoes_motion",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="memoria_programa_kb",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="memoria_dados_kb",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="especificacaoplc",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                blank=True,
                choices=TensaoChoices.choices,
                help_text="Tensão de alimentação do PLC.",
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoplc",
            name="entradas_digitais",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="especificacaoplc",
            name="saidas_digitais",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="especificacaoplc",
            name="entradas_analogicas",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="especificacaoplc",
            name="saidas_analogicas",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
