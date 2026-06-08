from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("fiscal", "0004_manifestacao_destinatario"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="objetivo_entrada",
            field=models.CharField(
                choices=[
                    ("INDUSTRIALIZACAO", "Industrialização"),
                    ("REVENDA", "Revenda"),
                    ("USO_CONSUMO", "Uso e consumo"),
                    ("ATIVO_IMOBILIZADO", "Ativo imobilizado"),
                    ("DEVOLUCAO_VENDA", "Devolução de venda"),
                    ("RETORNO_INDUSTRIALIZACAO", "Retorno de industrialização"),
                    ("RETORNO_CONSERTO_REPARO", "Retorno de conserto/reparo"),
                    ("TRANSFERENCIA", "Transferência"),
                    ("BONIFICACAO_DOACAO_BRINDE", "Bonificação, doação ou brinde"),
                    ("AMOSTRA_GRATIS", "Amostra grátis"),
                    ("COMODATO_EMPRESTIMO", "Comodato/empréstimo"),
                    ("DEMONSTRACAO", "Demonstração"),
                    ("IMPORTACAO", "Importação"),
                    ("OUTRAS_ENTRADAS", "Outras entradas"),
                ],
                db_index=True,
                default="OUTRAS_ENTRADAS",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="itemfiscalproduto",
            name="objetivo_entrada",
            field=models.CharField(
                choices=[
                    ("INDUSTRIALIZACAO", "Industrialização"),
                    ("REVENDA", "Revenda"),
                    ("USO_CONSUMO", "Uso e consumo"),
                    ("ATIVO_IMOBILIZADO", "Ativo imobilizado"),
                    ("DEVOLUCAO_VENDA", "Devolução de venda"),
                    ("RETORNO_INDUSTRIALIZACAO", "Retorno de industrialização"),
                    ("RETORNO_CONSERTO_REPARO", "Retorno de conserto/reparo"),
                    ("TRANSFERENCIA", "Transferência"),
                    ("BONIFICACAO_DOACAO_BRINDE", "Bonificação, doação ou brinde"),
                    ("AMOSTRA_GRATIS", "Amostra grátis"),
                    ("COMODATO_EMPRESTIMO", "Comodato/empréstimo"),
                    ("DEMONSTRACAO", "Demonstração"),
                    ("IMPORTACAO", "Importação"),
                    ("OUTRAS_ENTRADAS", "Outras entradas"),
                ],
                db_index=True,
                default="OUTRAS_ENTRADAS",
                max_length=40,
                verbose_name="Objetivo da entrada",
            ),
        ),
    ]
