"""
Alinha `CargaResistencia` e `CargaValvula` ao modelo atual.

Linhas antigas de resistência (schema legado sem kW/tensão) recebem valores
mínimos só para satisfazer NOT NULL na migração; `preserve_default=False`
no estado Django evita default persistente na operação. Dados legados devem
ser revisados no cadastro.

Operações de schema são defensivas (drift Docker/bases parcialmente migradas).
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


def _remover_colunas_legado_resistencia_se_existirem(apps, schema_editor):
    tabela = "cargas_cargaresistencia"
    legado = ("controle_em_etapas", "controle_pid", "quantidade_etapas")
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
                    cursor.execute(
                        f'ALTER TABLE "{tabela}" DROP COLUMN "{col}"'
                    )


def _adicionar_resistencia_e_valvula_se_faltarem(apps, schema_editor):
    connection = schema_editor.connection

    res = "cargas_cargaresistencia"
    cols_r = _colunas(connection, res)
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            if "corrente_calculada_a" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "corrente_calculada_a" '
                    f"numeric(10, 2) NULL"
                )
            if "numero_fases" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "numero_fases" '
                    f"integer DEFAULT 3 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{res}" ALTER COLUMN "numero_fases" DROP DEFAULT'
                )
            if "potencia_kw" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "potencia_kw" '
                    f"numeric(10, 3) DEFAULT 0.001 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{res}" ALTER COLUMN "potencia_kw" DROP DEFAULT'
                )
            if "tensao_resistencia" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "tensao_resistencia" '
                    f"integer DEFAULT 220 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{res}" ALTER COLUMN "tensao_resistencia" '
                    f"DROP DEFAULT"
                )
            if "tipo_acionamento" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "tipo_acionamento" '
                    f"varchar(30) DEFAULT 'RELE_ESTADO_SOLIDO' NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{res}" ALTER COLUMN "tipo_acionamento" '
                    f"DROP DEFAULT"
                )
            if "tipo_protecao" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "tipo_protecao" '
                    f"varchar(30) DEFAULT 'FUSIVEL_ULTRARRAPIDO' NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{res}" ALTER COLUMN "tipo_protecao" DROP DEFAULT'
                )
        elif connection.vendor == "sqlite":
            if "corrente_calculada_a" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "corrente_calculada_a" '
                    f"decimal(10, 2) NULL"
                )
            if "numero_fases" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "numero_fases" '
                    f"integer NOT NULL DEFAULT 3"
                )
            if "potencia_kw" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "potencia_kw" '
                    f"decimal(10, 3) NOT NULL DEFAULT 0.001"
                )
            if "tensao_resistencia" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "tensao_resistencia" '
                    f"integer NOT NULL DEFAULT 220"
                )
            if "tipo_acionamento" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "tipo_acionamento" '
                    f"varchar(30) NOT NULL DEFAULT 'RELE_ESTADO_SOLIDO'"
                )
            if "tipo_protecao" not in cols_r:
                cursor.execute(
                    f'ALTER TABLE "{res}" ADD COLUMN "tipo_protecao" '
                    f"varchar(30) NOT NULL DEFAULT 'FUSIVEL_ULTRARRAPIDO'"
                )

    val = "cargas_cargavalvula"
    cols_v = _colunas(connection, val)
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            if "corrente_consumida_ma" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "corrente_consumida_ma" '
                    f"numeric(8, 2) DEFAULT 200.00 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{val}" ALTER COLUMN "corrente_consumida_ma" '
                    f"DROP DEFAULT"
                )
            if "quantidade_solenoides" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "quantidade_solenoides" '
                    f"integer DEFAULT 1 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{val}" ALTER COLUMN "quantidade_solenoides" '
                    f"DROP DEFAULT"
                )
            if "tensao_alimentacao" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tensao_alimentacao" '
                    f"integer DEFAULT 24 NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{val}" ALTER COLUMN "tensao_alimentacao" '
                    f"DROP DEFAULT"
                )
            if "tipo_acionamento" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tipo_acionamento" '
                    f"varchar(30) DEFAULT 'RELE_ESTADO_SOLIDO' NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{val}" ALTER COLUMN "tipo_acionamento" '
                    f"DROP DEFAULT"
                )
            if "tipo_corrente" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tipo_corrente" '
                    f"varchar(2) DEFAULT 'CC' NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{val}" ALTER COLUMN "tipo_corrente" DROP DEFAULT'
                )
            if "tipo_protecao" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tipo_protecao" '
                    f"varchar(30) DEFAULT 'BORNE_FUSIVEL' NOT NULL"
                )
                cursor.execute(
                    f'ALTER TABLE "{val}" ALTER COLUMN "tipo_protecao" DROP DEFAULT'
                )
        elif connection.vendor == "sqlite":
            if "corrente_consumida_ma" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "corrente_consumida_ma" '
                    f"decimal(8, 2) NOT NULL DEFAULT 200.00"
                )
            if "quantidade_solenoides" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "quantidade_solenoides" '
                    f"integer NOT NULL DEFAULT 1"
                )
            if "tensao_alimentacao" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tensao_alimentacao" '
                    f"integer NOT NULL DEFAULT 24"
                )
            if "tipo_acionamento" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tipo_acionamento" '
                    f"varchar(30) NOT NULL DEFAULT 'RELE_ESTADO_SOLIDO'"
                )
            if "tipo_corrente" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tipo_corrente" '
                    f"varchar(2) NOT NULL DEFAULT 'CC'"
                )
            if "tipo_protecao" not in cols_v:
                cursor.execute(
                    f'ALTER TABLE "{val}" ADD COLUMN "tipo_protecao" '
                    f"varchar(30) NOT NULL DEFAULT 'BORNE_FUSIVEL'"
                )


class Migration(migrations.Migration):
    dependencies = [
        ("cargas", "0008_alinha_campos_cargamotor_fases_tensao"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="cargaresistencia",
                    name="controle_em_etapas",
                ),
                migrations.RemoveField(
                    model_name="cargaresistencia",
                    name="controle_pid",
                ),
                migrations.RemoveField(
                    model_name="cargaresistencia",
                    name="quantidade_etapas",
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    _remover_colunas_legado_resistencia_se_existirem,
                    migrations.RunPython.noop,
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="cargaresistencia",
                    name="corrente_calculada_a",
                    field=models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        editable=False,
                        max_digits=10,
                        null=True,
                    ),
                ),
                migrations.AddField(
                    model_name="cargaresistencia",
                    name="numero_fases",
                    field=models.IntegerField(
                        choices=[(1, "Monofásico"), (3, "Trifásico")],
                        default=3,
                        help_text="Número de fases da resistência.",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargaresistencia",
                    name="potencia_kw",
                    field=models.DecimalField(
                        decimal_places=3,
                        default=Decimal("0.001"),
                        help_text="Potência da resistência em kW.",
                        max_digits=10,
                        validators=[MinValueValidator(Decimal("0.001"))],
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargaresistencia",
                    name="tensao_resistencia",
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
                        help_text="Tensão nominal da resistência.",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargaresistencia",
                    name="tipo_acionamento",
                    field=models.CharField(
                        choices=[
                            ("CONTATOR", "Contator"),
                            ("RELE_ESTADO_SOLIDO", "Relé de Estado Sólido"),
                            ("OUTRO", "Outro"),
                        ],
                        default="RELE_ESTADO_SOLIDO",
                        help_text="Tipo de acionamento da resistência.",
                        max_length=30,
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargaresistencia",
                    name="tipo_protecao",
                    field=models.CharField(
                        choices=[
                            ("FUSIVEL_ULTRARRAPIDO", "Fusível Ultrarrápido"),
                            ("DISJUNTOR_MOTOR", "Disjuntor Motor"),
                            ("DISJUNTOR_CAIXA_MOLDADA", "Disjuntor Caixa Moldada"),
                            ("MINIDISJUNTOR", "Minidisjuntor"),
                            ("OUTRO", "Outro"),
                        ],
                        default="FUSIVEL_ULTRARRAPIDO",
                        help_text="Tipo de proteção elétrica da resistência.",
                        max_length=30,
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargavalvula",
                    name="corrente_consumida_ma",
                    field=models.DecimalField(
                        decimal_places=2,
                        default=Decimal("200.00"),
                        help_text="Corrente consumida pela válvula em mA.",
                        max_digits=8,
                        validators=[MinValueValidator(Decimal("0.00"))],
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargavalvula",
                    name="quantidade_solenoides",
                    field=models.PositiveIntegerField(
                        default=1,
                        help_text="Quantidade de solenoides da válvula.",
                        validators=[MinValueValidator(1)],
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargavalvula",
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
                        help_text="Tensão de alimentação da válvula.",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargavalvula",
                    name="tipo_acionamento",
                    field=models.CharField(
                        choices=[
                            ("CONTATOR", "Contator"),
                            ("RELE_INTERFACE", "Relé de Interface"),
                            ("RELE_ESTADO_SOLIDO", "Relé de Estado Sólido"),
                            ("CLP_DIRETO", "Saída direta do CLP"),
                            ("OUTRO", "Outro"),
                        ],
                        default="RELE_ESTADO_SOLIDO",
                        help_text="Tipo de acionamento da válvula.",
                        max_length=30,
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargavalvula",
                    name="tipo_corrente",
                    field=models.CharField(
                        choices=[("CA", "CA"), ("CC", "CC")],
                        default="CC",
                        help_text="Tipo de corrente da alimentação da válvula.",
                        max_length=2,
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="cargavalvula",
                    name="tipo_protecao",
                    field=models.CharField(
                        choices=[
                            ("BORNE_FUSIVEL", "Borne Fusível"),
                            ("DISJUNTOR_MOTOR", "Disjuntor Motor"),
                            ("DISJUNTOR_CAIXA_MOLDADA", "Disjuntor Caixa Moldada"),
                            ("MINIDISJUNTOR", "Minidisjuntor"),
                            ("OUTRO", "Outro"),
                        ],
                        default="BORNE_FUSIVEL",
                        help_text="Tipo de proteção elétrica da válvula.",
                        max_length=30,
                    ),
                    preserve_default=False,
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    _adicionar_resistencia_e_valvula_se_faltarem,
                    migrations.RunPython.noop,
                ),
            ],
        ),
    ]
