# Migração: Produto.categoria deixa de ser FK para CategoriaProduto e passa a ser
# CharField alinhado a CategoriaProdutoNomeChoices (como no modelo atual).

from django.db import migrations, models


def copiar_categoria_fk_para_texto(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    CategoriaProduto = apps.get_model("catalogo", "CategoriaProduto")
    for p in Produto.objects.all().iterator():
        if not p.categoria_id:
            p.categoria_codigo = "OUTROS"
        else:
            try:
                cat = CategoriaProduto.objects.get(pk=p.categoria_id)
                p.categoria_codigo = cat.nome
            except CategoriaProduto.DoesNotExist:
                p.categoria_codigo = "OUTROS"
        p.save(update_fields=["categoria_codigo"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="produto",
            name="categoria_codigo",
            field=models.CharField(max_length=50, null=True),
        ),
        migrations.RunPython(copiar_categoria_fk_para_texto, noop_reverse),
        migrations.RemoveField(
            model_name="produto",
            name="categoria",
        ),
        migrations.RenameField(
            model_name="produto",
            old_name="categoria_codigo",
            new_name="categoria",
        ),
        migrations.AlterField(
            model_name="produto",
            name="categoria",
            field=models.CharField(
                choices=[
                    ("CONTATORA", "Contatora"),
                    ("DISJUNTOR_MOTOR", "Disjuntor Motor"),
                    ("RELE_SOBRECARGA", "Relé de Sobrecarga"),
                    ("MINI_DISJUNTOR", "Mini disjuntor"),
                    ("SECCIONADORA", "Seccionadora"),
                    ("DISJUNTOR_CAIXA_MOLDADA", "Disjuntor Caixa Moldada"),
                    ("FONTE", "Fonte"),
                    ("PLC", "PLC"),
                    ("EXPANSAO_PLC", "Expansão PLC"),
                    ("BORNE", "Borne"),
                    ("CABO", "Cabo"),
                    ("CANALETA", "Canaleta"),
                    ("PAINEL", "Painel"),
                    ("CLIMATIZACAO", "Climatização"),
                    ("OUTROS", "Outros"),
                ],
                max_length=50,
            ),
        ),
        migrations.DeleteModel(
            name="CategoriaProduto",
        ),
    ]
