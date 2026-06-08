from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0008_produto_fornecedor_parceiro"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaocanaleta",
            old_name="largura_mm",
            new_name="largura_base_mm",
        ),
    ]
