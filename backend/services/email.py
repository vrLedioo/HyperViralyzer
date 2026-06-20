"""Transactional email via Resend (https://resend.com).

Set RESEND_API_KEY in the environment. If the key is absent the function
logs a warning and returns silently — emails are skipped in local dev.
"""
import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

_RESEND_URL = "https://api.resend.com/emails"


def _send(*, to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email to %s: %s", to, subject)
        return
    try:
        resp = httpx.post(
            _RESEND_URL,
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": html},
            timeout=10.0,
        )
        resp.raise_for_status()
    except Exception:
        logger.exception("Failed to send email to %s (%s)", to, subject)


def send_password_reset(to_email: str, reset_url: str) -> None:
    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FDF2F8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;border:1px solid #fce7f3;padding:40px 36px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">Hyperyzer</p>
          <p style="margin:0 0 28px;font-size:13px;color:#ec4899;font-weight:700;">AI Video Scoring</p>
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0f172a;">Reset your password</h1>
          <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.6;">
            Someone (hopefully you) requested a password reset for your Hyperyzer account.
            Click the button below — this link expires in <strong>1 hour</strong>.
          </p>
          <a href="{reset_url}"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ec4899,#f97316);
                    color:#fff;font-weight:800;font-size:15px;text-decoration:none;border-radius:14px;
                    letter-spacing:-0.2px;">
            Reset password &rarr;
          </a>
          <p style="margin:28px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
            If you didn&rsquo;t request this, you can safely ignore this email — your password won&rsquo;t change.<br>
            Or paste this link directly: <a href="{reset_url}" style="color:#ec4899;word-break:break-all;">{reset_url}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    _send(to=to_email, subject="Reset your Hyperyzer password", html=html)
