from django.db import models


class TipoCargaChoices(models.TextChoices):
    MOTOR = "MOTOR", "Motor"
    VALVULA = "VALVULA", "Válvula"
    RESISTENCIA = "RESISTENCIA", "Resistência"
    SENSOR = "SENSOR", "Sensor"
    TRANSDUTOR = "TRANSDUTOR", "Transdutor"
    TRANSMISSOR = "TRANSMISSOR", "Transmissor"
    OUTRO = "OUTRO", "Outro"


class TipoPartidaMotorChoices(models.TextChoices):
    DIRETA = "DIRETA", "Direta"
    ESTRELA_TRIANGULO = "ESTRELA_TRIANGULO", "Estrela-Triângulo"
    SOFT_STARTER = "SOFT_STARTER", "Soft Starter"
    INVERSOR = "INVERSOR", "Inversor"
    SERVO_DRIVE = "SERVO_DRIVE", "Servo Drive"


class TipoValvulaChoices(models.TextChoices):
    SOLENOIDE = "SOLENOIDE", "Solenóide"
    PROPORCIONAL = "PROPORCIONAL", "Proporcional"
    MOTORIZADA = "MOTORIZADA", "Motorizada"
    PNEUMATICA = "PNEUMATICA", "Pneumática"
    OUTRA = "OUTRA", "Outra"


class TipoSensorChoices(models.TextChoices):
    INDUTIVO = "INDUTIVO", "Indutivo"
    CAPACITIVO = "CAPACITIVO", "Capacitivo"
    FOTOELETRICO = "FOTOELETRICO", "Fotoelétrico"
    FIM_DE_CURSO = "FIM_DE_CURSO", "Fim de curso"
    PRESSOSTATO = "PRESSOSTATO", "Pressostato"
    TERMOSTATO = "TERMOSTATO", "Termostato"
    CHAVE_NIVEL = "CHAVE_NIVEL", "Chave de nível"
    ENCODER = "ENCODER", "Encoder"
    OUTRO = "OUTRO", "Outro"


class TipoTransdutorChoices(models.TextChoices):
    PRESSAO = "PRESSAO", "Pressão"
    TEMPERATURA = "TEMPERATURA", "Temperatura"
    NIVEL = "NIVEL", "Nível"
    VAZAO = "VAZAO", "Vazão"
    POSICAO = "POSICAO", "Posição"
    CORRENTE = "CORRENTE", "Corrente"
    TENSAO = "TENSAO", "Tensão"
    OUTRO = "OUTRO", "Outro"
    
