import uuid

import django.db.models.deletion
from django.db import migrations, models


def migrar_fornecedores_existentes(apps, schema_editor):
    Fornecedor = apps.get_model("cadastros", "Fornecedor")
    ParceiroComercial = apps.get_model("cadastros", "ParceiroComercial")
    EnderecoParceiro = apps.get_model("cadastros", "EnderecoParceiro")

    for fornecedor in Fornecedor.objects.all():
        parceiro, _created = ParceiroComercial.objects.update_or_create(
            documento=fornecedor.cnpj,
            defaults={
                "tipo_pessoa": "PJ",
                "razao_social": fornecedor.razao_social,
                "nome_fantasia": fornecedor.nome_fantasia,
                "inscricao_estadual": fornecedor.inscricao_estadual,
                "eh_fornecedor": True,
                "ativo": True,
                "origem": "IMPORTACAO",
                "criado_em": fornecedor.criado_em,
                "atualizado_em": fornecedor.atualizado_em,
            },
        )
        if any(
            [
                fornecedor.logradouro,
                fornecedor.numero,
                fornecedor.complemento,
                fornecedor.bairro,
                fornecedor.municipio,
                fornecedor.uf,
                fornecedor.cep,
            ]
        ):
            EnderecoParceiro.objects.get_or_create(
                parceiro=parceiro,
                principal=True,
                defaults={
                    "nome": "Principal",
                    "logradouro": fornecedor.logradouro,
                    "numero": fornecedor.numero,
                    "complemento": fornecedor.complemento,
                    "bairro": fornecedor.bairro,
                    "municipio": fornecedor.municipio,
                    "uf": fornecedor.uf,
                    "cep": fornecedor.cep,
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ParceiroComercial",
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
                    "tipo_pessoa",
                    models.CharField(
                        choices=[
                            ("PJ", "Pessoa juridica"),
                            ("PF", "Pessoa fisica"),
                            ("EX", "Estrangeiro"),
                        ],
                        default="PJ",
                        max_length=2,
                    ),
                ),
                (
                    "documento",
                    models.CharField(
                        db_index=True,
                        help_text="Documento somente digitos quando aplicavel (CNPJ/CPF).",
                        max_length=20,
                        unique=True,
                    ),
                ),
                ("razao_social", models.CharField(max_length=255)),
                ("nome_fantasia", models.CharField(blank=True, max_length=255)),
                ("inscricao_estadual", models.CharField(blank=True, max_length=20)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("telefone", models.CharField(blank=True, max_length=30)),
                ("eh_cliente", models.BooleanField(default=False)),
                ("eh_fornecedor", models.BooleanField(default=False)),
                ("eh_parceiro", models.BooleanField(default=False)),
                ("ativo", models.BooleanField(default=True)),
                (
                    "origem",
                    models.CharField(
                        choices=[
                            ("MANUAL", "Manual"),
                            ("NFE", "NF-e"),
                            ("IMPORTACAO", "Importacao"),
                        ],
                        default="MANUAL",
                        max_length=20,
                    ),
                ),
            ],
            options={
                "verbose_name": "Parceiro comercial",
                "verbose_name_plural": "Parceiros comerciais",
                "db_table": "cadastros_parceiro_comercial",
                "ordering": ["razao_social"],
            },
        ),
        migrations.CreateModel(
            name="EnderecoParceiro",
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
                ("nome", models.CharField(blank=True, max_length=80)),
                ("logradouro", models.CharField(blank=True, max_length=255)),
                ("numero", models.CharField(blank=True, max_length=20)),
                ("complemento", models.CharField(blank=True, max_length=120)),
                ("bairro", models.CharField(blank=True, max_length=120)),
                ("municipio", models.CharField(blank=True, max_length=120)),
                ("uf", models.CharField(blank=True, max_length=2)),
                ("cep", models.CharField(blank=True, max_length=8)),
                ("principal", models.BooleanField(default=False)),
                (
                    "parceiro",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="enderecos",
                        to="cadastros.parceirocomercial",
                    ),
                ),
            ],
            options={
                "verbose_name": "Endereco de parceiro",
                "verbose_name_plural": "Enderecos de parceiros",
                "db_table": "cadastros_parceiro_endereco",
                "ordering": ["-principal", "nome", "municipio"],
            },
        ),
        migrations.CreateModel(
            name="ContatoParceiro",
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
                ("nome", models.CharField(max_length=120)),
                ("cargo", models.CharField(blank=True, max_length=80)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("telefone", models.CharField(blank=True, max_length=30)),
                ("principal", models.BooleanField(default=False)),
                ("observacoes", models.TextField(blank=True)),
                (
                    "parceiro",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contatos",
                        to="cadastros.parceirocomercial",
                    ),
                ),
            ],
            options={
                "verbose_name": "Contato de parceiro",
                "verbose_name_plural": "Contatos de parceiros",
                "db_table": "cadastros_parceiro_contato",
                "ordering": ["-principal", "nome"],
            },
        ),
        migrations.RunPython(migrar_fornecedores_existentes, migrations.RunPython.noop),
        migrations.DeleteModel(name="Fornecedor"),
    ]
