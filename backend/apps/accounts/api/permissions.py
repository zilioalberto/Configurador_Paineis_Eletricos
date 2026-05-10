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


class HasEffectivePermission(permissions.BasePermission):
    """
    Verifica permissões efetivas calculadas no utilizador autenticado.
    Administrador da aplicação mantém acesso total.
    """

    message = "Você não tem permissão para esta operação."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or getattr(user, "tipo_usuario", None) == TipoUsuarioChoices.ADMIN:
            return True

        required = getattr(view, "required_permission", None)
        if callable(required):
            required = required(request, view)
        if not required:
            return True

        effective = set(getattr(user, "permissoes_efetivas", []) or [])
        return required in effective
