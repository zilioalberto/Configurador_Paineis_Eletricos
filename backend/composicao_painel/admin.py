from __future__ import annotations

from django.contrib import admin, messages
from django.utils.html import format_html

from composicao_painel.models import ConjuntoPainel, ItemComposicao, SugestaoItem
from composicao_painel.services import (
    aprovar_sugestao,
    garantir_conjuntos_padrao,
    gerar_sugestoes_projeto,
    regerar_sugestoes_projeto,
    rejeitar_sugestao,
    resumo_pendencias_projeto,
)


# ==========================================================
# INLINES
# ==========================================================

class ItemComposicaoInline(admin.TabularInline):
    model = ItemComposicao
    extra = 0
    fields = (
        "produto",
        "quantidade",
        "unidade",
        "origem",
        "carga",
        "descricao_complementar",
        "observacoes",
    )
    readonly_fields = ()
    autocomplete_fields = ("produto", "carga")


class SugestaoItemInline(admin.TabularInline):
    model = SugestaoItem
    extra = 0
    fields = (
        "tipo_sugestao",
        "produto",
        "carga",
        "quantidade",
        "unidade",
        "status",
        "descricao",
    )
    readonly_fields = ()
    autocomplete_fields = ("produto", "carga")


# ==========================================================
# CONJUNTO PAINEL
# ==========================================================

@admin.register(ConjuntoPainel)
class ConjuntoPainelAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "nome",
        "ordem",
        "descricao_resumida",
        "quantidade_itens",
        "quantidade_sugestoes",
    )
    list_filter = ("nome",)
    search_fields = (
        "projeto__nome",
        "descricao",
    )
    ordering = ("projeto", "ordem", "id")
    autocomplete_fields = ("projeto",)
    inlines = [ItemComposicaoInline, SugestaoItemInline]

    def descricao_resumida(self, obj):
        if not obj.descricao:
            return "-"
        return obj.descricao[:60]
    descricao_resumida.short_description = "Descrição"

    def quantidade_itens(self, obj):
        return obj.itens.count()
    quantidade_itens.short_description = "Itens"

    def quantidade_sugestoes(self, obj):
        return obj.sugestoes.count()
    quantidade_sugestoes.short_description = "Sugestões"


# ==========================================================
# ITEM COMPOSIÇÃO
# ==========================================================

@admin.register(ItemComposicao)
class ItemComposicaoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "conjunto",
        "produto",
        "quantidade",
        "unidade",
        "origem",
        "carga",
    )
    list_filter = (
        "conjunto__nome",
        "origem",
    )
    search_fields = (
        "projeto__nome",
        "produto__codigo",
        "produto__descricao",
        "descricao_complementar",
        "carga__nome",
    )
    ordering = ("projeto", "conjunto__ordem", "id")
    autocomplete_fields = (
        "projeto",
        "conjunto",
        "produto",
        "carga",
    )

    fieldsets = (
        ("Vínculos", {
            "fields": ("projeto", "conjunto", "produto", "carga")
        }),
        ("Quantidades", {
            "fields": ("quantidade", "unidade", "origem")
        }),
        ("Complementos", {
            "fields": ("descricao_complementar", "observacoes")
        }),
    )


# ==========================================================
# AÇÕES DE SUGESTÃO
# ==========================================================

@admin.action(description="Aprovar sugestões selecionadas")
def action_aprovar_sugestoes(modeladmin, request, queryset):
    total = 0
    erros = 0

    for sugestao in queryset:
        try:
            aprovar_sugestao(sugestao)
            total += 1
        except Exception as exc:
            erros += 1
            modeladmin.message_user(
                request,
                f"Erro ao aprovar sugestão #{sugestao.pk}: {exc}",
                level=messages.ERROR,
            )

    if total:
        modeladmin.message_user(
            request,
            f"{total} sugestão(ões) aprovada(s) com sucesso.",
            level=messages.SUCCESS,
        )

    if erros:
        modeladmin.message_user(
            request,
            f"{erros} sugestão(ões) não puderam ser aprovadas.",
            level=messages.WARNING,
        )


@admin.action(description="Rejeitar sugestões selecionadas")
def action_rejeitar_sugestoes(modeladmin, request, queryset):
    total = 0
    erros = 0

    for sugestao in queryset:
        try:
            rejeitar_sugestao(sugestao)
            total += 1
        except Exception as exc:
            erros += 1
            modeladmin.message_user(
                request,
                f"Erro ao rejeitar sugestão #{sugestao.pk}: {exc}",
                level=messages.ERROR,
            )

    if total:
        modeladmin.message_user(
            request,
            f"{total} sugestão(ões) rejeitada(s) com sucesso.",
            level=messages.SUCCESS,
        )

    if erros:
        modeladmin.message_user(
            request,
            f"{erros} sugestão(ões) não puderam ser rejeitadas.",
            level=messages.WARNING,
        )


# ==========================================================
# SUGESTÃO ITEM
# ==========================================================

@admin.register(SugestaoItem)
class SugestaoItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "projeto",
        "conjunto",
        "tipo_sugestao",
        "produto",
        "quantidade",
        "unidade",
        "status",
        "carga",
        "descricao_resumida",
    )
    list_filter = (
        "status",
        "tipo_sugestao",
        "conjunto__nome",
    )
    search_fields = (
        "projeto__nome",
        "produto__codigo",
        "produto__descricao",
        "descricao",
        "justificativa",
        "carga__nome",
    )
    ordering = ("projeto", "conjunto__ordem", "id")
    autocomplete_fields = (
        "projeto",
        "conjunto",
        "produto",
        "carga",
    )
    actions = (
        action_aprovar_sugestoes,
        action_rejeitar_sugestoes,
    )

    fieldsets = (
        ("Vínculos", {
            "fields": ("projeto", "conjunto", "produto", "carga")
        }),
        ("Sugestão", {
            "fields": ("tipo_sugestao", "descricao", "justificativa", "status")
        }),
        ("Quantidades", {
            "fields": ("quantidade", "unidade")
        }),
    )

    def descricao_resumida(self, obj):
        if not obj.descricao:
            return "-"
        return obj.descricao[:60]
    descricao_resumida.short_description = "Descrição"


# ==========================================================
# ADMIN AUXILIAR NO PROJETO
# ==========================================================

# Este trecho só deve ser usado se você quiser acoplar ações no admin de Projeto.
# Se o Projeto já estiver registrado em outro app/admin.py, use admin.site.unregister/register
# somente se necessário e com cuidado.

try:
    from projetos.models import Projeto
except Exception:
    Projeto = None


if Projeto is not None:

    @admin.action(description="Garantir conjuntos padrão")
    def action_garantir_conjuntos(modeladmin, request, queryset):
        total = 0

        for projeto in queryset:
            try:
                garantir_conjuntos_padrao(projeto)
                total += 1
            except Exception as exc:
                modeladmin.message_user(
                    request,
                    f"Erro no projeto #{projeto.pk}: {exc}",
                    level=messages.ERROR,
                )

        if total:
            modeladmin.message_user(
                request,
                f"Conjuntos padrão garantidos para {total} projeto(s).",
                level=messages.SUCCESS,
            )


    @admin.action(description="Gerar sugestões do painel")
    def action_gerar_sugestoes_painel(modeladmin, request, queryset):
        total_projetos = 0
        total_sugestoes = 0

        for projeto in queryset:
            try:
                resultado = gerar_sugestoes_projeto(projeto, limpar_pendentes_antes=False)
                total_projetos += 1
                total_sugestoes += resultado.sugestoes_criadas

                if resultado.possui_erros:
                    modeladmin.message_user(
                        request,
                        f"Projeto #{projeto.pk}: {len(resultado.erros)} erro(s) durante a geração.",
                        level=messages.WARNING,
                    )
            except Exception as exc:
                modeladmin.message_user(
                    request,
                    f"Erro ao gerar sugestões para o projeto #{projeto.pk}: {exc}",
                    level=messages.ERROR,
                )

        if total_projetos:
            modeladmin.message_user(
                request,
                f"Sugestões geradas para {total_projetos} projeto(s). Total de sugestões criadas: {total_sugestoes}.",
                level=messages.SUCCESS,
            )


    @admin.action(description="Regerar sugestões do painel")
    def action_regerar_sugestoes_painel(modeladmin, request, queryset):
        total_projetos = 0
        total_sugestoes = 0

        for projeto in queryset:
            try:
                resultado = regerar_sugestoes_projeto(projeto)
                total_projetos += 1
                total_sugestoes += resultado.sugestoes_criadas

                if resultado.possui_erros:
                    modeladmin.message_user(
                        request,
                        f"Projeto #{projeto.pk}: {len(resultado.erros)} erro(s) durante a regeração.",
                        level=messages.WARNING,
                    )
            except Exception as exc:
                modeladmin.message_user(
                    request,
                    f"Erro ao regerar sugestões para o projeto #{projeto.pk}: {exc}",
                    level=messages.ERROR,
                )

        if total_projetos:
            modeladmin.message_user(
                request,
                f"Sugestões regeradas para {total_projetos} projeto(s). Total de sugestões criadas: {total_sugestoes}.",
                level=messages.SUCCESS,
            )


    class ComposicaoPainelProjetoAdminMixin:
        """
        Mixin opcional para ser usado no ProjetoAdmin.
        """

        actions = (
            "action_garantir_conjuntos",
            "action_gerar_sugestoes_painel",
            "action_regerar_sugestoes_painel",
        )

        def resumo_composicao(self, obj):
            resumo = resumo_pendencias_projeto(obj)

            if resumo["possui_pendencias"]:
                return format_html(
                    '<span style="color: #b45309; font-weight: 600;">{} pendência(s)</span>',
                    resumo["quantidade"],
                )
            return format_html(
                '<span style="color: #15803d; font-weight: 600;">Sem pendências</span>'
            )

        resumo_composicao.short_description = "Composição"


# ==========================================================
# OBSERVAÇÃO
# ==========================================================
# Se quiser integrar as actions diretamente no ProjetoAdmin já existente,
# copie as funções:
# - action_garantir_conjuntos
# - action_gerar_sugestoes_painel
# - action_regerar_sugestoes_painel
# e o método resumo_composicao para o admin do app projetos.