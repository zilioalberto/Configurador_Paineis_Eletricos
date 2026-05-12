from django.db import migrations


def _atualizar_se_existir(Model, campo, origem, destino):
    try:
        Model._meta.get_field(campo)
    except Exception:
        return
    Model.objects.filter(**{campo: origem}).update(**{campo: destino})


def atualizar_tipo_protecao_minidisjuntor(apps, schema_editor):
    CargaMotor = apps.get_model("cargas", "CargaMotor")
    CargaResistencia = apps.get_model("cargas", "CargaResistencia")
    CargaValvula = apps.get_model("cargas", "CargaValvula")

    _atualizar_se_existir(
        CargaMotor, "tipo_protecao", "MINI_DISJUNTOR", "MINIDISJUNTOR"
    )
    _atualizar_se_existir(
        CargaResistencia, "tipo_protecao", "MINI_DISJUNTOR", "MINIDISJUNTOR"
    )
    _atualizar_se_existir(
        CargaValvula, "tipo_protecao", "MINI_DISJUNTOR", "MINIDISJUNTOR"
    )


def reverter_tipo_protecao_minidisjuntor(apps, schema_editor):
    CargaMotor = apps.get_model("cargas", "CargaMotor")
    CargaResistencia = apps.get_model("cargas", "CargaResistencia")
    CargaValvula = apps.get_model("cargas", "CargaValvula")

    _atualizar_se_existir(
        CargaMotor, "tipo_protecao", "MINIDISJUNTOR", "MINI_DISJUNTOR"
    )
    _atualizar_se_existir(
        CargaResistencia, "tipo_protecao", "MINIDISJUNTOR", "MINI_DISJUNTOR"
    )
    _atualizar_se_existir(
        CargaValvula, "tipo_protecao", "MINIDISJUNTOR", "MINI_DISJUNTOR"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("cargas", "0006_cargamotor_tipo_conexao_painel_retorno"),
    ]

    operations = [
        migrations.RunPython(
            atualizar_tipo_protecao_minidisjuntor,
            reverter_tipo_protecao_minidisjuntor,
        ),
    ]
