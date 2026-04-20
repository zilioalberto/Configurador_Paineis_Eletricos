from django.contrib.auth.models import AbstractUser
from django.db import models

from accounts.manager import CustomUserManager
from core.choices import DEFAULT_PERMISSIONS_BY_TIPO, TipoUsuarioChoices



class CustomUser(AbstractUser):
    username = None

    first_name = models.CharField("nome", max_length=150, blank=True)
    last_name = models.CharField("sobrenome", max_length=150, blank=True)
    email = models.EmailField("e-mail", unique=True)
    telefone = models.CharField("telefone", max_length=20, blank=True)
    tipo_usuario = models.CharField(
        "tipo de usuário",
        max_length=20,
        choices=TipoUsuarioChoices.choices,
        default=TipoUsuarioChoices.USUARIO,
    )
    permissoes_extras = models.JSONField(
        "permissões extras",
        default=list,
        blank=True,
        help_text="Permissões adicionais concedidas especificamente a este utilizador.",
    )
    permissoes_negadas = models.JSONField(
        "permissões negadas",
        default=list,
        blank=True,
        help_text="Permissões removidas especificamente para este utilizador.",
    )
    is_active = models.BooleanField("ativo", default=True)
    date_created = models.DateTimeField("criado em", auto_now_add=True)
    date_updated = models.DateTimeField("atualizado em", auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        ordering = ["email"]

    def __str__(self):
        return self.email

    @property
    def permissoes_efetivas(self):
        base = set(DEFAULT_PERMISSIONS_BY_TIPO.get(self.tipo_usuario, set()))
        extras = set(self.permissoes_extras or [])
        negadas = set(self.permissoes_negadas or [])
        return sorted((base | extras) - negadas)