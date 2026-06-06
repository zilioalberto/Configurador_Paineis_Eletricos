import {
  ativarImpressaoPropostaClienteDom,
  desativarImpressaoPropostaClienteDom,
} from './impressaoPropostaClienteDom'

function obterNomeArquivoImpressaoNoDom(): string | null {
  const el = document.querySelector('.proposta-cliente[data-nome-arquivo-impressao]')
  const nome = el?.getAttribute('data-nome-arquivo-impressao')?.trim()
  return nome || null
}

/** Dispara a impressão / “Salvar como PDF” do navegador após o layout estabilizar. */
export function imprimirPropostaCliente(): void {
  ativarImpressaoPropostaClienteDom()

  const tituloAnterior = document.title
  const nomeArquivo = obterNomeArquivoImpressaoNoDom()
  if (nomeArquivo) {
    document.title = nomeArquivo
  }

  const limpar = () => {
    document.title = tituloAnterior
    if (!document.querySelector('.proposta-cliente--pagina-impressao')) {
      desativarImpressaoPropostaClienteDom()
    }
  }
  window.addEventListener('afterprint', limpar, { once: true })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print()
    })
  })
}