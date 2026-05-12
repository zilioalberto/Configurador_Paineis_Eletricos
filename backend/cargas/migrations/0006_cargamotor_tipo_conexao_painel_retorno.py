from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cargas", "0005_alinha_campos_io_carga"),
    ]

    operations = [
        migrations.AddField(
            model_name="cargamotor",
            name="tipo_conexao_painel",
            field=models.CharField(
                choices=[
                    ("CONEXAO_BORNES_COM_PE", "Conexão a bornes com PE"),
                    ("CONEXAO_BORNES_SEM_PE", "Conexão a bornes sem PE"),
                    ("CONEXAO_DIRETO_COMPONENTE", "Conexão direta ao componente"),
                    ("OUTROS", "Outros"),
                ],
                default="CONEXAO_BORNES_COM_PE",
                help_text="Tipo de conexão da carga no painel.",
                max_length=50,
            ),
        ),
    ]
