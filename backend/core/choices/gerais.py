from django.db import models
class OrigemItemChoices(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AUTOMATICA = "AUTOMATICA", "Automática"
        SUGESTAO_APROVADA = "SUGESTAO_APROVADA", "Sugestão aprovada"
    
class StatusSugestaoChoices(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        APROVADA = "APROVADA", "Aprovada"
        REJEITADA = "REJEITADA", "Rejeitada"
        SUBSTITUIDA = "SUBSTITUIDA", "Substituída"
        
class StatusPendenciaChoices(models.TextChoices):
        ABERTA = "ABERTA", "Aberta"
        RESOLVIDA = "RESOLVIDA", "Resolvida"
        IGNORADA = "IGNORADA", "Ignorada"