from django.db import migrations, models


def migrar_painel_e_remover_placa_categoria(apps, schema_editor):
    Painel = apps.get_model("catalogo", "EspecificacaoPainel")
    for row in Painel.objects.all():
        upd = {}
        lw = getattr(row, "largura_util_mm", None)
        ah = getattr(row, "altura_util_mm", None)
        if lw is not None:
            upd["placa_largura_util_mm"] = lw
        if ah is not None:
            upd["placa_altura_util_mm"] = ah
        if upd:
            Painel.objects.filter(pk=row.pk).update(**upd)
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="PLACA_MONTAGEM").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0064_especificacao_trilho_din_simplifica"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaopainel",
            name="placa_largura_util_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Largura útil da placa de montagem.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="placa_altura_util_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Altura útil da placa de montagem.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="placa_acabamento",
            field=models.CharField(
                choices=[
                    ("GALVANIZADA", "Galvanizada"),
                    ("PINTURA_LARANJA", "Pintura laranja"),
                ],
                default="GALVANIZADA",
                max_length=30,
            ),
        ),
        migrations.RunPython(migrar_painel_e_remover_placa_categoria, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaopainel",
            name="largura_util_mm",
        ),
        migrations.RemoveField(
            model_name="especificacaopainel",
            name="altura_util_mm",
        ),
        migrations.RemoveField(
            model_name="especificacaopainel",
            name="possui_placa_montagem",
        ),
        migrations.RemoveField(
            model_name="especificacaopainel",
            name="cor",
        ),
        migrations.DeleteModel(name="EspecificacaoPlacaMontagem"),
    ]
