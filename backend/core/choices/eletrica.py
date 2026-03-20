from django.db import models


class TensaoChoices(models.IntegerChoices):
    V12CC = 12, "12 V"
    V24CC = 24, "24 V"
    V48CC = 48, "48 V"
    V110CA = 110, "110 V"
    V127CA = 127, "127 V"
    V220CA = 220, "220 V"
    V380CA = 380, "380 V"
    V440CA = 440, "440 V"
    

    
class TipoCorrenteChoices(models.TextChoices):
    CA = "CA", "Corrente Alternada"
    CC = "CC", "Corrente Contínua"
    
    
class UnidadePotenciaCorrenteChoices(models.TextChoices):
    CV = "CV", "CV"
    KW = "KW", "kW"
    A = "A", "Ampere"

class NumeroFasesChoices(models.IntegerChoices):
    MONOFASICO = 1, "Monofásico"
    BIFASICO = 2, "Bifásico"
    TRIFASICO = 3, "Trifásico"


class FrequenciaChoices(models.IntegerChoices):
    HZ50 = 50, "50 Hz"
    HZ60 = 60, "60 Hz"
    
    
class TipoSinalChoices(models.TextChoices):
    DIGITAL = "DIGITAL", "Digital"
    ANALOGICO = "ANALOGICO", "Analógico"
    PULSO = "PULSO", "Pulso"
    COMUNICACAO = "COMUNICACAO", "Comunicação"
    
class TipoSinaisAnalogicosChoices(models.TextChoices):
    TENSAO_0_10VCC = "TENSAO_0_10VCC", "Tensão 0-10 VCC"
    TENSAO_M10_10VCC = "TENSAO_M10_10VCC", "Tensão -10 a 10 VCC"
    CORRENTE_0_20MA = "CORRENTE_0_20MA", "Corrente 0-20 mA"
    CORRENTE_4_20MA = "CORRENTE_4_20MA", "Corrente 4-20 mA"
    TEMPERATURA_PT100 = "TEMPERATURA_PT100", "Temperatura PT100"
    TEMPERATURA_RTD = "TEMPERATURA_RTD", "Temperatura RTD"
    OUTROS = "OUTROS", "Outros"