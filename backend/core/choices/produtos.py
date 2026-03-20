from django.db import models


class CategoriaProdutoNomeChoices(models.TextChoices):
    CONTATORA = "CONTATORA", "Contatora"
    DISJUNTOR_MOTOR = "DISJUNTOR_MOTOR", "Disjuntor Motor"
    RELE_SOBRECARGA = "RELE_SOBRECARGA", "Relé de Sobrecarga"
    MINI_DISJUNTOR = "MINI_DISJUNTOR", "Mini disjuntor"
    SECCIONADORA = "SECCIONADORA", "Seccionadora"
    FONTE = "FONTE", "Fonte"
    BORNE = "BORNE", "Borne"
    CABO = "CABO", "Cabo"
    CANALETA = "CANALETA", "Canaleta"
    PAINEL = "PAINEL", "Painel"
    OUTROS = "OUTROS", "Outros"
    
    
    
class TensaoBobinaChoices(models.TextChoices):
    V24VCC = "24VCC", "24 VCC"
    V24VCA = "24VCA", "24 VCA"
    V110VCA = "110VCA", "110 VCA"
    V220VCA = "220VCA", "220 VCA"

class ModoMontagemChoices(models.TextChoices):
    TRILHO_DIN = "TRILHO_DIN", "Trilho DIN"
    PLACA = "PLACA", "Placa de montagem"
    PORTA = "PORTA", "Porta"
    LATERAL = "LATERAL", "Lateral do painel"
    FUNDO = "FUNDO", "Fundo do painel"
    
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