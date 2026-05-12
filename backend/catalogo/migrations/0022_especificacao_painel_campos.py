from django.db import migrations, models

from core.choices.paineis import (
    MaterialPainelChoices,
    TipoInstalacaoPainelChoices,
    TipoPainelCatalogoChoices,
)


def _map_material_livre_para_enum(valor: str) -> str:
    M = MaterialPainelChoices
    if not (valor and str(valor).strip()):
        return M.ACO_CARBONO
    s = str(valor).lower()
    if "inox" in s:
        return M.ACO_INOX
    if "alum" in s:
        return M.ALUMINIO
    if "policarbon" in s:
        return M.POLICARBONATO
    if "abs" in s:
        return M.ABS
    return M.ACO_CARBONO


def _normaliza_especificacao_painel(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoPainel")
    for row in Model.objects.all().only("id", "material", "grau_protecao_ip"):
        novo_material = _map_material_livre_para_enum(row.material or "")
        gp = row.grau_protecao_ip or ""
        if len(gp) > 10:
            gp = gp[:10]
        Model.objects.filter(pk=row.pk).update(
            material=novo_material,
            grau_protecao_ip=gp,
        )


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0021_especificacao_modulo_comunicacao_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaopainel",
            name="tipo_painel",
            field=models.CharField(
                choices=TipoPainelCatalogoChoices.choices,
                default=TipoPainelCatalogoChoices.CAIXA_METALICA,
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="tipo_instalacao",
            field=models.CharField(
                choices=TipoInstalacaoPainelChoices.choices,
                default=TipoInstalacaoPainelChoices.SOBREPOR,
                max_length=30,
            ),
        ),
        migrations.RunPython(
            _normaliza_especificacao_painel,
            _noop,
        ),
        migrations.AlterField(
            model_name="especificacaopainel",
            name="material",
            field=models.CharField(
                choices=MaterialPainelChoices.choices,
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaopainel",
            name="grau_protecao_ip",
            field=models.CharField(
                blank=True,
                help_text="Ex.: IP54, IP55, IP65.",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="largura_util_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Largura útil interna para montagem.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="altura_util_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Altura útil interna para montagem.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="profundidade_util_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Profundidade útil interna.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="possui_placa_montagem",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="possui_flange",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="possui_ventilacao",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="possui_fechadura",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaopainel",
            name="cor",
            field=models.CharField(
                blank=True,
                help_text="Ex.: RAL 7035.",
                max_length=30,
            ),
        ),
    ]
