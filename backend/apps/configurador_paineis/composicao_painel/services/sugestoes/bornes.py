def _criar_pendencia_borne_motor(
    projeto,
    carga,
    *,
    descricao: str,
    corrente_referencia_a: Decimal | None,
    memoria_calculo: str,
) -> None:
    PendenciaItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
        defaults={
            "descricao": descricao,
            "corrente_referencia_a": corrente_referencia_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusPendenciaChoices.ABERTA,
            "ordem": 43,
        },
    )


def _montar_memoria_borne_passagem_motor(
    carga,
    motor: CargaMotor,
    *,
    corrente_min_a: Decimal,
    mm2_fase: Decimal,
    qtd_passagem: int,
) -> str:
    return (
        "[BORNE PASSAGEM — MOTOR]\n"
        f"Carga: {carga}\n"
        f"Conexão no painel: {motor.tipo_conexao_painel}\n"
        f"Fases (motor): {motor.numero_fases}\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor fase (efetiva): {mm2_fase} mm²\n"
        f"Tipo borne: {TipoBorneChoices.PASSAGEM} | 1 nível por unidade\n"
        f"Quantidade de bornes de passagem: {qtd_passagem}\n"
        f"Filtro catálogo: seccao_max_mm2 ≥ {mm2_fase} mm²\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )


def _sugerir_borne_passagem_motor(
    projeto,
    carga,
    *,
    corrente_min_a: Decimal,
    mm2_fase: Decimal,
    qtd_passagem: int,
    memoria_calculo: str,
) -> Optional[SugestaoItem]:
    opcoes = selecionar_bornes(
        tipo_borne=TipoBorneChoices.PASSAGEM,
        corrente_nominal_min_a=corrente_min_a,
        numero_niveis=1,
        secao_max_mm2_min=mm2_fase,
    )
    opcoes_lista = list(opcoes)

    if not opcoes_lista:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
        ).delete()

        _criar_pendencia_borne_motor(
            projeto,
            carga,
            descricao=(
                f"Nenhum borne de passagem (1 nível) compatível com corrente "
                f"e seção para {carga}."
            ),
            corrente_referencia_a=corrente_min_a,
            memoria_calculo=memoria_calculo,
        )
        return None

    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
    ).delete()

    produto = opcoes_lista[0]

    sugestao_passagem, _ = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
        defaults={
            "produto": produto,
            "quantidade": Decimal(qtd_passagem),
            "corrente_referencia_a": corrente_min_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 43,
        },
    )

    return sugestao_passagem


def _processar_borne_terra_motor(
    projeto,
    carga,
    motor: CargaMotor,
    dim: DimensionamentoCircuitoCarga,
    corrente_min_a: Decimal,
) -> None:
    if motor.tipo_conexao_painel != TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE:
        _limpar_borne_terra_motor(projeto, carga)
        return

    mm2_pe = _mm2_efetivo_dim(
        dim.secao_condutor_pe_escolhida_mm2,
        dim.secao_condutor_pe_mm2,
    )

    memoria_terra = (
        "[BORNE TERRA — MOTOR (PE)]\n"
        f"Carga: {carga}\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor PE (efetiva): {mm2_pe} mm²\n"
        f"Tipo borne: {TipoBorneChoices.TERRA}\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )

    _sugerir_borne_terra_dimensionado(
        projeto,
        carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
        corrente_min_a=corrente_min_a,
        mm2_pe=mm2_pe,
        memoria_calculo=memoria_terra,
    )


def _processar_bornes_motor(projeto, carga) -> Optional[SugestaoItem]:
    """
    Motor com conexão a bornes: sugere vários bornes de passagem (1 nível cada) —
    quantidade 2 se monofásico, 3 se trifásico (2 se bifásico), todos filtrados por
    corrente e ``seccao_max_mm2`` ≥ seção de fase.

    Com ``CONEXAO_BORNES_COM_PE``: acrescenta 1 borne ``TERRA`` (PE) compatível com a seção PE.
    """
    motor = _obter_motor_para_bornes(projeto, carga)

    if motor is None:
        return None

    if motor.tipo_conexao_painel not in (
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE,
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_SEM_PE,
    ):
        return None

    dim = _obter_dimensionamento_motor_para_bornes(projeto, carga)

    if dim is None:
        return None

    mm2_fase = _mm2_efetivo_dim(
        dim.secao_condutor_fase_escolhida_mm2,
        dim.secao_condutor_fase_mm2,
    )
    corrente_min_a = _corrente_referencia_dim(dim)
    qtd_passagem = _quantidade_bornes_passagem_motor(motor.numero_fases)

    if qtd_passagem is None:
        _criar_pendencia_borne_motor(
            projeto,
            carga,
            descricao=f"Número de fases do motor inválido para sugestão de borne ({carga}).",
            corrente_referencia_a=corrente_min_a,
            memoria_calculo=(
                f"[BORNE — MOTOR]\n{carga}\nnumero_fases={motor.numero_fases}"
            ),
        )
        return None

    if mm2_fase is None or corrente_min_a is None:
        _criar_pendencia_borne_motor(
            projeto,
            carga,
            descricao=(
                f"Seção de fase ou corrente de referência ausente no "
                f"dimensionamento ({carga})."
            ),
            corrente_referencia_a=corrente_min_a,
            memoria_calculo=(
                f"[BORNE — MOTOR]\n{carga}\n"
                f"secao_fase={mm2_fase} | corrente_ref={corrente_min_a}"
            ),
        )
        return None

    memoria_passagem = _montar_memoria_borne_passagem_motor(
        carga,
        motor,
        corrente_min_a=corrente_min_a,
        mm2_fase=mm2_fase,
        qtd_passagem=qtd_passagem,
    )

    sugestao_passagem = _sugerir_borne_passagem_motor(
        projeto,
        carga,
        corrente_min_a=corrente_min_a,
        mm2_fase=mm2_fase,
        qtd_passagem=qtd_passagem,
        memoria_calculo=memoria_passagem,
    )

    _processar_borne_terra_motor(
        projeto,
        carga,
        motor,
        dim,
        corrente_min_a,
    )

    return sugestao_passagem