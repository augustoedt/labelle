"""API local de teste para conferir o catálogo no navegador, sem dados reais.

Execute: python3 tests/fixtures/catalog_api_mock.py
Em outro terminal, após npm run build:
  LABELLE_API_URL=http://127.0.0.1:4001 npm run start
Abra http://127.0.0.1:3000/app?tab=catalogo&category=cabelo
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlsplit
import json


def item(kind, id, **attrs):
    return {"type": kind, "id": id, "attributes": attrs}


DATA = {
    "/api/json/services": [
        item("service", "service-corte", name="Corte Feminino", category="cabelo", description="Corte e finalização", price="80", duration_minutes=45, is_active=True),
        item("service", "service-escova", name="Escova", category="cabelo", description="Escova profissional", price="60", duration_minutes=40, is_active=True),
        item("service", "service-unhas", name="Manicure", category="unha", description="Cuidados com as unhas", price="35", duration_minutes=30, is_active=True),
    ],
    "/api/json/service_variants": [
        item("service_variant", "variant-p", service_id="service-escova", name="P", price="45", duration_minutes=30, is_active=True),
        item("service_variant", "variant-m", service_id="service-escova", name="M", price="50", duration_minutes=35, is_active=False),
        item("service_variant", "variant-g", service_id="service-escova", name="G", price="60", duration_minutes=40, is_active=True),
    ],
    "/api/json/promotions": [
        item("promotion", "promo-valid", name="Desconto Escova", service_id="service-escova", discount_type="percent", discount_value="10", start_date="2020-01-01", end_date="2099-12-31", is_active=True),
        item("promotion", "promo-expired", name="Desconto Antigo", service_id="service-escova", discount_type="percent", discount_value="50", start_date="2020-01-01", end_date="2020-12-31", is_active=True),
    ],
    "/api/json/professionals": [
        item("professional", "prof-ana", name="Ana", is_active=True, work_start="09:00", work_end="18:00"),
    ],
    "/api/json/professional_services": [
        item("professional_service", "link-escova", professional_id="prof-ana", service_id="service-escova"),
        item("professional_service", "link-corte", professional_id="prof-ana", service_id="service-corte"),
        item("professional_service", "link-unhas", professional_id="prof-ana", service_id="service-unhas"),
    ],
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path not in DATA:
            self.send_error(404)
            return
        body = json.dumps({"data": DATA[path]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.api+json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlsplit(self.path).path
        response = {
            "/api/client/settings": {},
            "/api/client/available_slots": {"slots": ["14:00", "15:00"]},
            "/api/client/appointments": {"appointments": []},
        }.get(path)
        if response is None:
            self.send_error(404)
            return
        body = json.dumps(response).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 4001), Handler).serve_forever()
