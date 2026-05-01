from django.db import models


class TipoPainelChoices(models.TextChoices):
    AUTOMACAO = "AUTOMACAO", "Automação"
    DISTRIBUICAO = "DISTRIBUICAO", "Distribuição"


class TipoPainelCatalogoChoices(models.TextChoices):
    CAIXA_METALICA = "CAIXA_METALICA", "Caixa metálica"
    CAIXA_PLASTICA = "CAIXA_PLASTICA", "Caixa plástica"
    ARMARIO_METALICO = "ARMARIO_METALICO", "Armário metálico"
    PAINEL_MODULAR = "PAINEL_MODULAR", "Painel modular"


class TipoInstalacaoPainelChoices(models.TextChoices):
    SOBREPOR = "SOBREPOR", "Sobrepor"
    EMBUTIR = "EMBUTIR", "Embutir"
    PISO = "PISO", "Piso"
    AUTO_PORTANTE = "AUTO_PORTANTE", "Autoportante"


class MaterialPainelChoices(models.TextChoices):
    ACO_CARBONO = "ACO_CARBONO", "Aço carbono"
    ACO_INOX = "ACO_INOX", "Aço inox"
    ALUMINIO = "ALUMINIO", "Alumínio"
    POLICARBONATO = "POLICARBONATO", "Policarbonato"
    ABS = "ABS", "ABS"


class AcabamentoPlacaPainelChoices(models.TextChoices):
    """Acabamento da placa de montagem interna ao painel (catálogo)."""

    GALVANIZADA = "GALVANIZADA", "Galvanizada"
    PINTURA_LARANJA = "PINTURA_LARANJA", "Pintura laranja"


class CorPainelChoices(models.TextChoices):
    """Cor de pintura do invólucro (catálogo de painéis)."""

    RAL7035 = "RAL7035", "RAL 7035 (cinza claro)"
    RAL7032 = "RAL7032", "RAL 7032 (bege)"


class TipoSeccionamentoChoices(models.TextChoices):
    NENHUM = "NENHUM", "Sem seccionamento"
    SECCIONADORA = "SECCIONADORA", "Seccionadora"
    DISJUNTOR_CAIXA_MOLDADA = "DISJUNTOR_CAIXA_MOLDADA", "Disjuntor Caixa Moldada"
    
    
class TipoConexaoAlimetacaoChoices(models.TextChoices):
    BARRAMENTO = "BARRAMENTO", "Barramento"
    BORNE = "BORNE", "Borne"
    TOMADA = "TOMADA", "Tomada"
    DIRETO = "DIRETO", "Direto"
    OUTRO = "OUTRO", "Outro"


class StatusProjetoChoices(models.TextChoices):
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    FINALIZADO = "FINALIZADO", "Finalizado"
    
class PartesPainelChoices(models.TextChoices):
    SECCIONAMENTO = "SECCIONAMENTO", "Seccionamento"
    PROTECAO_GERAL = "PROTECAO_GERAL", "Proteção geral" 
    PROTECAO_CARGA = "PROTECAO_CARGA", "Proteção de carga"
    ACIONAMENTO_CARGA = "ACIONAMENTO_CARGA", "Acionamento de carga"    
    ENTRADA_PRINCIPAL = "ENTRADA_PRINCIPAL", "Entrada principal"
    POTENCIA = "POTENCIA", "Potência"
    COMANDO = "COMANDO", "Comando"
    BOTOEIRAS = "BOTOEIRAS", "Botoeiras"
    AUTOMACAO = "AUTOMACAO", "Automação"
    BORNES = "BORNES", "Bornes"
    CANALETAS = "CANALETAS", "Canaletas"
    CLIMATIZACAO = "CLIMATIZACAO", "Climatização"
    ILUMINACAO = "ILUMINACAO", "Iluminação"
    TOMADA_SERVICO = "TOMADA_SERVICO", "Tomada de serviço"
    ESTRUTURA = "ESTRUTURA", "Estrutura"
    IDENTIFICACAO="IDENTIFICACAO", "Identificação"
    ACESSORIOS="ACESSORIOS", "Acessórios"
    OUTROS = "OUTROS", "Outros"
    

