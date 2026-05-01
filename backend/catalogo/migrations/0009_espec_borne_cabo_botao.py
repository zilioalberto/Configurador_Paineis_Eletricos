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

_TIPO_BORNE = [
    ("PASSAGEM", "Passagem"),
    ("TERRA", "Terra"),
    ("FUSIVEL", "Fusível"),
    ("SECCIONAVEL", "Seccionável"),
    ("SENSOR", "Sensor"),
    ("DUPLO_NIVEL", "Duplo nível"),
]

_TIPO_CONEXAO_BORNE = [
    ("PARAFUSO", "Parafuso"),
    ("MOLA", "Mola"),
    ("PUSH_IN", "Push-in"),
]

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
]

_TIPO_CABO = [
    ("POTENCIA", "Potência"),
    ("COMANDO", "Comando"),
    ("SINAL", "Sinal"),
    ("REDE", "Rede / Comunicação"),
    ("ATERRAMENTO", "Aterramento"),
]

_MATERIAL_CONDUTOR = [
    ("COBRE", "Cobre"),
    ("ALUMINIO", "Alumínio"),
]

_TIPO_ISOLACAO_CABO = [
    ("PVC", "PVC"),
    ("HEPR", "HEPR"),
    ("EPR", "EPR"),
    ("XLPE", "XLPE"),
]

_COR_CABO = [
    ("PRETO", "Preto"),
    ("AZUL", "Azul"),
    ("VERMELHO", "Vermelho"),
    ("BRANCO", "Branco"),
    ("VERDE_AMARELO", "Verde/Amarelo"),
    ("CINZA", "Cinza"),
]

_TIPO_BOTAO = [
    ("PULSADOR", "Pulsador"),
    ("EMERGENCIA", "Emergência"),
]

_TIPO_ACIONAMENTO_BOTAO_MODO = [
    ("MOMENTANEO", "Momentâneo"),
    ("RETENCAO", "Com retenção"),
]

_COR_BOTAO = [
    ("VERDE", "Verde"),
    ("VERMELHO", "Vermelho"),
    ("AMARELO", "Amarelo"),
    ("AZUL", "Azul"),
    ("PRETO", "Preto"),
    ("BRANCO", "Branco"),
]

_TIPO_CORRENTE = [
    ("CA", "Corrente Alternada"),
    ("CC", "Corrente Contínua"),
]


def _borne_copiar_numero_posicoes_para_niveis(apps, schema_editor):
    Borne = apps.get_model("catalogo", "EspecificacaoBorne")
    for row in Borne.objects.all():
        row.numero_niveis = row.numero_posicoes
        row.save(update_fields=["numero_niveis"])


def _borne_copiar_numero_posicoes_para_niveis_reverse(apps, schema_editor):
    Borne = apps.get_model("catalogo", "EspecificacaoBorne")
    for row in Borne.objects.all():
        row.numero_posicoes = row.numero_niveis
        row.save(update_fields=["numero_posicoes"])


def _botao_mapear_acionamento_legado(apps, schema_editor):
    Botao = apps.get_model("catalogo", "EspecificacaoBotao")
    for row in Botao.objects.all():
        leg = row.legado_tipo_acionamento_botao
        if leg == "MANTIDO":
            row.tipo_acionamento = "RETENCAO"
        else:
            row.tipo_acionamento = "MOMENTANEO"
        row.save(update_fields=["tipo_acionamento"])


def _botao_mapear_acionamento_legado_reverse(apps, schema_editor):
    Botao = apps.get_model("catalogo", "EspecificacaoBotao")
    for row in Botao.objects.all():
        if row.tipo_acionamento == "RETENCAO":
            row.legado_tipo_acionamento_botao = "MANTIDO"
        else:
            row.legado_tipo_acionamento_botao = "MOMENTANEO"
        row.save(update_fields=["legado_tipo_acionamento_botao"])


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0008_especificacao_barramento_campos"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaoborne",
            old_name="secao_condutor_max_mm2",
            new_name="secao_max_mm2",
        ),
        migrations.AlterField(
            model_name="especificacaoborne",
            name="secao_max_mm2",
            field=models.DecimalField(decimal_places=2, max_digits=8),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="tipo_borne",
            field=models.CharField(
                choices=_TIPO_BORNE,
                default="PASSAGEM",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="tipo_conexao",
            field=models.CharField(
                choices=_TIPO_CONEXAO_BORNE,
                default="PARAFUSO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="secao_min_mm2",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="corrente_nominal_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="tensao_nominal_v",
            field=models.IntegerField(
                blank=True,
                choices=_TENSAO_INTEGER_CHOICES,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="numero_niveis",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.RunPython(
            _borne_copiar_numero_posicoes_para_niveis,
            _borne_copiar_numero_posicoes_para_niveis_reverse,
        ),
        migrations.RemoveField(
            model_name="especificacaoborne",
            name="numero_posicoes",
        ),
        migrations.RemoveField(
            model_name="especificacaoborne",
            name="passo_mm",
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="numero_conexoes",
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="possui_terra",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="possui_fusivel",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="possui_seccionamento",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoborne",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="TRILHO_DIN",
                max_length=20,
            ),
        ),
        migrations.RenameField(
            model_name="especificacaocabo",
            old_name="secao_nominal_mm2",
            new_name="secao_mm2",
        ),
        migrations.AlterField(
            model_name="especificacaocabo",
            name="secao_mm2",
            field=models.DecimalField(decimal_places=2, max_digits=8),
        ),
        migrations.RenameField(
            model_name="especificacaocabo",
            old_name="tensao_isolamento_v",
            new_name="tensao_isolacao_v",
        ),
        migrations.AddField(
            model_name="especificacaocabo",
            name="tipo_cabo",
            field=models.CharField(
                choices=_TIPO_CABO,
                default="POTENCIA",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaocabo",
            name="corrente_admissivel_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocabo",
            name="material_condutor",
            field=models.CharField(
                choices=_MATERIAL_CONDUTOR,
                default="COBRE",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocabo",
            name="tipo_isolacao",
            field=models.CharField(
                choices=_TIPO_ISOLACAO_CABO,
                default="PVC",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaocabo",
            name="cor",
            field=models.CharField(
                choices=_COR_CABO,
                default="PRETO",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaocabo",
            name="blindado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaocabo",
            name="flexivel",
            field=models.BooleanField(default=False),
        ),
        migrations.RenameField(
            model_name="especificacaobotao",
            old_name="tipo_acionamento",
            new_name="legado_tipo_acionamento_botao",
        ),
        migrations.RenameField(
            model_name="especificacaobotao",
            old_name="numero_contatos_na",
            new_name="contatos_na",
        ),
        migrations.RenameField(
            model_name="especificacaobotao",
            old_name="numero_contatos_nf",
            new_name="contatos_nf",
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="tipo_botao",
            field=models.CharField(
                choices=_TIPO_BOTAO,
                default="PULSADOR",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="tipo_acionamento",
            field=models.CharField(
                choices=_TIPO_ACIONAMENTO_BOTAO_MODO,
                default="MOMENTANEO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="cor",
            field=models.CharField(
                choices=_COR_BOTAO,
                default="VERDE",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="diametro_furo_mm",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("22.00"),
                max_digits=5,
            ),
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="iluminado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="tensao_iluminacao_v",
            field=models.IntegerField(
                blank=True,
                choices=_TENSAO_INTEGER_CHOICES,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="tipo_corrente_iluminacao",
            field=models.CharField(
                blank=True,
                choices=_TIPO_CORRENTE,
                max_length=2,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="grau_protecao_ip",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name="especificacaobotao",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="PORTA",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            _botao_mapear_acionamento_legado,
            _botao_mapear_acionamento_legado_reverse,
        ),
        migrations.RemoveField(
            model_name="especificacaobotao",
            name="legado_tipo_acionamento_botao",
        ),
        migrations.RemoveField(
            model_name="especificacaobotao",
            name="tensao_comando_v",
        ),
    ]
