from django.contrib import admin, messages

from projetos.models import Projeto
from composicao_painel.models import SugestaoItem, PendenciaItem
from composicao_painel.services.sugestoes.orquestrador import (
    gerar_sugestoes_painel,
)
from composicao_painel.services.sugestoes.orquestrador_pendencias import (
    reavaliar_pendencias_projeto,
)

from core.choices import StatusPendenciaChoices


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
        total_pendencias = PendenciaItem.objects.filter(projeto=projeto).count()

        if resultado.get("sugestoes"):
            print("[ADMIN ACTION] Sugestões geradas:")
            for sugestao in resultado["sugestoes"]:
                print(
                    f"  - id={sugestao.id} | "
                    f"parte={sugestao.parte_painel} | "
                    f"categoria={getattr(sugestao, 'categoria_produto', None)} | "
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

        if total_sugestoes > 0 or total_pendencias > 0:
            modeladmin.message_user(
                request,
                (
                    f"Projeto ID {projeto.id}: "
                    f"{total_sugestoes} sugestão(ões) gerada(s) e "
                    f"{total_pendencias} pendência(s) encontrada(s)."
                ),
                level=messages.SUCCESS if total_erros == 0 else messages.WARNING,
            )
        elif total_erros == 0:
            modeladmin.message_user(
                request,
                (
                    f"Projeto ID {projeto.id}: "
                    "nenhuma sugestão nem pendência foi gerada."
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

    print("[ADMIN ACTION] Finalizando gerar_sugestoes_painel_teste_action")
    print("=" * 100 + "\n")


@admin.action(description="Reavaliar pendências do projeto (teste)")
def reavaliar_pendencias_teste_action(modeladmin, request, queryset):
    print("\n" + "=" * 100)
    print("[ADMIN ACTION] Iniciando reavaliar_pendencias_teste_action")
    print(f"[ADMIN ACTION] Total de projetos selecionados: {queryset.count()}")

    if queryset.count() != 1:
        print("[ADMIN ACTION] Falha: mais de um projeto ou nenhum projeto selecionado")
        modeladmin.message_user(
            request,
            "Selecione exatamente 1 projeto para reavaliar pendências.",
            level=messages.WARNING,
        )
        return

    projeto = queryset.first()
    print(f"[ADMIN ACTION] Projeto selecionado: id={projeto.id} | projeto={projeto}")

    try:
        total_antes = PendenciaItem.objects.filter(
            projeto=projeto,
            status=StatusPendenciaChoices.ABERTA,
        ).count()

        print(f"[ADMIN ACTION] Pendências abertas antes da reavaliação: {total_antes}")

        resultado = reavaliar_pendencias_projeto(projeto)
        print(f"[ADMIN ACTION] Resultado do orquestrador_pendencias: {resultado}")

        total_depois = PendenciaItem.objects.filter(
            projeto=projeto,
            status=StatusPendenciaChoices.ABERTA,
        ).count()

        print(f"[ADMIN ACTION] Pendências abertas após reavaliação: {total_depois}")

        categorias_reavaliadas = resultado.get("categorias_reavaliadas", [])
        categorias_nao_mapeadas = resultado.get("categorias_nao_mapeadas", [])
        erros = resultado.get("erros", [])

        if categorias_reavaliadas:
            print("[ADMIN ACTION] Categorias reavaliadas:")
            for categoria in categorias_reavaliadas:
                print(f"  - {categoria}")

        if categorias_nao_mapeadas:
            print("[ADMIN ACTION] Categorias não mapeadas:")
            for categoria in categorias_nao_mapeadas:
                print(f"  - {categoria}")
                modeladmin.message_user(
                    request,
                    f"Categoria não mapeada para reavaliação: {categoria}",
                    level=messages.WARNING,
                )

        if erros:
            print("[ADMIN ACTION] Erros na reavaliação:")
            for erro in erros:
                print(f"  - {erro}")
                modeladmin.message_user(
                    request,
                    (
                        f"Erro na categoria {erro['categoria_produto']}: "
                        f"{erro['erro']}"
                    ),
                    level=messages.WARNING,
                )

        modeladmin.message_user(
            request,
            (
                f"Projeto ID {projeto.id}: "
                f"pendências abertas antes={total_antes}, depois={total_depois}. "
                f"Categorias reavaliadas={len(categorias_reavaliadas)}."
            ),
            level=messages.SUCCESS if not erros else messages.WARNING,
        )

    except Exception as exc:
        print(f"[ADMIN ACTION] Exceção geral: {exc}")
        modeladmin.message_user(
            request,
            f"Erro ao reavaliar pendências: {str(exc)}",
            level=messages.ERROR,
        )

    print("[ADMIN ACTION] Finalizando reavaliar_pendencias_teste_action")
    print("=" * 100 + "\n")


@admin.register(SugestaoItem)
class SugestaoItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "parte_painel",
        "categoria_produto",
        "carga",
        "produto",
        "quantidade",
        "corrente_referencia_a",
        "status",
        "ordem",
    )

    list_filter = (
        "parte_painel",
        "categoria_produto",
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
        "categoria_produto",
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

    ordering = ("projeto", "ordem", "parte_painel", "categoria_produto", "id")

    fieldsets = (
        (
            "Identificação",
            {
                "fields": (
                    "projeto",
                    "parte_painel",
                    "categoria_produto",
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


@admin.register(PendenciaItem)
class PendenciaItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "parte_painel",
        "categoria_produto",
        "carga",
        "descricao_resumida",
        "corrente_referencia_a",
        "status",
        "ordem",
    )

    list_filter = (
        "parte_painel",
        "categoria_produto",
        "status",
        "projeto",
    )

    search_fields = (
        "projeto__nome",
        "carga__nome",
        "carga__descricao",
        "categoria_produto",
        "descricao",
        "observacoes",
        "memoria_calculo",
    )

    readonly_fields = (
        "memoria_calculo",
        "observacoes",
    )

    autocomplete_fields = (
        "projeto",
        "carga",
    )

    list_select_related = (
        "projeto",
        "carga",
    )

    ordering = ("projeto", "ordem", "parte_painel", "categoria_produto", "id")

    fieldsets = (
        (
            "Identificação",
            {
                "fields": (
                    "projeto",
                    "parte_painel",
                    "categoria_produto",
                    "carga",
                )
            },
        ),
        (
            "Dados da pendência",
            {
                "fields": (
                    "descricao",
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
            "carga",
        )

    @admin.display(description="Descrição")
    def descricao_resumida(self, obj):
        if not obj.descricao:
            return "-"
        return obj.descricao[:80] + "..." if len(obj.descricao) > 80 else obj.descricao


try:
    projeto_admin = admin.site._registry.get(Projeto)
    if projeto_admin:
        actions = list(getattr(projeto_admin, "actions", []) or [])

        if gerar_sugestoes_painel_teste_action not in actions:
            actions.append(gerar_sugestoes_painel_teste_action)

        if reavaliar_pendencias_teste_action not in actions:
            actions.append(reavaliar_pendencias_teste_action)

        projeto_admin.actions = actions

except Exception as exc:
    print(f"[ADMIN ACTION] Falha ao acoplar actions ao admin de Projeto: {exc}")