from django.db import migrations, models


def preencher_preco_atualizado_em(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Servico = apps.get_model("catalogo", "Servico")
    for model in (Produto, Servico):
        for obj in model.objects.filter(preco_atualizado_em__isnull=True):
            obj.preco_atualizado_em = obj.atualizado_em or obj.criado_em
            obj.save(update_fields=("preco_atualizado_em",))


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0006_catalogo_servico"),
    ]

    operations = [
        migrations.AddField(
            model_name="produto",
            name="preco_atualizado_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Data da última revisão comercial do preço de referência.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="servico",
            name="preco_atualizado_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Data da última revisão comercial do preço de referência.",
                null=True,
            ),
        ),
        migrations.RunPython(preencher_preco_atualizado_em, migrations.RunPython.noop),
    ]
