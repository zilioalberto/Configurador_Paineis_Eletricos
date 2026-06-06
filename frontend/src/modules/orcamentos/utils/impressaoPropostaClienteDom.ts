const CLASSE = 'proposta-cliente-impressao-ativa'

/** Marca html/body para o CSS de impressão fiel à rota /oferta. */
export function ativarImpressaoPropostaClienteDom(): void {
  document.documentElement.classList.add(CLASSE)
  document.body.classList.add(CLASSE)
}

export function desativarImpressaoPropostaClienteDom(): void {
  document.documentElement.classList.remove(CLASSE)
  document.body.classList.remove(CLASSE)
}
