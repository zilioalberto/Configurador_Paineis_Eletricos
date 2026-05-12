from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from catalogo.models import (
    EspecificacaoBarramento,
    EspecificacaoBorne,
    EspecificacaoBotao,
    EspecificacaoCabo,
    EspecificacaoCanaleta,
    EspecificacaoChaveSeletora,
    EspecificacaoClimatizacao,
    EspecificacaoContatora,
    EspecificacaoControladorTemperatura,
    EspecificacaoDisjuntorCaixaMoldada,
    EspecificacaoDisjuntorMotor,
    EspecificacaoExpansaoPLC,
    EspecificacaoFonte,
    EspecificacaoFusivel,
    EspecificacaoGateway,
    EspecificacaoIHM,
    EspecificacaoInversorFrequencia,
    EspecificacaoMiniDisjuntor,
    EspecificacaoModuloComunicacao,
    EspecificacaoPainel,
    EspecificacaoPLC,
    EspecificacaoReleEstadoSolido,
    EspecificacaoReleInterface,
    EspecificacaoReleSobrecarga,
    EspecificacaoSeccionadora,
    EspecificacaoSinalizador,
    EspecificacaoSoftStarter,
    EspecificacaoSwitchRede,
    EspecificacaoTemporizador,
    EspecificacaoTrilhoDIN,
    Produto,
)
from core.choices.eletrica import (
    NumeroFasesChoices,
    TensaoChoices,
    TensaoIluminacaoBotaoChoices,
    TipoCorrenteChoices,
)
from core.choices.paineis import (
    AcabamentoPlacaPainelChoices,
    CorPainelChoices,
    MaterialPainelChoices,
    TipoInstalacaoPainelChoices,
    TipoPainelCatalogoChoices,
)
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    CorSinalizadorChoices,
    CurvaDisparoMiniDisjuntorChoices,
    ConfiguracaoDisparadorDisjuntorCMChoices,
    ModoMontagemChoices,
    NumeroFasesReleEstadoSolidoChoices,
    NumeroFasesInversorFrequenciaChoices,
    MaterialBarramentoChoices,
    NumeroPolosChoices,
    CorBotaoChoices,
    CorCaboChoices,
    MaterialCondutorChoices,
    TipoBarramentoChoices,
    TipoBorneChoices,
    TipoCaboChoices,
    TipoAcionamentoBotaoModoChoices,
    TipoBotaoChoices,
    TipoConexaoBorneChoices,
    TipoIsolacaoCaboChoices,
    TipoExpansaoPLCChoices,
    TipoModuloComunicacaoChoices,
    ProtocoloIndustrialChoices,
    InterfaceFisicaGatewayChoices,
    TipoTelaIHMChoices,
    ProtocoloIHMChoices,
    TipoCanaletaChoices,
    MaterialCanaletaChoices,
    CorCanaletaChoices,
    TipoChaveSeletoraChoices,
    TipoAcionamentoChaveSeletoraChoices,
    CorManoplaChaveSeletoraChoices,
    TipoClimatizacaoChoices,
    TipoFusivelChoices,
    FusivelCartuchoTamanhoChoices,
    FusivelNHTamanhoChoices,
    FormatoFusivelChoices,
    TipoSensorTemperaturaChoices,
    TipoSaidaControleChoices,
    TipoControleTemperaturaChoices,
    ProtocoloComunicacaoChoices,
    TipoMontagemReleChoices,
    TipoContatoChoices,
    TipoReleInterfaceChoices,
    NumeroFaseControleSoftStarterChoices,
    TipoSwitchRedeChoices,
    TipoPortaRedeChoices,
    VelocidadePortaRedeChoices,
    TipoMontagemSwitchChoices,
    TipoTemporizadorChoices,
    TipoFuncaoTemporizadorChoices,
    TipoMontagemTemporizadorChoices,
    TipoTrilhoDINChoices,
    MaterialTrilhoDINChoices,
)

NESTED_KEYS = (
    "especificacao_contatora",
    "especificacao_disjuntor_motor",
    "especificacao_seccionadora",
    "especificacao_disjuntor_caixa_moldada",
    "especificacao_rele_sobrecarga",
    "especificacao_minidisjuntor",
    "especificacao_rele_estado_solido",
    "especificacao_fusivel",
    "especificacao_fonte",
    "especificacao_plc",
    "especificacao_expansao_plc",
    "especificacao_borne",
    "especificacao_cabo",
    "especificacao_canaleta",
    "especificacao_painel",
    "especificacao_climatizacao",
    "especificacao_inversor_frequencia",
    "especificacao_soft_starter",
    "especificacao_rele_interface",
    "especificacao_ihm",
    "especificacao_switch_rede",
    "especificacao_modulo_comunicacao",
    "especificacao_botao",
    "especificacao_chave_seletora",
    "especificacao_sinalizador",
    "especificacao_temporizador",
    "especificacao_controlador_temperatura",
    "especificacao_trilho_din",
    "especificacao_barramento",
    "especificacao_gateway",
)

CATEGORIA_PARA_CAMPO = {
    CategoriaProdutoNomeChoices.CONTATORA: "especificacao_contatora",
    CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR: "especificacao_disjuntor_motor",
    CategoriaProdutoNomeChoices.SECCIONADORA: "especificacao_seccionadora",
    CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA: "especificacao_disjuntor_caixa_moldada",
    CategoriaProdutoNomeChoices.RELE_SOBRECARGA: "especificacao_rele_sobrecarga",
    CategoriaProdutoNomeChoices.MINIDISJUNTOR: "especificacao_minidisjuntor",
    CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO: "especificacao_rele_estado_solido",
    CategoriaProdutoNomeChoices.FUSIVEL: "especificacao_fusivel",
    CategoriaProdutoNomeChoices.FONTE_CHAVEADA: "especificacao_fonte",
    CategoriaProdutoNomeChoices.PLC: "especificacao_plc",
    CategoriaProdutoNomeChoices.EXPANSAO_PLC: "especificacao_expansao_plc",
    CategoriaProdutoNomeChoices.BORNE: "especificacao_borne",
    CategoriaProdutoNomeChoices.CABO: "especificacao_cabo",
    CategoriaProdutoNomeChoices.CANALETA: "especificacao_canaleta",
    CategoriaProdutoNomeChoices.PAINEL: "especificacao_painel",
    CategoriaProdutoNomeChoices.CLIMATIZACAO: "especificacao_climatizacao",
    CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA: "especificacao_inversor_frequencia",
    CategoriaProdutoNomeChoices.SOFT_STARTER: "especificacao_soft_starter",
    CategoriaProdutoNomeChoices.RELE_INTERFACE: "especificacao_rele_interface",
    CategoriaProdutoNomeChoices.IHM: "especificacao_ihm",
    CategoriaProdutoNomeChoices.SWITCH_REDE: "especificacao_switch_rede",
    CategoriaProdutoNomeChoices.MODULO_COMUNICACAO: "especificacao_modulo_comunicacao",
    CategoriaProdutoNomeChoices.BOTAO: "especificacao_botao",
    CategoriaProdutoNomeChoices.CHAVE_SELETORA: "especificacao_chave_seletora",
    CategoriaProdutoNomeChoices.SINALIZADOR: "especificacao_sinalizador",
    CategoriaProdutoNomeChoices.TEMPORIZADOR: "especificacao_temporizador",
    CategoriaProdutoNomeChoices.CONTROLADOR_TEMPERATURA: "especificacao_controlador_temperatura",
    CategoriaProdutoNomeChoices.TRILHO_DIN: "especificacao_trilho_din",
    CategoriaProdutoNomeChoices.BARRAMENTO: "especificacao_barramento",
    CategoriaProdutoNomeChoices.GATEWAY: "especificacao_gateway",
}

MODEL_BY_CAMPO = {
    "especificacao_contatora": EspecificacaoContatora,
    "especificacao_disjuntor_motor": EspecificacaoDisjuntorMotor,
    "especificacao_seccionadora": EspecificacaoSeccionadora,
    "especificacao_disjuntor_caixa_moldada": EspecificacaoDisjuntorCaixaMoldada,
    "especificacao_rele_sobrecarga": EspecificacaoReleSobrecarga,
    "especificacao_minidisjuntor": EspecificacaoMiniDisjuntor,
    "especificacao_rele_estado_solido": EspecificacaoReleEstadoSolido,
    "especificacao_fusivel": EspecificacaoFusivel,
    "especificacao_fonte": EspecificacaoFonte,
    "especificacao_plc": EspecificacaoPLC,
    "especificacao_expansao_plc": EspecificacaoExpansaoPLC,
    "especificacao_borne": EspecificacaoBorne,
    "especificacao_cabo": EspecificacaoCabo,
    "especificacao_canaleta": EspecificacaoCanaleta,
    "especificacao_painel": EspecificacaoPainel,
    "especificacao_climatizacao": EspecificacaoClimatizacao,
    "especificacao_inversor_frequencia": EspecificacaoInversorFrequencia,
    "especificacao_soft_starter": EspecificacaoSoftStarter,
    "especificacao_rele_interface": EspecificacaoReleInterface,
    "especificacao_ihm": EspecificacaoIHM,
    "especificacao_switch_rede": EspecificacaoSwitchRede,
    "especificacao_modulo_comunicacao": EspecificacaoModuloComunicacao,
    "especificacao_botao": EspecificacaoBotao,
    "especificacao_chave_seletora": EspecificacaoChaveSeletora,
    "especificacao_sinalizador": EspecificacaoSinalizador,
    "especificacao_temporizador": EspecificacaoTemporizador,
    "especificacao_controlador_temperatura": EspecificacaoControladorTemperatura,
    "especificacao_trilho_din": EspecificacaoTrilhoDIN,
    "especificacao_barramento": EspecificacaoBarramento,
    "especificacao_gateway": EspecificacaoGateway,
}


def _merge_spec(defaults: dict, incoming: dict | None) -> dict:
    if not incoming:
        return dict(defaults)
    out = dict(defaults)
    for k, v in incoming.items():
        if v is not None:
            out[k] = v
    return out


def _defaults_para_categoria(nome: str) -> dict:
    if nome == CategoriaProdutoNomeChoices.CONTATORA:
        return {
            "tensao_bobina_v": TensaoChoices.V24,
            "tipo_corrente_bobina": TipoCorrenteChoices.CC,
            "contatos_aux_na": 0,
            "contatos_aux_nf": 0,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR:
        return {
            "contatos_aux_na": 0,
            "contatos_aux_nf": 0,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.SECCIONADORA:
        from core.choices.produtos import (
            CorManoplaChoices,
            TipoFixacaoSeccionadoraChoices,
        )

        return {
            "tipo_montagem": ModoMontagemChoices.TRILHO_DIN,
            "tipo_fixacao": TipoFixacaoSeccionadoraChoices.FURO_CENTRAL_M22_5,
            "cor_manopla": CorManoplaChoices.PUNHO_PRETO,
        }
    if nome == CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA:
        return {
            "corrente_nominal_a": "100.00",
            "numero_polos": NumeroPolosChoices.P3,
            "configuracao_disparador": (
                ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO
            ),
            "capacidade_interrupcao_220v_ka": "36.00",
            "capacidade_interrupcao_380v_ka": "25.00",
            "capacidade_interrupcao_440v_ka": "16.00",
            "disparador_sobrecarga_ir_ajuste_min_a": "80.00",
            "disparador_sobrecarga_ir_ajuste_max_a": "100.00",
            "disparador_curto_ii_fixo_a": "1000.00",
            "modo_montagem": ModoMontagemChoices.PLACA,
        }
    if nome == CategoriaProdutoNomeChoices.RELE_SOBRECARGA:
        return {
            "faixa_ajuste_min_a": "1.00",
            "faixa_ajuste_max_a": "100.00",
            "contatos_aux_na": 0,
            "contatos_aux_nf": 0,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.MINIDISJUNTOR:
        return {
            "corrente_nominal_a": "10.00",
            "curva_disparo": CurvaDisparoMiniDisjuntorChoices.C,
            "numero_polos": NumeroPolosChoices.P1,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO:
        return {
            "corrente_nominal_a": "25.00",
            "possui_dissipador": False,
            "tipo_dissipador": None,
            "possui_ventilacao": False,
            "tensao_ventilacao_v": None,
            "potencia_dissipada_w": None,
            "numero_fases": NumeroFasesReleEstadoSolidoChoices.F3,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.FUSIVEL:
        return {
            "tipo_fusivel": TipoFusivelChoices.RAPIDO,
            "formato": FormatoFusivelChoices.NH,
            "tamanho": FusivelNHTamanhoChoices.NH00,
            "corrente_nominal_a": "10.00",
            "indicador_queima": False,
        }
    if nome == CategoriaProdutoNomeChoices.FONTE_CHAVEADA:
        return {
            "tensao_entrada_v": TensaoChoices.V220,
            "tipo_corrente_entrada": TipoCorrenteChoices.CA,
            "tensao_saida_v": TensaoChoices.V24,
            "tipo_corrente_saida": TipoCorrenteChoices.CC,
            "corrente_saida_a": "5.00",
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.PLC:
        return {
            "tensao_alimentacao_v": TensaoChoices.V24,
            "entradas_digitais": 0,
            "saidas_digitais": 0,
            "entradas_analogicas": 0,
            "saidas_analogicas": 0,
            "possui_ethernet": True,
            "possui_serial": False,
            "protocolo_principal": ProtocoloComunicacaoChoices.PROFINET,
            "suporta_expansao": True,
        }
    if nome == CategoriaProdutoNomeChoices.EXPANSAO_PLC:
        return {
            "tipo_expansao": TipoExpansaoPLCChoices.ENTRADA_DIGITAL,
            "entradas_digitais": 8,
            "saidas_digitais": 0,
            "entradas_analogicas": 0,
            "saidas_analogicas": 0,
            "tensao_alimentacao_v": TensaoChoices.V24,
            "tipo_corrente_alimentacao": TipoCorrenteChoices.CC,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.BORNE:
        return {
            "tipo_borne": TipoBorneChoices.PASSAGEM,
            "tipo_conexao": TipoConexaoBorneChoices.PARAFUSO,
            "secao_max_mm2": "4.00",
            "numero_niveis": 1,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.CABO:
        return {
            "tipo_cabo": TipoCaboChoices.POTENCIA,
            "secao_mm2": "2.50",
            "numero_condutores": 1,
            "material_condutor": MaterialCondutorChoices.COBRE,
            "tipo_isolacao": TipoIsolacaoCaboChoices.PVC,
            "cor": CorCaboChoices.PRETO,
            "blindado": False,
            "flexivel": False,
        }
    if nome == CategoriaProdutoNomeChoices.CANALETA:
        return {
            "tipo_canaleta": TipoCanaletaChoices.FECHADA,
            "largura_mm": "40.00",
            "altura_mm": "25.00",
            "material": MaterialCanaletaChoices.PVC,
            "cor": CorCanaletaChoices.CINZA,
            "modo_montagem": ModoMontagemChoices.PLACA,
        }
    if nome == CategoriaProdutoNomeChoices.PAINEL:
        return {
            "tipo_painel": TipoPainelCatalogoChoices.CAIXA_METALICA,
            "tipo_instalacao": TipoInstalacaoPainelChoices.SOBREPOR,
            "material": MaterialPainelChoices.ACO_CARBONO,
            "grau_protecao_ip": "IP55",
            "placa_largura_util_mm": "500.00",
            "placa_altura_util_mm": "400.00",
            "placa_acabamento": AcabamentoPlacaPainelChoices.GALVANIZADA,
            "cor": CorPainelChoices.RAL7035,
            "possui_flange": False,
        }
    if nome == CategoriaProdutoNomeChoices.CLIMATIZACAO:
        return {
            "tipo_climatizacao": TipoClimatizacaoChoices.VENTILACAO,
            "tensao_alimentacao_v": TensaoChoices.V220,
            "potencia_consumida_w": "50.00",
            "vazao_m3_h": "100.00",
            "modo_montagem": ModoMontagemChoices.PORTA,
        }
    if nome == CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA:
        return {
            "potencia_nominal_kw": "1.000",
            "tensao_entrada_v": TensaoChoices.V220,
            "tensao_saida_v": TensaoChoices.V220,
            "numero_fases_entrada": NumeroFasesInversorFrequenciaChoices.F1,
            "protocolo_comunicacao": "",
        }
    if nome == CategoriaProdutoNomeChoices.SOFT_STARTER:
        return {
            "corrente_nominal_a": "10.00",
            "tensao_nominal_v": TensaoChoices.V220,
            "numero_fase_controle": NumeroFaseControleSoftStarterChoices.F3,
            "protocolo_comunicacao": "",
            "tipo_montagem": ModoMontagemChoices.PLACA,
        }
    if nome == CategoriaProdutoNomeChoices.RELE_INTERFACE:
        return {
            "tipo_rele": TipoReleInterfaceChoices.ELETROMECANICO,
            "tensao_bobina_v": TensaoIluminacaoBotaoChoices.V24,
            "corrente_contato_a": "10.00",
            "quantidade_contatos": 1,
            "tipo_contato": TipoContatoChoices.NA,
            "tipo_montagem": TipoMontagemReleChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.IHM:
        return {
            "tamanho_tela_pol": "7.00",
            "tipo_tela": TipoTelaIHMChoices.TOUCH,
            "protocolo_comunicacao": ProtocoloIHMChoices.MODBUS_TCP,
            "possui_ethernet": True,
            "possui_serial": False,
            "possui_usb": False,
            "tensao_alimentacao_v": TensaoIluminacaoBotaoChoices.V24,
            "modo_montagem": ModoMontagemChoices.PORTA,
        }
    if nome == CategoriaProdutoNomeChoices.SWITCH_REDE:
        return {
            "tipo_switch": TipoSwitchRedeChoices.INDUSTRIAL,
            "quantidade_portas": 5,
            "quantidade_portas_rj45": 5,
            "quantidade_portas_fibra": 0,
            "velocidade_porta": VelocidadePortaRedeChoices.MBPS_1000,
            "possui_poe": False,
            "tipo_montagem": TipoMontagemSwitchChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.MODULO_COMUNICACAO:
        return {
            "tipo_modulo": TipoModuloComunicacaoChoices.INTERFACE_REDE,
            "protocolo": ProtocoloIndustrialChoices.MODBUS_RTU,
            "interface_fisica": InterfaceFisicaGatewayChoices.RS485,
            "quantidade_portas": 1,
            "suporta_master": False,
            "suporta_slave": False,
            "suporta_client": False,
            "suporta_server": False,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.BOTAO:
        return {
            "tipo_botao": TipoBotaoChoices.PULSADOR,
            "tipo_acionamento": TipoAcionamentoBotaoModoChoices.MOMENTANEO,
            "cor": CorBotaoChoices.VERDE,
            "diametro_furo_mm": "22.00",
            "contatos_na": 0,
            "contatos_nf": 0,
            "iluminado": False,
            "modo_montagem": ModoMontagemChoices.PORTA,
        }
    if nome == CategoriaProdutoNomeChoices.CHAVE_SELETORA:
        return {
            "tipo_seletor": TipoChaveSeletoraChoices.MANOPLA,
            "numero_posicoes": 3,
            "tipo_acionamento": TipoAcionamentoChaveSeletoraChoices.RETENTIVO,
            "contatos_na": 0,
            "contatos_nf": 0,
            "diametro_furo_mm": "22.00",
            "cor_manopla": CorManoplaChaveSeletoraChoices.PRETO,
            "iluminado": False,
            "modo_montagem": ModoMontagemChoices.PORTA,
        }
    if nome == CategoriaProdutoNomeChoices.SINALIZADOR:
        return {
            "tensao_comando_v": TensaoIluminacaoBotaoChoices.V24,
            "cor": CorSinalizadorChoices.VERDE,
        }
    if nome == CategoriaProdutoNomeChoices.TEMPORIZADOR:
        return {
            "tipo_temporizador": TipoTemporizadorChoices.ELETRONICO,
            "tipo_funcao": TipoFuncaoTemporizadorChoices.ATRASO_ENERGIZACAO,
            "tensao_alimentacao_v": TensaoIluminacaoBotaoChoices.V24,
            "corrente_contato_a": "10.00",
            "tipo_montagem": TipoMontagemTemporizadorChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.CONTROLADOR_TEMPERATURA:
        return {
            "tipo_sensor": TipoSensorTemperaturaChoices.PT100,
            "tipo_controle": TipoControleTemperaturaChoices.PID,
            "tipo_saida_controle": TipoSaidaControleChoices.RELE,
            "quantidade_saidas": 1,
            "tensao_alimentacao_v": TensaoIluminacaoBotaoChoices.V24,
            "modo_montagem": ModoMontagemChoices.PORTA,
        }
    if nome == CategoriaProdutoNomeChoices.TRILHO_DIN:
        return {
            "tipo_trilho": TipoTrilhoDINChoices.TS35,
            "comprimento_mm": 1000,
            "material": MaterialTrilhoDINChoices.ACO_GALVANIZADO,
            "perfurado": True,
        }
    if nome == CategoriaProdutoNomeChoices.BARRAMENTO:
        return {
            "corrente_nominal_a": "100.00",
            "material": MaterialBarramentoChoices.COBRE,
            "tipo_barramento": TipoBarramentoChoices.BARRA_CHATA,
            "numero_polos": NumeroPolosChoices.P3,
            "secao_mm2": "50.00",
            "capacidade_curto_circuito_ka": "50.00",
            "modo_montagem": ModoMontagemChoices.PLACA,
            "isolado": False,
        }
    if nome == CategoriaProdutoNomeChoices.GATEWAY:
        return {
            "protocolo_entrada": ProtocoloIndustrialChoices.MODBUS_RTU,
            "protocolo_saida": ProtocoloIndustrialChoices.MODBUS_TCP,
            "interface_entrada": InterfaceFisicaGatewayChoices.RS485,
            "interface_saida": InterfaceFisicaGatewayChoices.ETHERNET,
            "quantidade_portas_ethernet": 1,
            "quantidade_portas_serial": 0,
            "tensao_alimentacao_v": TensaoChoices.V24,
            "tipo_corrente_alimentacao": TipoCorrenteChoices.CC,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    return {}


def _clear_specs(produto: Produto) -> None:
    for Model in MODEL_BY_CAMPO.values():
        Model.objects.filter(produto=produto).delete()


def _salvar_especificacao(produto: Produto, nome_categoria: str, payload: dict | None) -> None:
    campo = CATEGORIA_PARA_CAMPO.get(nome_categoria)
    if not campo:
        return
    Model = MODEL_BY_CAMPO[campo]
    merged = _merge_spec(_defaults_para_categoria(nome_categoria), payload)
    merged = _ajustar_payload_regras_categoria(nome_categoria, merged)
    obj = Model(produto=produto, **merged)
    try:
        obj.full_clean()
        obj.save()
    except DjangoValidationError as exc:
        _raise_erro_especificacao_amigavel(campo, exc)


def _ajustar_payload_regras_categoria(nome_categoria: str, merged: dict) -> dict:
    if nome_categoria == CategoriaProdutoNomeChoices.MINIDISJUNTOR:
        merged["modo_montagem"] = ModoMontagemChoices.TRILHO_DIN
    if nome_categoria == CategoriaProdutoNomeChoices.FUSIVEL:
        formato = merged.get("formato")
        if formato == FormatoFusivelChoices.NH:
            if not merged.get("tamanho"):
                merged["tamanho"] = FusivelNHTamanhoChoices.NH00
        elif formato == FormatoFusivelChoices.CARTUCHO:
            if not merged.get("tamanho"):
                merged["tamanho"] = FusivelCartuchoTamanhoChoices.CART_10X38
    if nome_categoria == CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO:
        if not bool(merged.get("possui_dissipador", False)):
            merged["tipo_dissipador"] = None
        if not bool(merged.get("possui_ventilacao", False)):
            merged["tensao_ventilacao_v"] = None
        if merged.get("modo_montagem") not in {
            ModoMontagemChoices.TRILHO_DIN,
            ModoMontagemChoices.PLACA,
        }:
            merged["modo_montagem"] = ModoMontagemChoices.TRILHO_DIN
    if nome_categoria == CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA:
        cfg = merged.get("configuracao_disparador")
        merged["modo_montagem"] = ModoMontagemChoices.PLACA
        if cfg == ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO:
            merged["disparador_sobrecarga_ir_fixo_a"] = None
        else:
            merged["disparador_sobrecarga_ir_ajuste_min_a"] = None
            merged["disparador_sobrecarga_ir_ajuste_max_a"] = None

        if cfg == ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_II_AJUSTAVEL:
            merged["disparador_curto_ii_fixo_a"] = None
        else:
            merged["disparador_curto_ii_ajuste_min_a"] = None
            merged["disparador_curto_ii_ajuste_max_a"] = None
    if nome_categoria == CategoriaProdutoNomeChoices.PAINEL:
        if merged.get("material") == MaterialPainelChoices.ACO_INOX:
            merged["cor"] = None
        elif not merged.get("cor"):
            merged["cor"] = CorPainelChoices.RAL7035
    if nome_categoria == CategoriaProdutoNomeChoices.CLIMATIZACAO:
        if merged.get("tensao_alimentacao_v") not in {
            TensaoChoices.V24,
            TensaoChoices.V110,
            TensaoChoices.V220,
            TensaoChoices.V380,
        }:
            merged["tensao_alimentacao_v"] = TensaoChoices.V220
        if merged.get("modo_montagem") not in {
            ModoMontagemChoices.TRILHO_DIN,
            ModoMontagemChoices.PLACA,
            ModoMontagemChoices.PORTA,
        }:
            merged["modo_montagem"] = ModoMontagemChoices.PORTA
    if nome_categoria == CategoriaProdutoNomeChoices.SOFT_STARTER:
        merged["tipo_montagem"] = ModoMontagemChoices.PLACA
        if merged.get("protocolo_comunicacao") is None:
            merged["protocolo_comunicacao"] = ""
    return merged


def _raise_erro_especificacao_amigavel(campo: str, exc: DjangoValidationError) -> None:
    campo_legivel = campo.replace("_", " ")
    detalhe = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
    raise serializers.ValidationError(
        {
            campo: {
                "mensagem": (
                    f"Não foi possível salvar a especificação ({campo_legivel}). "
                    "Revise os campos informados e tente novamente."
                ),
                "detalhes": detalhe,
            }
        }
    ) from exc


def _spec_detail(obj: Produto, cat: str, Model, SerializerCls):
    if obj.categoria != cat:
        return None
    try:
        inst = Model.objects.get(produto=obj)
    except Model.DoesNotExist:
        return None
    return SerializerCls(inst).data


class EspecificacaoContatoraSerializer(serializers.ModelSerializer):
    tensao_bobina_display = serializers.CharField(
        source="get_tensao_bobina_v_display",
        read_only=True,
    )
    tipo_corrente_bobina_display = serializers.CharField(
        source="get_tipo_corrente_bobina_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoContatora
        exclude = ("produto",)


class EspecificacaoDisjuntorMotorSerializer(serializers.ModelSerializer):
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoDisjuntorMotor
        exclude = ("produto",)


class EspecificacaoSeccionadoraSerializer(serializers.ModelSerializer):
    tipo_montagem_display = serializers.CharField(
        source="get_tipo_montagem_display",
        read_only=True,
    )
    tipo_fixacao_display = serializers.CharField(
        source="get_tipo_fixacao_display",
        read_only=True,
    )
    cor_manopla_display = serializers.CharField(
        source="get_cor_manopla_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoSeccionadora
        exclude = ("produto",)


class EspecificacaoDisjuntorCaixaMoldadaSerializer(serializers.ModelSerializer):
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )
    numero_polos_display = serializers.CharField(
        source="get_numero_polos_display",
        read_only=True,
    )
    configuracao_disparador_display = serializers.CharField(
        source="get_configuracao_disparador_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoDisjuntorCaixaMoldada
        exclude = ("produto",)


class EspecificacaoReleSobrecargaSerializer(serializers.ModelSerializer):
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoReleSobrecarga
        exclude = ("produto",)


class EspecificacaoMiniDisjuntorSerializer(serializers.ModelSerializer):
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )
    curva_disparo_display = serializers.CharField(
        source="get_curva_disparo_display",
        read_only=True,
    )
    numero_polos_display = serializers.CharField(
        source="get_numero_polos_display",
        read_only=True,
    )
    class Meta:
        model = EspecificacaoMiniDisjuntor
        exclude = ("produto",)


class EspecificacaoReleEstadoSolidoSerializer(serializers.ModelSerializer):
    tipo_dissipador_display = serializers.CharField(
        source="get_tipo_dissipador_display",
        read_only=True,
        allow_null=True,
    )
    numero_fases_display = serializers.CharField(
        source="get_numero_fases_display",
        read_only=True,
    )
    tensao_ventilacao_display = serializers.CharField(
        source="get_tensao_ventilacao_v_display",
        read_only=True,
        allow_null=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoReleEstadoSolido
        exclude = ("produto",)


class EspecificacaoFusivelSerializer(serializers.ModelSerializer):
    tipo_fusivel_display = serializers.CharField(
        source="get_tipo_fusivel_display",
        read_only=True,
    )
    formato_display = serializers.CharField(
        source="get_formato_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoFusivel
        exclude = ("produto",)


class EspecificacaoFonteSerializer(serializers.ModelSerializer):
    tensao_entrada_display = serializers.CharField(
        source="get_tensao_entrada_v_display",
        read_only=True,
    )
    tipo_corrente_entrada_display = serializers.CharField(
        source="get_tipo_corrente_entrada_display",
        read_only=True,
    )
    tensao_saida_display = serializers.CharField(
        source="get_tensao_saida_v_display",
        read_only=True,
    )
    tipo_corrente_saida_display = serializers.CharField(
        source="get_tipo_corrente_saida_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoFonte
        exclude = ("produto",)


class EspecificacaoPLCSerializer(serializers.ModelSerializer):
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
        allow_null=True,
    )
    protocolo_principal_display = serializers.CharField(
        source="get_protocolo_principal_display",
        read_only=True,
        allow_null=True,
    )
    tipo_entradas_analogicas_display = serializers.CharField(
        source="get_tipo_entradas_analogicas_display",
        read_only=True,
        allow_null=True,
    )
    tipo_saidas_analogicas_display = serializers.CharField(
        source="get_tipo_saidas_analogicas_display",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = EspecificacaoPLC
        exclude = ("produto",)


class EspecificacaoExpansaoPLCSerializer(serializers.ModelSerializer):
    tipo_expansao_display = serializers.CharField(
        source="get_tipo_expansao_display",
        read_only=True,
    )
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
        allow_null=True,
    )
    tipo_corrente_alimentacao_display = serializers.CharField(
        source="get_tipo_corrente_alimentacao_display",
        read_only=True,
        allow_null=True,
    )
    tipo_sinal_digital_display = serializers.CharField(
        source="get_tipo_sinal_digital_display",
        read_only=True,
        allow_blank=True,
    )
    tipo_sinal_analogico_display = serializers.CharField(
        source="get_tipo_sinal_analogico_display",
        read_only=True,
        allow_blank=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoExpansaoPLC
        exclude = ("produto",)


class EspecificacaoBorneSerializer(serializers.ModelSerializer):
    tipo_borne_display = serializers.CharField(
        source="get_tipo_borne_display",
        read_only=True,
    )
    tipo_conexao_display = serializers.CharField(
        source="get_tipo_conexao_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoBorne
        exclude = ("produto",)


class EspecificacaoCaboSerializer(serializers.ModelSerializer):
    tipo_cabo_display = serializers.CharField(
        source="get_tipo_cabo_display",
        read_only=True,
    )
    material_condutor_display = serializers.CharField(
        source="get_material_condutor_display",
        read_only=True,
    )
    tipo_isolacao_display = serializers.CharField(
        source="get_tipo_isolacao_display",
        read_only=True,
    )
    cor_display = serializers.CharField(source="get_cor_display", read_only=True)

    class Meta:
        model = EspecificacaoCabo
        exclude = ("produto",)


class EspecificacaoCanaletaSerializer(serializers.ModelSerializer):
    tipo_canaleta_display = serializers.CharField(
        source="get_tipo_canaleta_display",
        read_only=True,
    )
    material_display = serializers.CharField(
        source="get_material_display",
        read_only=True,
    )
    cor_display = serializers.CharField(source="get_cor_display", read_only=True)
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoCanaleta
        exclude = ("produto",)


class EspecificacaoPainelSerializer(serializers.ModelSerializer):
    tipo_painel_display = serializers.CharField(
        source="get_tipo_painel_display",
        read_only=True,
    )
    tipo_instalacao_display = serializers.CharField(
        source="get_tipo_instalacao_display",
        read_only=True,
    )
    material_display = serializers.CharField(
        source="get_material_display",
        read_only=True,
    )
    placa_acabamento_display = serializers.CharField(
        source="get_placa_acabamento_display",
        read_only=True,
    )
    cor_display = serializers.CharField(
        source="get_cor_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoPainel
        exclude = ("produto",)


class EspecificacaoClimatizacaoSerializer(serializers.ModelSerializer):
    tipo_climatizacao_display = serializers.CharField(
        source="get_tipo_climatizacao_display",
        read_only=True,
    )
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoClimatizacao
        exclude = ("produto",)


class EspecificacaoInversorFrequenciaSerializer(serializers.ModelSerializer):
    tensao_entrada_display = serializers.CharField(
        source="get_tensao_entrada_v_display",
        read_only=True,
    )
    tensao_saida_display = serializers.CharField(
        source="get_tensao_saida_v_display",
        read_only=True,
    )
    numero_fases_entrada_display = serializers.CharField(
        source="get_numero_fases_entrada_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoInversorFrequencia
        exclude = ("produto",)


class EspecificacaoSoftStarterSerializer(serializers.ModelSerializer):
    tensao_nominal_display = serializers.CharField(
        source="get_tensao_nominal_v_display",
        read_only=True,
    )
    numero_fase_controle_display = serializers.CharField(
        source="get_numero_fase_controle_display",
        read_only=True,
    )
    protocolo_comunicacao_display = serializers.CharField(
        source="get_protocolo_comunicacao_display",
        read_only=True,
    )
    tipo_montagem_display = serializers.CharField(
        source="get_tipo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoSoftStarter
        exclude = ("produto",)


class EspecificacaoReleInterfaceSerializer(serializers.ModelSerializer):
    tensao_bobina_display = serializers.CharField(
        source="get_tensao_bobina_v_display",
        read_only=True,
    )
    tipo_rele_display = serializers.CharField(
        source="get_tipo_rele_display",
        read_only=True,
    )
    tipo_contato_display = serializers.CharField(
        source="get_tipo_contato_display",
        read_only=True,
    )
    tipo_montagem_display = serializers.CharField(
        source="get_tipo_montagem_display",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = EspecificacaoReleInterface
        exclude = ("produto",)


class EspecificacaoIHMSerializer(serializers.ModelSerializer):
    tipo_tela_display = serializers.CharField(
        source="get_tipo_tela_display",
        read_only=True,
    )
    protocolo_comunicacao_display = serializers.CharField(
        source="get_protocolo_comunicacao_display",
        read_only=True,
    )
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoIHM
        exclude = ("produto",)


class EspecificacaoSwitchRedeSerializer(serializers.ModelSerializer):
    tipo_switch_display = serializers.CharField(
        source="get_tipo_switch_display",
        read_only=True,
    )
    tipo_porta_display = serializers.CharField(
        source="get_tipo_porta_display",
        read_only=True,
        allow_null=True,
    )
    velocidade_porta_display = serializers.CharField(
        source="get_velocidade_porta_display",
        read_only=True,
        allow_null=True,
    )
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
        allow_null=True,
    )
    tipo_montagem_display = serializers.CharField(
        source="get_tipo_montagem_display",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = EspecificacaoSwitchRede
        exclude = ("produto",)


class EspecificacaoModuloComunicacaoSerializer(serializers.ModelSerializer):
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )
    tipo_modulo_display = serializers.CharField(
        source="get_tipo_modulo_display",
        read_only=True,
    )
    protocolo_display = serializers.CharField(
        source="get_protocolo_display",
        read_only=True,
    )
    interface_fisica_display = serializers.CharField(
        source="get_interface_fisica_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoModuloComunicacao
        exclude = ("produto",)


class EspecificacaoBotaoSerializer(serializers.ModelSerializer):
    tipo_botao_display = serializers.CharField(
        source="get_tipo_botao_display",
        read_only=True,
    )
    tipo_acionamento_display = serializers.CharField(
        source="get_tipo_acionamento_display",
        read_only=True,
    )
    cor_display = serializers.CharField(source="get_cor_display", read_only=True)
    tensao_iluminacao_display = serializers.CharField(
        source="get_tensao_iluminacao_v_display",
        read_only=True,
        allow_null=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoBotao
        exclude = ("produto",)


class EspecificacaoChaveSeletoraSerializer(serializers.ModelSerializer):
    tipo_seletor_display = serializers.CharField(
        source="get_tipo_seletor_display",
        read_only=True,
    )
    tipo_acionamento_display = serializers.CharField(
        source="get_tipo_acionamento_display",
        read_only=True,
    )
    cor_manopla_display = serializers.CharField(
        source="get_cor_manopla_display",
        read_only=True,
    )
    tensao_iluminacao_display = serializers.CharField(
        source="get_tensao_iluminacao_v_display",
        read_only=True,
        allow_null=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoChaveSeletora
        exclude = ("produto",)


class EspecificacaoSinalizadorSerializer(serializers.ModelSerializer):
    tensao_comando_display = serializers.CharField(
        source="get_tensao_comando_v_display",
        read_only=True,
    )
    cor_display = serializers.CharField(source="get_cor_display", read_only=True)

    class Meta:
        model = EspecificacaoSinalizador
        exclude = ("produto",)


class EspecificacaoTemporizadorSerializer(serializers.ModelSerializer):
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
    )
    tipo_temporizador_display = serializers.CharField(
        source="get_tipo_temporizador_display",
        read_only=True,
    )
    tipo_funcao_display = serializers.CharField(
        source="get_tipo_funcao_display",
        read_only=True,
    )
    tipo_montagem_display = serializers.CharField(
        source="get_tipo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoTemporizador
        exclude = ("produto",)


class EspecificacaoControladorTemperaturaSerializer(serializers.ModelSerializer):
    tipo_sensor_display = serializers.CharField(
        source="get_tipo_sensor_display",
        read_only=True,
    )
    tipo_controle_display = serializers.CharField(
        source="get_tipo_controle_display",
        read_only=True,
    )
    tipo_saida_controle_display = serializers.CharField(
        source="get_tipo_saida_controle_display",
        read_only=True,
    )
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoControladorTemperatura
        exclude = ("produto",)


class EspecificacaoTrilhoDINSerializer(serializers.ModelSerializer):
    tipo_trilho_display = serializers.CharField(
        source="get_tipo_trilho_display",
        read_only=True,
    )
    material_display = serializers.CharField(
        source="get_material_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoTrilhoDIN
        exclude = ("produto",)


class EspecificacaoBarramentoSerializer(serializers.ModelSerializer):
    material_display = serializers.CharField(
        source="get_material_display",
        read_only=True,
    )
    tipo_barramento_display = serializers.CharField(
        source="get_tipo_barramento_display",
        read_only=True,
    )
    numero_polos_display = serializers.CharField(
        source="get_numero_polos_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoBarramento
        exclude = ("produto",)


class EspecificacaoGatewaySerializer(serializers.ModelSerializer):
    protocolo_entrada_display = serializers.CharField(
        source="get_protocolo_entrada_display",
        read_only=True,
    )
    protocolo_saida_display = serializers.CharField(
        source="get_protocolo_saida_display",
        read_only=True,
    )
    interface_entrada_display = serializers.CharField(
        source="get_interface_entrada_display",
        read_only=True,
    )
    interface_saida_display = serializers.CharField(
        source="get_interface_saida_display",
        read_only=True,
    )
    tensao_alimentacao_display = serializers.CharField(
        source="get_tensao_alimentacao_v_display",
        read_only=True,
        allow_null=True,
    )
    tipo_corrente_alimentacao_display = serializers.CharField(
        source="get_tipo_corrente_alimentacao_display",
        read_only=True,
        allow_null=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoGateway
        exclude = ("produto",)


_WRITE_EXCLUDE = ("id", "produto", "criado_em", "atualizado_em")


class EspecificacaoContatoraWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoContatora
        exclude = _WRITE_EXCLUDE


class EspecificacaoDisjuntorMotorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoDisjuntorMotor
        exclude = _WRITE_EXCLUDE


class EspecificacaoSeccionadoraWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoSeccionadora
        exclude = _WRITE_EXCLUDE


class EspecificacaoDisjuntorCaixaMoldadaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoDisjuntorCaixaMoldada
        exclude = _WRITE_EXCLUDE


class EspecificacaoReleSobrecargaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoReleSobrecarga
        exclude = _WRITE_EXCLUDE


class EspecificacaoMiniDisjuntorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoMiniDisjuntor
        exclude = _WRITE_EXCLUDE


class EspecificacaoReleEstadoSolidoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoReleEstadoSolido
        exclude = _WRITE_EXCLUDE


class EspecificacaoFusivelWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoFusivel
        exclude = _WRITE_EXCLUDE


class EspecificacaoFonteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoFonte
        exclude = _WRITE_EXCLUDE


class EspecificacaoPLCWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoPLC
        exclude = _WRITE_EXCLUDE


class EspecificacaoExpansaoPLCWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoExpansaoPLC
        exclude = _WRITE_EXCLUDE


class EspecificacaoBorneWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoBorne
        exclude = _WRITE_EXCLUDE


class EspecificacaoCaboWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoCabo
        exclude = _WRITE_EXCLUDE


class EspecificacaoCanaletaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoCanaleta
        exclude = _WRITE_EXCLUDE


class EspecificacaoPainelWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoPainel
        exclude = _WRITE_EXCLUDE


class EspecificacaoClimatizacaoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoClimatizacao
        exclude = _WRITE_EXCLUDE


class EspecificacaoInversorFrequenciaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoInversorFrequencia
        exclude = _WRITE_EXCLUDE


class EspecificacaoSoftStarterWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoSoftStarter
        exclude = _WRITE_EXCLUDE


class EspecificacaoReleInterfaceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoReleInterface
        exclude = _WRITE_EXCLUDE


class EspecificacaoIHMWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoIHM
        exclude = _WRITE_EXCLUDE


class EspecificacaoSwitchRedeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoSwitchRede
        exclude = _WRITE_EXCLUDE


class EspecificacaoModuloComunicacaoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoModuloComunicacao
        exclude = _WRITE_EXCLUDE


class EspecificacaoBotaoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoBotao
        exclude = _WRITE_EXCLUDE


class EspecificacaoChaveSeletoraWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoChaveSeletora
        exclude = _WRITE_EXCLUDE


class EspecificacaoSinalizadorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoSinalizador
        exclude = _WRITE_EXCLUDE


class EspecificacaoTemporizadorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoTemporizador
        exclude = _WRITE_EXCLUDE


class EspecificacaoControladorTemperaturaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoControladorTemperatura
        exclude = _WRITE_EXCLUDE


class EspecificacaoTrilhoDINWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoTrilhoDIN
        exclude = _WRITE_EXCLUDE


class EspecificacaoBarramentoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoBarramento
        exclude = _WRITE_EXCLUDE


class EspecificacaoGatewayWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoGateway
        exclude = _WRITE_EXCLUDE


_DETALHE_FIELDS = (
    ("especificacao_contatora", CategoriaProdutoNomeChoices.CONTATORA, EspecificacaoContatora, EspecificacaoContatoraSerializer),
    ("especificacao_disjuntor_motor", CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR, EspecificacaoDisjuntorMotor, EspecificacaoDisjuntorMotorSerializer),
    ("especificacao_seccionadora", CategoriaProdutoNomeChoices.SECCIONADORA, EspecificacaoSeccionadora, EspecificacaoSeccionadoraSerializer),
    ("especificacao_disjuntor_caixa_moldada", CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA, EspecificacaoDisjuntorCaixaMoldada, EspecificacaoDisjuntorCaixaMoldadaSerializer),
    ("especificacao_rele_sobrecarga", CategoriaProdutoNomeChoices.RELE_SOBRECARGA, EspecificacaoReleSobrecarga, EspecificacaoReleSobrecargaSerializer),
    ("especificacao_minidisjuntor", CategoriaProdutoNomeChoices.MINIDISJUNTOR, EspecificacaoMiniDisjuntor, EspecificacaoMiniDisjuntorSerializer),
    ("especificacao_rele_estado_solido", CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO, EspecificacaoReleEstadoSolido, EspecificacaoReleEstadoSolidoSerializer),
    ("especificacao_fusivel", CategoriaProdutoNomeChoices.FUSIVEL, EspecificacaoFusivel, EspecificacaoFusivelSerializer),
    ("especificacao_fonte", CategoriaProdutoNomeChoices.FONTE_CHAVEADA, EspecificacaoFonte, EspecificacaoFonteSerializer),
    ("especificacao_plc", CategoriaProdutoNomeChoices.PLC, EspecificacaoPLC, EspecificacaoPLCSerializer),
    ("especificacao_expansao_plc", CategoriaProdutoNomeChoices.EXPANSAO_PLC, EspecificacaoExpansaoPLC, EspecificacaoExpansaoPLCSerializer),
    ("especificacao_borne", CategoriaProdutoNomeChoices.BORNE, EspecificacaoBorne, EspecificacaoBorneSerializer),
    ("especificacao_cabo", CategoriaProdutoNomeChoices.CABO, EspecificacaoCabo, EspecificacaoCaboSerializer),
    ("especificacao_canaleta", CategoriaProdutoNomeChoices.CANALETA, EspecificacaoCanaleta, EspecificacaoCanaletaSerializer),
    ("especificacao_painel", CategoriaProdutoNomeChoices.PAINEL, EspecificacaoPainel, EspecificacaoPainelSerializer),
    ("especificacao_climatizacao", CategoriaProdutoNomeChoices.CLIMATIZACAO, EspecificacaoClimatizacao, EspecificacaoClimatizacaoSerializer),
    ("especificacao_inversor_frequencia", CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA, EspecificacaoInversorFrequencia, EspecificacaoInversorFrequenciaSerializer),
    ("especificacao_soft_starter", CategoriaProdutoNomeChoices.SOFT_STARTER, EspecificacaoSoftStarter, EspecificacaoSoftStarterSerializer),
    ("especificacao_rele_interface", CategoriaProdutoNomeChoices.RELE_INTERFACE, EspecificacaoReleInterface, EspecificacaoReleInterfaceSerializer),
    ("especificacao_ihm", CategoriaProdutoNomeChoices.IHM, EspecificacaoIHM, EspecificacaoIHMSerializer),
    ("especificacao_switch_rede", CategoriaProdutoNomeChoices.SWITCH_REDE, EspecificacaoSwitchRede, EspecificacaoSwitchRedeSerializer),
    ("especificacao_modulo_comunicacao", CategoriaProdutoNomeChoices.MODULO_COMUNICACAO, EspecificacaoModuloComunicacao, EspecificacaoModuloComunicacaoSerializer),
    ("especificacao_botao", CategoriaProdutoNomeChoices.BOTAO, EspecificacaoBotao, EspecificacaoBotaoSerializer),
    ("especificacao_chave_seletora", CategoriaProdutoNomeChoices.CHAVE_SELETORA, EspecificacaoChaveSeletora, EspecificacaoChaveSeletoraSerializer),
    ("especificacao_sinalizador", CategoriaProdutoNomeChoices.SINALIZADOR, EspecificacaoSinalizador, EspecificacaoSinalizadorSerializer),
    ("especificacao_temporizador", CategoriaProdutoNomeChoices.TEMPORIZADOR, EspecificacaoTemporizador, EspecificacaoTemporizadorSerializer),
    ("especificacao_controlador_temperatura", CategoriaProdutoNomeChoices.CONTROLADOR_TEMPERATURA, EspecificacaoControladorTemperatura, EspecificacaoControladorTemperaturaSerializer),
    ("especificacao_trilho_din", CategoriaProdutoNomeChoices.TRILHO_DIN, EspecificacaoTrilhoDIN, EspecificacaoTrilhoDINSerializer),
    ("especificacao_barramento", CategoriaProdutoNomeChoices.BARRAMENTO, EspecificacaoBarramento, EspecificacaoBarramentoSerializer),
    ("especificacao_gateway", CategoriaProdutoNomeChoices.GATEWAY, EspecificacaoGateway, EspecificacaoGatewaySerializer),
)


class ProdutoListSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria", read_only=True)
    categoria_display = serializers.SerializerMethodField()
    unidade_medida_display = serializers.CharField(
        source="get_unidade_medida_display",
        read_only=True,
    )

    class Meta:
        model = Produto
        fields = (
            "id",
            "codigo",
            "descricao",
            "categoria",
            "categoria_nome",
            "categoria_display",
            "fabricante",
            "unidade_medida",
            "unidade_medida_display",
            "valor_unitario",
            "ativo",
            "criado_em",
            "atualizado_em",
        )

    def get_categoria_display(self, obj):
        return obj.get_categoria_display()


PRODUTO_DETAIL_FIELDS = (
    "id",
    "criado_em",
    "atualizado_em",
    "ativo",
    "codigo",
    "descricao",
    "categoria",
    "categoria_nome",
    "categoria_display",
    "unidade_medida",
    "unidade_medida_display",
    "valor_unitario",
    "fabricante",
    "referencia_fabricante",
    "largura_mm",
    "altura_mm",
    "profundidade_mm",
    "observacoes_tecnicas",
)


class ProdutoDetailSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria", read_only=True)
    categoria_display = serializers.SerializerMethodField()
    unidade_medida_display = serializers.CharField(
        source="get_unidade_medida_display",
        read_only=True,
    )

    class Meta:
        model = Produto
        fields = PRODUTO_DETAIL_FIELDS

    def get_categoria_display(self, obj):
        return obj.get_categoria_display()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field_name, cat, Model, Ser in _DETALHE_FIELDS:
            data[field_name] = _spec_detail(instance, cat, Model, Ser)
        return data


class ProdutoWriteSerializer(serializers.ModelSerializer):
    especificacao_contatora = EspecificacaoContatoraWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_disjuntor_motor = EspecificacaoDisjuntorMotorWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_seccionadora = EspecificacaoSeccionadoraWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_disjuntor_caixa_moldada = EspecificacaoDisjuntorCaixaMoldadaWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_rele_sobrecarga = EspecificacaoReleSobrecargaWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_minidisjuntor = EspecificacaoMiniDisjuntorWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_rele_estado_solido = EspecificacaoReleEstadoSolidoWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_fusivel = EspecificacaoFusivelWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_fonte = EspecificacaoFonteWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_plc = EspecificacaoPLCWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_expansao_plc = EspecificacaoExpansaoPLCWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_borne = EspecificacaoBorneWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_cabo = EspecificacaoCaboWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_canaleta = EspecificacaoCanaletaWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_painel = EspecificacaoPainelWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_climatizacao = EspecificacaoClimatizacaoWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_inversor_frequencia = EspecificacaoInversorFrequenciaWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_soft_starter = EspecificacaoSoftStarterWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_rele_interface = EspecificacaoReleInterfaceWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_ihm = EspecificacaoIHMWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_switch_rede = EspecificacaoSwitchRedeWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_modulo_comunicacao = EspecificacaoModuloComunicacaoWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_botao = EspecificacaoBotaoWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_chave_seletora = EspecificacaoChaveSeletoraWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_sinalizador = EspecificacaoSinalizadorWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_temporizador = EspecificacaoTemporizadorWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_controlador_temperatura = EspecificacaoControladorTemperaturaWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_trilho_din = EspecificacaoTrilhoDINWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_barramento = EspecificacaoBarramentoWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_gateway = EspecificacaoGatewayWriteSerializer(
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Produto
        fields = (
            "id",
            "codigo",
            "descricao",
            "categoria",
            "unidade_medida",
            "valor_unitario",
            "fabricante",
            "referencia_fabricante",
            "largura_mm",
            "altura_mm",
            "profundidade_mm",
            "observacoes_tecnicas",
            "ativo",
        ) + NESTED_KEYS
        read_only_fields = ("id",)

    def validate(self, attrs):
        instance = self.instance
        categoria = attrs.get("categoria")
        if categoria is None and instance is not None:
            categoria = instance.categoria
        if categoria is None:
            return attrs
        campo = CATEGORIA_PARA_CAMPO.get(categoria)
        if campo is None:
            return attrs
        if instance is None:
            if attrs.get(campo) is None:
                attrs[campo] = {}
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        payloads = {k: validated_data.pop(k, None) for k in NESTED_KEYS}
        produto = Produto.objects.create(**validated_data)
        nome = produto.categoria
        if CATEGORIA_PARA_CAMPO.get(nome):
            campo = CATEGORIA_PARA_CAMPO[nome]
            _salvar_especificacao(produto, nome, payloads.get(campo))
        return produto

    @transaction.atomic
    def update(self, instance, validated_data):
        payloads = {}
        for k in NESTED_KEYS:
            if k in validated_data:
                payloads[k] = validated_data.pop(k)
        categoria_antiga = instance.categoria
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        nome_novo = instance.categoria
        if nome_novo != categoria_antiga:
            _clear_specs(instance)
            if CATEGORIA_PARA_CAMPO.get(nome_novo):
                campo = CATEGORIA_PARA_CAMPO[nome_novo]
                _salvar_especificacao(instance, nome_novo, payloads.get(campo))
            return instance
        campo = CATEGORIA_PARA_CAMPO.get(nome_novo)
        if not campo or campo not in payloads or payloads[campo] is None:
            return instance
        Model = MODEL_BY_CAMPO[campo]
        merged = _merge_spec(
            _defaults_para_categoria(nome_novo),
            payloads[campo],
        )
        merged = _ajustar_payload_regras_categoria(nome_novo, merged)
        try:
            spec = Model.objects.get(produto=instance)
        except Model.DoesNotExist:
            spec = Model(produto=instance, **merged)
        else:
            for k, v in merged.items():
                setattr(spec, k, v)
        try:
            spec.full_clean()
            spec.save()
        except DjangoValidationError as exc:
            _raise_erro_especificacao_amigavel(campo, exc)
        return instance
