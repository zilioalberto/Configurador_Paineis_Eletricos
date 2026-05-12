from django.db import migrations, models

from core.choices.produtos import (
    FormatoTrilhoDINChoices,
    MaterialTrilhoDINChoices,
    TipoTrilhoDINChoices,
)


def _map_material_livre_para_enum(valor):
    M = MaterialTrilhoDINChoices
    if not (valor and str(valor).strip()):
        return M.ACO_GALVANIZADO
    s = str(valor).lower()
    if "inox" in s:
        return M.ACO_INOX
    if "alum" in s:
        return M.ALUMINIO
    if "galvan" in s or "aço" in s or "aco" in s:
        return M.ACO_GALVANIZADO
    return M.OUTRO


def _normaliza_trilho_din(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoTrilhoDIN")
    for row in Model.objects.all():
        novo = _map_material_livre_para_enum(row.material or "")
        Model.objects.filter(pk=row.pk).update(material=novo)


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0029_especificacao_temporizador_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaotrilhodin",
            name="tipo_trilho",
            field=models.CharField(
                choices=TipoTrilhoDINChoices.choices,
                default=TipoTrilhoDINChoices.TS35,
                help_text="Tipo/padrão do trilho DIN.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotrilhodin",
            name="formato",
            field=models.CharField(
                choices=FormatoTrilhoDINChoices.choices,
                default=FormatoTrilhoDINChoices.OMEGA,
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotrilhodin",
            name="altura_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Altura do perfil.",
                max_digits=5,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotrilhodin",
            name="espessura_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Espessura da chapa.",
                max_digits=4,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotrilhodin",
            name="perfurado",
            field=models.BooleanField(
                default=True,
                help_text="Indica se o trilho possui furação.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaotrilhodin",
            name="capacidade_carga_kg_m",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Capacidade de carga por metro.",
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaotrilhodin",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="especificacaotrilhodin",
            name="comprimento_mm",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Comprimento da barra (ex.: 2000 mm).",
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaotrilhodin",
            name="largura_mm",
            field=models.PositiveIntegerField(
                help_text="Largura do trilho (ex.: 35 mm).",
            ),
        ),
        migrations.RunPython(_normaliza_trilho_din, _noop),
        migrations.AlterField(
            model_name="especificacaotrilhodin",
            name="material",
            field=models.CharField(
                choices=MaterialTrilhoDINChoices.choices,
                default=MaterialTrilhoDINChoices.ACO_GALVANIZADO,
                max_length=30,
            ),
        ),
    ]
