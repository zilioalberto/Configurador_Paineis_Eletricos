"""
Substitui flags `ocupa_*` por contagens de IO em `Carga`. Operações defensivas para
schema divergente (colunas legadas ausentes ou novas já presentes).
"""

from django.db import migrations, models


def _colunas(connection, tabela: str) -> set[str]:
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = %s
                """,
                [tabela],
            )
            return {row[0] for row in cursor.fetchall()}
        if connection.vendor == "sqlite":
            cursor.execute(f'PRAGMA table_info("{tabela}")')
            return {row[1] for row in cursor.fetchall()}
    return set()


def _remover_flags_io_legado_se_existirem(apps, schema_editor):
    tabela = "cargas_carga"
    legado = (
        "exige_fonte_auxiliar",
        "ocupa_entrada_analogica",
        "ocupa_entrada_digital",
        "ocupa_saida_analogica",
        "ocupa_saida_digital",
    )
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            for col in legado:
                cursor.execute(
                    f'ALTER TABLE "{tabela}" DROP COLUMN IF EXISTS "{col}" CASCADE;'
                )
        elif connection.vendor == "sqlite":
            existentes = _colunas(connection, tabela)
            for col in legado:
                if col in existentes:
                    cursor.execute(f'ALTER TABLE "{tabela}" DROP COLUMN "{col}"')


def _adicionar_quantidades_io_se_faltarem(apps, schema_editor):
    tabela = "cargas_carga"
    connection = schema_editor.connection
    cols = _colunas(connection, tabela)
    novos = (
        "quantidade_entradas_analogicas",
        "quantidade_entradas_digitais",
        "quantidade_entradas_rapidas",
        "quantidade_saidas_analogicas",
        "quantidade_saidas_digitais",
    )
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            for nome in novos:
                if nome not in cols:
                    cursor.execute(
                        f'ALTER TABLE "{tabela}" ADD COLUMN "{nome}" '
                        f"integer DEFAULT 0 NOT NULL"
                    )
        elif connection.vendor == "sqlite":
            for nome in novos:
                if nome not in cols:
                    cursor.execute(
                        f'ALTER TABLE "{tabela}" ADD COLUMN "{nome}" '
                        f"integer NOT NULL DEFAULT 0"
                    )


class Migration(migrations.Migration):

    dependencies = [
        ("cargas", "0004_cargamodelo"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="carga",
                    name="exige_fonte_auxiliar",
                ),
                migrations.RemoveField(
                    model_name="carga",
                    name="ocupa_entrada_analogica",
                ),
                migrations.RemoveField(
                    model_name="carga",
                    name="ocupa_entrada_digital",
                ),
                migrations.RemoveField(
                    model_name="carga",
                    name="ocupa_saida_analogica",
                ),
                migrations.RemoveField(
                    model_name="carga",
                    name="ocupa_saida_digital",
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    _remover_flags_io_legado_se_existirem,
                    migrations.RunPython.noop,
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="carga",
                    name="quantidade_entradas_analogicas",
                    field=models.PositiveIntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="carga",
                    name="quantidade_entradas_digitais",
                    field=models.PositiveIntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="carga",
                    name="quantidade_entradas_rapidas",
                    field=models.PositiveIntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="carga",
                    name="quantidade_saidas_analogicas",
                    field=models.PositiveIntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="carga",
                    name="quantidade_saidas_digitais",
                    field=models.PositiveIntegerField(default=0),
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    _adicionar_quantidades_io_se_faltarem,
                    migrations.RunPython.noop,
                ),
            ],
        ),
    ]
