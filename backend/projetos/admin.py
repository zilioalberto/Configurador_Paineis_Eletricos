from django.contrib import admin
from django import forms

from .models import Projeto
from core.choices import TipoCorrenteChoices


class ProjetoAdminForm(forms.ModelForm):
    class Meta:
        model = Projeto
        fields = "__all__"

    def clean_codigo(self):
        codigo = self.cleaned_data.get("codigo")
        if codigo:
            return codigo.upper().strip()
        return codigo

    def clean_nome(self):
        nome = self.cleaned_data.get("nome")
        if nome:
            return nome.upper().strip()
        return nome

    def clean_cliente(self):
        cliente = self.cleaned_data.get("cliente")
        if cliente:
            return cliente.upper().strip()
        return cliente


@admin.register(Projeto)
class ProjetoAdmin(admin.ModelAdmin):
    form = ProjetoAdminForm

    list_display = (
        "codigo",
        "nome",
        "cliente",
        "tipo_painel",
        "sistema_resumido",
        "tensao_nominal",
        "tensao_comando",
        "possui_plc",
        "possui_ihm",
        "possui_climatizacao",
        "status",
        "ativo",
        "possui_seccionamento",
        "criado_em",
    )

    list_display_links = ("codigo", "nome")

    list_filter = (
        "tipo_painel",
        "tipo_corrente",
        "tipo_corrente_comando",
        "status",
        "ativo",
        "possui_seccionamento",
        "possui_neutro",
        "possui_terra",
        "possui_plc",
        "possui_ihm",
        "possui_switches",
        "possui_climatizacao",
        "tipo_climatizacao",
        "possui_plaqueta_identificacao",
        "possui_faixa_identificacao",
        "possui_adesivo_alerta",
        "possui_adesivos_tensao",
        "frequencia",
        "tensao_nominal",
        "tensao_comando",
        "criado_em",
        "atualizado_em",
    )

    search_fields = (
        "codigo",
        "nome",
        "cliente",
        "descricao",
    )

    ordering = ("codigo", "nome")

    readonly_fields = (
        "criado_em",
        "atualizado_em",
    )

    list_per_page = 25

    fieldsets = (
        (
            "Identificação do Projeto",
            {
                "fields": (
                    "codigo",
                    "nome",
                    "cliente",
                    "descricao",
                    "status",
                    "ativo",
                )
            },
        ),
        (
            "Características do Painel",
            {
                "fields": (
                    "tipo_painel",
                    "fator_demanda",
                )
            },
        ),
        (
            "Alimentação Principal",
            {
                "fields": (
                    "tipo_corrente",
                    "tensao_nominal",
                    "numero_fases",
                    "frequencia",
                    "tipo_conexao_alimentacao_potencia",
                    "possui_neutro",
                    "tipo_conexao_alimentacao_neutro",
                    "possui_terra",
                    "tipo_conexao_alimentacao_terra",
                ),
                "description": (
                    "Para corrente alternada (CA), informar número de fases e frequência. "
                    "Para corrente contínua (CC), fases e frequência não se aplicam."
                ),
            },
        ),
        (
            "Comando",
            {
                "fields": (
                    "tipo_corrente_comando",
                    "tensao_comando",
                    "possui_plc",
                    "possui_ihm",
                    "possui_switches",
                )
            },
        ),
        (
            "Climatização do Painel",
            {
                "fields": (
                    "possui_climatizacao",
                    "tipo_climatizacao",
                ),
            },
        ),
        (
            "Identificação e Sinalização",
            {
                "fields": (
                    "possui_plaqueta_identificacao",
                    "possui_faixa_identificacao",
                    "possui_adesivo_alerta",
                    "possui_adesivos_tensao",
                )
            },
        ),
        (
            "Seccionamento Geral",
            {
                "fields": (
                    "possui_seccionamento",
                    "tipo_seccionamento",
                )
            },
        ),
        (
            "Controle de Registro",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                ),
            },
        ),
    )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        if "descricao" in form.base_fields:
            form.base_fields["descricao"].widget.attrs.update(
                {
                    "rows": 4,
                    "style": "text-transform: uppercase;",
                }
            )

        for field_name in ("codigo", "nome", "cliente"):
            if field_name in form.base_fields:
                form.base_fields[field_name].widget.attrs.update(
                    {"style": "text-transform: uppercase;"}
                )

        return form

    @admin.display(description="Sistema")
    def sistema_resumido(self, obj):
        partes = [obj.get_tipo_corrente_display()]

        if obj.tipo_corrente == TipoCorrenteChoices.CA and obj.numero_fases:
            mapa_fases = {
                1: "MONO",
                2: "BI",
                3: "TRI",
            }
            partes.append(mapa_fases.get(obj.numero_fases, str(obj.numero_fases)))

        if obj.possui_neutro:
            partes.append("N")

        if obj.possui_terra:
            partes.append("PE")

        return " + ".join(partes)