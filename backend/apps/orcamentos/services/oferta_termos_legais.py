"""Termos legais padrão ZFW — apêndice da proposta (não editável no portal)."""
from __future__ import annotations

# Versão do pacote de termos (rastreio em snapshot/PDF futuro).
TERMOS_LEGAIS_VERSAO = "2026.1"


def termos_legais_padrao() -> list[dict[str, str]]:
    """
    Blocos exibidos no apêndice da proposta para o cliente.
    Separados do conteúdo comercial editável pelo time.
    """
    return [
        {
            "id": "inadimplencia",
            "titulo": "Inadimplência",
            "conteudo": (
                "Caso a empresa compradora esteja com inadimplência(s) anterior(es), "
                "somente será liberado o faturamento e a entrega após regularização."
            ),
        },
        {
            "id": "credito_conta",
            "titulo": "Pagamento em conta",
            "conteudo": (
                "Para empresas que efetuam pagamentos somente via crédito em conta, em caso de "
                "não pagamento na data acordada, a ZFW poderá suspender entregas e serviços "
                "vinculados a esta proposta."
            ),
        },
        {
            "id": "entrega",
            "titulo": "Entrega",
            "conteudo": (
                "Os preços mencionados na proposta são para entrega por conta do destinatário, "
                "salvo disposição em contrário. Referência comercial: FOB Joinville/SC."
            ),
        },
        {
            "id": "impostos",
            "titulo": "Impostos",
            "conteudo": "Inclusos no orçamento conforme legislação vigente e perfil fiscal informado.",
        },
        {
            "id": "confirmacao",
            "titulo": "Confirmação do pedido",
            "conteudo": (
                "Só será confirmado o orçamento quando retornarem esta proposta, devidamente "
                "aprovada, por e-mail ou documento assinado."
            ),
        },
        {
            "id": "pedidos",
            "titulo": "Informações no pedido de compra",
            "conteudo": (
                "Dados cadastrais, endereço de entrega e faturamento (quando diferentes), "
                "destinação do material (revenda, industrialização ou consumo), regimes especiais "
                "de tributação e, em frete FOB, identificação da transportadora."
            ),
        },
        {
            "id": "garantia_legal",
            "titulo": "Garantia (condições gerais)",
            "conteudo": (
                "A garantia da ZFW Engenharia limita-se a reparar ou substituir, a seu critério, "
                "no prazo acordado comercialmente, componentes com defeito de fabricação ou "
                "montagem sob sua responsabilidade, nas condições de uso previstas."
            ),
        },
    ]
