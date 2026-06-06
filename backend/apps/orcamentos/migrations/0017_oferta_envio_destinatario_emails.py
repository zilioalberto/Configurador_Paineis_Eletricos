from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orcamentos", "0016_oferta_convite_resposta"),
    ]

    operations = [
        migrations.AddField(
            model_name="orcamentoofertaenvio",
            name="destinatario_emails",
            field=models.TextField(blank=True),
        ),
    ]
