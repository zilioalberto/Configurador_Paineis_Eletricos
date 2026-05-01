from django.db import migrations


def normaliza_modo_montagem(apps, schema_editor):
    """Alinha dados aos modos válidos: catálogo geral (3); exceções por modelo."""
    obsolete_geral = {"LATERAL", "FUNDO", "ACOPLADO_CONTATOR"}

    Mini = apps.get_model("catalogo", "EspecificacaoMiniDisjuntor")
    Mini.objects.exclude(modo_montagem="TRILHO_DIN").update(modo_montagem="TRILHO_DIN")

    Dcm = apps.get_model("catalogo", "EspecificacaoDisjuntorCaixaMoldada")
    Dcm.objects.exclude(modo_montagem="PLACA").update(modo_montagem="PLACA")

    Res = apps.get_model("catalogo", "EspecificacaoReleEstadoSolido")
    Res.objects.exclude(modo_montagem__in=["TRILHO_DIN", "PLACA"]).update(
        modo_montagem="TRILHO_DIN"
    )

    Rso = apps.get_model("catalogo", "EspecificacaoReleSobrecarga")
    Rso.objects.exclude(
        modo_montagem__in=["TRILHO_DIN", "ACOPLADO_CONTATOR"]
    ).update(modo_montagem="TRILHO_DIN")

    Bot = apps.get_model("catalogo", "EspecificacaoBotao")
    Bot.objects.exclude(modo_montagem="PORTA").update(modo_montagem="PORTA")

    Ch = apps.get_model("catalogo", "EspecificacaoChaveSeletora")
    Ch.objects.exclude(modo_montagem="PORTA").update(modo_montagem="PORTA")

    generic_models = [
        "EspecificacaoBarramento",
        "EspecificacaoBorne",
        "EspecificacaoCanaleta",
        "EspecificacaoClimatizacao",
        "EspecificacaoContatora",
        "EspecificacaoControladorTemperatura",
        "EspecificacaoDisjuntorMotor",
        "EspecificacaoExpansaoPLC",
        "EspecificacaoFiltroAr",
        "EspecificacaoFonte",
        "EspecificacaoGateway",
        "EspecificacaoIHM",
        "EspecificacaoModuloComunicacao",
    ]
    for name in generic_models:
        Model = apps.get_model("catalogo", name)
        Model.objects.filter(modo_montagem__in=obsolete_geral).update(
            modo_montagem="TRILHO_DIN"
        )


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0050_especificacao_controlador_temperatura_simplifica"),
    ]

    operations = [
        migrations.RunPython(normaliza_modo_montagem, migrations.RunPython.noop),
    ]
