from django.db import migrations, models

from core.choices.eletrica import NumeroFasesChoices, TensaoChoices
from core.choices.produtos import (
    TipoAplicacaoSoftStarterChoices,
    TipoBypassChoices,
    TipoControleSoftStarterChoices,
)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0026_especificacao_resistencia_aquecimento_campos"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaosoftstarter",
            old_name="tensao_alimentacao_nominal_v",
            new_name="tensao_nominal_v",
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="numero_fases",
            field=models.IntegerField(
                choices=NumeroFasesChoices.choices,
                default=NumeroFasesChoices.TRIFASICO,
                help_text="Número de fases (normalmente 3).",
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="tipo_controle",
            field=models.CharField(
                blank=True,
                choices=TipoControleSoftStarterChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="tipo_aplicacao",
            field=models.CharField(
                choices=TipoAplicacaoSoftStarterChoices.choices,
                default=TipoAplicacaoSoftStarterChoices.NORMAL,
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="tipo_bypass",
            field=models.CharField(
                choices=TipoBypassChoices.choices,
                default=TipoBypassChoices.INTERNO,
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="possui_contator_bypass_interno",
            field=models.BooleanField(
                default=False,
                help_text="Indica se já possui contator de bypass interno.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="corrente_partida_maxima",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Corrente máxima durante a partida.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="tempo_rampa_partida_s",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="tempo_rampa_parada_s",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="possui_protecao_sobrecarga",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="possui_protecao_falta_fase",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="possui_protecao_subtensao",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="possui_comunicacao",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="suporta_modbus",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="suporta_profinet",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="suporta_ethernet_ip",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="grau_protecao_ip",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="tipo_montagem",
            field=models.CharField(
                blank=True,
                help_text="Ex.: painel, trilho, placa.",
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="especificacaosoftstarter",
            name="corrente_nominal_a",
            field=models.DecimalField(
                decimal_places=2,
                help_text="Corrente nominal do soft starter.",
                max_digits=8,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaosoftstarter",
            name="tensao_nominal_v",
            field=models.IntegerField(
                choices=TensaoChoices.choices,
                help_text="Tensão nominal de operação.",
            ),
        ),
    ]
