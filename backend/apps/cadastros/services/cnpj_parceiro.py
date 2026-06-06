"""
Persistencia de parceiro a partir do preview da consulta CNPJ.
"""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.cadastros.models import (
    CnaeParceiro,
    EnderecoParceiro,
    OrigemCadastroParceiroChoices,
    ParceiroComercial,
    SocioParceiro,
    TipoPessoaParceiroChoices,
)
from apps.cadastros.services.brasilapi_cnpj import (
    CnpjConsultaError,
    CnpjConsultaPreview,
    _cnae_principal,
    consultar_cnpj_brasilapi,
)


def _validar_papeis(eh_cliente: bool, eh_fornecedor: bool, eh_parceiro: bool) -> None:
    if not any((eh_cliente, eh_fornecedor, eh_parceiro)):
        raise CnpjConsultaError(
            "Marque ao menos uma classificacao: cliente, fornecedor ou parceiro comercial.",
            status_code=400,
        )


def _aviso_situacao_inativa(preview: CnpjConsultaPreview) -> str | None:
    situacao = (preview.situacao_cadastral or "").strip().upper()
    if situacao and situacao != "ATIVA":
        return (
            f"A empresa consta como {preview.situacao_cadastral} na Receita Federal. "
            "Confirme se deseja cadastrar mesmo assim."
        )
    return None


@transaction.atomic
def salvar_parceiro_de_cnpj(
    preview: CnpjConsultaPreview,
    *,
    eh_cliente: bool,
    eh_fornecedor: bool,
    eh_parceiro: bool,
    inscricao_estadual: str = "",
    email_override: str | None = None,
    telefone_override: str | None = None,
    razao_social_override: str | None = None,
    nome_fantasia_override: str | None = None,
) -> tuple[ParceiroComercial, str | None]:
    """
    Cria parceiro, endereco principal e socios a partir do preview.
    Retorna (parceiro, aviso_opcional).
    """
    _validar_papeis(eh_cliente, eh_fornecedor, eh_parceiro)

    if ParceiroComercial.objects.filter(documento=preview.documento).exists():
        raise CnpjConsultaError(
            "Ja existe cadastro com este CNPJ.",
            status_code=409,
        )

    aviso = _aviso_situacao_inativa(preview)
    agora = timezone.now()

    parceiro = ParceiroComercial.objects.create(
        tipo_pessoa=TipoPessoaParceiroChoices.PESSOA_JURIDICA,
        documento=preview.documento,
        razao_social=(razao_social_override or preview.razao_social).strip(),
        nome_fantasia=(nome_fantasia_override or preview.nome_fantasia).strip(),
        inscricao_estadual=(inscricao_estadual or "").strip(),
        email=(email_override if email_override is not None else preview.email).strip(),
        telefone=(telefone_override if telefone_override is not None else preview.telefone).strip(),
        eh_cliente=eh_cliente,
        eh_fornecedor=eh_fornecedor,
        eh_parceiro=eh_parceiro,
        ativo=True,
        origem=OrigemCadastroParceiroChoices.BRASILAPI,
        situacao_cadastral=preview.situacao_cadastral,
        situacao_cadastral_codigo=preview.situacao_cadastral_codigo,
        data_inicio_atividade=preview.data_inicio_atividade,
        capital_social=preview.capital_social,
        cnae_fiscal=preview.cnae_fiscal,
        cnae_fiscal_descricao=preview.cnae_fiscal_descricao,
        natureza_juridica=preview.natureza_juridica,
        consulta_receita_em=agora,
    )

    if preview.endereco:
        end = preview.endereco
        EnderecoParceiro.objects.create(
            parceiro=parceiro,
            nome=end.nome,
            logradouro=end.logradouro,
            numero=end.numero,
            complemento=end.complemento,
            bairro=end.bairro,
            municipio=end.municipio,
            uf=end.uf,
            cep=end.cep,
            principal=True,
        )

    _sync_socios(parceiro, preview)
    _sync_cnaes(parceiro, preview)

    return parceiro, aviso


def _sync_endereco_principal(parceiro: ParceiroComercial, preview: CnpjConsultaPreview) -> None:
    if not preview.endereco:
        return
    end = preview.endereco
    principal = parceiro.enderecos.filter(principal=True).first()
    if principal:
        principal.nome = end.nome or principal.nome
        principal.logradouro = end.logradouro
        principal.numero = end.numero
        principal.complemento = end.complemento
        principal.bairro = end.bairro
        principal.municipio = end.municipio
        principal.uf = end.uf
        principal.cep = end.cep
        principal.save()
        return
    EnderecoParceiro.objects.create(
        parceiro=parceiro,
        nome=end.nome,
        logradouro=end.logradouro,
        numero=end.numero,
        complemento=end.complemento,
        bairro=end.bairro,
        municipio=end.municipio,
        uf=end.uf,
        cep=end.cep,
        principal=True,
    )


def _sync_socios(parceiro: ParceiroComercial, preview: CnpjConsultaPreview) -> None:
    parceiro.socios.all().delete()
    for ordem, socio in enumerate(preview.socios):
        SocioParceiro.objects.create(
            parceiro=parceiro,
            ordem=ordem,
            nome=socio.nome,
            qualificacao=socio.qualificacao,
            data_entrada=socio.data_entrada,
            faixa_etaria=socio.faixa_etaria,
        )


def _sync_cnaes(parceiro: ParceiroComercial, preview: CnpjConsultaPreview) -> None:
    parceiro.cnaes.all().delete()
    for ordem, cnae in enumerate(preview.cnaes):
        CnaeParceiro.objects.create(
            parceiro=parceiro,
            ordem=ordem,
            codigo=cnae.codigo,
            descricao=cnae.descricao,
            principal=cnae.principal,
        )
    principal = _cnae_principal(preview.cnaes)
    if principal:
        parceiro.cnae_fiscal = principal.codigo
        parceiro.cnae_fiscal_descricao = principal.descricao
        parceiro.save(update_fields=["cnae_fiscal", "cnae_fiscal_descricao"])


def _resolver_campo_texto(
    atual: str,
    preview_val: str,
    override: str | None,
) -> str:
    if override is not None:
        return override.strip()
    if preview_val.strip():
        return preview_val.strip()
    return (atual or "").strip()


@transaction.atomic
def atualizar_parceiro_de_cnpj(
    parceiro: ParceiroComercial,
    preview: CnpjConsultaPreview,
    *,
    eh_cliente: bool,
    eh_fornecedor: bool,
    eh_parceiro: bool,
    inscricao_estadual: str | None = None,
    email_override: str | None = None,
    telefone_override: str | None = None,
    razao_social_override: str | None = None,
    nome_fantasia_override: str | None = None,
) -> tuple[ParceiroComercial, str | None]:
    """Atualiza cadastro existente com dados frescos da Receita."""
    _validar_papeis(eh_cliente, eh_fornecedor, eh_parceiro)

    if parceiro.documento != preview.documento:
        raise CnpjConsultaError(
            "O CNPJ consultado nao corresponde ao cadastro selecionado.",
            status_code=400,
        )

    aviso = _aviso_situacao_inativa(preview)
    agora = timezone.now()

    parceiro.tipo_pessoa = TipoPessoaParceiroChoices.PESSOA_JURIDICA
    parceiro.razao_social = _resolver_campo_texto(
        parceiro.razao_social,
        preview.razao_social,
        razao_social_override,
    )
    parceiro.nome_fantasia = _resolver_campo_texto(
        parceiro.nome_fantasia,
        preview.nome_fantasia,
        nome_fantasia_override,
    )
    if inscricao_estadual is not None:
        parceiro.inscricao_estadual = inscricao_estadual.strip()
    parceiro.email = _resolver_campo_texto(parceiro.email, preview.email, email_override)
    parceiro.telefone = _resolver_campo_texto(parceiro.telefone, preview.telefone, telefone_override)
    parceiro.eh_cliente = eh_cliente
    parceiro.eh_fornecedor = eh_fornecedor
    parceiro.eh_parceiro = eh_parceiro
    parceiro.situacao_cadastral = preview.situacao_cadastral
    parceiro.situacao_cadastral_codigo = preview.situacao_cadastral_codigo
    parceiro.data_inicio_atividade = preview.data_inicio_atividade
    parceiro.capital_social = preview.capital_social
    parceiro.cnae_fiscal = preview.cnae_fiscal
    parceiro.cnae_fiscal_descricao = preview.cnae_fiscal_descricao
    parceiro.natureza_juridica = preview.natureza_juridica
    parceiro.consulta_receita_em = agora
    parceiro.save()

    _sync_endereco_principal(parceiro, preview)
    _sync_socios(parceiro, preview)
    _sync_cnaes(parceiro, preview)

    return parceiro, aviso


def consultar_e_salvar_cnpj(
    cnpj: str,
    *,
    eh_cliente: bool,
    eh_fornecedor: bool,
    eh_parceiro: bool,
    **overrides,
) -> tuple[ParceiroComercial, CnpjConsultaPreview, str | None]:
    preview = consultar_cnpj_brasilapi(cnpj)
    parceiro, aviso = salvar_parceiro_de_cnpj(
        preview,
        eh_cliente=eh_cliente,
        eh_fornecedor=eh_fornecedor,
        eh_parceiro=eh_parceiro,
        **overrides,
    )
    return parceiro, preview, aviso


def consultar_e_atualizar_cnpj(
    cnpj: str,
    parceiro_id,
    *,
    eh_cliente: bool,
    eh_fornecedor: bool,
    eh_parceiro: bool,
    **overrides,
) -> tuple[ParceiroComercial, CnpjConsultaPreview, str | None]:
    preview = consultar_cnpj_brasilapi(cnpj)
    try:
        parceiro = ParceiroComercial.objects.prefetch_related("enderecos", "cnaes", "socios").get(
            pk=parceiro_id
        )
    except ParceiroComercial.DoesNotExist as exc:
        raise CnpjConsultaError("Cadastro nao encontrado.", status_code=404) from exc

    parceiro, aviso = atualizar_parceiro_de_cnpj(
        parceiro,
        preview,
        eh_cliente=eh_cliente,
        eh_fornecedor=eh_fornecedor,
        eh_parceiro=eh_parceiro,
        **overrides,
    )
    return parceiro, preview, aviso
