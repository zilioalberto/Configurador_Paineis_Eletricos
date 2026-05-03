import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0002_produto_categoria_char_remove_categoriaproduto"),
    ]

    operations = [
        migrations.CreateModel(
            name="EspecificacaoAcoplador",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("tipo_interface", models.CharField(max_length=60)),
                (
                    "velocidade_mbps",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_acoplador",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Acoplador",
                "verbose_name_plural": "Especificações de Acopladores",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoBorne",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("secao_condutor_max_mm2", models.DecimalField(decimal_places=2, max_digits=6)),
                (
                    "passo_mm",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=6, null=True
                    ),
                ),
                ("numero_posicoes", models.PositiveSmallIntegerField(default=1)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_borne",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Borne",
                "verbose_name_plural": "Especificações de Bornes",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoCabo",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("secao_nominal_mm2", models.DecimalField(decimal_places=2, max_digits=6)),
                ("numero_condutores", models.PositiveSmallIntegerField(default=1)),
                (
                    "tensao_isolamento_v",
                    models.PositiveIntegerField(blank=True, null=True),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_cabo",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Cabo",
                "verbose_name_plural": "Especificações de Cabos",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoCanaleta",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("largura_interna_mm", models.DecimalField(decimal_places=2, max_digits=8)),
                ("altura_interna_mm", models.DecimalField(decimal_places=2, max_digits=8)),
                ("material", models.CharField(blank=True, max_length=50)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_canaleta",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Canaleta",
                "verbose_name_plural": "Especificações de Canaletas",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoClimatizacao",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("potencia_w", models.DecimalField(decimal_places=2, max_digits=10)),
                (
                    "tensao_alimentacao_v",
                    models.IntegerField(
                        choices=[
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
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_climatizacao",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Climatização",
                "verbose_name_plural": "Especificações de Climatização",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoDisjuntorCaixaMoldada",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("corrente_nominal_a", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "tipo_montagem",
                    models.CharField(
                        choices=[
                            ("TRILHO_DIN", "Trilho DIN"),
                            ("PLACA", "Placa de montagem"),
                            ("PORTA", "Porta"),
                            ("LATERAL", "Lateral do painel"),
                            ("FUNDO", "Fundo do painel"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_disjuntor_caixa_moldada",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Disjuntor Caixa Moldada",
                "verbose_name_plural": "Especificações de Disjuntores Caixa Moldada",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoExpansaoPLC",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tipo_modulo",
                    models.CharField(
                        choices=[
                            ("DI", "Entradas digitais"),
                            ("DO", "Saídas digitais"),
                            ("AI", "Entradas analógicas"),
                            ("AO", "Saídas analógicas"),
                            ("MIXTA", "Mista"),
                            ("OUTRO", "Outro"),
                        ],
                        max_length=10,
                    ),
                ),
                ("numero_canais", models.PositiveSmallIntegerField()),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=[
                            ("TRILHO_DIN", "Trilho DIN"),
                            ("PLACA", "Placa de montagem"),
                            ("PORTA", "Porta"),
                            ("LATERAL", "Lateral do painel"),
                            ("FUNDO", "Fundo do painel"),
                        ],
                        default="TRILHO_DIN",
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_expansao_plc",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Expansão de PLC",
                "verbose_name_plural": "Especificações de Expansões de PLC",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoFonte",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_saida_v",
                    models.IntegerField(
                        choices=[
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
                    ),
                ),
                (
                    "tipo_saida",
                    models.CharField(
                        choices=[("CA", "Corrente Alternada"), ("CC", "Corrente Contínua")],
                        default="CC",
                        max_length=2,
                    ),
                ),
                (
                    "corrente_saida_a",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                (
                    "potencia_saida_w",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_fonte",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Fonte",
                "verbose_name_plural": "Especificações de Fontes",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoFusivel",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("corrente_nominal_a", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "tipo_fusivel",
                    models.CharField(
                        choices=[
                            ("ULTRA_RAPIDO", "Ultrarrápido"),
                            ("RAPIDO", "Rápido"),
                            ("RETARDADO", "Retardado (lento)"),
                            ("GG", "gG (uso geral)"),
                            ("AM", "aM (motor)"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "formato",
                    models.CharField(
                        choices=[
                            ("NH", "NH"),
                            ("CARTUCHO", "Cartucho"),
                            ("DIAZED", "Diazed"),
                            ("NEOZED", "Neozed"),
                            ("OUTRO", "Outro"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=[
                            ("TRILHO_DIN", "Trilho DIN"),
                            ("PLACA", "Placa de montagem"),
                            ("PORTA", "Porta"),
                            ("LATERAL", "Lateral do painel"),
                            ("FUNDO", "Fundo do painel"),
                        ],
                        default="TRILHO_DIN",
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_fusivel",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Fusível",
                "verbose_name_plural": "Especificações de Fusíveis",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoMiniDisjuntor",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("faixa_ajuste_min_a", models.DecimalField(decimal_places=2, max_digits=8)),
                ("faixa_ajuste_max_a", models.DecimalField(decimal_places=2, max_digits=8)),
                ("polos", models.PositiveSmallIntegerField(default=1)),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=[
                            ("TRILHO_DIN", "Trilho DIN"),
                            ("PLACA", "Placa de montagem"),
                            ("PORTA", "Porta"),
                            ("LATERAL", "Lateral do painel"),
                            ("FUNDO", "Fundo do painel"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_mini_disjuntor",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Mini Disjuntor",
                "verbose_name_plural": "Especificações de Mini Disjuntores",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoPainel",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("grau_protecao_ip", models.CharField(blank=True, max_length=15)),
                ("material", models.CharField(blank=True, max_length=80)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_painel",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Painel",
                "verbose_name_plural": "Especificações de Painéis",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoPLC",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_alimentacao_v",
                    models.IntegerField(
                        choices=[
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
                    ),
                ),
                ("entradas_digitais", models.PositiveSmallIntegerField(default=0)),
                ("saidas_digitais", models.PositiveSmallIntegerField(default=0)),
                ("entradas_analogicas", models.PositiveSmallIntegerField(default=0)),
                ("saidas_analogicas", models.PositiveSmallIntegerField(default=0)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_plc",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de PLC",
                "verbose_name_plural": "Especificações de PLCs",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoReleEstadoSolido",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_comando_v",
                    models.IntegerField(
                        choices=[
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
                    ),
                ),
                ("corrente_nominal_a", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=[
                            ("TRILHO_DIN", "Trilho DIN"),
                            ("PLACA", "Placa de montagem"),
                            ("PORTA", "Porta"),
                            ("LATERAL", "Lateral do painel"),
                            ("FUNDO", "Fundo do painel"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_rele_estado_solido",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Relé de Estado Sólido",
                "verbose_name_plural": "Especificações de Relés de Estado Sólido",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoReleSobrecarga",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("faixa_nominal_min_a", models.DecimalField(decimal_places=2, max_digits=8)),
                ("faixa_nominal_max_a", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=[
                            ("TRILHO_DIN", "Trilho DIN"),
                            ("PLACA", "Placa de montagem"),
                            ("PORTA", "Porta"),
                            ("LATERAL", "Lateral do painel"),
                            ("FUNDO", "Fundo do painel"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_rele_sobrecarga",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Relé de Sobrecarga",
                "verbose_name_plural": "Especificações de Relés de Sobrecarga",
            },
        ),
    ]
