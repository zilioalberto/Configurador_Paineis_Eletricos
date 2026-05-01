from decimal import Decimal

from django.db import migrations, models

_TIPO_CLIM = [
    ("VENTILACAO", "Ventilação"),
    ("EXAUSTOR", "Exaustor"),
    ("TROCADOR_CALOR", "Trocador de Calor"),
    ("AR_CONDICIONADO", "Ar-condicionado"),
    ("RESISTENCIA_AQUECIMENTO", "Resistência de Aquecimento"),
]

_TIPO_CORRENTE = [
    ("CA", "Corrente Alternada"),
    ("CC", "Corrente Contínua"),
]

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
]


def _climatizacao_backfill_vazao(apps, schema_editor):
    Clima = apps.get_model("catalogo", "EspecificacaoClimatizacao")
    Clima.objects.filter(
        tipo_climatizacao__in=("VENTILACAO", "EXAUSTOR"),
        vazao_m3_h__isnull=True,
    ).update(vazao_m3_h=Decimal("100.00"))


def _climatizacao_backfill_vazao_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0011_especificacao_chave_seletora_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="tipo_climatizacao",
            field=models.CharField(
                choices=_TIPO_CLIM,
                default="VENTILACAO",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.RenameField(
            model_name="especificacaoclimatizacao",
            old_name="potencia_w",
            new_name="potencia_consumida_w",
        ),
        migrations.AlterField(
            model_name="especificacaoclimatizacao",
            name="potencia_consumida_w",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="capacidade_refrigeracao_w",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="capacidade_aquecimento_w",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="tipo_corrente_alimentacao",
            field=models.CharField(
                choices=_TIPO_CORRENTE,
                default="CA",
                max_length=2,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="corrente_nominal_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="vazao_m3_h",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Vazão de ar em m³/h, aplicável a ventiladores/exaustores.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="grau_protecao_ip",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoclimatizacao",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="PORTA",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            _climatizacao_backfill_vazao,
            _climatizacao_backfill_vazao_reverse,
        ),
    ]
