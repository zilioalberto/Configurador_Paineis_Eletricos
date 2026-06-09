"""Normaliza variantes legadas da cor verde/amarelo em especificações de cabo."""

from django.db import migrations

from apps.catalogo.utils.cor_cabo import normalizar_cor_cabo


def normalizar_cores_cabo(apps, schema_editor):
    EspecificacaoCabo = apps.get_model("catalogo", "EspecificacaoCabo")
    for espec in EspecificacaoCabo.objects.exclude(cor="").iterator():
        canon = normalizar_cor_cabo(espec.cor)
        if canon and canon != espec.cor:
            espec.cor = canon
            espec.save(update_fields=["cor"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0014_especificacao_acessorio_geral"),
    ]

    operations = [
        migrations.RunPython(normalizar_cores_cabo, migrations.RunPython.noop),
    ]
