# Plano de migração do WAHA para servidor Ubuntu local

## Objetivo

Mover o serviço `labelle_waha` do Railway para um computador local com Ubuntu 24 e Docker, mantendo o backend e o frontend do LaBelle no Railway.

A sessão atual do WhatsApp **não será preservada**. Após a migração, o número será pareado novamente por QR code.

## Recomendação

Usar **Cloudflare Tunnel**, no plano gratuito, com um subdomínio do domínio já comprado na Hostinger.

Exemplo:

```text
waha.seudominio.com
```

O domínio continuará registrado na Hostinger. Apenas o DNS será administrado pela Cloudflare.

### Por que esta opção

- não exige IP fixo;
- não exige abrir portas no roteador;
- não exige port forwarding;
- funciona com conexão iniciada de dentro da rede doméstica;
- fornece um endereço HTTPS estável para o Railway;
- é gratuito para este cenário;
- o `cloudflared` reconecta automaticamente após quedas ou mudanças de IP.

## Arquitetura final

```text
LaBelle backend no Railway
        |
        | HTTPS: https://waha.seudominio.com
        v
Cloudflare Tunnel
        ^
        | conexão de saída, iniciada pelo PC local
        |
PC Ubuntu 24
        |
        +-- Docker: cloudflared
        +-- Docker: WAHA
            +-- volume persistente ./data/waha-sessions:/app/.sessions
```

O Railway nunca precisará conhecer o IP residencial.

## Estado atual que será substituído

O backend atualmente usa:

```text
WAHA_BASE_URL=http://labellewaha.railway.internal:8080
```

O WAHA no Railway possui volume persistente em `/app/.sessions` e sessão pareada. Como a sessão não será preservada, o serviço poderá ser desligado somente depois dos testes do WAHA local.

## Fases do trabalho

### Fase 1 — Preparar o domínio na Cloudflare

1. Criar uma conta gratuita na Cloudflare.
2. Adicionar o domínio comprado na Hostinger.
3. Copiar os dois nameservers fornecidos pela Cloudflare.
4. Na Hostinger, trocar os nameservers do domínio pelos nameservers da Cloudflare.
5. Aguardar a propagação e confirmar o domínio como `Active` na Cloudflare.
6. Não alterar o registro do domínio na Hostinger; somente a autoridade DNS será transferida.

> O domínio continua sendo seu e continua registrado na Hostinger. A Cloudflare passará a responder pelos registros DNS.

### Fase 2 — Criar o Cloudflare Tunnel

1. No painel da Cloudflare, criar um Tunnel do tipo **Cloudflared**.
2. Criar o hostname público:

```text
waha.seudominio.com
```

3. Configurar o serviço de origem como:

```text
http://waha:8080
```

4. Copiar o token de instalação do Tunnel.
5. Guardar o token em arquivo `.env` no servidor local, sem versioná-lo.

O Tunnel deverá ser executado dentro do mesmo `docker-compose` do WAHA, usando a rede interna do Compose.

### Fase 3 — Preparar o Ubuntu 24

Instalar e habilitar:

- Docker Engine;
- Docker Compose Plugin;
- `git` apenas se necessário para administrar os arquivos;
- atualizações de segurança do sistema.

Criar uma pasta exclusiva, por exemplo:

```text
/opt/labelle-waha/
```

Estrutura planejada:

```text
/opt/labelle-waha/
├── docker-compose.yml
├── .env
├── .gitignore
└── data/
    └── waha-sessions/
```

Permitir acesso ao painel do Ubuntu apenas pela rede local ou via SSH seguro. Não publicar diretamente a porta 8080 do WAHA no roteador.

### Fase 4 — Criar o Docker Compose local

O Compose deverá conter dois serviços:

1. `waha` — imagem `devlikepro/waha:latest`;
2. `cloudflared` — conexão permanente com o Tunnel.

Configurações esperadas do WAHA:

```yaml
environment:
  WHATSAPP_DEFAULT_ENGINE: WEBJS
  WHATSAPP_RESTART_ALL_SESSIONS: "true"
  WAHA_API_KEY: "sha512:HASH_DO_TOKEN"
```

Volume obrigatório:

```yaml
volumes:
  - ./data/waha-sessions:/app/.sessions
```

A porta 8080 deverá ficar disponível apenas para a rede Docker. Não usar `ports:` para expor o WAHA diretamente na internet.

Também deverá ser configurada uma autenticação própria para o dashboard do WAHA, conforme as variáveis suportadas pela versão da imagem utilizada.

O arquivo `.env` conterá, no mínimo:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=...
WAHA_API_KEY=...
WAHA_DASHBOARD_USERNAME=...
WAHA_DASHBOARD_PASSWORD=...
```

O `.env` nunca deverá ser commitado no GitHub.

### Fase 5 — Validar o WAHA local antes de alterar o Railway

1. Subir os containers:

```bash
cd /opt/labelle-waha
docker compose up -d
```

2. Verificar logs:

```bash
docker compose logs -f waha cloudflared
```

3. Confirmar que o Tunnel está conectado.
4. Testar o endpoint HTTPS:

```text
https://waha.seudominio.com
```

5. Confirmar que a API exige o header:

```http
x-api-key: CHAVE_DO_WAHA
```

6. Criar a sessão `default` com `start: true`.
7. Gerar o QR code.
8. Parear o WhatsApp novamente.
9. Confirmar que o status chega a `WORKING`.
10. Testar manualmente o endpoint `sendText` antes de conectar o LaBelle.

### Fase 6 — Adaptar o backend LaBelle

Alterar no serviço `labelle_back` do Railway:

```text
WAHA_BASE_URL=https://waha.seudominio.com
```

Manter:

```text
WAHA_SESSION=default
WAHA_API_KEY=mesma_chave_em_texto_plano
```

A chave deve continuar assimétrica:

- no WAHA local: hash no formato `sha512:...`;
- no backend: chave original em texto plano.

#### Webhook

O código atual monta automaticamente um webhook usando o domínio privado do Railway:

```text
http://<dominio-privado-do-backend>:8080/api/webhooks/waha
```

O WAHA local não conseguirá acessar esse domínio privado. Antes da migração, será necessário escolher uma destas opções:

1. **Recomendação inicial:** permitir configurar/desativar o webhook por variável de ambiente, deixando-o vazio no cenário local;
2. publicar também o endpoint de webhook do backend por um endereço HTTPS público;
3. criar uma segunda conexão privada entre o PC e o Railway.

Como o webhook atual apenas registra logs de eventos e não é necessário para o envio básico, a opção 1 é suficiente para a primeira versão.

### Fase 7 — Deploy e testes integrados

1. Fazer o ajuste do webhook no código, se necessário.
2. Validar o backend localmente.
3. Alterar as variáveis do `labelle_back` no Railway.
4. Fazer redeploy do backend.
5. Abrir o painel de configurações do LaBelle.
6. Confirmar o status do WhatsApp.
7. Testar:
   - confirmação de agendamento;
   - lembrete;
   - notificação de novo agendamento;
   - logout/despareamento;
   - novo QR code;
   - reinício dos containers;
   - persistência da sessão após reinício.

### Fase 8 — Desativar o WAHA no Railway

Somente após os testes integrados:

1. Confirmar que o backend está usando o domínio do Tunnel.
2. Confirmar envio de mensagens por pelo menos um período de observação.
3. Desligar o serviço `labelle_waha` no Railway.
4. Manter o serviço antigo disponível por alguns dias, se o custo permitir, para rollback rápido.
5. Depois da confirmação definitiva, remover o serviço e o volume do Railway.

## Alterações no proxy do admin

O `labelle_proxy` atualmente possui rotas para encaminhar `/dashboard*` e `/api/*` diretamente ao WAHA do Railway.

Após a migração, essas rotas ficarão obsoletas. O plano é:

- remover ou desativar essas rotas do Caddy;
- acessar o dashboard do WAHA pela Cloudflare apenas quando necessário;
- manter o dashboard protegido por autenticação própria;
- não expor a chave `WAHA_API_KEY` no frontend LaBelle.

A remoção dessas rotas não afeta o app principal nem o AshAdmin.

## Rollback

Se o WAHA local apresentar instabilidade:

1. Reapontar `WAHA_BASE_URL` para:

```text
http://labellewaha.railway.internal:8080
```

2. Fazer redeploy do backend.
3. Reativar o serviço WAHA no Railway, se ele ainda estiver disponível.
4. Parear novamente o WhatsApp no serviço que estiver ativo.

Como a sessão atual não será preservada, o rollback também poderá exigir novo pareamento.

## Segurança

- não abrir a porta 8080 no roteador;
- não usar Quick Tunnel como solução definitiva, pois o endereço pode mudar;
- não colocar a chave do WAHA no código ou no GitHub;
- proteger o dashboard do WAHA com usuário e senha;
- usar HTTPS no hostname público;
- manter o Ubuntu e Docker atualizados;
- limitar o acesso SSH ao servidor;
- usar volume persistente para não perder o pareamento após reinícios;
- monitorar o espaço em disco e os logs do Chromium/WAHA;
- não desligar o computador enquanto o serviço for necessário.

## Limitações operacionais

O LaBelle continuará disponível no Railway, mas os recursos que dependem do WhatsApp ficarão indisponíveis quando:

- o PC estiver desligado;
- a internet residencial cair;
- o Docker parar;
- o Tunnel perder conexão sem conseguir reconectar;
- a sessão do WhatsApp for desconectada.

O Tunnel resolve o IP dinâmico, mas não resolve indisponibilidade elétrica ou de internet. Para produção mais crítica, considerar nobreak, reinício automático e uma conexão reserva.

## Critérios de conclusão

A migração será considerada concluída quando:

- `https://waha.seudominio.com` estiver acessível pelo Railway;
- o status da sessão estiver `WORKING`;
- o backend conseguir enviar mensagens pelo WAHA local;
- confirmação e lembrete funcionarem pelo LaBelle;
- o QR code puder ser gerado pelo painel;
- o WAHA reiniciar sem perder a sessão;
- o PC não expuser diretamente nenhuma porta no roteador;
- o serviço `labelle_waha` do Railway puder ser desligado sem interromper o sistema.

## Decisão resumida

```text
Registrar domínio: Hostinger
DNS autoritativo: Cloudflare Free
Túnel: Cloudflare Tunnel / cloudflared
WAHA: Docker no Ubuntu 24 local
Conexão Railway → WAHA: HTTPS pelo hostname do Tunnel
IP fixo: não necessário
Port forwarding: não necessário
Sessão atual: não preservar; parear novamente
```
