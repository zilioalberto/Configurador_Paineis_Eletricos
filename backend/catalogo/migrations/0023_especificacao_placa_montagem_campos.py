from django.db import migrations, models

from core.choices.produtos import (
    AcabamentoPlacaMontagemChoices,
    CorPlacaMontagemChoices,
    MaterialPlacaMontagemChoices,
)


def _map_material_livre(valor):
    M = MaterialPlacaMontagemChoices
    if not valor or not str(valor).strip():
        return None
    s = str(valor).lower()
    if "inox" in s:
        return M.ACO_INOX
    if "galvan" in s:
        return M.ACO_GALVANIZADO
    if "alum" in s:
        return M.ALUMINIO
    if "grp" in s or "fibra" in s or "vidro" in s:
        return M.FIBRA_VIDRO
    if "carbono" in s or "aço" in s or "aco" in s:
        return M.ACO_CARBONO
    return M.OUTRO


def _normaliza_placa_montagem(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoPlacaMontagem")
    for row in Model.objects.all().only("id", "material"):
        novo = _map_material_livre(row.material)
        Model.objects.filter(pk=row.pk).update(material=novo)


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0022_especificacao_painel_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoplacamontagem",
            name="acabamento",
            field=models.CharField(
                blank=True,
                choices=AcabamentoPlacaMontagemChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplacamontagem",
            name="cor",
            field=models.CharField(
                blank=True,
                choices=CorPlacaMontagemChoices.choices,
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplacamontagem",
            name="possui_dobras_reforco",
            field=models.BooleanField(
                default=False,
                help_text="Indica se a placa possui dobras/reforços estruturais.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplacamontagem",
            name="possui_furacao",
            field=models.BooleanField(
                default=False,
                help_text="Indica se a placa possui furação padrão de fábrica.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplacamontagem",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RunPython(
            _normaliza_placa_montagem,
            _noop,
        ),
        migrations.AlterField(
            model_name="especificacaoplacamontagem",
            name="material",
            field=models.CharField(
                blank=True,
                choices=MaterialPlacaMontagemChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
    ]
