from rest_framework import permissions

from core.choices import TipoUsuarioChoices


class IsAppAdmin(permissions.BasePermission):
    """
    Administrador da aplicação: superusuário Django ou tipo_usuario ADMIN.
    Utilizado para gestão de utilizadores e futuras rotas só de administração.
    """

    message = "Apenas administradores da aplicação podem aceder a este recurso."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return getattr(user, "tipo_usuario", None) == TipoUsuarioChoices.ADMIN
