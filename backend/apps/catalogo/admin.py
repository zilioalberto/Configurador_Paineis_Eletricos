"""Admin Django do catálogo (produto e todas as especificações técnicas)."""

from django.contrib import admin

from .models import (
    EspecificacaoAcessorioGeral,
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
    EspecificacaoIdentificacao,
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
    EspecificacaoTerminal,
    EspecificacaoTrilhoDIN,
    Produto,
    ProdutoAcessorioCompativel,
    Servico,
)


class EspecificacaoContatoraInline(admin.StackedInline):
    model = EspecificacaoContatora
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoDisjuntorMotorInline(admin.StackedInline):
    model = EspecificacaoDisjuntorMotor
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoSeccionadoraInline(admin.StackedInline):
    model = EspecificacaoSeccionadora
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoDisjuntorCaixaMoldadaInline(admin.StackedInline):
    model = EspecificacaoDisjuntorCaixaMoldada
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoReleSobrecargaInline(admin.StackedInline):
    model = EspecificacaoReleSobrecarga
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoMiniDisjuntorInline(admin.StackedInline):
    model = EspecificacaoMiniDisjuntor
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoReleEstadoSolidoInline(admin.StackedInline):
    model = EspecificacaoReleEstadoSolido
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoFusivelInline(admin.StackedInline):
    model = EspecificacaoFusivel
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoFonteInline(admin.StackedInline):
    model = EspecificacaoFonte
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoPLCInline(admin.StackedInline):
    model = EspecificacaoPLC
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoExpansaoPLCInline(admin.StackedInline):
    model = EspecificacaoExpansaoPLC
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoBorneInline(admin.StackedInline):
    model = EspecificacaoBorne
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoCaboInline(admin.StackedInline):
    model = EspecificacaoCabo
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoCanaletaInline(admin.StackedInline):
    model = EspecificacaoCanaleta
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoPainelInline(admin.StackedInline):
    model = EspecificacaoPainel
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoClimatizacaoInline(admin.StackedInline):
    model = EspecificacaoClimatizacao
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoInversorFrequenciaInline(admin.StackedInline):
    model = EspecificacaoInversorFrequencia
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoSoftStarterInline(admin.StackedInline):
    model = EspecificacaoSoftStarter
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoReleInterfaceInline(admin.StackedInline):
    model = EspecificacaoReleInterface
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoIHMInline(admin.StackedInline):
    model = EspecificacaoIHM
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoIdentificacaoInline(admin.StackedInline):
    model = EspecificacaoIdentificacao
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoAcessorioGeralInline(admin.StackedInline):
    model = EspecificacaoAcessorioGeral
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoSwitchRedeInline(admin.StackedInline):
    model = EspecificacaoSwitchRede
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoModuloComunicacaoInline(admin.StackedInline):
    model = EspecificacaoModuloComunicacao
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoBotaoInline(admin.StackedInline):
    model = EspecificacaoBotao
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoChaveSeletoraInline(admin.StackedInline):
    model = EspecificacaoChaveSeletora
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoSinalizadorInline(admin.StackedInline):
    model = EspecificacaoSinalizador
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoTemporizadorInline(admin.StackedInline):
    model = EspecificacaoTemporizador
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoControladorTemperaturaInline(admin.StackedInline):
    model = EspecificacaoControladorTemperatura
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoTrilhoDINInline(admin.StackedInline):
    model = EspecificacaoTrilhoDIN
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoTerminalInline(admin.StackedInline):
    model = EspecificacaoTerminal
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoBarramentoInline(admin.StackedInline):
    model = EspecificacaoBarramento
    extra = 0
    max_num = 1
    can_delete = True


class EspecificacaoGatewayInline(admin.StackedInline):
    model = EspecificacaoGateway
    extra = 0
    max_num = 1
    can_delete = True


INLINE_POR_CATEGORIA = {
    "CONTATORA": EspecificacaoContatoraInline,
    "DISJUNTOR_MOTOR": EspecificacaoDisjuntorMotorInline,
    "SECCIONADORA": EspecificacaoSeccionadoraInline,
    "DISJUNTOR_CAIXA_MOLDADA": EspecificacaoDisjuntorCaixaMoldadaInline,
    "RELE_SOBRECARGA": EspecificacaoReleSobrecargaInline,
    "MINIDISJUNTOR": EspecificacaoMiniDisjuntorInline,
    "RELE_ESTADO_SOLIDO": EspecificacaoReleEstadoSolidoInline,
    "FUSIVEL": EspecificacaoFusivelInline,
    "FONTE_CHAVEADA": EspecificacaoFonteInline,
    "PLC": EspecificacaoPLCInline,
    "EXPANSAO_PLC": EspecificacaoExpansaoPLCInline,
    "BORNE": EspecificacaoBorneInline,
    "CABO": EspecificacaoCaboInline,
    "CANALETA": EspecificacaoCanaletaInline,
    "PAINEL": EspecificacaoPainelInline,
    "CLIMATIZACAO": EspecificacaoClimatizacaoInline,
    "INVERSOR_FREQUENCIA": EspecificacaoInversorFrequenciaInline,
    "SOFT_STARTER": EspecificacaoSoftStarterInline,
    "RELE_INTERFACE": EspecificacaoReleInterfaceInline,
    "IHM": EspecificacaoIHMInline,
    "SWITCH_REDE": EspecificacaoSwitchRedeInline,
    "MODULO_COMUNICACAO": EspecificacaoModuloComunicacaoInline,
    "BOTAO": EspecificacaoBotaoInline,
    "CHAVE_SELETORA": EspecificacaoChaveSeletoraInline,
    "SINALIZADOR": EspecificacaoSinalizadorInline,
    "TEMPORIZADOR": EspecificacaoTemporizadorInline,
    "CONTROLADOR_TEMPERATURA": EspecificacaoControladorTemperaturaInline,
    "TRILHO_DIN": EspecificacaoTrilhoDINInline,
    "TERMINAIS": EspecificacaoTerminalInline,
    "IDENTIFICACAO": EspecificacaoIdentificacaoInline,
    "ACESSORIOS_GERAIS": EspecificacaoAcessorioGeralInline,
    "BARRAMENTO": EspecificacaoBarramentoInline,
    "GATEWAY": EspecificacaoGatewayInline,
}


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "descricao",
        "categoria",
        "fabricante_parceiro",
        "fornecedor_parceiro",
        "fabricante",
        "preco_base",
        "ativo",
    )
    list_filter = ("ativo", "categoria", "fabricante_parceiro", "fornecedor_parceiro", "fabricante")
    search_fields = (
        "codigo",
        "descricao",
        "fabricante",
        "referencia_fabricante",
        "fabricante_parceiro__razao_social",
        "fabricante_parceiro__documento",
        "fornecedor_parceiro__razao_social",
        "fornecedor_parceiro__documento",
    )

    fieldsets = (
        (
            "Classificação",
            {
                "fields": ("categoria",),
            },
        ),
        (
            "Dados principais",
            {
                "fields": (
                    "codigo",
                    "descricao",
                ),
            },
        ),
        (
            "Dados comerciais",
            {
                "fields": (
                    ("unidade_medida", "preco_base"),
                    "fabricante_parceiro",
                    "fornecedor_parceiro",
                ),
            },
        ),
        (
            "Fiscal e logística (referência NF-e)",
            {
                "fields": (
                    ("gtin", "ncm", "cest"),
                    ("origem_mercadoria", "unidade_tributavel"),
                    "codigo_perfil_fiscal",
                    ("peso_liquido_kg", "peso_bruto_kg"),
                ),
            },
        ),
        (
            "Fabricante",
            {
                "fields": (("fabricante", "referencia_fabricante"),),
            },
        ),
        (
            "Dimensões",
            {
                "fields": (("largura_mm", "altura_mm", "profundidade_mm"),),
            },
        ),
        (
            "Informações adicionais",
            {
                "fields": (
                    "ativo",
                    "observacoes_tecnicas",
                ),
            },
        ),
    )

    def get_inline_instances(self, request, obj=None):
        if not obj or not obj.categoria:
            return []
        inline = INLINE_POR_CATEGORIA.get(obj.categoria)
        if not inline:
            return []
        return [inline(self.model, self.admin_site)]


@admin.register(ProdutoAcessorioCompativel)
class ProdutoAcessorioCompativelAdmin(admin.ModelAdmin):
    list_display = (
        "produto_base",
        "tipo_acessorio",
        "acessorio",
        "quantidade_padrao",
        "prioridade",
    )
    list_filter = ("tipo_acessorio",)
    search_fields = (
        "produto_base__codigo",
        "produto_base__descricao",
        "acessorio__codigo",
        "acessorio__descricao",
    )
    autocomplete_fields = ("produto_base", "acessorio")


@admin.register(EspecificacaoContatora)
class EspecificacaoContatoraAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_ac3_a",
        "corrente_ac1_a",
        "tensao_bobina_v",
        "contatos_aux_na",
        "contatos_aux_nf",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoDisjuntorMotor)
class EspecificacaoDisjuntorMotorAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "faixa_ajuste_min_a",
        "faixa_ajuste_max_a",
        "contatos_aux_na",
        "contatos_aux_nf",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoSeccionadora)
class EspecificacaoSeccionadoraAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_ac1_a",
        "corrente_ac3_a",
        "tipo_montagem",
        "tipo_fixacao",
        "cor_manopla",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoDisjuntorCaixaMoldada)
class EspecificacaoDisjuntorCaixaMoldadaAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_nominal_a",
        "numero_polos",
        "configuracao_disparador",
        "capacidade_interrupcao_220v_ka",
        "capacidade_interrupcao_380v_ka",
        "capacidade_interrupcao_440v_ka",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoReleSobrecarga)
class EspecificacaoReleSobrecargaAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "faixa_ajuste_min_a",
        "faixa_ajuste_max_a",
        "contatos_aux_na",
        "contatos_aux_nf",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoMiniDisjuntor)
class EspecificacaoMiniDisjuntorAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_nominal_a",
        "curva_disparo",
        "numero_polos",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoReleEstadoSolido)
class EspecificacaoReleEstadoSolidoAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_nominal_a",
        "numero_fases",
        "tensao_ventilacao_v",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoFusivel)
class EspecificacaoFusivelAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_fusivel",
        "formato",
        "tamanho",
        "corrente_nominal_a",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoFonte)
class EspecificacaoFonteAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tensao_entrada_v",
        "tensao_saida_v",
        "corrente_saida_a",
        "potencia_saida_w",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoPLC)
class EspecificacaoPLCAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "familia",
        "modelo_cpu",
        "tensao_alimentacao_v",
        "entradas_digitais",
        "saidas_digitais",
        "entradas_analogicas",
        "saidas_analogicas",
        "protocolo_principal",
        "suporta_expansao",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "modelo_cpu",
        "observacoes",
    )


@admin.register(EspecificacaoExpansaoPLC)
class EspecificacaoExpansaoPLCAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_expansao",
        "entradas_digitais",
        "saidas_digitais",
        "entradas_analogicas",
        "saidas_analogicas",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoBorne)
class EspecificacaoBorneAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_borne",
        "secao_max_mm2",
        "numero_niveis",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoCabo)
class EspecificacaoCaboAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_cabo",
        "secao_mm2",
        "numero_condutores",
        "material_condutor",
        "cor",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoCanaleta)
class EspecificacaoCanaletaAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_canaleta",
        "largura_base_mm",
        "altura_mm",
        "material",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoPainel)
class EspecificacaoPainelAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_painel",
        "tipo_instalacao",
        "material",
        "grau_protecao_ip",
        "placa_largura_util_mm",
        "placa_altura_util_mm",
        "placa_acabamento",
        "cor",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "grau_protecao_ip",
    )


@admin.register(EspecificacaoClimatizacao)
class EspecificacaoClimatizacaoAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_climatizacao",
        "potencia_consumida_w",
        "tensao_alimentacao_v",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoInversorFrequencia)
class EspecificacaoInversorFrequenciaAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "potencia_nominal_kw",
        "tensao_entrada_v",
        "numero_fases_entrada",
        "tensao_saida_v",
        "corrente_nominal_a",
        "protocolo_comunicacao",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "protocolo_comunicacao",
    )


@admin.register(EspecificacaoSoftStarter)
class EspecificacaoSoftStarterAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "corrente_nominal_a",
        "tensao_nominal_v",
        "numero_fase_controle",
        "protocolo_comunicacao",
        "tipo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoReleInterface)
class EspecificacaoReleInterfaceAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_rele",
        "tensao_bobina_v",
        "corrente_contato_a",
        "quantidade_contatos",
        "tipo_contato",
        "tipo_montagem",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "observacoes",
    )


@admin.register(EspecificacaoIHM)
class EspecificacaoIHMAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tamanho_tela_pol",
        "tipo_tela",
        "protocolo_comunicacao",
        "tensao_alimentacao_v",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoIdentificacao)
class EspecificacaoIdentificacaoAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_identificacao",
        "secao_min_mm2",
        "secao_max_mm2",
        "comprimento_mm",
        "tamanho_plaqueta",
        "tensao_v",
    )
    list_filter = ("tipo_identificacao", "tamanho_plaqueta", "tensao_v")
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoAcessorioGeral)
class EspecificacaoAcessorioGeralAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_acessorio",
        "porte_painel",
        "quantidade_padrao",
        "largura_min_mm",
        "largura_max_mm",
        "altura_min_mm",
        "altura_max_mm",
    )
    list_filter = ("tipo_acessorio", "porte_painel")
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoSwitchRede)
class EspecificacaoSwitchRedeAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_switch",
        "quantidade_portas",
        "velocidade_porta",
        "tensao_alimentacao_v",
        "possui_poe",
        "gerenciavel",
        "tipo_montagem",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "observacoes",
    )


@admin.register(EspecificacaoModuloComunicacao)
class EspecificacaoModuloComunicacaoAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "familia_plc",
        "tipo_modulo",
        "protocolo",
        "interface_fisica",
        "quantidade_portas",
        "suporta_master",
        "suporta_slave",
        "suporta_client",
        "suporta_server",
        "modo_montagem",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "familia_plc",
    )


@admin.register(EspecificacaoBotao)
class EspecificacaoBotaoAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_botao",
        "tipo_acionamento",
        "cor",
        "iluminado",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoChaveSeletora)
class EspecificacaoChaveSeletoraAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_seletor",
        "numero_posicoes",
        "tipo_acionamento",
        "cor_manopla",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoSinalizador)
class EspecificacaoSinalizadorAdmin(admin.ModelAdmin):
    list_display = ("produto", "tensao_comando_v", "cor")
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoTemporizador)
class EspecificacaoTemporizadorAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_temporizador",
        "tipo_funcao",
        "tensao_alimentacao_v",
        "corrente_contato_a",
        "quantidade_contatos",
        "tipo_montagem",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "observacoes",
    )


@admin.register(EspecificacaoControladorTemperatura)
class EspecificacaoControladorTemperaturaAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_sensor",
        "tipo_controle",
        "quantidade_saidas",
        "tensao_alimentacao_v",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoTrilhoDIN)
class EspecificacaoTrilhoDINAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_trilho",
        "comprimento_mm",
        "material",
        "perfurado",
    )
    search_fields = (
        "produto__codigo",
        "produto__descricao",
        "observacoes",
    )


@admin.register(EspecificacaoTerminal)
class EspecificacaoTerminalAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_terminal",
        "secao_min_mm2",
        "secao_max_mm2",
        "furo_olhal",
    )
    list_filter = ("tipo_terminal", "furo_olhal")
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoBarramento)
class EspecificacaoBarramentoAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "tipo_barramento",
        "material",
        "numero_polos",
        "corrente_nominal_a",
        "secao_mm2",
        "modo_montagem",
        "isolado",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(EspecificacaoGateway)
class EspecificacaoGatewayAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "protocolo_entrada",
        "protocolo_saida",
        "quantidade_portas_ethernet",
        "quantidade_portas_serial",
        "modo_montagem",
    )
    search_fields = ("produto__codigo", "produto__descricao")


@admin.register(Servico)
class ServicoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "descricao",
        "categoria",
        "unidade_medida",
        "preco_base",
        "ativo",
    )
    list_filter = ("ativo", "unidade_medida")
    search_fields = ("codigo", "descricao", "categoria")
