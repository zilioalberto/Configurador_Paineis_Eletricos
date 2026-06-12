import uuid

from django.db import migrations, models


def preencher_public_id(apps, schema_editor):
    DocumentoFiscalEmitido = apps.get_model("fiscal", "DocumentoFiscalEmitido")
    for documento in DocumentoFiscalEmitido.objects.filter(public_id__isnull=True).iterator():
        documento.public_id = uuid.uuid4()
        documento.save(update_fields=["public_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("fiscal", "0007_simples_nacional"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentofiscalemitido",
            name="public_id",
            field=models.UUIDField(db_index=True, editable=False, null=True),
        ),
        migrations.RunPython(preencher_public_id, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="documentofiscalemitido",
            name="public_id",
            field=models.UUIDField(
                db_index=True,
                default=uuid.uuid4,
                editable=False,
                unique=True,
            ),
        ),
    ]
