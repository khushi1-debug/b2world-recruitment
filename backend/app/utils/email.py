"""
Email sending helper.

If SENDGRID_API_KEY is configured, real emails are sent via SendGrid.
Otherwise (zero-setup dev mode), the email is printed to the backend
console/log so you can copy the reset link and test the flow without
needing an email account.
"""
import logging

from app.config import settings

logger = logging.getLogger("b2world.email")


def send_email(to_email: str, subject: str, body: str) -> None:
    # 1. Try SMTP if configured (e.g. Gmail App Password, Outlook, custom SMTP)
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart()
            msg["From"] = settings.FROM_EMAIL or settings.SMTP_USER
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
                if settings.SMTP_TLS:
                    server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            logger.info("Email delivered via SMTP to %s", to_email)
            return
        except Exception as exc:
            logger.error("SMTP delivery failed: %s", exc)

    # 2. Try SendGrid if configured
    if settings.SENDGRID_API_KEY:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=settings.FROM_EMAIL,
                to_emails=to_email,
                subject=subject,
                plain_text_content=body,
            )
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            if response.status_code in (200, 201, 202):
                logger.info("Email accepted by SendGrid (status %s) to %s", response.status_code, to_email)
                return
        except Exception as exc:  # pragma: no cover
            logger.error("SendGrid send failed, falling back to console: %s", exc)

    # Dev fallback: print to console so the flow is fully testable with no email account.
    print("\n" + "=" * 60)
    print(f"[DEV EMAIL] To: {to_email}")
    print(f"Subject: {subject}")
    print("-" * 60)
    print(body)
    print("=" * 60 + "\n")


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    subject = "Reset your B2World password"
    body = (
        f"Hi,\n\nWe received a request to reset your B2World account password.\n"
        f"Click the link below to set a new password (valid for a limited time):\n\n"
        f"{reset_link}\n\n"
        f"If you didn't request this, you can safely ignore this email."
    )
    send_email(to_email, subject, body)


def send_interview_invitation_email(to_email: str, candidate_name: str, job_title: str, interview_datetime=None) -> tuple[str, str]:
    """Step 12 — Automatic Email Workflow: sent when a candidate reaches
    'interview_scheduled' or 'selected'. If a specific date/time was set
    by the recruiter, includes it directly instead of a vague 'we'll be
    in touch' - a real time is far more useful to the candidate."""
    subject = f"You've been shortlisted for {job_title} at B2World!"
    if interview_datetime:
        formatted_time = interview_datetime.strftime("%A, %B %d at %I:%M %p")
        schedule_line = f"Your interview is scheduled for {formatted_time}. We'll send calendar details shortly."
    else:
        schedule_line = "Our team will reach out shortly to schedule your interview."
    body = (
        f"Hi {candidate_name},\n\n"
        f"Great news — based on our initial screening, you've been shortlisted for "
        f"the {job_title} role at B2World. {schedule_line}\n\n"
        f"Congratulations, and we look forward to speaking with you!"
    )
    send_email(to_email, subject, body)
    return subject, body


def send_rejection_email(to_email: str, candidate_name: str, job_title: str) -> tuple[str, str]:
    """Step 12 — sent when a candidate is marked 'rejected'."""
    subject = f"Update on your application for {job_title} at B2World"
    body = (
        f"Hi {candidate_name},\n\n"
        f"Thank you for applying for the {job_title} role at B2World, and for "
        f"taking the time to share your background with us.\n\n"
        f"After careful review, we've decided to move forward with other candidates "
        f"whose experience more closely matches this role right now. We'll keep your "
        f"resume on file for future openings that may be a better fit.\n\n"
        f"We wish you the best in your job search."
    )
    send_email(to_email, subject, body)
    return subject, body


def send_under_review_email(to_email: str, candidate_name: str, job_title: str) -> tuple[str, str]:
    """Step 12 — sent when a candidate's application is put on hold/under review."""
    subject = f"Your application for {job_title} is under review"
    body = (
        f"Hi {candidate_name},\n\n"
        f"Just a quick update — your application for {job_title} at B2World is "
        f"currently under review by our hiring team. We'll be in touch as soon as "
        f"there's a decision.\n\n"
        f"Thanks for your patience!"
    )
    send_email(to_email, subject, body)
    return subject, body