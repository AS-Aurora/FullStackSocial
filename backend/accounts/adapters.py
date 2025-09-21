from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

class CustomAccountAdapter(DefaultAccountAdapter):
    def send_confirmation_mail(self, request, emailconfirmation, signup):
        user = emailconfirmation.email_address.user
        activate_url = f"{settings.FRONTEND_URL}/verify-email?key={emailconfirmation.key}"
        ctx = {
            "user": user,
            "activate_url": activate_url,
            "key": emailconfirmation.key,
        }
        message = render_to_string("account/email/email_confirmation_message.txt", ctx)
        subject = render_to_string("account/email/email_confirmation_subject.txt", ctx).strip()
        email = EmailMessage(subject, message, to=[user.email])
        email.send()
    
    def send_password_reset_mail(self, request, user, temp_key):
        """Send custom password reset email"""
        # Generate token and uid for the reset URL
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Create the password reset URL for your frontend
        reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
        
        ctx = {
            "user": user,
            "reset_url": reset_url,
            "uid": uid,
            "token": token,
            "site_name": "FullStackSocial",
            "domain": settings.FRONTEND_URL.replace("http://", "").replace("https://", ""),
        }
        
        # Render email content
        message = render_to_string("account/email/password_reset_message.txt", ctx)
        subject = render_to_string("account/email/password_reset_subject.txt", ctx).strip()
        
        # Send email
        email = EmailMessage(
            subject=subject,
            body=message,
            to=[user.email],
            from_email=settings.DEFAULT_FROM_EMAIL
        )
        email.send()
        
        return True
    
    def is_email_verified(self, request, email):
        """Check if email is verified"""
        from allauth.account.models import EmailAddress
        try:
            email_address = EmailAddress.objects.get(email=email)
            return email_address.verified
        except EmailAddress.DoesNotExist:
            return False