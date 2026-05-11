"""
Alinha bases criadas antes de `preco_base` existir em `catalogo_produto`.

Usa introspecção para não falhar quando a coluna já existe (instalações novas via 0001).
"""

from django.db import migrations


def _column_names(schema_editor, table: str) -> set[str]:
    with schema_editor.connection.cursor() as cursor:
        if table not in schema_editor.connection.introspection.table_names(cursor):
            return set()
        return {
            col.name
            for col in schema_editor.connection.introspection.get_table_description(
                cursor, table
            )
        }


def adicionar_preco_base_se_ausente(apps, schema_editor):
    if "preco_base" in _column_names(schema_editor, "catalogo_produto"):
        return
    vendor = schema_editor.connection.vendor
    if vendor == "postgresql":
        schema_editor.execute(
            "ALTER TABLE catalogo_produto ADD COLUMN preco_base NUMERIC(12,2) NOT NULL DEFAULT 0"
        )
    elif vendor == "sqlite":
        schema_editor.execute(
            "ALTER TABLE catalogo_produto ADD COLUMN preco_base decimal(12,2) NOT NULL DEFAULT 0"
        )
    else:
        # Fallback genérico (ex.: CI com outro backend)
        schema_editor.execute(
            "ALTER TABLE catalogo_produto ADD COLUMN preco_base NUMERIC(12,2) NOT NULL DEFAULT 0"
        )


def reverter_noop(apps, schema_editor):
    """Não remove a coluna automaticamente (evita perda de dados)."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(adicionar_preco_base_se_ausente, reverter_noop),
    ]
