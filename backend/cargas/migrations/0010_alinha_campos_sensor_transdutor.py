"""
Campos de alimentação em sensor/transdutor. Operações defensivas para drift de schema
(Docker / bases parcialmente alinhadas). Estado Django = modelo; banco = ADD só se faltar.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
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


def _adicionar_sensor_e_transdutor_se_faltarem(apps, schema_editor):
    connection = schema_editor.connection

    sensor = "cargas_cargasensor"
    cs = _colunas(connection, sensor)
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            if "corrente_consumida_ma" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "corrente_consumida_ma" '
                    f"numeric(8, 2) DEFAULT 20.00 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ALTER COLUMN "corrente_consumida_ma" '
                    f"DROP DEFAULT"
                )
            if "quantidade_fios" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "quantidade_fios" '
                    f"integer NULL"
                )
            if "tensao_alimentacao" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "tensao_alimentacao" '
                    f"integer DEFAULT 24 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ALTER COLUMN "tensao_alimentacao" '
                    f"DROP DEFAULT"
                )
            if "tipo_corrente" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "tipo_corrente" '
                    f"varchar(2) DEFAULT 'CC' NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ALTER COLUMN "tipo_corrente" DROP DEFAULT'
                )
        elif connection.vendor == "sqlite":
            if "corrente_consumida_ma" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "corrente_consumida_ma" '
                    f"decimal(8, 2) NOT NULL DEFAULT 20.00"
                )
            if "quantidade_fios" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "quantidade_fios" '
                    f"integer NULL"
                )
            if "tensao_alimentacao" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "tensao_alimentacao" '
                    f"integer NOT NULL DEFAULT 24"
                )
            if "tipo_corrente" not in cs:
                cursor.execute(
                    f'ALTER TABLE "{sensor}" ADD COLUMN "tipo_corrente" '
                    f"varchar(2) NOT NULL DEFAULT 'CC'"
                )

    trans = "cargas_cargatransdutor"
    ct = _colunas(connection, trans)
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            if "corrente_consumida_ma" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "corrente_consumida_ma" '
                    f"numeric(8, 2) DEFAULT 20.00 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{trans}" ALTER COLUMN "corrente_consumida_ma" '
                    f"DROP DEFAULT"
                )
            if "quantidade_fios" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "quantidade_fios" '
                    f"integer NULL"
                )
            if "tensao_alimentacao" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "tensao_alimentacao" '
                    f"integer DEFAULT 24 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{trans}" ALTER COLUMN "tensao_alimentacao" '
                    f"DROP DEFAULT"
                )
            if "tipo_corrente" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "tipo_corrente" '
                    f"varchar(2) DEFAULT 'CC' NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{trans}" ALTER COLUMN "tipo_corrente" DROP DEFAULT'
                )
        elif connection.vendor == "sqlite":
            if "corrente_consumida_ma" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "corrente_consumida_ma" '
                    f"decimal(8, 2) NOT NULL DEFAULT 20.00"
                )
            if "quantidade_fios" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "quantidade_fios" '
                    f"integer NULL"
                )
            if "tensao_alimentacao" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "tensao_alimentacao" '
                    f"integer NOT NULL DEFAULT 24"
                )
            if "tipo_corrente" not in ct:
                cursor.execute(
                    f'ALTER TABLE "{trans}" ADD COLUMN "tipo_corrente" '
                    f"varchar(2) NOT NULL DEFAULT 'CC'"
                )


class Migration(migrations.Migration):
    dependencies = [
        ("cargas", "0009_alinha_campos_resistencia_valvula"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="cargasensor",
                    name="corrente_consumida_ma",
                    field=models.DecimalField(
                        decimal_places=2,
                        default=Decimal("20.00"),
                        help_text="Corrente consumida pelo sensor em mA.",
                        max_digits=8,
                        validators=[MinValueValidator(Decimal("0.00"))],
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargasensor",
                    name="quantidade_fios",
                    field=models.PositiveIntegerField(
                        blank=True,
                        help_text="Quantidade de fios do sensor.",
                        null=True,
                    ),
                ),
                migrations.AddField(
                    model_name="cargasensor",
                    name="tensao_alimentacao",
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
                        default=24,
                        help_text="Tensão de alimentação do sensor.",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargasensor",
                    name="tipo_corrente",
                    field=models.CharField(
                        choices=[("CA", "CA"), ("CC", "CC")],
                        default="CC",
                        help_text="Tipo de corrente da alimentação do sensor.",
                        max_length=2,
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargatransdutor",
                    name="corrente_consumida_ma",
                    field=models.DecimalField(
                        decimal_places=2,
                        default=Decimal("20.00"),
                        help_text="Corrente consumida pelo transdutor em mA.",
                        max_digits=8,
                        validators=[MinValueValidator(Decimal("0.00"))],
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargatransdutor",
                    name="quantidade_fios",
                    field=models.PositiveIntegerField(
                        blank=True,
                        help_text="Quantidade de fios do transdutor.",
                        null=True,
                    ),
                ),
                migrations.AddField(
                    model_name="cargatransdutor",
                    name="tensao_alimentacao",
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
                        default=24,
                        help_text="Tensão de alimentação do transdutor.",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargatransdutor",
                    name="tipo_corrente",
                    field=models.CharField(
                        choices=[("CA", "CA"), ("CC", "CC")],
                        default="CC",
                        help_text="Tipo de corrente da alimentação do transdutor.",
                        max_length=2,
                    ),
                    preserve_default=False,
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    _adicionar_sensor_e_transdutor_se_faltarem,
                    migrations.RunPython.noop,
                ),
            ],
        ),
    ]
