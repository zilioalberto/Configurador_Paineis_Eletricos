from django.contrib import admin, messages
from django.db import transaction

from projetos.models import Projeto
from composicao_painel.models import (
    ComposicaoInclusaoManual,
    SugestaoItem,
    PendenciaItem,
    ComposicaoItem,
)
from composicao_painel.services.sugestoes.orquestrador import (
    gerar_sugestoes_painel,
)
from composicao_painel.services.sugestoes.orquestrador_pendencias import (
    reavaliar_pendencias_projeto,
)
from composicao_painel.services.sugestoes.aprovacao_sugestoes import (
    aprovar_sugestao_item,
    aprovar_sugestoes,
)

from core.choices import (
    StatusPendenciaChoices,
    StatusSugestaoChoices,
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


@admin.action(description="Aprovar sugestões selecionadas")
def aprovar_sugestoes_action(modeladmin, request, queryset):
    print("\n" + "=" * 100)
    print("[ADMIN ACTION] Iniciando aprovar_sugestoes_action")
    print(f"[ADMIN ACTION] Total de sugestões selecionadas: {queryset.count()}")

    itens_transferidos = []
    erros = []

    try:
        with transaction.atomic():
            for sugestao in queryset.select_related("projeto", "produto", "carga"):
                try:
                    print(
                        f"[ADMIN ACTION] Aprovando sugestão "
                        f"id={sugestao.id} | projeto={sugestao.projeto_id} | "
                        f"parte={sugestao.parte_painel} | "
                        f"categoria={sugestao.categoria_produto} | "
                        f"carga={sugestao.carga_id} | produto={sugestao.produto_id}"
                    )

                    item = aprovar_sugestao_item(sugestao)
                    itens_transferidos.append(item)

                except Exception as exc:
                    erro_msg = (
                        f"Sugestão {getattr(sugestao, 'id', 'sem_id')}: {str(exc)}"
                    )
                    print(f"[ADMIN ACTION] Erro ao aprovar sugestão: {erro_msg}")
                    erros.append(erro_msg)

        if itens_transferidos:
            modeladmin.message_user(
                request,
                (
                    f"{len(itens_transferidos)} sugestão(ões) aprovada(s) e "
                    f"transferida(s) para a composição."
                ),
                level=messages.SUCCESS if not erros else messages.WARNING,
            )

        if erros:
            for erro in erros:
                modeladmin.message_user(
                    request,
                    erro,
                    level=messages.WARNING,
                )

        if not itens_transferidos and not erros:
            modeladmin.message_user(
                request,
                "Nenhuma sugestão foi aprovada.",
                level=messages.INFO,
            )

    except Exception as exc:
        print(f"[ADMIN ACTION] Exceção geral em aprovar_sugestoes_action: {exc}")
        modeladmin.message_user(
            request,
            f"Erro ao aprovar sugestões: {str(exc)}",
            level=messages.ERROR,
        )

    print("[ADMIN ACTION] Finalizando aprovar_sugestoes_action")
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
        "produto__descricao",
        "produto__codigo",
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

    actions = (
        aprovar_sugestoes_action,
    )

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

    def save_model(self, request, obj, form, change):
        status_anterior = None

        if change and obj.pk:
            try:
                status_anterior = SugestaoItem.objects.get(pk=obj.pk).status
            except SugestaoItem.DoesNotExist:
                status_anterior = None

        super().save_model(request, obj, form, change)

        if (
            change
            and status_anterior != StatusSugestaoChoices.APROVADA
            and obj.status == StatusSugestaoChoices.APROVADA
        ):
            try:
                aprovar_sugestao_item(obj)
                self.message_user(
                    request,
                    "Sugestão aprovada e transferida para a composição.",
                    level=messages.SUCCESS,
                )
            except Exception as exc:
                self.message_user(
                    request,
                    f"Erro ao transferir sugestão aprovada: {str(exc)}",
                    level=messages.ERROR,
                )


@admin.register(ComposicaoItem)
class ComposicaoItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "parte_painel",
        "categoria_produto",
        "carga",
        "produto",
        "quantidade",
        "corrente_referencia_a",
        "ordem",
    )

    list_filter = (
        "parte_painel",
        "categoria_produto",
        "projeto",
    )

    search_fields = (
        "projeto__nome",
        "produto__descricao",
        "produto__codigo",
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
            "Dados da composição",
            {
                "fields": (
                    "quantidade",
                    "corrente_referencia_a",
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


@admin.register(ComposicaoInclusaoManual)
class ComposicaoInclusaoManualAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "produto",
        "quantidade",
        "ordem",
    )
    list_filter = ("projeto",)
    search_fields = (
        "projeto__nome",
        "produto__codigo",
        "produto__descricao",
    )
    autocomplete_fields = ("projeto", "produto")
    list_select_related = ("projeto", "produto")
    ordering = ("projeto", "ordem", "id")


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