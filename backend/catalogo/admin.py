from django.contrib import admin

from .models import (
    Produto,
    EspecificacaoContatora,
    EspecificacaoDisjuntorMotor,
    EspecificacaoSeccionadora,
)


class EspecificacaoContatoraInline(admin.StackedInline):
    model = EspecificacaoContatora
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoDisjuntorMotorInline(admin.StackedInline):
    model = EspecificacaoDisjuntorMotor
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoSeccionadoraInline(admin.StackedInline):
    model = EspecificacaoSeccionadora
    extra = 0
    max_num = 1
    can_delete = True


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "descricao",
        "categoria",
        "fabricante",
        "valor_unitario",
        "ativo",
    )
    list_filter = ("ativo", "categoria", "fabricante")
    search_fields = ("codigo", "descricao", "fabricante", "referencia_fabricante")

    fieldsets = (
        (
            "Classificação",
            {
                "fields": ("categoria",),
            },
        ),
        (
            "Dados principais",
            {
                "fields": (
                    "codigo",
                    "descricao",
                ),
            },
        ),
        (
            "Dados comerciais",
            {
                "fields": (("unidade_medida", "valor_unitario"),),
            },
        ),
        (
            "Fabricante",
            {
                "fields": (("fabricante", "referencia_fabricante"),),
            },
        ),
        (
            "Dimensões",
            {
                "fields": (("largura_mm", "altura_mm", "profundidade_mm"),),
            },
        ),
        (
            "Informações adicionais",
            {
                "fields": (
                    "ativo",
                    "observacoes_tecnicas",
                ),
            },
        ),
    )

    def get_inline_instances(self, request, obj=None):
        inline_classes = []

        if obj and obj.categoria:
            categoria_nome = obj.categoria

            if categoria_nome == "CONTATORA":
                inline_classes = [EspecificacaoContatoraInline]
            elif categoria_nome == "DISJUNTOR_MOTOR":
                inline_classes = [EspecificacaoDisjuntorMotorInline]
            elif categoria_nome == "SECCIONADORA":
                inline_classes = [EspecificacaoSeccionadoraInline]

        return [inline_class(self.model, self.admin_site) for inline_class in inline_classes]


@admin.register(EspecificacaoContatora)
class EspecificacaoContatoraAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_ac3_a",
        "corrente_ac1_a",
        "tensao_bobina_v",
        "contatos_aux_na",
        "contatos_aux_nf",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoDisjuntorMotor)
class EspecificacaoDisjuntorMotorAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "faixa_ajuste_min_a",
        "faixa_ajuste_max_a",
        "contatos_aux_na",
        "contatos_aux_nf",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoSeccionadora)
class EspecificacaoSeccionadoraAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_ac1_a",
        "corrente_ac3_a",
        "tipo_montagem",
        "tipo_fixacao",
        "cor_manopla",
    )
    search_fields = ("produto__codigo", "produto__descricao")
