from django.db import migrations, models

_TIPO_FILTRO = [
    ("ENTRADA_AR", "Entrada de ar"),
    ("SAIDA_AR", "Saída de ar"),
    ("EXAUSTAO", "Exaustão"),
    ("FILTRO_VENTILADOR", "Filtro ventilador"),
]

_MATERIAL_FILTRO = [
    ("FIBRA_SINTETICA", "Fibra sintética"),
    ("ESPUMA", "Espuma"),
    ("METALICO", "Metálico"),
    ("POLIESTER", "Poliéster"),
]

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
]


def _filtro_ar_dimensao_recorte_de_legado(apps, schema_editor):
    F = apps.get_model("catalogo", "EspecificacaoFiltroAr")
    for row in F.objects.all():
        lw = row.dimensao_largura_mm
        lh = row.dimensao_altura_mm
        esp = row.espessura_mm
        cls = (row.classe_filtragem or "").strip()
        bits = []
        if lw and lh:
            bits.append(f"{lw}x{lh} mm")
        if esp:
            bits.append(f"e={esp} mm")
        dr = " ".join(bits).strip()
        if cls and dr:
            dr = f"{dr} ({cls})"
        elif cls:
            dr = cls
        if len(dr) > 30:
            dr = dr[:30]
        F.objects.filter(pk=row.pk).update(dimensao_recorte_mm=dr)


def _filtro_ar_dimensao_recorte_de_legado_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0014_especificacao_expansao_plc_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaofiltroar",
            name="tipo_filtro",
            field=models.CharField(
                choices=_TIPO_FILTRO,
                default="ENTRADA_AR",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaofiltroar",
            name="vazao_nominal_m3_h",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaofiltroar",
            name="grau_protecao_ip",
            field=models.CharField(
                blank=True,
                help_text="Ex: IP54, IP55.",
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaofiltroar",
            name="material_filtro",
            field=models.CharField(
                blank=True,
                choices=_MATERIAL_FILTRO,
                default="",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaofiltroar",
            name="dimensao_recorte_mm",
            field=models.CharField(
                blank=True,
                help_text="Ex: 125x125 mm.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaofiltroar",
            name="lavavel",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaofiltroar",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="PORTA",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            _filtro_ar_dimensao_recorte_de_legado,
            _filtro_ar_dimensao_recorte_de_legado_reverse,
        ),
        migrations.RemoveField(
            model_name="especificacaofiltroar",
            name="classe_filtragem",
        ),
        migrations.RemoveField(
            model_name="especificacaofiltroar",
            name="dimensao_largura_mm",
        ),
        migrations.RemoveField(
            model_name="especificacaofiltroar",
            name="dimensao_altura_mm",
        ),
        migrations.RemoveField(
            model_name="especificacaofiltroar",
            name="espessura_mm",
        ),
    ]
