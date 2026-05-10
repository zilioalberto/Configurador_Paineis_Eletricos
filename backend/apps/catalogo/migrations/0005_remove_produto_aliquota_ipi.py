from django.db import migrations


def forwards_migra_ipi_para_fiscal(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    ItemFiscalProduto = apps.get_model("fiscal", "ItemFiscalProduto")
    for p in Produto.objects.all():
        al = getattr(p, "aliquota_ipi", None)
        if al is None:
            continue
        first = (
            ItemFiscalProduto.objects.filter(produto_id=p.pk)
            .order_by("ordem", "criado_em")
            .first()
        )
        if first is None:
            ItemFiscalProduto.objects.create(
                produto_id=p.pk,
                ordem=0,
                rotulo="",
                p_ipi=al,
            )
        elif first.p_ipi is None:
            first.p_ipi = al
            first.save(update_fields=["p_ipi"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0004_produto_aliquota_ipi"),
        ("fiscal", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forwards_migra_ipi_para_fiscal, noop_reverse),
        migrations.RemoveField(
            model_name="produto",
            name="aliquota_ipi",
        ),
    ]
