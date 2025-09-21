from rest_framework_simplejwt.authentication import JWTAuthentication
import logging

logger = logging.getLogger(__name__)

class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        logger.info(f"Authenticating request to: {request.path}")
        
        # First try to get token from cookies
        raw_token = request.COOKIES.get('jwt-auth')
        logger.info(f"Token from cookies: {raw_token}")
        
        # If no cookie, fall back to header
        if raw_token is None:
            header = self.get_header(request)
            if header is None:
                logger.info("No authorization header found")
                return None
            raw_token = self.get_raw_token(header)
            logger.info(f"Token from header: {raw_token}")
            if raw_token is None:
                return None
        
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            logger.info(f"Successfully authenticated user: {user}")
            return user, validated_token
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return None