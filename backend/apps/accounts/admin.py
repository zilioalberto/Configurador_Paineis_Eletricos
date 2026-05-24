"""Registo do CustomUser no Django Admin (campos alinhados ao login por e-mail)."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Painel admin para gestão manual de utilizadores e flags Django."""

    model = CustomUser

    list_display = (
        "email",
        "first_name",
        "last_name",
        "tipo_usuario",
        "is_active",
        "is_staff",
    )
    list_filter = (
        "tipo_usuario",
        "is_active",
        "is_staff",
        "is_superuser",
    )
    ordering = ("email",)
    search_fields = ("email", "first_name", "last_name")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informações pessoais", {"fields": ("first_name", "last_name", "telefone", "tipo_usuario")}),
        ("Permissões", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Datas importantes", {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "first_name",
                "last_name",
                "telefone",
                "tipo_usuario",
                "password1",
                "password2",
                "is_active",
                "is_staff",
            ),
        }),
    )