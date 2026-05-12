"""
Garante coluna range_medicao em cargas_cargasensor (bases Docker / dumps antigos).
"""

from django.db import migrations


def _adicionar_range_medicao_se_faltar(apps, schema_editor):
    connection = schema_editor.connection
    tabela = "cargas_cargasensor"
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = %s
                  AND column_name = 'range_medicao'
                """,
                [tabela],
            )
            if cursor.fetchone() is not None:
                return
            cursor.execute(
                f'ALTER TABLE "{tabela}" ADD COLUMN "range_medicao" '
                f"varchar(100) DEFAULT '' NOT NULL"
            )
            cursor.execute(
                f'ALTER TABLE "{tabela}" ALTER COLUMN "range_medicao" DROP DEFAULT'
            )
        elif connection.vendor == "sqlite":
            cursor.execute(f'PRAGMA table_info("{tabela}")')
            colunas = {row[1] for row in cursor.fetchall()}
            if "range_medicao" in colunas:
                return
            cursor.execute(
                f'ALTER TABLE "{tabela}" ADD COLUMN "range_medicao" '
                f"varchar(100) NOT NULL DEFAULT ''"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("cargas", "0012_rele_interface_valvula_resistencia"),
    ]

    operations = [
        migrations.RunPython(_adicionar_range_medicao_se_faltar, migrations.RunPython.noop),
    ]
