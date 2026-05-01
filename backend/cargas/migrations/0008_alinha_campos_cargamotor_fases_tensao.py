"""
`numero_fases` / `tensao_motor`: default na migração só preenche linhas existentes;
`preserve_default=False` alinha o estado da migração ao modelo (sem default de ORM
persistente na operação). Para `tensao_motor`, linhas antigas recebem 220 V —
revisar cadastro se houver dados reais.
"""

from django.db import migrations, models


def _remover_tempo_partida_s_se_existir(apps, schema_editor):
    """Bases antigas podem nunca ter tido `tempo_partida_s`; evita falha no DROP."""
    connection = schema_editor.connection
    tabela = "cargas_cargamotor"
    coluna = "tempo_partida_s"
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute(
                f'ALTER TABLE "{tabela}" DROP COLUMN IF EXISTS "{coluna}" CASCADE;'
            )
        elif connection.vendor == "sqlite":
            cursor.execute(f'PRAGMA table_info("{tabela}")')
            nomes = [row[1] for row in cursor.fetchall()]
            if coluna in nomes:
                cursor.execute(
                    f'ALTER TABLE "{tabela}" DROP COLUMN "{coluna}"'
                )


def _colunas_tabela(connection, tabela: str) -> set[str]:
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


def _adicionar_numero_fases_e_tensao_motor_se_faltarem(apps, schema_editor):
    """
    Algumas bases já receberam essas colunas fora do grafo Django (drift);
    só executa ADD quando a coluna não existe. Replica o efeito de
    `preserve_default=False` no PostgreSQL.
    """
    connection = schema_editor.connection
    tabela = "cargas_cargamotor"
    colunas = _colunas_tabela(connection, tabela)
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            if "numero_fases" not in colunas:
                cursor.execute(
                    f'ALTER TABLE "{tabela}" ADD COLUMN "numero_fases" '
                    f"integer DEFAULT 3 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{tabela}" ALTER COLUMN "numero_fases" DROP DEFAULT'
                )
            if "tensao_motor" not in colunas:
                cursor.execute(
                    f'ALTER TABLE "{tabela}" ADD COLUMN "tensao_motor" '
                    f"integer DEFAULT 220 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{tabela}" ALTER COLUMN "tensao_motor" DROP DEFAULT'
                )
        elif connection.vendor == "sqlite":
            if "numero_fases" not in colunas:
                cursor.execute(
                    f'ALTER TABLE "{tabela}" ADD COLUMN "numero_fases" '
                    f"integer NOT NULL DEFAULT 3"
                )
            if "tensao_motor" not in colunas:
                cursor.execute(
                    f'ALTER TABLE "{tabela}" ADD COLUMN "tensao_motor" '
                    f"integer NOT NULL DEFAULT 220"
                )


class Migration(migrations.Migration):
    dependencies = [
        ("cargas", "0007_tipo_protecao_minidisjuntor_sem_separador"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="cargamotor",
                    name="tempo_partida_s",
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    _remover_tempo_partida_s_se_existir,
                    migrations.RunPython.noop,
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="cargamotor",
                    name="numero_fases",
                    field=models.IntegerField(
                        choices=[(1, "Monofásico"), (3, "Trifásico")],
                        default=3,
                        help_text="Número de fases do motor.",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargamotor",
                    name="tensao_motor",
                    field=models.IntegerField(
                        choices=[
                            (24, "24V"),
                            (48, "48V"),
                            (110, "110V"),
                            (220, "220V"),
                            (380, "380V"),
                            (440, "440V"),
                            (660, "660V"),
                            (1000, "1000V"),
                        ],
                        default=220,
                        help_text="Tensão nominal do motor.",
                    ),
                    preserve_default=False,
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    _adicionar_numero_fases_e_tensao_motor_se_faltarem,
                    migrations.RunPython.noop,
                ),
            ],
        ),
    ]
