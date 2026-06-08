from django.db import migrations, models
import django.db.models.deletion


def copiar_fabricante_para_fornecedor(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(
        fornecedor_parceiro__isnull=True,
        fabricante_parceiro__isnull=False,
    ).update(fornecedor_parceiro=models.F("fabricante_parceiro"))


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0002_parceiro_comercial"),
        ("catalogo", "0007_preco_atualizado_em"),
    ]

    operations = [
        migrations.AddField(
            model_name="produto",
            name="fornecedor_parceiro",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"ativo": True, "eh_fornecedor": True},
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="produtos_fornecidos_catalogo",
                to="cadastros.parceirocomercial",
            ),
        ),
        migrations.RunPython(copiar_fabricante_para_fornecedor, migrations.RunPython.noop),
    ]
