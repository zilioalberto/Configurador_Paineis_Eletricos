from django.db import models


class CategoriaProdutoNomeChoices(models.TextChoices):


    CONTATORA = "CONTATORA", "Contatora"
    DISJUNTOR_MOTOR = "DISJUNTOR_MOTOR", "Disjuntor Motor"
    DISJUNTOR_CAIXA_MOLDADA = "DISJUNTOR_CAIXA_MOLDADA", "Disjuntor Caixa Moldada"
    MINIDISJUNTOR = "MINIDISJUNTOR", "Minidisjuntor"
    RELE_SOBRECARGA = "RELE_SOBRECARGA", "Relé de Sobrecarga"
    SECCIONADORA = "SECCIONADORA", "Seccionadora"
    FUSIVEL = "FUSIVEL", "Fusível"
    RELE_ESTADO_SOLIDO = "RELE_ESTADO_SOLIDO", "Relé Estado Sólido"


    INVERSOR_FREQUENCIA = "INVERSOR_FREQUENCIA", "Inversor de Frequência"
    SOFT_STARTER = "SOFT_STARTER", "Soft Starter"


    BOTAO = "BOTAO", "Botão de Comando"
    CHAVE_SELETORA = "CHAVE_SELETORA", "Chave Seletora"
    SINALIZADOR = "SINALIZADOR", "Sinaleiro"
    RELE_INTERFACE = "RELE_INTERFACE", "Relé de Interface"
    TEMPORIZADOR = "TEMPORIZADOR", "Relé Temporizador"
    CONTROLADOR_TEMPERATURA = "CONTROLADOR_TEMPERATURA", "Controlador de Temperatura"


    PLC = "PLC", "PLC"
    EXPANSAO_PLC = "EXPANSAO_PLC", "Expansão PLC"
    IHM = "IHM", "Interface Homem Máquina (IHM)"
    MODULO_COMUNICACAO = "MODULO_COMUNICACAO", "Módulo de Comunicação"
    GATEWAY = "GATEWAY", "Gateway"
    SWITCH_REDE = "SWITCH_REDE", "Switch Industrial"


    FONTE_CHAVEADA = "FONTE_CHAVEADA", "Fonte Chaveada"

    BORNE = "BORNE", "Borne"
    BARRAMENTO = "BARRAMENTO", "Barramento"


    CABO = "CABO", "Cabo"
    CANALETA = "CANALETA", "Canaleta"
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"

    PAINEL = "PAINEL", "Painel"
    CLIMATIZACAO = "CLIMATIZACAO", "Climatização"

    OUTROS = "OUTROS", "Outros"

    SEM_REGRA_SUGESTAO_AUTOMATICA = (
        "SEM_REGRA_SUGESTAO_AUTOMATICA",
        "Sem regra de sugestão automática",
    )

class TipoFusivelChoices(models.TextChoices):
    ULTRARAPIDO = "ULTRARAPIDO", "Ultrarrápido"
    RAPIDO = "RAPIDO", "Rápido"
    RETARDADO = "RETARDADO", "Retardado"


class ClasseUtilizacaoFusivelChoices(models.TextChoices):
    GG = "gG", "Proteção geral"
    AM = "aM", "Proteção de motor"
    AR = "aR", "Proteção de semicondutores"


class FormatoFusivelChoices(models.TextChoices):
    NH = "NH", "NH"
    CARTUCHO = "CARTUCHO", "Cartucho"
    
class FusivelNHTamanhoChoices(models.TextChoices):
    NH000 = "NH000", "NH000"
    NH00 = "NH00", "NH00"
    NH1 = "NH1", "NH1"
    NH2 = "NH2", "NH2"
    NH3 = "NH3", "NH3"

class FusivelCartuchoTamanhoChoices(models.TextChoices):
    CART_5X20 = "5x20", "5 x 20 mm"
    CART_6X30 = "6x30", "6 x 30 mm"
    CART_10X38 = "10x38", "10 x 38 mm"
    CART_14X51 = "14x51", "14 x 51 mm"
    CART_22X58 = "22x58", "22 x 58 mm"   


class ModoMontagemChoices(models.TextChoices):
    """Modos de montagem admitidos no catálogo (painel / trilho / porta)."""

    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    PLACA = "PLACA", "Placa de montagem"
    PORTA = "PORTA", "Porta"


class ModoMontagemReleSobrecargaChoices(models.TextChoices):
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    ACOPLADO_CONTATOR = "ACOPLADO_CONTATOR", "Acoplado ao contator"


class TipoFixacaoSeccionadoraChoices(models.TextChoices):
    FURO_CENTRAL_M22_5 = "FURO_CENTRAL_M22_5", "Fixação por furo central M22,5"
    QUATRO_FUROS = "QUATRO_FUROS", "Fixação por quatro furos"
    

class CorManoplaChoices(models.TextChoices):
    PUNHO_PRETO = "PUNHO_PRETO", "Punho Preto"
    PUNHO_VERMELHO = "PUNHO_VERMELHO", "Punho Vermelho"
    
    
class UnidadeMedidaChoices(models.TextChoices):
    UN = "UN", "Unidade"
    MT = "MT", "Metro"
    CJ = "CJ", "Conjunto"


class TipoModuloExpansaoPLCChoices(models.TextChoices):
    DI = "DI", "Entradas digitais"
    DO = "DO", "Saídas digitais"
    AI = "AI", "Entradas analógicas"
    AO = "AO", "Saídas analógicas"
    MIXTA = "MIXTA", "Mista"
    OUTRO = "OUTRO", "Outro"


class TipoModuloComunicacaoChoices(models.TextChoices):
    INTERFACE_REDE = "INTERFACE_REDE", "Interface rede industrial"
    INTERFACE_SERIAL = "INTERFACE_SERIAL", "Interface serial"
    INTERFACE_FIELDBUS = "INTERFACE_FIELDBUS", "Interface fieldbus"
    MULTIPROTOCOLO = "MULTIPROTOCOLO", "Multiprotocolo"
    OUTRO = "OUTRO", "Outro"


class MaterialPlacaMontagemChoices(models.TextChoices):
    ACO_CARBONO = "ACO_CARBONO", "Aço carbono"
    ACO_GALVANIZADO = "ACO_GALVANIZADO", "Aço galvanizado"
    ACO_INOX = "ACO_INOX", "Aço inox"
    ALUMINIO = "ALUMINIO", "Alumínio"
    FIBRA_VIDRO = "FIBRA_VIDRO", "Fibra de vidro (GRP)"
    OUTRO = "OUTRO", "Outro"


class AcabamentoPlacaMontagemChoices(models.TextChoices):
    NATURAL = "NATURAL", "Natural (sem acabamento)"
    PINTURA_ELETROSTATICA = "PINTURA_ELETROSTATICA", "Pintura eletrostática"
    PINTURA_PU = "PINTURA_PU", "Pintura PU"
    GALVANIZADO = "GALVANIZADO", "Galvanizado"
    ANODIZADO = "ANODIZADO", "Anodizado"
    OUTRO = "OUTRO", "Outro"


class CorPlacaMontagemChoices(models.TextChoices):
    CINZA_RAL7035 = "CINZA_RAL7035", "Cinza RAL 7035"
    BRANCO_RAL9010 = "BRANCO_RAL9010", "Branco RAL 9010"
    PRETO = "PRETO", "Preto"
    SEM_COR_DEFINIDA = "SEM_COR_DEFINIDA", "Sem cor definida / natural"
    OUTRO = "OUTRO", "Outro"


class TipoPLCChoices(models.TextChoices):
    COMPACTO = "COMPACTO", "Compacto"
    MODULAR = "MODULAR", "Modular"
    SAFETY = "SAFETY", "Safety"
    MOTION = "MOTION", "Motion"
    OUTRO = "OUTRO", "Outro"


class FamiliaPLCChoices(models.TextChoices):
    SIEMENS_S7_1200 = "SIEMENS_S7_1200", "Siemens S7-1200"
    SIEMENS_S7_1500 = "SIEMENS_S7_1500", "Siemens S7-1500"
    WEG_CLIC02 = "WEG_CLIC02", "WEG CLIC02"
    SCHNEIDER_MODICON = "SCHNEIDER_MODICON", "Schneider Modicon"
    ROCKWELL_COMPACTLOGIX = "ROCKWELL_COMPACTLOGIX", "Rockwell CompactLogix"
    OUTRA = "OUTRA", "Outra"


class ProtocoloComunicacaoChoices(models.TextChoices):
    PROFINET = "PROFINET", "Profinet"
    PROFIBUS = "PROFIBUS", "Profibus"
    MODBUS_TCP = "MODBUS_TCP", "Modbus TCP"
    MODBUS_RTU = "MODBUS_RTU", "Modbus RTU"
    ETHERNET_IP = "ETHERNET_IP", "Ethernet/IP"
    OPC_UA = "OPC_UA", "OPC UA"
    SERIAL = "SERIAL", "Serial"
    OUTRO = "OUTRO", "Outro"


class TipoMontagemReleChoices(models.TextChoices):
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    PLACA = "PLACA", "Placa"
    OUTRO = "OUTRO", "Outro"


class TipoContatoChoices(models.TextChoices):
    NA = "NA", "Normalmente Aberto (NA)"
    NF = "NF", "Normalmente Fechado (NF)"
    REVERSIVEL = "REVERSIVEL", "Reversível (NA/NF)"


class TipoReleInterfaceChoices(models.TextChoices):
    ELETROMECANICO = "ELETROMECANICO", "Eletromecânico"
    ESTADO_SOLIDO = "ESTADO_SOLIDO", "Estado sólido"


class TipoResistenciaAquecimentoChoices(models.TextChoices):
    CONVENCIONAL = "CONVENCIONAL", "Convencional"
    PTC = "PTC", "PTC autorregulável"
    COM_VENTILACAO = "COM_VENTILACAO", "Com ventilação"
    OUTRO = "OUTRO", "Outro"


class TipoMontagemResistenciaChoices(models.TextChoices):
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    PARAFUSADA = "PARAFUSADA", "Parafusada"
    OUTRO = "OUTRO", "Outro"


class TipoControleSoftStarterChoices(models.TextChoices):
    CONTROLE_TENSAO = "CONTROLE_TENSAO", "Partida/controle por tensão"
    CONTROLE_CORRENTE = "CONTROLE_CORRENTE", "Partida/controle por corrente"
    OUTRO = "OUTRO", "Outro"


class TipoAplicacaoSoftStarterChoices(models.TextChoices):
    NORMAL = "NORMAL", "Geral / normal"
    BOMBA = "BOMBA", "Bomba"
    VENTILADOR = "VENTILADOR", "Ventilador"
    COMPRESSOR = "COMPRESSOR", "Compressor"
    OUTRO = "OUTRO", "Outro"


class TipoBypassChoices(models.TextChoices):
    INTERNO = "INTERNO", "Bypass interno"
    EXTERNO = "EXTERNO", "Bypass externo"
    SEM_BYPASS = "SEM_BYPASS", "Sem bypass"
    OUTRO = "OUTRO", "Outro"


class NumeroFaseControleSoftStarterChoices(models.TextChoices):
    F2 = "2F", "2 fases"
    F3 = "3F", "3 fases"


class TipoSwitchRedeChoices(models.TextChoices):
    INDUSTRIAL = "INDUSTRIAL", "Industrial"
    GERENCIAVEL = "GERENCIAVEL", "Gerenciável"
    NAO_GERENCIAVEL = "NAO_GERENCIAVEL", "Não gerenciável"
    OUTRO = "OUTRO", "Outro"


class TipoPortaRedeChoices(models.TextChoices):
    RJ45 = "RJ45", "RJ45"
    FIBRA = "FIBRA", "Fibra"
    MISTA = "MISTA", "Mista"
    OUTRO = "OUTRO", "Outro"


class VelocidadePortaRedeChoices(models.TextChoices):
    MBPS_10 = "MBPS_10", "10 Mbps"
    MBPS_100 = "MBPS_100", "100 Mbps"
    MBPS_1000 = "MBPS_1000", "1 Gbps"
    MBPS_10000 = "MBPS_10000", "10 Gbps"
    OUTRO = "OUTRO", "Outro"


class TipoMontagemSwitchChoices(models.TextChoices):
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    PAINEL = "PAINEL", "Painel"
    RACK = "RACK", "Rack"
    OUTRO = "OUTRO", "Outro"


class TipoTemporizadorChoices(models.TextChoices):
    RELE = "RELE", "Relé temporizado"
    ELETRONICO = "ELETRONICO", "Eletrônico"
    OUTRO = "OUTRO", "Outro"


class TipoFuncaoTemporizadorChoices(models.TextChoices):
    ATRASO_ENERGIZACAO = "ATRASO_ENERGIZACAO", "Atraso na energização"
    ATRASO_DESENERGIZACAO = "ATRASO_DESENERGIZACAO", "Atraso na desenergização"
    INTERMITENTE = "INTERMITENTE", "Intermitente"
    MULTIFUNCAO = "MULTIFUNCAO", "Multifunção"
    OUTRO = "OUTRO", "Outro"


class UnidadeTempoChoices(models.TextChoices):
    SEGUNDOS = "SEGUNDOS", "Segundos"
    MINUTOS = "MINUTOS", "Minutos"
    HORAS = "HORAS", "Horas"


class TipoMontagemTemporizadorChoices(models.TextChoices):
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    PORTA = "PORTA", "Porta"
    PLACA = "PLACA", "Placa"
    OUTRO = "OUTRO", "Outro"


class TipoTrilhoDINChoices(models.TextChoices):
    TS35 = "TS35", "TS 35"
    TS32 = "TS32", "TS 32"
    TS15 = "TS15", "TS 15"
    OUTRO = "OUTRO", "Outro"


class FormatoTrilhoDINChoices(models.TextChoices):
    OMEGA = "OMEGA", "Ômega"
    C = "C", "Perfil C"
    G = "G", "Perfil G"
    OUTRO = "OUTRO", "Outro"


class MaterialTrilhoDINChoices(models.TextChoices):
    ACO_GALVANIZADO = "ACO_GALVANIZADO", "Aço galvanizado"
    ACO_INOX = "ACO_INOX", "Aço inox"
    ALUMINIO = "ALUMINIO", "Alumínio"
    OUTRO = "OUTRO", "Outro"


class TipoVentiladorChoices(models.TextChoices):
    AXIAL = "AXIAL", "Axial"
    CENTRIFUGO = "CENTRIFUGO", "Centrífugo"
    TANGENCIAL = "TANGENCIAL", "Tangencial"
    HELICOIDEAL = "HELICOIDEAL", "Helicoideal"
    LINEAR = "LINEAR", "Linear"
    EXAUSTOR = "EXAUSTOR", "Exaustor"
    OUTRO = "OUTRO", "Outro"


class TipoMontagemVentiladorChoices(models.TextChoices):
    PAREDE = "PAREDE", "Parede"
    TETO = "TETO", "Teto"
    PORTA = "PORTA", "Porta"
    CHASSI = "CHASSI", "Chassi"
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    OUTRO = "OUTRO", "Outro"


class TipoAcionamentoBotaoChoices(models.TextChoices):
    MOMENTANEO = "MOMENTANEO", "Momentâneo"
    MANTIDO = "MANTIDO", "Mantido"


class CorSinalizadorChoices(models.TextChoices):
    VERMELHO = "VERMELHO", "Vermelho"
    VERDE = "VERDE", "Verde"
    AMBAR = "AMBAR", "Âmbar"
    BRANCO = "BRANCO", "Branco"
    AZUL = "AZUL", "Azul"


class CurvaDisparoMiniDisjuntorChoices(models.TextChoices):
    B = "B", "Curva B"
    C = "C", "Curva C"
    D = "D", "Curva D"


class ConfiguracaoDisparadorDisjuntorCMChoices(models.TextChoices):
    TERMOMAGNETICO_IR_II_FIXOS = (
        "TERMOMAGNETICO_IR_II_FIXOS",
        "Com disparador termomagnético, sobrecarga e curto-circuito fixos",
    )
    TERMOMAGNETICO_LI_IR_II_FIXOS = (
        "TERMOMAGNETICO_LI_IR_II_FIXOS",
        "Com disparador termomagnético, proteção LI, sobrecarga e curto-circuito fixos",
    )
    TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO = (
        "TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO",
        "Com disparador termomagnético, proteção LI, sobrecarga ajustável e curto-circuito fixo",
    )
    TERMOMAGNETICO_LI_II_AJUSTAVEL = (
        "TERMOMAGNETICO_LI_II_AJUSTAVEL",
        "Com disparador termomagnético, proteção LI e curto-circuito ajustável",
    )


class NumeroPolosChoices(models.TextChoices):
    P1 = "1P", "Monopolar (1P)"
    P2 = "2P", "Bipolar (2P)"
    P3 = "3P", "Tripolar (3P)"
    P4 = "4P", "Tetrapolar (4P)"


class PadraoNormativoMiniDisjuntorChoices(models.TextChoices):
    IEC = "IEC", "IEC"
    UL = "UL", "UL"


class TipoProtecaoMiniDisjuntorChoices(models.TextChoices):
    TERMOMAGNETICO = "TERMOMAGNETICO", "Termomagnético"


class TipoComutacaoReleEstadoSolidoChoices(models.TextChoices):
    ZERO_CROSS = "ZERO_CROSS", "Zero-cross"
    RANDOM = "RANDOM", "Aleatória (random)"


class TipoDissipadorReleEstadoSolidoChoices(models.TextChoices):
    INTEGRADO = "INTEGRADO", "Integrado"
    EXTERNO = "EXTERNO", "Externo"


class NumeroFasesReleEstadoSolidoChoices(models.TextChoices):
    F1 = "1F", "Monofásico (1F)"
    F3 = "3F", "Trifásico (3F)"


class NumeroFasesInversorFrequenciaChoices(models.TextChoices):
    F1 = "1F", "Monofásico (1F)"
    F3 = "3F", "Trifásico (3F)"


class TipoCargaReleEstadoSolidoChoices(models.TextChoices):
    RESISTIVA = "RESISTIVA", "Resistiva"
    INDUTIVA = "INDUTIVA", "Indutiva"


class MaterialBarramentoChoices(models.TextChoices):
    COBRE = "COBRE", "Cobre"
    ALUMINIO = "ALUMINIO", "Alumínio"


class TipoBarramentoChoices(models.TextChoices):
    BARRA_CHATA = "BARRA_CHATA", "Barra chata"
    BARRAMENTO_PENTE = "BARRAMENTO_PENTE", "Barramento pente"
    BARRAMENTO_TRIFASICO = "BARRAMENTO_TRIFASICO", "Barramento trifásico"
    BARRAMENTO_DISTRIBUICAO = (
        "BARRAMENTO_DISTRIBUICAO",
        "Barramento de distribuição",
    )


class TipoBorneChoices(models.TextChoices):
    PASSAGEM = "PASSAGEM", "Passagem"
    TERRA = "TERRA", "Terra"
    FUSIVEL = "FUSIVEL", "Fusível"
    SECCIONAVEL = "SECCIONAVEL", "Seccionável"
    SENSOR = "SENSOR", "Sensor"
    AFERICAO = "AFERICAO", "Borne de aferição"


class TipoConexaoBorneChoices(models.TextChoices):
    PARAFUSO = "PARAFUSO", "Parafuso"
    MOLA = "MOLA", "Mola"
    PUSH_IN = "PUSH_IN", "Push-in"


class TipoBotaoChoices(models.TextChoices):
    PULSADOR = "PULSADOR", "Pulsador"
    EMERGENCIA = "EMERGENCIA", "Emergência"


class TipoAcionamentoBotaoModoChoices(models.TextChoices):
    MOMENTANEO = "MOMENTANEO", "Momentâneo"
    RETENCAO = "RETENCAO", "Com retenção"


class CorBotaoChoices(models.TextChoices):
    VERDE = "VERDE", "Verde"
    VERMELHO = "VERMELHO", "Vermelho"
    AMARELO = "AMARELO", "Amarelo"
    AZUL = "AZUL", "Azul"
    PRETO = "PRETO", "Preto"
    BRANCO = "BRANCO", "Branco"


class TipoCaboChoices(models.TextChoices):
    POTENCIA = "POTENCIA", "Potência"
    COMANDO = "COMANDO", "Comando"
    SINAL = "SINAL", "Sinal"
    REDE = "REDE", "Rede / Comunicação"
    ATERRAMENTO = "ATERRAMENTO", "Aterramento"


class MaterialCondutorChoices(models.TextChoices):
    COBRE = "COBRE", "Cobre"
    ALUMINIO = "ALUMINIO", "Alumínio"


class TipoIsolacaoCaboChoices(models.TextChoices):
    PVC = "PVC", "PVC"
    HEPR = "HEPR", "HEPR"
    EPR = "EPR", "EPR"
    XLPE = "XLPE", "XLPE"


class CorCaboChoices(models.TextChoices):
    PRETO = "PRETO", "Preto"
    AZUL = "AZUL", "Azul"
    AZUL_ESCURO = "AZUL_ESCURO", "Azul Escuro"
    VERMELHO = "VERMELHO", "Vermelho"
    BRANCO = "BRANCO", "Branco"
    VERDE_AMARELO = "VERDE_AMARELO", "Verde/Amarelo"
    VERDE = "VERDE", "Verde"
    AMARELO = "AMARELO", "Amarelo"
    MARROM = "MARROM", "Marrom"
    CINZA = "CINZA", "Cinza"


class TipoCanaletaChoices(models.TextChoices):
    FECHADA = "FECHADA", "Fechada"
    COM_RECORTE = "COM_RECORTE", "Com recorte"


class MaterialCanaletaChoices(models.TextChoices):
    PVC = "PVC", "PVC"
    METALICA = "METALICA", "Metálica"


class CorCanaletaChoices(models.TextChoices):
    CINZA = "CINZA", "Cinza"
    BRANCA = "BRANCA", "Branca"
    AZUL_PETROLEO = "AZUL_PETROLEO", "Azul Petróleo"


class TipoChaveSeletoraChoices(models.TextChoices):
    MANOPLA = "MANOPLA", "Manopla"
    CHAVE = "CHAVE", "Chave com chave"


class TipoAcionamentoChaveSeletoraChoices(models.TextChoices):
    RETENTIVO = "RETENTIVO", "Retentivo"
    MOMENTANEO = "MOMENTANEO", "Momentâneo"


class CorManoplaChaveSeletoraChoices(models.TextChoices):
    PRETO = "PRETO", "Preto"
    VERMELHO = "VERMELHO", "Vermelho"
    AZUL = "AZUL", "Azul"
    VERDE = "VERDE", "Verde"


class TipoClimatizacaoChoices(models.TextChoices):
    VENTILACAO = "VENTILACAO", "Ventilação"
    EXAUSTOR = "EXAUSTOR", "Exaustor"
    TROCADOR_CALOR = "TROCADOR_CALOR", "Trocador de Calor"
    AR_CONDICIONADO = "AR_CONDICIONADO", "Ar-condicionado"
    RESISTENCIA_AQUECIMENTO = "RESISTENCIA_AQUECIMENTO", "Resistência de Aquecimento"


class TipoSensorTemperaturaChoices(models.TextChoices):
    PT100 = "PT100", "PT100"
    TERMOPAR_J = "TERMOPAR_J", "Termopar J"
    TERMOPAR_K = "TERMOPAR_K", "Termopar K"
    NTC = "NTC", "NTC"
    UNIVERSAL = "UNIVERSAL", "Entrada universal"


class TipoSaidaControleChoices(models.TextChoices):
    RELE = "RELE", "Relé"
    SSR = "SSR", "SSR"
    ANALOGICA_4_20MA = "ANALOGICA_4_20MA", "Analógica 4-20mA"
    ANALOGICA_0_10V = "ANALOGICA_0_10V", "Analógica 0-10V"


class TipoControleTemperaturaChoices(models.TextChoices):
    ON_OFF = "ON_OFF", "On/Off"
    PID = "PID", "PID"


class TipoExpansaoPLCChoices(models.TextChoices):
    ENTRADA_DIGITAL = "ENTRADA_DIGITAL", "Entrada Digital"
    SAIDA_DIGITAL = "SAIDA_DIGITAL", "Saída Digital"
    ENTRADA_ANALOGICA = "ENTRADA_ANALOGICA", "Entrada Analógica"
    SAIDA_ANALOGICA = "SAIDA_ANALOGICA", "Saída Analógica"
    MISTA_DIGITAL = "MISTA_DIGITAL", "Mista Digital"
    MISTA_ANALOGICA = "MISTA_ANALOGICA", "Mista Analógica"
    MISTA_GERAL = "MISTA_GERAL", "Mista Geral"


class TipoSinalDigitalChoices(models.TextChoices):
    PNP = "PNP", "PNP"
    NPN = "NPN", "NPN"
    RELE = "RELE", "Relé"


class TipoSinalAnalogicoChoices(models.TextChoices):
    MA_4_20 = "4_20MA", "4-20 mA"
    V_0_10 = "0_10V", "0-10 V"
    UNIVERSAL = "UNIVERSAL", "Universal"


class TipoAnalogicoPlcChoices(models.TextChoices):
    """Faixa/tipo de sinal das entradas ou saídas analógicas do PLC (quando existirem)."""

    MA_0_20 = "MA_0_20", "0–20 mA"
    MA_4_20 = "MA_4_20", "4–20 mA"
    V_0_10 = "V_0_10", "0–10 V"
    V_PM_10 = "V_PM_10", "±10 V"
    V_0_5 = "V_0_5", "0–5 V"
    CONFIGURAVEL_SOFTWARE = "CONFIGURAVEL_SOFTWARE", "Configurável via software"


class TipoFiltroArChoices(models.TextChoices):
    ENTRADA_AR = "ENTRADA_AR", "Entrada de ar"
    SAIDA_AR = "SAIDA_AR", "Saída de ar"
    EXAUSTAO = "EXAUSTAO", "Exaustão"
    FILTRO_VENTILADOR = "FILTRO_VENTILADOR", "Filtro ventilador"


class MaterialFiltroArChoices(models.TextChoices):
    FIBRA_SINTETICA = "FIBRA_SINTETICA", "Fibra sintética"
    ESPUMA = "ESPUMA", "Espuma"
    METALICO = "METALICO", "Metálico"
    POLIESTER = "POLIESTER", "Poliéster"


class ProtocoloIndustrialChoices(models.TextChoices):
    MODBUS_TCP = "MODBUS_TCP", "Modbus TCP"
    MODBUS_RTU = "MODBUS_RTU", "Modbus RTU"
    PROFINET = "PROFINET", "Profinet"
    ETHERNET_IP = "ETHERNET_IP", "EtherNet/IP"
    PROFIBUS = "PROFIBUS", "Profibus"
    CANOPEN = "CANOPEN", "CANopen"
    OPC_UA = "OPC_UA", "OPC UA"
    MQTT = "MQTT", "MQTT"
    OUTRO = "OUTRO", "Outro"


class InterfaceFisicaGatewayChoices(models.TextChoices):
    ETHERNET = "ETHERNET", "Ethernet"
    RS485 = "RS485", "RS-485"
    RS232 = "RS232", "RS-232"
    USB = "USB", "USB"
    WIFI = "WIFI", "Wi-Fi"


class TipoTelaIHMChoices(models.TextChoices):
    TOUCH = "TOUCH", "Touchscreen"
    TECLADO = "TECLADO", "Teclado"
    TOUCH_TECLADO = "TOUCH_TECLADO", "Touch + Teclado"


class TipoDisplayIHMChoices(models.TextChoices):
    TFT = "TFT", "TFT"
    LCD = "LCD", "LCD"
    OLED = "OLED", "OLED"


class ProtocoloIHMChoices(models.TextChoices):
    PROFINET = "PROFINET", "Profinet"
    MODBUS_TCP = "MODBUS_TCP", "Modbus TCP"
    MODBUS_RTU = "MODBUS_RTU", "Modbus RTU"
    ETHERNET_IP = "ETHERNET_IP", "EtherNet/IP"
    OPC_UA = "OPC_UA", "OPC UA"
    SERIAL = "SERIAL", "Serial"
    OUTRO = "OUTRO", "Outro"