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
    
class TipoProtecaoMotorChoices(models.TextChoices):
    DISJUNTOR_MOTOR = "DISJUNTOR_MOTOR", "Disjuntor Motor"
    RELE_SOBRECARGA = "RELE_SOBRECARGA", "Relé de Sobrecarga"
    FUSIVEL = "FUSIVEL", "Fusível"
    MINI_DISJUNTOR = "MINI_DISJUNTOR", "Mini Disjuntor"
    OUTRO = "OUTRO", "Outro"
    

class TipoConexaoCargaPainelChoices(models.TextChoices):
    CONEXAO_BORNES_COM_PE = "CONEXAO_BORNES_COM_PE", "Conexão a bornes com PE"
    CONEXAO_BORNES_SEM_PE = "CONEXAO_BORNES_SEM_PE", "Conexão a bornes sem PE"
    CONEXAO_DIRETO_COMPONENTE = "CONEXAO_DIRETO_COMPONENTE", "Conexão direta ao componente"
    OUTROS = "OUTROS", "Outros"


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
    
class TipoClimatizacaoPainelChoices(models.TextChoices):
    VENTILADOR = "VENTILADOR", "Ventilador"
    EXAUSTOR = "EXAUSTOR", "Exaustor"
    AR_CONDICIONADO = "AR_CONDICIONADO", "Ar Condicionado"
    OUTRO = "OUTRO", "Outro"
    
    
