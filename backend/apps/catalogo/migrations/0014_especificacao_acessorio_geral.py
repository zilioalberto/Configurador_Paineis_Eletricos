# Generated manually for acessórios gerais por porte/faixa do painel.

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0013_especificacao_identificacao"),
    ]

    operations = [
        migrations.AlterField(
            model_name="produto",
            name="categoria",
            field=models.CharField(
                choices=[
                    ("CONTATORA", "Contatora"),
                    ("DISJUNTOR_MOTOR", "Disjuntor Motor"),
                    ("DISJUNTOR_CAIXA_MOLDADA", "Disjuntor Caixa Moldada"),
                    ("MINIDISJUNTOR", "Minidisjuntor"),
                    ("RELE_SOBRECARGA", "Relé de Sobrecarga"),
                    ("SECCIONADORA", "Seccionadora"),
                    ("FUSIVEL", "Fusível"),
                    ("RELE_ESTADO_SOLIDO", "Relé Estado Sólido"),
                    ("INVERSOR_FREQUENCIA", "Inversor de Frequência"),
                    ("SOFT_STARTER", "Soft Starter"),
                    ("BOTAO", "Botão de Comando"),
                    ("CHAVE_SELETORA", "Chave Seletora"),
                    ("SINALIZADOR", "Sinaleiro"),
                    ("RELE_INTERFACE", "Relé de Interface"),
                    ("TEMPORIZADOR", "Relé Temporizador"),
                    ("CONTROLADOR_TEMPERATURA", "Controlador de Temperatura"),
                    ("PLC", "PLC"),
                    ("EXPANSAO_PLC", "Expansão PLC"),
                    ("IHM", "Interface Homem Máquina (IHM)"),
                    ("MODULO_COMUNICACAO", "Módulo de Comunicação"),
                    ("GATEWAY", "Gateway"),
                    ("SWITCH_REDE", "Switch Industrial"),
                    ("RELE_SEGURANCA", "Relé de Segurança"),
                    ("FONTE_CHAVEADA", "Fonte Chaveada"),
                    ("BORNE", "Borne"),
                    ("BARRAMENTO", "Barramento"),
                    ("CABO", "Cabo"),
                    ("CANALETA", "Canaleta"),
                    ("TRILHO_DIN", "Trilho DIN"),
                    ("PAINEL", "Painel"),
                    ("CLIMATIZACAO", "Climatização"),
                    ("IDENTIFICACAO", "Identificação"),
                    ("TERMINAIS", "Terminais"),
                    ("ACESSORIOS_GERAIS", "Acessórios Gerais"),
                    ("OUTROS", "Outros"),
                    ("SEM_REGRA_SUGESTAO_AUTOMATICA", "Sem regra de sugestão automática"),
                ],
                db_index=True,
                max_length=50,
            ),
        ),
        migrations.CreateModel(
            name="EspecificacaoAcessorioGeral",
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
                    "tipo_acessorio",
                    models.CharField(
                        choices=[
                            ("KIT_MONTAGEM", "Kit de montagem"),
                            ("CONSUMIVEIS", "Consumíveis de montagem"),
                            ("DIVERSOS", "Diversos de montagem"),
                        ],
                        default="KIT_MONTAGEM",
                        max_length=40,
                    ),
                ),
                (
                    "porte_painel",
                    models.CharField(
                        choices=[
                            ("PEQUENO", "Pequeno"),
                            ("MEDIO", "Médio"),
                            ("GRANDE", "Grande"),
                            ("EXTRA_GRANDE", "Extra grande"),
                        ],
                        default="MEDIO",
                        max_length=20,
                    ),
                ),
                (
                    "largura_min_mm",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                (
                    "largura_max_mm",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                (
                    "altura_min_mm",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                (
                    "altura_max_mm",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                (
                    "profundidade_min_mm",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                (
                    "profundidade_max_mm",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                (
                    "quantidade_padrao",
                    models.DecimalField(decimal_places=2, default=1, max_digits=10),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_acessorio_geral",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Acessório Geral",
                "verbose_name_plural": "Especificações de Acessórios Gerais",
            },
        ),
    ]
