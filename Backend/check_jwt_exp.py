#!/usr/bin/env python3
import base64
import json
import sys
from datetime import datetime

def decode_jwt(token):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            print('❌ Format JWT invalide')
            return
        payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)
        print('--- Payload décodé ---')
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        
        exp = payload.get('exp')
        if exp:
            exp_dt = datetime.utcfromtimestamp(exp)
            now = datetime.utcnow()
            print(f"\n⏰ Expiration (exp): {exp_dt} UTC")
            if now > exp_dt:
                print("❌ Le token est expiré !")
            else:
                print("✅ Le token est encore valide.")
        else:
            print('⚠️  Pas de champ exp dans ce token.')
    except Exception as e:
        print(f'Erreur lors du décodage : {e}')

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage : python check_jwt_exp.py VOTRE_TOKEN_JWT")
    else:
        decode_jwt(sys.argv[1]) 