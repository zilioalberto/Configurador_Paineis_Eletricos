"""Envio de e-mail da oferta ao cliente."""
from __future__ import annotations

from email.mime.image import MIMEImage
from email.utils import make_msgid
from html import escape
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def email_configurado() -> bool:
    backend = getattr(settings, "EMAIL_BACKEND", "")
    if "console" in backend:
        return False
    return bool(settings.EMAIL_HOST and settings.DEFAULT_FROM_EMAIL)


def _whatsapp_url() -> str:
    numero = "".join(ch for ch in getattr(settings, "ZFW_WHATSAPP_E164", "") if ch.isdigit())
    if not numero:
        return ""
    return f"https://wa.me/{numero}"


def _html_paragrafos(corpo: str) -> str:
    texto = (corpo or "").strip() or "Segue em anexo nossa proposta comercial."
    blocos = [bloco.strip() for bloco in texto.split("\n\n") if bloco.strip()]
    if not blocos:
        blocos = [texto]
    return "\n".join(
        f"<p style=\"margin:0 0 15px;line-height:1.62;color:#2d3a4a;font-size:15px;\">"
        f"{escape(bloco).replace(chr(10), '<br>')}</p>"
        for bloco in blocos
    )


def _whatsapp_icon_data_uri() -> str:
    svg = """
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
  <path fill="#ffffff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
</svg>
"""
    return f"data:image/svg+xml;utf8,{quote(svg.strip())}"


def _montar_html_email(corpo: str, *, logo_cid: str | None) -> str:
    logo_html = ""
    if logo_cid:
        logo_html = (
            f'<img src="cid:{logo_cid}" alt="ZFW Engenharia" width="190" '
            'style="display:block;width:190px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">'
        )
    else:
        logo_html = (
            '<div style="font-size:20px;line-height:1.2;font-weight:700;color:#2a4a62;'
            'letter-spacing:.02em;">ZFW Engenharia</div>'
        )

    whatsapp_url = _whatsapp_url()
    whatsapp_display = escape(getattr(settings, "ZFW_WHATSAPP_DISPLAY", "") or "")
    whatsapp_icon = _whatsapp_icon_data_uri()
    whatsapp_html = ""
    if whatsapp_url:
        whatsapp_html = f"""
          <tr>
            <td style="padding:18px 0 0;">
              <a href="{escape(whatsapp_url)}"
                 style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;
                        font-weight:700;border-radius:999px;padding:12px 20px;font-size:14px;
                        box-shadow:0 8px 18px rgba(37,211,102,.24);">
                <img src="{whatsapp_icon}" alt="" width="18" height="18"
                     style="display:inline-block;width:18px;height:18px;margin:0 8px 0 0;
                            vertical-align:-4px;border:0;">
                Falar pelo WhatsApp
              </a>
              <span style="display:block;margin-top:9px;color:#5c6d7e;font-size:12px;line-height:1.45;">
                {whatsapp_display}
              </span>
            </td>
          </tr>
        """

    return f"""\
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#eef4f8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
           style="background:#eef4f8;padding:30px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0"
                 style="width:640px;max-width:94%;background:#ffffff;border:1px solid #dce4eb;border-radius:14px;
                        overflow:hidden;box-shadow:0 8px 28px rgba(42,74,98,.10);">
            <tr>
              <td style="padding:0;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="height:8px;background:#3d6d8c;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:28px 30px 20px;background:#f8fafb;border-bottom:1px solid #dce4eb;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="vertical-align:middle;">{logo_html}</td>
                          <td align="right" style="vertical-align:middle;">
                            <span style="display:inline-block;padding:7px 11px;border-radius:999px;
                                         background:#edf5f0;color:#4a8f6e;font-size:11px;font-weight:700;
                                         letter-spacing:.08em;text-transform:uppercase;">
                              Proposta comercial
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 10px;background:#ffffff;">
                <div style="padding:0 0 4px;">
                  {_html_paragrafos(corpo)}
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="margin-top:20px;background:#f3f7fa;border:1px solid #dce4eb;border-radius:12px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:13px;line-height:1.45;color:#5c6d7e;margin-bottom:3px;">
                        Atendimento comercial
                      </div>
                      <div style="font-size:17px;line-height:1.3;font-weight:700;color:#2a4a62;">
                        ZFW Engenharia
                      </div>
                      <div style="height:1px;background:#dce4eb;margin:14px 0;"></div>
                      <div style="color:#5c6d7e;font-size:13px;line-height:1.6;">
                        Rua República da China, 80 · 89211-420 Joinville - SC - Brasil<br>
                        <strong style="color:#2d3a4a;">+55 47 3473-7029</strong> ·
                        <a href="mailto:vendas@zfw.com.br" style="color:#2a4a62;text-decoration:none;">vendas@zfw.com.br</a> ·
                        <a href="https://www.zfw.com.br" style="color:#2a4a62;text-decoration:none;">www.zfw.com.br</a>
                      </div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        {whatsapp_html}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 30px 26px;background:#ffffff;">
                <div style="font-size:11px;line-height:1.45;color:#7b8b9b;border-top:1px solid #edf2f6;padding-top:14px;">
                  Esta mensagem acompanha a proposta em PDF anexa. Em caso de dúvidas, responda este e-mail
                  ou acione nosso atendimento comercial.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _montar_texto_email(corpo: str) -> str:
    texto = (corpo or "").strip() or "Segue em anexo nossa proposta comercial."
    assinatura = (
        "\n\n--\n"
        "ZFW Engenharia\n"
        "Rua República da China, 80 - 89211-420 Joinville - SC - Brasil\n"
        "+55 47 3473-7029 | vendas@zfw.com.br | www.zfw.com.br"
    )
    whatsapp_url = _whatsapp_url()
    whatsapp_display = getattr(settings, "ZFW_WHATSAPP_DISPLAY", "") or ""
    if whatsapp_url:
        assinatura += f"\nWhatsApp: {whatsapp_display} ({whatsapp_url})"
    return f"{texto}{assinatura}"


def _anexar_logo_inline(msg: EmailMultiAlternatives) -> str | None:
    path = Path(getattr(settings, "ZFW_EMAIL_LOGO_PATH", "") or "")
    if not path.exists() or not path.is_file():
        return None
    logo_cid = make_msgid(domain="zfw.com.br")[1:-1]
    with path.open("rb") as logo_file:
        imagem = MIMEImage(logo_file.read())
    imagem.add_header("Content-ID", f"<{logo_cid}>")
    imagem.add_header("Content-Disposition", "inline", filename=path.name)
    msg.attach(imagem)
    return logo_cid


def enviar_email_oferta(
    *,
    destinatario: str,
    assunto: str,
    corpo: str,
    pdf_bytes: bytes,
    nome_arquivo_pdf: str,
    destinatarios: list[str] | None = None,
) -> None:
    emails = [email.strip() for email in (destinatarios or [destinatario]) if email.strip()]
    if not emails:
        raise ValueError("Informe o e-mail do destinatário.")
    if not email_configurado():
        raise ValueError(
            "Servidor de e-mail não configurado. Defina EMAIL_HOST e DEFAULT_FROM_EMAIL."
        )
    remetente = settings.DEFAULT_FROM_EMAIL
    msg = EmailMultiAlternatives(
        subject=assunto.strip() or "Proposta comercial",
        body=_montar_texto_email(corpo),
        from_email=remetente,
        to=emails,
    )
    logo_cid = _anexar_logo_inline(msg)
    msg.attach_alternative(_montar_html_email(corpo, logo_cid=logo_cid), "text/html")
    msg.attach(nome_arquivo_pdf, pdf_bytes, "application/pdf")
    msg.send(fail_silently=False)
