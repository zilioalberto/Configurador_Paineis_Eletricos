# Generated manually for ItemFiscalProduto

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("catalogo", "0003_produto_fornecedor"),
    ]

    operations = [
        migrations.CreateModel(
            name="ItemFiscalProduto",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("ordem", models.PositiveSmallIntegerField(default=0)),
                ("rotulo", models.CharField(blank=True, help_text="Identificação opcional (ex.: «Entrada SP», «Padrão»).", max_length=80)),
                ("cfop", models.CharField(blank=True, max_length=4, verbose_name="CFOP")),
                (
                    "origem_mercadoria",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("0", "Nacional — exceto 3, 4, 5 e 8"),
                            ("1", "Estrangeira — importação direta (exceto 6)"),
                            ("2", "Estrangeira — mercado interno (exceto 7)"),
                            ("3", "Nacional — importação >40% e ≤70%"),
                            ("4", "Nacional — processos produtivos básicos"),
                            ("5", "Nacional — importação ≤40%"),
                            ("6", "Estrangeira — importação direta sem similar nacional"),
                            ("7", "Estrangeira — mercado interno sem similar nacional"),
                            ("8", "Nacional — importação >70%"),
                        ],
                        max_length=1,
                        null=True,
                        verbose_name="Origem (ICMS)",
                    ),
                ),
                ("cst_icms", models.CharField(blank=True, max_length=3, verbose_name="CST ICMS")),
                ("csosn", models.CharField(blank=True, max_length=4, verbose_name="CSOSN")),
                (
                    "icms_grupo_xml",
                    models.CharField(
                        blank=True,
                        help_text="Nome do grupo na NF-e (ex.: ICMS00, ICMSSN102).",
                        max_length=24,
                        verbose_name="Grupo ICMS (XML)",
                    ),
                ),
                ("mod_bc_icms", models.CharField(blank=True, max_length=2, verbose_name="Modalidade BC ICMS")),
                ("v_bc_icms", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="BC ICMS")),
                ("p_icms", models.DecimalField(blank=True, decimal_places=4, max_digits=7, null=True, verbose_name="Alíquota ICMS (%)")),
                ("v_icms", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="Valor ICMS")),
                ("cst_ipi", models.CharField(blank=True, max_length=2, verbose_name="CST IPI")),
                ("v_bc_ipi", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="BC IPI")),
                ("p_ipi", models.DecimalField(blank=True, decimal_places=4, max_digits=7, null=True, verbose_name="Alíquota IPI (%)")),
                ("v_ipi", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="Valor IPI")),
                ("cst_pis", models.CharField(blank=True, max_length=2, verbose_name="CST PIS")),
                ("v_bc_pis", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="BC PIS")),
                ("p_pis", models.DecimalField(blank=True, decimal_places=4, max_digits=7, null=True, verbose_name="Alíquota PIS (%)")),
                ("v_pis", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="Valor PIS")),
                ("cst_cofins", models.CharField(blank=True, max_length=2, verbose_name="CST COFINS")),
                ("v_bc_cofins", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="BC COFINS")),
                ("p_cofins", models.DecimalField(blank=True, decimal_places=4, max_digits=7, null=True, verbose_name="Alíquota COFINS (%)")),
                ("v_cofins", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True, verbose_name="Valor COFINS")),
                ("chave_nfe", models.CharField(blank=True, db_index=True, max_length=44, verbose_name="Chave NF-e")),
                ("n_item_nfe", models.PositiveIntegerField(blank=True, null=True, verbose_name="Nº item na NF-e")),
                (
                    "produto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="itens_fiscais",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Item fiscal do produto",
                "verbose_name_plural": "Itens fiscais do produto",
                "ordering": ["ordem", "criado_em"],
            },
        ),
    ]
