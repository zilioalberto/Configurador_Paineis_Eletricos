from django.contrib import admin, messages

from projetos.models import Projeto
from composicao_painel.services.sugestoes.orquestrador import (
    gerar_sugestoes_painel,
)
from composicao_painel.models import SugestaoItem


@admin.action(description="Gerar sugestões de composição do painel (teste)")
def gerar_sugestoes_painel_teste_action(modeladmin, request, queryset):
    print("\n" + "=" * 100)
    print("[ADMIN ACTION] Iniciando gerar_sugestoes_painel_teste_action")
    print(f"[ADMIN ACTION] Total de projetos selecionados: {queryset.count()}")

    if queryset.count() != 1:
        print("[ADMIN ACTION] Falha: mais de um projeto ou nenhum projeto selecionado")
        modeladmin.message_user(
            request,
            "Selecione exatamente 1 projeto para teste.",
            level=messages.WARNING,
        )
        return

    projeto = queryset.first()
    print(f"[ADMIN ACTION] Projeto selecionado: id={projeto.id} | projeto={projeto}")

    try:
        resultado = gerar_sugestoes_painel(
            projeto=projeto,
            limpar_antes=True,
        )

        print(f"[ADMIN ACTION] Resultado do orquestrador: {resultado}")

        if resultado.get("erros"):
            for erro in resultado["erros"]:
                print(f"[ADMIN ACTION] Erro encontrado: {erro}")
                modeladmin.message_user(
                    request,
                    f"Etapa {erro['etapa']}: {erro['erro']}",
                    level=messages.WARNING,
                )

        modeladmin.message_user(
            request,
            (
                f"Projeto ID {projeto.id}: "
                f"{resultado['total_sugestoes']} sugestão(ões) gerada(s)."
            ),
            level=messages.SUCCESS,
        )

    except Exception as exc:
        print(f"[ADMIN ACTION] Exceção geral: {exc}")
        modeladmin.message_user(
            request,
            f"Erro ao gerar sugestões: {str(exc)}",
            level=messages.ERROR,
        )

    print("[ADMIN ACTION] Finalizando action")
    print("=" * 100 + "\n")


@admin.register(SugestaoItem)
class SugestaoItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "parte_painel",
        "produto",
        "quantidade",
        "status",
        "ordem",
    )
    list_filter = (
        "parte_painel",
        "status",
    )
    search_fields = (
        "projeto__nome",
        "produto__nome",
        "produto__codigo",
    )
    readonly_fields = (
        "memoria_calculo",
    )


try:
    projeto_admin = admin.site._registry.get(Projeto)
    if projeto_admin:
        actions = list(getattr(projeto_admin, "actions", []) or [])
        if gerar_sugestoes_painel_teste_action not in actions:
            actions.append(gerar_sugestoes_painel_teste_action)
            projeto_admin.actions = actions
except Exception as exc:
    print(f"[ADMIN ACTION] Falha ao acoplar action ao admin de Projeto: {exc}")