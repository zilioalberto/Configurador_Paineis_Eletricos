from django.db import migrations, models

from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    TipoMontagemSwitchChoices,
    TipoPortaRedeChoices,
    TipoSwitchRedeChoices,
    VelocidadePortaRedeChoices,
)


def _map_mbps_para_velocidade_porta(mbps):
    V = VelocidadePortaRedeChoices
    if mbps == 10:
        return V.MBPS_10
    if mbps == 100:
        return V.MBPS_100
    if mbps == 1000:
        return V.MBPS_1000
    if mbps == 10000:
        return V.MBPS_10000
    return V.OUTRO


def _backfill_switch_velocidade_e_portas(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoSwitchRede")
    for row in Model.objects.all():
        vp = _map_mbps_para_velocidade_porta(row.velocidade_nominal_mbps)
        updates = {"velocidade_porta": vp}
        if row.quantidade_portas_rj45 == 0:
            updates["quantidade_portas_rj45"] = row.quantidade_portas
        if row.possui_poe and row.quantidade_portas_poe == 0:
            updates["quantidade_portas_poe"] = row.quantidade_portas
        Model.objects.filter(pk=row.pk).update(**updates)


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0027_especificacao_soft_starter_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="tipo_switch",
            field=models.CharField(
                choices=TipoSwitchRedeChoices.choices,
                default=TipoSwitchRedeChoices.INDUSTRIAL,
                help_text="Tipo do switch de rede.",
                max_length=30,
            ),
        ),
        migrations.RenameField(
            model_name="especificacaoswitchrede",
            old_name="numero_portas",
            new_name="quantidade_portas",
        ),
        migrations.AlterField(
            model_name="especificacaoswitchrede",
            name="quantidade_portas",
            field=models.PositiveIntegerField(
                help_text="Quantidade total de portas do switch.",
            ),
        ),
        migrations.RenameField(
            model_name="especificacaoswitchrede",
            old_name="suporta_poe",
            new_name="possui_poe",
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="quantidade_portas_rj45",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Quantidade de portas RJ45.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="quantidade_portas_fibra",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Quantidade de portas de fibra óptica.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="tipo_porta",
            field=models.CharField(
                blank=True,
                choices=TipoPortaRedeChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="velocidade_porta",
            field=models.CharField(
                blank=True,
                choices=VelocidadePortaRedeChoices.choices,
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                blank=True,
                choices=TensaoChoices.choices,
                help_text="Tensão de alimentação do switch.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="corrente_nominal_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                help_text="Corrente nominal consumida.",
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="quantidade_portas_poe",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Quantidade de portas PoE.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="gerenciavel",
            field=models.BooleanField(
                default=False,
                help_text="Indica se o switch é gerenciável.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="suporta_vlan",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="suporta_rstp",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="suporta_mrp",
            field=models.BooleanField(
                default=False,
                help_text="Suporte a MRP, comum em redes Profinet.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="suporta_profinet",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="suporta_ethernet_ip",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="suporta_modbus_tcp",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="tipo_montagem",
            field=models.CharField(
                blank=True,
                choices=TipoMontagemSwitchChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="grau_protecao_ip",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="largura_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="altura_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="profundidade_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoswitchrede",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RunPython(_backfill_switch_velocidade_e_portas, _noop),
        migrations.RemoveField(
            model_name="especificacaoswitchrede",
            name="velocidade_nominal_mbps",
        ),
    ]
