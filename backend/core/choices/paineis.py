from django.db import models


class TipoPainelChoices(models.TextChoices):
    AUTOMACAO = "AUTOMACAO", "Automação"
    DISTRIBUICAO = "DISTRIBUICAO", "Distribuição"


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
    RASCUNHO = "RASCUNHO", "Rascunho"
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    FINALIZADO = "FINALIZADO", "Finalizado"
    
class PartesPainelChoices(models.TextChoices):
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