/** Créditos de desenvolvimento — exibidos no rodapé da aplicação. */
export const DEVELOPER = {
  name: 'Alberto Zilio',
  linkedinUrl: 'https://www.linkedin.com/in/alberto-zilio-133682a7/',
  /** E.164 sem símbolos, para wa.me */
  whatsappE164: '5547984027016',
  whatsappDisplay: '+55 47 98402-7016',
} as const

export function getWhatsAppUrl(): string {
  return `https://wa.me/${DEVELOPER.whatsappE164}`
}
