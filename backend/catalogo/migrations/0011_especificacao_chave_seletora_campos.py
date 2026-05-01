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

_TIPO_SELETOR = [
    ("MANOPLA", "Manopla"),
    ("CHAVE", "Chave com chave"),
]

_TIPO_ACIONAMENTO_CHAVE = [
    ("MANTIDO", "Mantido"),
    ("MOMENTANEO", "Momentâneo"),
]

_COR_MANOPLA_CHAVE = [
    ("PRETO", "Preto"),
    ("VERMELHO", "Vermelho"),
    ("AZUL", "Azul"),
    ("VERDE", "Verde"),
]


def _chave_seletora_minimo_duas_posicoes(apps, schema_editor):
    Chave = apps.get_model("catalogo", "EspecificacaoChaveSeletora")
    Chave.objects.filter(numero_posicoes__lt=2).update(numero_posicoes=2)


def _chave_seletora_minimo_duas_posicoes_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0010_especificacao_canaleta_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="tipo_seletor",
            field=models.CharField(
                choices=_TIPO_SELETOR,
                default="MANOPLA",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="tipo_acionamento",
            field=models.CharField(
                choices=_TIPO_ACIONAMENTO_CHAVE,
                default="MANTIDO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="angulo_comutacao_graus",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Ex: 45°, 60°, 90°",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="contatos_na",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="contatos_nf",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="diametro_furo_mm",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("22.00"),
                max_digits=5,
            ),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="cor_manopla",
            field=models.CharField(
                choices=_COR_MANOPLA_CHAVE,
                default="PRETO",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="iluminado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="tensao_iluminacao_v",
            field=models.IntegerField(
                blank=True,
                choices=_TENSAO_INTEGER_CHOICES,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="tipo_corrente_iluminacao",
            field=models.CharField(
                blank=True,
                choices=_TIPO_CORRENTE,
                max_length=2,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="retorno_automatico",
            field=models.BooleanField(
                default=False,
                help_text="Ex: posição momentânea retorna automaticamente",
            ),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="grau_protecao_ip",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name="especificacaochaveseletora",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="PORTA",
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaochaveseletora",
            name="tensao_comando_v",
        ),
        migrations.RemoveField(
            model_name="especificacaochaveseletora",
            name="corrente_nominal_a",
        ),
        migrations.RunPython(
            _chave_seletora_minimo_duas_posicoes,
            _chave_seletora_minimo_duas_posicoes_reverse,
        ),
    ]
