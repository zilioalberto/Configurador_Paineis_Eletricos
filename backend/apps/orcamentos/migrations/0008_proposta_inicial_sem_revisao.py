"""Proposta inicial sem sufixo de revisão; Rev. A+ só após primeira revisão."""

from django.db import migrations, models
from django.db.models import Exists, OuterRef


def limpar_revisao_propostas_iniciais(apps, schema_editor):
    Orcamento = apps.get_model("orcamentos", "Orcamento")
    derivados = Orcamento.objects.filter(orcamento_origem_id=OuterRef("pk"))
    candidatos = (
        Orcamento.objects.filter(orcamento_origem__isnull=True, revisao="A")
        .annotate(tem_derivada=Exists(derivados))
        .filter(tem_derivada=False)
    )
    for orc in candidatos.iterator():
        orc.revisao = ""
        base = (orc.codigo_base or "").strip()
        if base:
            orc.codigo = base
        elif orc.codigo and " Rev " in orc.codigo:
            orc.codigo = orc.codigo.rsplit(" Rev ", 1)[0].strip()
        orc.save(update_fields=["revisao", "codigo"])


class Migration(migrations.Migration):
    dependencies = [
        ("orcamentos", "0007_orcamento_snapshot"),
    ]

    operations = [
        migrations.AlterField(
            model_name="orcamento",
            name="revisao",
            field=models.CharField(blank=True, default="", max_length=4),
        ),
        migrations.RunPython(limpar_revisao_propostas_iniciais, migrations.RunPython.noop),
    ]
