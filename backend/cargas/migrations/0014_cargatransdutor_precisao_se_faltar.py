"""
Garante coluna precisao em cargas_cargatransdutor (bases Docker / dumps sem a coluna).
"""

from django.db import migrations


def _adicionar_precisao_se_faltar(apps, schema_editor):
    connection = schema_editor.connection
    tabela = "cargas_cargatransdutor"
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = %s
                  AND column_name = 'precisao'
                """,
                [tabela],
            )
            if cursor.fetchone() is not None:
                return
            cursor.execute(
                f'ALTER TABLE "{tabela}" ADD COLUMN "precisao" '
                f"varchar(50) DEFAULT '' NOT NULL"
            )
            cursor.execute(
                f'ALTER TABLE "{tabela}" ALTER COLUMN "precisao" DROP DEFAULT'
            )
        elif connection.vendor == "sqlite":
            cursor.execute(f'PRAGMA table_info("{tabela}")')
            colunas = {row[1] for row in cursor.fetchall()}
            if "precisao" in colunas:
                return
            cursor.execute(
                f'ALTER TABLE "{tabela}" ADD COLUMN "precisao" '
                f"varchar(50) NOT NULL DEFAULT ''"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("cargas", "0013_cargasensor_range_medicao_se_faltar"),
    ]

    operations = [
        migrations.RunPython(_adicionar_precisao_se_faltar, migrations.RunPython.noop),
    ]
