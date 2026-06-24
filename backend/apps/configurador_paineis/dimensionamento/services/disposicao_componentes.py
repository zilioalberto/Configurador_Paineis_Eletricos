"""Disposição de componentes na placa de montagem (trilho DIN e zona livre)."""

from __future__ import annotations

from decimal import Decimal

_GAP_COMPONENTES_MM = 4
_FOLGA_LATERAL_ESQUERDA_MM = 10


def _parse_positive_int(value, fallback=0) -> int:
    try:
        n = int(Decimal(str(value)))
    except (TypeError, ValueError, ArithmeticError):
        return fallback
    return n if n > 0 else fallback


def _rects_sobrepoem(a: dict, b: dict, margem: int = 0) -> bool:
    return (
        a["x_mm"] < b["x_mm"] + b["largura_mm"] + margem
        and a["x_mm"] + a["largura_mm"] + margem > b["x_mm"]
        and a["y_mm"] < b["y_mm"] + b["altura_mm"] + margem
        and a["y_mm"] + a["altura_mm"] + margem > b["y_mm"]
    )


def _rect_sobrepoe_canaletas(rect: dict, layout_placa: dict) -> bool:
    canaletas = (layout_placa.get("canaletas_verticais") or []) + (
        layout_placa.get("canaletas_horizontais") or []
    )
    for canaleta in canaletas:
        if _rects_sobrepoem(rect, canaleta):
            return True
    return False


def _centro_y_trilho(trilho: dict) -> float:
    return trilho["y_mm"] + trilho["altura_mm"] / 2


def _obter_faixa_vertical_livre_trilho(trilho: dict, layout_placa: dict) -> tuple[int, int]:
    horizontais = sorted(
        layout_placa.get("canaletas_horizontais") or [],
        key=lambda c: c["y_mm"],
    )
    y_topo_trilho = trilho["y_mm"]
    y_base_trilho = trilho["y_mm"] + trilho["altura_mm"]

    y_min_mm = 0
    for canaleta in horizontais:
        base_canaleta = canaleta["y_mm"] + canaleta["altura_mm"]
        if base_canaleta <= y_topo_trilho + 0.5:
            y_min_mm = max(y_min_mm, base_canaleta)

    y_max_mm = layout_placa["placa_altura_mm"]
    for canaleta in horizontais:
        if canaleta["y_mm"] >= y_base_trilho - 0.5:
            y_max_mm = min(y_max_mm, canaleta["y_mm"])
            break

    return y_min_mm, y_max_mm


def _posicao_centralizada_no_trilho(
    trilho: dict,
    largura_mm: int,
    altura_mm: int,
    layout_placa: dict | None = None,
) -> dict:
    x_mm = int(round(trilho["x_mm"] + (trilho["largura_mm"] - largura_mm) / 2))
    y_mm = int(round(_centro_y_trilho(trilho) - altura_mm / 2))

    if layout_placa is not None:
        y_min_mm, y_max_mm = _obter_faixa_vertical_livre_trilho(trilho, layout_placa)
        y_max_componente = y_max_mm - altura_mm
        y_mm = int(round(max(y_min_mm, min(y_mm, max(y_min_mm, y_max_componente)))))

    return {"x_mm": x_mm, "y_mm": y_mm}


def _clamp_x_no_trilho(trilho: dict, x_mm: int, largura_mm: int) -> int:
    minimo = trilho["x_mm"] + _FOLGA_LATERAL_ESQUERDA_MM
    maximo = trilho["x_mm"] + trilho["largura_mm"] - largura_mm
    if maximo < minimo:
        maximo = minimo
    return int(round(max(minimo, min(x_mm, maximo))))


def _x_inicial_sequencial_esquerda(trilho: dict) -> int:
    return trilho["x_mm"] + _FOLGA_LATERAL_ESQUERDA_MM


def expandir_instancias_componentes(itens: list[dict]) -> list[dict]:
    instancias: list[dict] = []
    for item in itens:
        largura = _parse_positive_int(item.get("largura_mm"))
        altura = _parse_positive_int(item.get("altura_mm"))
        if largura <= 0 or altura <= 0:
            continue
        qtd = max(1, int(Decimal(str(item.get("quantidade") or "1"))))
        secao = item.get("secao_max_mm2")
        try:
            secao_num = float(Decimal(str(secao))) if secao is not None else 0.0
        except (TypeError, ValueError, ArithmeticError):
            secao_num = 0.0
        for indice in range(qtd):
            instancias.append(
                {
                    "instancia_id": f"{item['composicao_item_id']}#{indice}",
                    "composicao_item_id": item["composicao_item_id"],
                    "produto_codigo": item.get("produto_codigo", ""),
                    "produto_descricao": item.get("produto_descricao", ""),
                    "modo_montagem": item.get("modo_montagem") or "",
                    "categoria_produto": item.get("categoria_produto") or "",
                    "parte_painel": item.get("parte_painel") or "",
                    "secao_max_mm2": secao_num,
                    "eh_borne_alimentacao": bool(item.get("eh_borne_alimentacao")),
                    "largura_mm": largura,
                    "altura_mm": altura,
                }
            )
    return instancias


def _eh_borne(inst: dict) -> bool:
    return inst.get("categoria_produto") == "BORNE"


def _eh_disjuntor(inst: dict) -> bool:
    return inst.get("categoria_produto") in {
        "DISJUNTOR",
        "DISJUNTOR_MOTOR",
        "DISJUNTOR_CAIXA_MOLDADA",
        "MINIDISJUNTOR",
    }


def _eh_contatora(inst: dict) -> bool:
    return inst.get("categoria_produto") in {"CONTATOR", "CONTATORA"}


def _eh_disjuntor_superior_esquerda(inst: dict) -> bool:
    if inst.get("modo_montagem") != "TRILHO_DIN":
        return False
    categoria = inst.get("categoria_produto")
    if categoria not in ("DISJUNTOR_CAIXA_MOLDADA", "MINIDISJUNTOR"):
        return False
    return inst.get("parte_painel") in ("PROTECAO_GERAL", "SECCIONAMENTO")


def _centro_y_trilho_dict(trilho: dict) -> float:
    return trilho["y_mm"] + trilho["altura_mm"] / 2


def _indice_trilho_inferior(trilhos: list[dict]) -> int | None:
    if not trilhos:
        return None
    return max(range(len(trilhos)), key=lambda idx: _centro_y_trilho_dict(trilhos[idx]))


def _indice_trilho_superior(trilhos: list[dict]) -> int | None:
    if not trilhos:
        return None
    return min(range(len(trilhos)), key=lambda idx: _centro_y_trilho_dict(trilhos[idx]))


def _ordenar_bornes(insts: list[dict]) -> list[dict]:
    return sorted(
        insts,
        key=lambda inst: (
            0 if inst.get("eh_borne_alimentacao") else 1,
            -float(inst.get("secao_max_mm2") or 0),
            inst.get("produto_codigo") or "",
        ),
    )


def _ordenar_disjuntores_superiores(insts: list[dict]) -> list[dict]:
    peso = {"SECCIONAMENTO": 0, "PROTECAO_GERAL": 1}

    def chave(inst: dict):
        return (
            peso.get(inst.get("parte_painel") or "", 2),
            inst.get("produto_codigo") or "",
        )

    return sorted(insts, key=chave)


def _distribuir_sequencial_esquerda_no_trilho(
    trilho: dict,
    trilho_indice: int,
    instancias: list[dict],
    layout_placa: dict,
    ja_posicionados: list[dict],
    gap_mm: int = _GAP_COMPONENTES_MM,
    x_inicial: int | None = None,
) -> list[dict]:
    if not instancias:
        return []
    x = x_inicial if x_inicial is not None else _x_inicial_sequencial_esquerda(trilho)
    posicionados: list[dict] = []
    for inst in instancias:
        contexto = [*ja_posicionados, *posicionados]
        candidato = _buscar_posicao_valida_no_trilho(
            trilho,
            trilho_indice,
            inst,
            layout_placa,
            contexto,
            x_preferido=x,
        )
        if candidato is None:
            continue
        posicionados.append(candidato)
        x = candidato["x_mm"] + inst["largura_mm"] + gap_mm
    return posicionados


def _distribuir_bornes_no_trilho(
    trilho: dict,
    trilho_indice: int,
    instancias: list[dict],
    layout_placa: dict,
    ja_posicionados: list[dict],
) -> list[dict]:
    return _distribuir_sequencial_esquerda_no_trilho(
        trilho,
        trilho_indice,
        _ordenar_bornes(instancias),
        layout_placa,
        ja_posicionados,
        gap_mm=0,
    )


def _posicao_valida(item: dict, layout_placa: dict, outros: list[dict]) -> bool:
    rect = {
        "x_mm": item["x_mm"],
        "y_mm": item["y_mm"],
        "largura_mm": item["largura_mm"],
        "altura_mm": item["altura_mm"],
    }
    if rect["x_mm"] < 0 or rect["y_mm"] < 0:
        return False
    if rect["x_mm"] + rect["largura_mm"] > layout_placa["placa_largura_mm"]:
        return False
    if rect["y_mm"] + rect["altura_mm"] > layout_placa["placa_altura_mm"]:
        return False
    if _rect_sobrepoe_canaletas(rect, layout_placa):
        return False
    for outro in outros:
        if outro["instancia_id"] == item["instancia_id"]:
            continue
        if _rects_sobrepoem(
            rect,
            {
                "x_mm": outro["x_mm"],
                "y_mm": outro["y_mm"],
                "largura_mm": outro["largura_mm"],
                "altura_mm": outro["altura_mm"],
            },
        ):
            return False
    return True


def _montar_candidato_disposicao(
    inst: dict,
    trilho_indice: int | None,
    x_mm: int,
    y_mm: int,
) -> dict:
    return {
        "instancia_id": inst["instancia_id"],
        "composicao_item_id": inst["composicao_item_id"],
        "produto_codigo": inst["produto_codigo"],
        "produto_descricao": inst["produto_descricao"],
        "modo_montagem": inst["modo_montagem"],
        "x_mm": x_mm,
        "y_mm": y_mm,
        "largura_mm": inst["largura_mm"],
        "altura_mm": inst["altura_mm"],
        "trilho_indice": trilho_indice,
        "manual": False,
    }


def _montar_candidato_trilho(
    inst: dict,
    trilho_indice: int,
    x_mm: int,
    y_mm: int,
) -> dict:
    return _montar_candidato_disposicao(inst, trilho_indice, x_mm, y_mm)


def _buscar_posicao_valida_no_trilho(
    trilho: dict,
    trilho_indice: int,
    inst: dict,
    layout_placa: dict,
    ja_posicionados: list[dict],
    *,
    x_preferido: int,
    passo_mm: int = 1,
) -> dict | None:
    base = _posicao_centralizada_no_trilho(
        trilho, inst["largura_mm"], inst["altura_mm"], layout_placa
    )
    x_min = trilho["x_mm"] + _FOLGA_LATERAL_ESQUERDA_MM
    x_max = trilho["x_mm"] + trilho["largura_mm"] - inst["largura_mm"]
    if x_max < x_min:
        return None
    x_inicio = max(x_min, min(int(round(x_preferido)), x_max))

    for x in range(x_inicio, x_max + 1, passo_mm):
        candidato = _montar_candidato_trilho(
            inst, trilho_indice, x, base["y_mm"]
        )
        if _posicao_valida(candidato, layout_placa, ja_posicionados):
            return candidato

    for x in range(x_min, x_inicio, passo_mm):
        candidato = _montar_candidato_trilho(
            inst, trilho_indice, x, base["y_mm"]
        )
        if _posicao_valida(candidato, layout_placa, ja_posicionados):
            return candidato
    return None


def _buscar_posicao_valida_na_faixa(
    inst: dict,
    faixa: dict,
    layout_placa: dict,
    ja_posicionados: list[dict],
    *,
    y_preferido: int,
    passo_mm: int = 1,
) -> dict | None:
    x = int(round(faixa["x_mm"] + (faixa["largura_mm"] - inst["largura_mm"]) / 2))
    y_min = faixa["y_inicio_mm"]
    y_max = faixa["y_fim_mm"] - inst["altura_mm"]
    if y_max < y_min:
        return None
    y_inicio = max(y_min, min(int(round(y_preferido)), y_max))

    for y in range(y_inicio, y_max + 1, passo_mm):
        candidato = _montar_candidato_disposicao(inst, None, x, y)
        if _posicao_valida(candidato, layout_placa, ja_posicionados):
            return candidato

    for y in range(y_min, y_inicio, passo_mm):
        candidato = _montar_candidato_disposicao(inst, None, x, y)
        if _posicao_valida(candidato, layout_placa, ja_posicionados):
            return candidato
    return None


def _distribuir_no_trilho(
    trilho: dict,
    trilho_indice: int,
    instancias: list[dict],
    layout_placa: dict,
    ja_posicionados: list[dict],
) -> list[dict]:
    if not instancias:
        return []

    total_largura = sum(inst["largura_mm"] for inst in instancias) + _GAP_COMPONENTES_MM * max(
        0, len(instancias) - 1
    )
    x = trilho["x_mm"] + max(0, (trilho["largura_mm"] - total_largura) / 2)
    posicionados: list[dict] = []

    for inst in instancias:
        contexto = [*ja_posicionados, *posicionados]
        candidato = _buscar_posicao_valida_no_trilho(
            trilho,
            trilho_indice,
            inst,
            layout_placa,
            contexto,
            x_preferido=x,
        )
        if candidato is None:
            continue
        posicionados.append(candidato)
        x = candidato["x_mm"] + inst["largura_mm"] + _GAP_COMPONENTES_MM

    return posicionados


def _largura_total_grupo_trilho(instancias: list[dict], gap_mm: int = _GAP_COMPONENTES_MM) -> int:
    return sum(inst["largura_mm"] for inst in instancias) + gap_mm * max(0, len(instancias) - 1)


def _grupo_cabe_no_trilho(
    trilho: dict,
    instancias: list[dict],
    x_inicial: int | None = None,
    gap_mm: int = _GAP_COMPONENTES_MM,
) -> bool:
    if not instancias:
        return True
    x = x_inicial if x_inicial is not None else _x_inicial_sequencial_esquerda(trilho)
    return x + _largura_total_grupo_trilho(instancias, gap_mm) <= trilho["x_mm"] + trilho["largura_mm"]


def _ordenar_disjuntores_agrupados(insts: list[dict]) -> list[dict]:
    return sorted(insts, key=lambda inst: (inst.get("produto_codigo") or "", inst["instancia_id"]))


def _ordenar_contatoras_agrupadas(insts: list[dict]) -> list[dict]:
    return sorted(insts, key=lambda inst: (inst.get("produto_codigo") or "", inst["instancia_id"]))


def _x_inicial_para_posicao(pos: int, indice_minimo: int, x_inicial: int | None) -> int | None:
    return x_inicial if pos == indice_minimo else None


def _distribuir_grupo_em_um_trilho(
    trilhos: list[dict],
    indices_preferencia: list[int],
    instancias: list[dict],
    layout_placa: dict,
    resultado: list[dict],
    *,
    indice_minimo: int,
    x_inicial: int | None,
) -> tuple[list[dict], int] | None:
    for pos, indice in enumerate(indices_preferencia[indice_minimo:], start=indice_minimo):
        x_posicao = _x_inicial_para_posicao(pos, indice_minimo, x_inicial)
        trilho = trilhos[indice]
        if not _grupo_cabe_no_trilho(trilho, instancias, x_posicao):
            continue
        posicionados = _distribuir_sequencial_esquerda_no_trilho(
            trilho,
            indice,
            instancias,
            layout_placa,
            resultado,
            x_inicial=x_posicao,
        )
        if len(posicionados) == len(instancias):
            return posicionados, pos
    return None


def _distribuir_grupo_parcial_por_trilhos(
    trilhos: list[dict],
    indices_preferencia: list[int],
    instancias: list[dict],
    layout_placa: dict,
    resultado: list[dict],
    *,
    indice_minimo: int,
    x_inicial: int | None,
) -> tuple[list[dict], int]:
    posicionados: list[dict] = []
    restantes = list(instancias)
    ultimo_pos = indice_minimo
    for pos, indice in enumerate(indices_preferencia[indice_minimo:], start=indice_minimo):
        if not restantes:
            break
        parciais = _distribuir_sequencial_esquerda_no_trilho(
            trilhos[indice],
            indice,
            restantes,
            layout_placa,
            [*resultado, *posicionados],
            x_inicial=_x_inicial_para_posicao(pos, indice_minimo, x_inicial),
        )
        if not parciais:
            continue
        ids = {item["instancia_id"] for item in parciais}
        posicionados.extend(parciais)
        restantes = [inst for inst in restantes if inst["instancia_id"] not in ids]
        ultimo_pos = pos
    return posicionados, ultimo_pos


def _distribuir_grupo_preferindo_mesmo_trilho(
    trilhos: list[dict],
    indices_preferencia: list[int],
    instancias: list[dict],
    layout_placa: dict,
    resultado: list[dict],
    *,
    indice_minimo: int = 0,
    x_inicial: int | None = None,
) -> tuple[list[dict], int]:
    if not instancias:
        return [], indice_minimo

    completos = _distribuir_grupo_em_um_trilho(
        trilhos,
        indices_preferencia,
        instancias,
        layout_placa,
        resultado,
        indice_minimo=indice_minimo,
        x_inicial=x_inicial,
    )
    if completos is not None:
        return completos
    return _distribuir_grupo_parcial_por_trilhos(
        trilhos,
        indices_preferencia,
        instancias,
        layout_placa,
        resultado,
        indice_minimo=indice_minimo,
        x_inicial=x_inicial,
    )


def _listar_faixas_horizontais_livres(layout_placa: dict) -> list[dict]:
    """Faixas livres entre canaletas horizontais consecutivas (mesmo índice do trilho DIN)."""
    horizontais = sorted(
        layout_placa.get("canaletas_horizontais") or [],
        key=lambda c: c["y_mm"],
    )
    zona = layout_placa["zona_componentes"]
    faixas: list[dict] = []
    for indice in range(len(horizontais) - 1):
        superior = horizontais[indice]
        inferior = horizontais[indice + 1]
        y_inicio = superior["y_mm"] + superior["altura_mm"]
        y_fim = inferior["y_mm"]
        if y_fim <= y_inicio:
            continue
        faixas.append(
            {
                "indice": indice,
                "y_inicio_mm": y_inicio,
                "y_fim_mm": y_fim,
                "altura_livre_mm": y_fim - y_inicio,
                "x_mm": zona["x_mm"],
                "largura_mm": zona["largura_mm"],
            }
        )
    return faixas


def _ordenar_faixas_para_item_placa(inst: dict, faixas: list[dict]) -> list[dict]:
    candidatas = [
        faixa
        for faixa in faixas
        if faixa["altura_livre_mm"] >= inst["altura_mm"]
        and faixa["largura_mm"] >= inst["largura_mm"]
    ]
    base = candidatas if candidatas else sorted(faixas, key=lambda faixa: faixa["altura_livre_mm"], reverse=True)
    return sorted(base, key=lambda faixa: faixa["indice"], reverse=True)


def _escolher_faixa_para_item_placa(inst: dict, faixas: list[dict]) -> dict | None:
    ordenadas = _ordenar_faixas_para_item_placa(inst, faixas)
    return ordenadas[0] if ordenadas else None


def ajustar_layout_placa_para_itens(layout_placa: dict, _itens: list[dict]) -> dict:
    """
    Mantém trilhos DIN no layout para disposição e validação.

    O recorte visual do trilho sob componentes montados em PLACA (+ folga lateral)
    é feito na renderização (frontend) a partir da disposição calculada.
    """
    return layout_placa


_RECORTE_TRILHO_PLACA_MARGEM_MM = 10


def _merge_recortes_x(recortes: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not recortes:
        return []
    ordenados = sorted(recortes, key=lambda par: par[0])
    merged: list[tuple[int, int]] = [ordenados[0]]
    for x_inicio, x_fim in ordenados[1:]:
        ultimo_inicio, ultimo_fim = merged[-1]
        if x_inicio <= ultimo_fim:
            merged[-1] = (ultimo_inicio, max(ultimo_fim, x_fim))
        else:
            merged.append((x_inicio, x_fim))
    return merged


def _rects_sobrepoem_verticalmente(trilho: dict, comp: dict) -> bool:
    t_topo = trilho["y_mm"]
    t_base = trilho["y_mm"] + trilho["altura_mm"]
    c_topo = comp["y_mm"]
    c_base = comp["y_mm"] + comp["altura_mm"]
    return not (c_base <= t_topo or c_topo >= t_base)


def recortes_trilho_por_componentes_placa(
    trilho: dict,
    componentes: list[dict],
) -> list[tuple[int, int]]:
    recortes: list[tuple[int, int]] = []
    for comp in componentes:
        if comp.get("modo_montagem") == "TRILHO_DIN":
            continue
        if not _rects_sobrepoem_verticalmente(trilho, comp):
            continue
        recortes.append(
            (
                int(comp["x_mm"]) - _RECORTE_TRILHO_PLACA_MARGEM_MM,
                int(comp["x_mm"]) + int(comp["largura_mm"]) + _RECORTE_TRILHO_PLACA_MARGEM_MM,
            )
        )
    return _merge_recortes_x(recortes)


def segmentar_trilho_din(trilho: dict, recortes: list[tuple[int, int]]) -> list[dict]:
    x_min = int(trilho["x_mm"])
    x_max = x_min + int(trilho["largura_mm"])
    recortes_efetivos = _merge_recortes_x(
        [
            (max(x_min, ini), min(x_max, fim))
            for ini, fim in recortes
            if min(x_max, fim) > max(x_min, ini)
        ]
    )
    if not recortes_efetivos:
        return [dict(trilho)]

    segmentos: list[dict] = []
    cursor = x_min
    for x_inicio, x_fim in recortes_efetivos:
        if x_inicio > cursor:
            largura = x_inicio - cursor
            segmentos.append(
                {
                    **trilho,
                    "x_mm": cursor,
                    "largura_mm": largura,
                    "comprimento_mm": largura,
                }
            )
        cursor = max(cursor, x_fim)
    if cursor < x_max:
        largura = x_max - cursor
        segmentos.append(
            {
                **trilho,
                "x_mm": cursor,
                "largura_mm": largura,
                "comprimento_mm": largura,
            }
        )
    return segmentos


def segmentar_trilhos_din_com_disposicao(
    trilhos: list[dict],
    disposicao: list[dict],
) -> list[dict]:
    resultado: list[dict] = []
    for trilho in trilhos:
        recortes = recortes_trilho_por_componentes_placa(trilho, disposicao)
        resultado.extend(segmentar_trilho_din(trilho, recortes))
    return resultado


def _posicionar_itens_placa_na_faixa(
    instancias: list[dict],
    faixa: dict,
    layout_placa: dict,
    ja_posicionados: list[dict],
) -> list[dict]:
    espacamento = _GAP_COMPONENTES_MM
    altura_total = sum(inst["altura_mm"] for inst in instancias) + espacamento * max(
        0, len(instancias) - 1
    )
    y_base = faixa["y_inicio_mm"] + max(0, (faixa["altura_livre_mm"] - altura_total) / 2)
    posicionados: list[dict] = []

    for indice, inst in enumerate(instancias):
        y_preferido = int(round(y_base + indice * (inst["altura_mm"] + espacamento)))
        candidato = _buscar_posicao_valida_na_faixa(
            inst,
            faixa,
            layout_placa,
            [*ja_posicionados, *posicionados],
            y_preferido=y_preferido,
        )
        if candidato is not None:
            posicionados.append(candidato)
    return posicionados


def _posicionar_itens_placa(
    placa_itens: list[dict],
    layout_placa: dict,
    ja_posicionados: list[dict],
) -> list[dict]:
    if not placa_itens:
        return []

    faixas = _listar_faixas_horizontais_livres(layout_placa)
    resultado: list[dict] = []

    for inst in placa_itens:
        for faixa in _ordenar_faixas_para_item_placa(inst, faixas):
            y_preferido = int(
                round(faixa["y_inicio_mm"] + (faixa["altura_livre_mm"] - inst["altura_mm"]) / 2)
            )
            candidato = _buscar_posicao_valida_na_faixa(
                inst,
                faixa,
                layout_placa,
                [*ja_posicionados, *resultado],
                y_preferido=y_preferido,
            )
            if candidato is not None:
                resultado.append(candidato)
                break

    return resultado


def _classificar_instancias_disposicao(instancias: list[dict]) -> dict:
    bornes = [i for i in instancias if _eh_borne(i) and i["modo_montagem"] == "TRILHO_DIN"]
    trilho_itens = [
        i for i in instancias if i["modo_montagem"] == "TRILHO_DIN" and not _eh_borne(i)
    ]
    disjuntores_superiores = [i for i in trilho_itens if _eh_disjuntor_superior_esquerda(i)]
    resto_trilho = [i for i in trilho_itens if not _eh_disjuntor_superior_esquerda(i)]
    disjuntores = _ordenar_disjuntores_agrupados([i for i in resto_trilho if _eh_disjuntor(i)])
    contatoras = _ordenar_contatoras_agrupadas([i for i in resto_trilho if _eh_contatora(i)])
    outros_trilho = [
        i for i in resto_trilho if not _eh_disjuntor(i) and not _eh_contatora(i)
    ]
    return {
        "bornes": bornes,
        "disjuntores_superiores": disjuntores_superiores,
        "disjuntores": disjuntores,
        "contatoras": contatoras,
        "outros_trilho": outros_trilho,
        "placa_itens": [i for i in instancias if i["modo_montagem"] != "TRILHO_DIN"],
    }


def _distribuir_trilho_unico(
    trilhos: list[dict],
    idx_superior: int,
    grupos: dict,
    layout_placa: dict,
    resultado: list[dict],
) -> None:
    lista_nao_bornes = [
        *_ordenar_disjuntores_superiores(grupos["disjuntores_superiores"]),
        *grupos["disjuntores"],
        *grupos["contatoras"],
        *grupos["outros_trilho"],
    ]
    if lista_nao_bornes:
        resultado.extend(
            _distribuir_sequencial_esquerda_no_trilho(
                trilhos[idx_superior],
                idx_superior,
                lista_nao_bornes,
                layout_placa,
                resultado,
            )
        )
    if not grupos["bornes"]:
        return
    ultimo = resultado[-1] if resultado else None
    x_bornes = ultimo["x_mm"] + ultimo["largura_mm"] + _GAP_COMPONENTES_MM if ultimo else None
    resultado.extend(
        _distribuir_sequencial_esquerda_no_trilho(
            trilhos[idx_superior],
            idx_superior,
            _ordenar_bornes(grupos["bornes"]),
            layout_placa,
            resultado,
            gap_mm=0,
            x_inicial=x_bornes,
        )
    )


def _indices_trilhos_superiores(trilhos: list[dict], idx_inferior: int | None) -> list[int]:
    return sorted(
        [idx for idx in range(len(trilhos)) if idx != idx_inferior],
        key=lambda idx: _centro_y_trilho_dict(trilhos[idx]),
    )


def _x_apos_ultimo_no_trilho(resultado: list[dict], trilho_indice: int | None) -> int | None:
    if not resultado or trilho_indice is None:
        return None
    ultimo = resultado[-1]
    if ultimo.get("trilho_indice") != trilho_indice:
        return None
    return ultimo["x_mm"] + ultimo["largura_mm"] + _GAP_COMPONENTES_MM


def _proxima_posicao_trilho(pos: int, total: int) -> int:
    return pos + 1 if pos + 1 < total else pos


def _distribuir_outros_trilho(
    trilhos: list[dict],
    indices_superiores: list[int],
    outros_trilho: list[dict],
    layout_placa: dict,
    resultado: list[dict],
) -> None:
    for inst in outros_trilho:
        if not indices_superiores:
            break
        indice_menor = min(
            indices_superiores,
            key=lambda idx: sum(
                item["largura_mm"]
                for item in resultado
                if item.get("trilho_indice") == idx
            ),
        )
        resultado.extend(
            _distribuir_sequencial_esquerda_no_trilho(
                trilhos[indice_menor],
                indice_menor,
                [inst],
                layout_placa,
                resultado,
            )
        )


def _distribuir_multiplos_trilhos(
    trilhos: list[dict],
    idx_inferior: int | None,
    idx_superior: int | None,
    grupos: dict,
    layout_placa: dict,
    resultado: list[dict],
) -> None:
    indices_superiores = _indices_trilhos_superiores(trilhos, idx_inferior)
    pos_corrente = 0
    if idx_superior is not None:
        lista_superior = _ordenar_disjuntores_superiores(grupos["disjuntores_superiores"])
        if lista_superior:
            resultado.extend(
                _distribuir_sequencial_esquerda_no_trilho(
                    trilhos[idx_superior],
                    idx_superior,
                    lista_superior,
                    layout_placa,
                    resultado,
                )
            )

    posicionados_disj, pos_disj = _distribuir_grupo_preferindo_mesmo_trilho(
        trilhos,
        indices_superiores,
        grupos["disjuntores"],
        layout_placa,
        resultado,
        indice_minimo=pos_corrente,
        x_inicial=_x_apos_ultimo_no_trilho(resultado, idx_superior),
    )
    resultado.extend(posicionados_disj)
    if posicionados_disj:
        pos_corrente = _proxima_posicao_trilho(pos_disj, len(indices_superiores))

    posicionados_contatoras, _pos_contatoras = _distribuir_grupo_preferindo_mesmo_trilho(
        trilhos,
        indices_superiores,
        grupos["contatoras"],
        layout_placa,
        resultado,
        indice_minimo=pos_corrente,
    )
    resultado.extend(posicionados_contatoras)

    _distribuir_outros_trilho(
        trilhos,
        indices_superiores,
        grupos["outros_trilho"],
        layout_placa,
        resultado,
    )

    if idx_inferior is not None and grupos["bornes"]:
        resultado.extend(
            _distribuir_bornes_no_trilho(
                trilhos[idx_inferior],
                idx_inferior,
                grupos["bornes"],
                layout_placa,
                resultado,
            )
        )


def sugerir_disposicao_componentes(layout_placa: dict, itens: list[dict]) -> list[dict]:
    layout_placa = ajustar_layout_placa_para_itens(layout_placa, itens)
    instancias = expandir_instancias_componentes(itens)
    trilhos = layout_placa.get("trilhos_din") or []
    idx_inferior = _indice_trilho_inferior(trilhos)
    idx_superior = _indice_trilho_superior(trilhos)
    grupos = _classificar_instancias_disposicao(instancias)
    resultado: list[dict] = []

    if idx_inferior is not None and idx_superior == idx_inferior:
        _distribuir_trilho_unico(trilhos, idx_superior, grupos, layout_placa, resultado)
    else:
        _distribuir_multiplos_trilhos(
            trilhos,
            idx_inferior,
            idx_superior,
            grupos,
            layout_placa,
            resultado,
        )

    resultado.extend(_posicionar_itens_placa(grupos["placa_itens"], layout_placa, resultado))

    return _completar_disposicao_faltante(instancias, layout_placa, resultado)


def _posicionar_instancia_faltante(
    inst: dict,
    layout_placa: dict,
    ja_posicionados: list[dict],
) -> dict | None:
    trilhos = layout_placa.get("trilhos_din") or []
    if inst.get("modo_montagem") == "TRILHO_DIN":
        for indice, trilho in enumerate(trilhos):
            candidato = _buscar_posicao_valida_no_trilho(
                trilho,
                indice,
                inst,
                layout_placa,
                ja_posicionados,
                x_preferido=_x_inicial_sequencial_esquerda(trilho),
            )
            if candidato is not None:
                return candidato
        return None

    faixas = _listar_faixas_horizontais_livres(layout_placa)
    for faixa in _ordenar_faixas_para_item_placa(inst, faixas):
        y_preferido = int(
            round(faixa["y_inicio_mm"] + (faixa["altura_livre_mm"] - inst["altura_mm"]) / 2)
        )
        candidato = _buscar_posicao_valida_na_faixa(
            inst,
            faixa,
            layout_placa,
            ja_posicionados,
            y_preferido=y_preferido,
        )
        if candidato is not None:
            return candidato
    return None


def _completar_disposicao_faltante(
    instancias: list[dict],
    layout_placa: dict,
    parcial: list[dict],
) -> list[dict]:
    resultado = list(parcial)
    colocados = {item["instancia_id"] for item in resultado}
    mapa = {inst["instancia_id"]: inst for inst in instancias}
    for inst_id, inst in mapa.items():
        if inst_id in colocados:
            continue
        candidato = _posicionar_instancia_faltante(inst, layout_placa, resultado)
        if candidato is not None:
            resultado.append(candidato)
            colocados.add(inst_id)
    return resultado


def validar_disposicao_componentes(disposicao: list[dict], layout_placa: dict) -> list[str]:
    erros: list[str] = []

    for item in disposicao:
        rect = {
            "x_mm": item["x_mm"],
            "y_mm": item["y_mm"],
            "largura_mm": item["largura_mm"],
            "altura_mm": item["altura_mm"],
        }
        if _rect_sobrepoe_canaletas(rect, layout_placa):
            erros.append(
                f"Componente {item.get('produto_codigo', item.get('instancia_id'))} sobrepõe canaleta."
            )
        outros = [outro for outro in disposicao if outro["instancia_id"] != item["instancia_id"]]
        for outro in outros:
            if _rects_sobrepoem(
                rect,
                {
                    "x_mm": outro["x_mm"],
                    "y_mm": outro["y_mm"],
                    "largura_mm": outro["largura_mm"],
                    "altura_mm": outro["altura_mm"],
                },
            ):
                erros.append(
                    f"Componentes {item.get('produto_codigo')} e {outro.get('produto_codigo')} "
                    "estão sobrepostos."
                )
                break

    return erros


def validar_disposicao_para_itens(
    disposicao: list[dict] | None,
    layout_placa: dict | None,
    itens: list[dict],
) -> list[str]:
    if not layout_placa:
        return ["Layout da placa indisponível."]
    if not disposicao:
        return []

    esperadas = {inst["instancia_id"] for inst in expandir_instancias_componentes(itens)}
    recebidas = {item["instancia_id"] for item in disposicao}
    if esperadas != recebidas:
        faltando = esperadas - recebidas
        extras = recebidas - esperadas
        msgs = []
        if faltando:
            msgs.append(f"Disposição incompleta: faltam {len(faltando)} instância(s).")
        if extras:
            msgs.append(f"Disposição contém {len(extras)} instância(s) obsoleta(s).")
        return msgs

    return validar_disposicao_componentes(disposicao, layout_placa)


def _fallback_disposicao_instancia(
    inst_id: str,
    mapa_instancias: dict,
    mapa_sugerida: dict,
    layout_placa: dict,
    resultado: list[dict],
) -> dict | None:
    fallback = mapa_sugerida.get(inst_id)
    if fallback is not None:
        return fallback
    inst = mapa_instancias.get(inst_id)
    if inst is None:
        return None
    return _posicionar_instancia_faltante(inst, layout_placa, resultado)


def _mesclar_item_disposicao_salva(
    *,
    salvo: dict | None,
    fallback: dict,
    layout_placa: dict,
    resultado: list[dict],
) -> dict:
    if not salvo:
        return fallback
    candidato = dict(salvo)
    if salvo.get("manual"):
        candidato["manual"] = True
    if _posicao_valida(candidato, layout_placa, resultado):
        return candidato
    return fallback


def mesclar_disposicao_salva(
    salva: list[dict] | None,
    layout_placa: dict,
    itens: list[dict],
) -> list[dict]:
    layout_ajustado = ajustar_layout_placa_para_itens(layout_placa, itens)
    sugerida = sugerir_disposicao_componentes(layout_placa, itens)
    if not salva:
        return sugerida

    instancias = expandir_instancias_componentes(itens)
    mapa_instancias = {inst["instancia_id"]: inst for inst in instancias}
    instancias_atuais = set(mapa_instancias.keys())
    mapa_sugerida = {item["instancia_id"]: item for item in sugerida}
    mapa_salva = {item["instancia_id"]: item for item in salva}
    resultado: list[dict] = []

    for inst_id in instancias_atuais:
        fallback = _fallback_disposicao_instancia(
            inst_id,
            mapa_instancias,
            mapa_sugerida,
            layout_ajustado,
            resultado,
        )
        if fallback is None:
            continue
        resultado.append(
            _mesclar_item_disposicao_salva(
                salvo=mapa_salva.get(inst_id),
                fallback=fallback,
                layout_placa=layout_placa,
                resultado=resultado,
            )
        )

    return _completar_disposicao_faltante(instancias, layout_ajustado, resultado)


def sincronizar_disposicao_com_itens(
    salva: list[dict] | None,
    layout_placa: dict,
    itens: list[dict],
) -> list[dict]:
    """Mescla posições salvas e completa com sugestão automática quando faltam instâncias."""
    merged = mesclar_disposicao_salva(salva, layout_placa, itens)
    esperado = len(expandir_instancias_componentes(itens))
    if len(merged) == esperado:
        return merged
    return sugerir_disposicao_componentes(layout_placa, itens)
