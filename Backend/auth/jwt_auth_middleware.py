from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
import logging
logger = logging.getLogger("websocket_consumers")


@database_sync_to_async
def get_user(validated_token):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user_id = validated_token['user_id']
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        logger.info("[WebSocket JWT] Middleware __call__ exécuté pour %s", scope.get('path', ''))
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        from django.contrib.auth import get_user_model
        User = get_user_model()
        # Extraction du token
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        if token:
            logger.info(f"[WebSocket JWT] Token extrait de la query string: {token}")
        else:
            # Tentative d'extraction depuis les headers
            headers = dict(scope.get('headers', []))
            auth_header = headers.get(b'authorization') or headers.get(b'Authorization')
            if auth_header:
                try:
                    auth_header = auth_header.decode()
                    if auth_header.lower().startswith('bearer '):
                        token = auth_header[7:]
                        logger.info(f"[WebSocket JWT] Token extrait des headers: {token}")
                except Exception as e:
                    logger.warning(f"[WebSocket JWT] Erreur décodage header Authorization: {e}")
        if not token:
            logger.warning("[WebSocket JWT] Aucun token fourni")
            scope['user'] = AnonymousUser()
            return await super().__call__(scope, receive, send)
        # Validation et décodage du token
        try:
            validated_token = UntypedToken(token)
            logger.info(f"[WebSocket JWT] Token validé: {validated_token}")
            user_id = validated_token.get('user_id')
            logger.info(f"[WebSocket JWT] user_id extrait du token: {user_id}")
            user = await get_user(validated_token)
            if user and getattr(user, 'is_authenticated', False):
                logger.info(f"[WebSocket JWT] Utilisateur authentifié: id={user.id}, username={getattr(user, 'username', None)}")
            else:
                logger.warning(f"[WebSocket JWT] Utilisateur non trouvé ou non authentifié pour user_id={user_id}")
            scope['user'] = user
        except (InvalidToken, TokenError) as e:
            logger.warning(f"[WebSocket JWT] Token invalide: {e}")
            scope['user'] = AnonymousUser()
        except Exception as e:
            logger.error(f"[WebSocket JWT] Erreur inattendue lors de la validation du token: {e}")
            scope['user'] = AnonymousUser()
        return await super().__call__(scope, receive, send) 