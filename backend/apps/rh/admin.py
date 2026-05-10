from django.contrib import admin

from apps.rh.models import Cargo, Colaborador, Departamento, Equipe, JornadaTrabalho


@admin.register(Departamento)
class DepartamentoAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "ativo", "atualizado_em")
    list_filter = ("ativo",)
    search_fields = ("nome", "codigo")


@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display = ("nome", "ativo", "atualizado_em")
    list_filter = ("ativo",)
    search_fields = ("nome",)


@admin.register(JornadaTrabalho)
class JornadaTrabalhoAdmin(admin.ModelAdmin):
    list_display = ("nome", "carga_horaria_semanal", "hora_inicio", "hora_fim", "ativo")
    list_filter = ("ativo",)
    search_fields = ("nome",)


@admin.register(Equipe)
class EquipeAdmin(admin.ModelAdmin):
    list_display = ("nome", "departamento", "lider", "ativo")
    list_filter = ("ativo", "departamento")
    search_fields = ("nome", "departamento__nome", "lider__nome")


@admin.register(Colaborador)
class ColaboradorAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "matricula",
        "email",
        "cargo",
        "departamento",
        "equipe",
        "ativo",
    )
    list_filter = ("ativo", "cargo", "departamento", "equipe", "jornada")
    search_fields = ("nome", "matricula", "email", "documento")
