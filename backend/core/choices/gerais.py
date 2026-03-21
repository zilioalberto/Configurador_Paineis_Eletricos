from django.db import models
class OrigemItem(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AUTOMATICA = "AUTOMATICA", "Automática"
        SUGESTAO_APROVADA = "SUGESTAO_APROVADA", "Sugestão aprovada"
    
class StatusSugestao(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        APROVADA = "APROVADA", "Aprovada"
        REJEITADA = "REJEITADA", "Rejeitada"
        SUBSTITUIDA = "SUBSTITUIDA", "Substituída"