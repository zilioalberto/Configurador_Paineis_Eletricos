from django.db import models

class TipoUsuarioChoices(models.TextChoices):
    ADMIN = "ADMIN", "Administrador"
    USUARIO = "USUARIO", "Usuário"
