from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body)

        token   = data.get('token')
        user_id = data.get('userId')
        message = data.get('message')

        def respond(payload):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

        try:
            # Step 1: Open DM channel
            req1 = urllib.request.Request(
                'https://discord.com/api/v10/users/@me/channels',
                data=json.dumps({'recipient_id': user_id}).encode(),
                headers={'Authorization': f'Bot {token}', 'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req1) as r:
                channel = json.loads(r.read())

            # Step 2: Send message
            req2 = urllib.request.Request(
                f'https://discord.com/api/v10/channels/{channel["id"]}/messages',
                data=json.dumps({'content': message}).encode(),
                headers={'Authorization': f'Bot {token}', 'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req2):
                pass

            respond({'ok': True})

        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read())
                msg = err.get('message', str(e))
            except Exception:
                msg = str(e)
            respond({'ok': False, 'error': msg})
        except Exception as e:
            respond({'ok': False, 'error': str(e)})

    def log_message(self, format, *args):
        pass  # keep terminal quiet

if __name__ == '__main__':
    server = HTTPServer(('localhost', 3001), ProxyHandler)
    print('✅ Discord proxy running on http://localhost:3001')
    print('   Keep this window open while using PresaleDrop.')
    print('   Press Ctrl+C to stop.')
    server.serve_forever()
