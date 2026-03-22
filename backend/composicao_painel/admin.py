from django.contrib import admin, messages

from projetos.models import Projeto
from composicao_painel.models import SugestaoItem
from composicao_painel.services.sugestoes.orquestrador import (
    gerar_sugestoes_painel,
)


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

        total_sugestoes = resultado.get("total_sugestoes", 0)
        total_erros = len(resultado.get("erros", []))

        if resultado.get("sugestoes"):
            print("[ADMIN ACTION] Sugestões geradas:")
            for sugestao in resultado["sugestoes"]:
                print(
                    f"  - id={sugestao.id} | "
                    f"parte={sugestao.parte_painel} | "
                    f"carga={getattr(sugestao, 'carga', None)} | "
                    f"produto={sugestao.produto}"
                )

        if resultado.get("erros"):
            for erro in resultado["erros"]:
                print(f"[ADMIN ACTION] Erro encontrado: {erro}")
                modeladmin.message_user(
                    request,
                    f"Etapa {erro['etapa']}: {erro['erro']}",
                    level=messages.WARNING,
                )

        if total_sugestoes > 0:
            modeladmin.message_user(
                request,
                (
                    f"Projeto ID {projeto.id}: "
                    f"{total_sugestoes} sugestão(ões) gerada(s) com sucesso."
                ),
                level=messages.SUCCESS,
            )
        elif total_erros == 0:
            modeladmin.message_user(
                request,
                (
                    f"Projeto ID {projeto.id}: "
                    "nenhuma sugestão foi gerada."
                ),
                level=messages.INFO,
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
        "carga",
        "produto",
        "quantidade",
        "corrente_referencia_a",
        "status",
        "ordem",
    )

    list_filter = (
        "parte_painel",
        "status",
        "projeto",
    )

    search_fields = (
        "projeto__nome",
        "produto__nome",
        "produto__descricao",
        "produto__codigo",
        "carga__nome",
        "carga__descricao",
    )

    readonly_fields = (
        "memoria_calculo",
        "observacoes",
    )

    autocomplete_fields = (
        "projeto",
        "produto",
        "carga",
    )

    list_select_related = (
        "projeto",
        "produto",
        "carga",
    )

    ordering = ("projeto", "ordem", "parte_painel", "id")

    fieldsets = (
        (
            "Identificação",
            {
                "fields": (
                    "projeto",
                    "parte_painel",
                    "carga",
                    "produto",
                )
            },
        ),
        (
            "Dados da sugestão",
            {
                "fields": (
                    "quantidade",
                    "corrente_referencia_a",
                    "status",
                    "ordem",
                )
            },
        ),
        (
            "Rastreabilidade",
            {
                "fields": (
                    "memoria_calculo",
                    "observacoes",
                )
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "projeto",
            "produto",
            "carga",
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