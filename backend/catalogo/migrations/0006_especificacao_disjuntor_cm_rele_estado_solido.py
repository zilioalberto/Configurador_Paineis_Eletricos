from decimal import Decimal

from django.db import migrations, models


_TENSAO_INTEGER_CHOICES = [
    (12, "12 V"),
    (24, "24 V"),
    (48, "48 V"),
    (90, "90 V"),
    (110, "110 V"),
    (127, "127 V"),
    (220, "220 V"),
    (380, "380 V"),
    (440, "440 V"),
]

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
]

_CURVA_BCD = [("B", "Curva B"), ("C", "Curva C"), ("D", "Curva D")]
_POLOS = [("1P", "1P"), ("2P", "2P"), ("3P", "3P"), ("4P", "4P")]
_TIPO_CORRENTE = [("CA", "Corrente Alternada"), ("CC", "Corrente Contínua")]
_COMUTACAO = [
    ("ZERO_CROSS", "Zero-cross"),
    ("RANDOM", "Aleatória (random)"),
]
_DISSIP = [("INTEGRADO", "Integrado"), ("EXTERNO", "Externo")]
_FASES = [("1F", "Monofásico (1F)"), ("3F", "Trifásico (3F)")]
_TIPO_CARGA = [("RESISTIVA", "Resistiva"), ("INDUTIVA", "Indutiva")]


def _copiar_tensao_comando_para_carga_e_controle(apps, schema_editor):
    M = apps.get_model("catalogo", "EspecificacaoReleEstadoSolido")
    for obj in M.objects.all():
        tc = getattr(obj, "tensao_comando_v", None)
        if tc is not None:
            obj.tensao_carga_v = tc
            obj.tensao_controle_v = tc
            obj.save(update_fields=["tensao_carga_v", "tensao_controle_v"])


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0005_especificacao_mini_disjuntor_campos"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaodisjuntorcaixamoldada",
            old_name="tipo_montagem",
            new_name="modo_montagem",
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="capacidade_interrupcao_ka",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("25"),
                help_text="Capacidade de interrupção em kA.",
                max_digits=8,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="corrente_ajuste_termico_max_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Só aplicável quando o disjuntor não é de corrente fixa.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="corrente_ajuste_termico_min_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Só aplicável quando o disjuntor não é de corrente fixa.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disjuntor_fixo",
            field=models.BooleanField(
                default=True,
                help_text="Se verdadeiro, corrente nominal fixa; não usa faixa térmica.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="numero_polos",
            field=models.CharField(
                choices=_POLOS,
                default="3P",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="tensao_nominal_v",
            field=models.IntegerField(choices=_TENSAO_INTEGER_CHOICES, default=380),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="tipo_disparo",
            field=models.CharField(
                choices=_CURVA_BCD,
                default="C",
                max_length=1,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="numero_fases",
            field=models.CharField(
                choices=_FASES,
                default="3F",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="possui_dissipador",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="possui_ventilacao",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="potencia_dissipada_w",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True
            ),
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tensao_carga_v",
            field=models.IntegerField(
                choices=_TENSAO_INTEGER_CHOICES,
                default=220,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tensao_controle_v",
            field=models.IntegerField(
                choices=_TENSAO_INTEGER_CHOICES,
                default=24,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tipo_carga",
            field=models.CharField(
                choices=_TIPO_CARGA,
                default="RESISTIVA",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tipo_comutacao",
            field=models.CharField(
                choices=_COMUTACAO,
                default="ZERO_CROSS",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tipo_corrente_carga",
            field=models.CharField(
                choices=_TIPO_CORRENTE,
                default="CA",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tipo_corrente_controle",
            field=models.CharField(
                choices=_TIPO_CORRENTE,
                default="CC",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tipo_dissipador",
            field=models.CharField(
                blank=True,
                choices=_DISSIP,
                max_length=20,
                null=True,
            ),
        ),
        migrations.RunPython(
            _copiar_tensao_comando_para_carga_e_controle,
            _noop,
        ),
        migrations.RemoveField(
            model_name="especificacaoreleestadosolido",
            name="tensao_comando_v",
        ),
    ]
