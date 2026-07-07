import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { useAppSession } from '~/utils/session'

const API_BASE = process.env.LABELLE_API_URL || 'http://localhost:4000'

// Node's fetch (undici) hangs/fails against Railway's *.railway.internal
// private-network hostnames because of how it handles the IPv6+IPv4
// happy-eyeballs DNS results there. Forcing the dispatcher to IPv4 avoids it.
// Dynamic import (not a static one) so this Node-only module never gets
// pulled into the client bundle.
let internalNetworkingConfigured = false
export async function ensureInternalNetworking() {
  if (internalNetworkingConfigured) return
  internalNetworkingConfigured = true
  const { setGlobalDispatcher, Agent } = await import('undici')
  setGlobalDispatcher(new Agent({ connect: { family: 6 } }))
}

type ListParams = {
  sort?: string
  limit?: number
  filter?: Record<string, string>
}

function buildQuery({ sort, limit, filter }: ListParams = {}) {
  const params = new URLSearchParams()
  if (sort) params.set('sort', sort)
  if (limit) params.set('page[size]', String(limit))
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      params.set(`filter[${key}]`, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// Wrapped in createServerOnlyFn: this touches the httpOnly session cookie and
// must never execute client-side. Without this wrapper, TanStack Start's dev
// bundler can still pull the `useAppSession`/session.ts import chain into the
// client bundle when this module is imported by page components, and the
// "mocked" server-only import throws at call time. createServerOnlyFn keeps
// the real implementation server-side and throws a clear error if ever
// invoked from client code instead.
const authedRequest = createServerOnlyFn(
  async (path: string, options: RequestInit = {}) => {
    await ensureInternalNetworking()
    const session = await useAppSession()
    const token = session.data.token

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`API ${options.method || 'GET'} ${path} failed: ${res.status} ${body}`)
    }

    if (res.status === 204) return null
    return res.json()
  },
)

// AshJsonApi serializes :decimal attributes as JSON strings (to avoid float
// precision loss on the wire). Coerce the known decimal fields back to JS
// numbers here so pages can do plain arithmetic (sum/reduce/+) like the old
// Base44 app did, instead of every page needing to parseFloat() itself.
const DECIMAL_FIELDS = new Set([
  'price',
  'cost',
  'amount',
  'net_amount',
  'total_fees',
  'total_spent',
  'commission_percent',
  'rent_value',
  'discount_value',
  'fee_percent',
  'fee_amount',
])

function deserialize(resource: any) {
  const attrs = { ...resource.attributes }
  for (const key of Object.keys(attrs)) {
    if (DECIMAL_FIELDS.has(key) && typeof attrs[key] === 'string') {
      attrs[key] = parseFloat(attrs[key])
    }
  }
  return { id: resource.id, ...attrs }
}

async function jsonApiList(path: string, params?: ListParams) {
  const json = await authedRequest(`/api/json/${path}${buildQuery(params)}`)
  return (json.data || []).map(deserialize)
}

// Attributes the backend computes itself and does not accept as writable input
// on Appointment's create/update actions (see
// LabelleBack.Studio.Changes.SnapshotAppointmentFields on the Elixir side).
// The old Base44 app computed these client-side and sent them along with
// every appointment create/update — ported pages still do that out of habit,
// but AshJsonApi validates the request body strictly against each action's
// accept list and rejects unknown keys with "invalid_body", so they must be
// stripped before the request goes out. Harmless to strip globally: no other
// resource has attributes with these names.
const SERVER_COMPUTED_FIELDS = new Set(['service_name', 'professional_name'])

// The old Base44 schema was schemaless and tolerated "" as an "unset" sentinel
// for id/select fields (e.g. an unselected client dropdown). Ash's typed
// resources don't — an empty string is not a valid UUID/enum/etc. Strip those
// out here once, so every ported page/form doesn't have to special-case it.
function cleanAttributes(attributes: Record<string, any>) {
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== '' && !SERVER_COMPUTED_FIELDS.has(key)) cleaned[key] = value
  }
  return cleaned
}

async function jsonApiCreate(path: string, type: string, attributes: Record<string, any>) {
  const json = await authedRequest(`/api/json/${path}`, {
    method: 'POST',
    body: JSON.stringify({ data: { type, attributes: cleanAttributes(attributes) } }),
  })
  return deserialize(json.data)
}

async function jsonApiUpdate(
  path: string,
  type: string,
  id: string,
  attributes: Record<string, any>,
) {
  const json = await authedRequest(`/api/json/${path}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type, id, attributes: cleanAttributes(attributes) } }),
  })
  return deserialize(json.data)
}

// PATCH em uma rota de action customizada (ex.: /appointments/:id/finalize).
async function jsonApiAction(
  path: string,
  type: string,
  id: string,
  action: string,
  attributes: Record<string, any> = {},
) {
  const json = await authedRequest(`/api/json/${path}/${id}/${action}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type, id, attributes: cleanAttributes(attributes) } }),
  })
  return deserialize(json.data)
}

async function jsonApiDelete(path: string, id: string) {
  await authedRequest(`/api/json/${path}/${id}`, { method: 'DELETE' })
  return { id }
}

// NOTE: TanStack Start's compiler requires each `createServerFn().handler()`
// call to be its own top-level `export const NAME = ...` — it generates a
// synthetic export per declaration for the client/server RPC split, and that
// fails silently (500 at request time) if createServerFn is called inside a
// reusable factory function instead. So each resource's list/create/update is
// declared individually below, then grouped into a `*Api` object afterwards
// (the grouping itself is just a plain object literal, not a createServerFn
// call, so it doesn't need to be top-level).

export const listClients = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('clients', data))
export const createClient = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('clients', 'client', data))
export const updateClient = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('clients', 'client', data.id, data.attributes))

export const listProfessionals = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('professionals', data))
export const createProfessional = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('professionals', 'professional', data))
export const updateProfessional = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('professionals', 'professional', data.id, data.attributes))

// Liga profissional <-> serviços que ela realiza. Leitura é pública no
// backend (sem dado sensível), então também funciona sem login no app da
// cliente, exatamente como Services/Professionals já funcionam ali.
export const listProfessionalServices = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('professional_services', data))
export const createProfessionalService = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('professional_services', 'professional_service', data))
export const deleteProfessionalService = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) => jsonApiDelete('professional_services', data.id))

export const listServices = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('services', data))
export const createService = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('services', 'service', data))
export const updateService = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('services', 'service', data.id, data.attributes))

export const listAppointments = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('appointments', data))
export const createAppointment = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('appointments', 'appointment', data))
export const updateAppointment = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('appointments', 'appointment', data.id, data.attributes))
// Finaliza o atendimento cobrando: o backend soma serviço principal + itens
// adicionais e registra a transação financeira como paga (action :finalize).
export const finalizeAppointment = createServerFn({ method: 'POST' })
  .validator((data: { id: string; payment_method: string }) => data)
  .handler(({ data }) =>
    jsonApiAction('appointments', 'appointment', data.id, 'finalize', {
      payment_method: data.payment_method,
    }),
  )
// Confirmar e enviar lembrete a partir da visão da profissional passam pelo
// backend (que envia via WhatsApp da empresa) em vez de abrir o WhatsApp
// pessoal de quem está logado no navegador.
export const confirmAppointment = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) => jsonApiAction('appointments', 'appointment', data.id, 'confirm'))
export const sendAppointmentReminder = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) => jsonApiAction('appointments', 'appointment', data.id, 'send_reminder'))

export const listAppointmentServices = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('appointment_services', data))
export const createAppointmentService = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('appointment_services', 'appointment_service', data))
export const updateAppointmentService = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) =>
    jsonApiUpdate('appointment_services', 'appointment_service', data.id, data.attributes),
  )
export const deleteAppointmentService = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) => jsonApiDelete('appointment_services', data.id))

export const listClientReminders = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('client_reminders', data))
export const markReminderSent = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) =>
    jsonApiAction('client_reminders', 'client_reminder', data.id, 'mark_sent'),
  )
export const cancelReminder = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) => jsonApiAction('client_reminders', 'client_reminder', data.id, 'cancel'))

export const listProducts = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('products', data))
export const createProduct = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('products', 'product', data))
export const updateProduct = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('products', 'product', data.id, data.attributes))

export const listPromotions = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('promotions', data))
export const createPromotion = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('promotions', 'promotion', data))
export const updatePromotion = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('promotions', 'promotion', data.id, data.attributes))

export const listTransactions = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('transactions', data))
export const createTransaction = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('transactions', 'transaction', data))
export const updateTransaction = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('transactions', 'transaction', data.id, data.attributes))

export const listPayments = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('payments', data))
export const createPayment = createServerFn({ method: 'POST' })
  .validator((data: Record<string, any>) => data)
  .handler(({ data }) => jsonApiCreate('payments', 'payment', data))
export const updatePayment = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdate('payments', 'payment', data.id, data.attributes))

// As páginas chamam `XApi.list({ sort, filter })` e `XApi.update({ id,
// attributes })` passando o payload direto, mas o TanStack Start invoca
// server functions como `fn({ data: payload })` — sem o wrapper o servidor
// recebia `data: undefined`: listas ignoravam sort/filtro/limite e TODO
// update quebrava com 500 (era isso que travava confirmar/iniciar/concluir
// atendimento). Os wrappers abaixo fazem a ponte. `create` já é chamado como
// `create({ data })` nas páginas, então passa direto.
const wrapList =
  (fn: (ctx: { data?: ListParams }) => Promise<any>) => (params?: ListParams) =>
    fn({ data: params })
const wrapInput =
  <T,>(fn: (ctx: { data: T }) => Promise<any>) => (input: T) =>
    fn({ data: input })

export const ClientsApi = { list: wrapList(listClients), create: createClient, update: wrapInput(updateClient) }
export const ProfessionalsApi = { list: wrapList(listProfessionals), create: createProfessional, update: wrapInput(updateProfessional) }
export const ProfessionalServicesApi = { list: wrapList(listProfessionalServices), create: createProfessionalService, delete: wrapInput(deleteProfessionalService) }
export const ServicesApi = { list: wrapList(listServices), create: createService, update: wrapInput(updateService) }
export const AppointmentsApi = { list: wrapList(listAppointments), create: createAppointment, update: wrapInput(updateAppointment), finalize: wrapInput(finalizeAppointment), confirm: wrapInput(confirmAppointment), sendReminder: wrapInput(sendAppointmentReminder) }
export const AppointmentServicesApi = { list: wrapList(listAppointmentServices), create: createAppointmentService, update: wrapInput(updateAppointmentService), delete: wrapInput(deleteAppointmentService) }
export const RemindersApi = { list: wrapList(listClientReminders), markSent: wrapInput(markReminderSent), cancel: wrapInput(cancelReminder) }
export const ProductsApi = { list: wrapList(listProducts), create: createProduct, update: wrapInput(updateProduct) }
export const PromotionsApi = { list: wrapList(listPromotions), create: createPromotion, update: wrapInput(updatePromotion) }
export const TransactionsApi = { list: wrapList(listTransactions), create: createTransaction, update: wrapInput(updateTransaction) }
export const PaymentsApi = { list: wrapList(listPayments), create: createPayment, update: wrapInput(updatePayment) }

export const listUsers = createServerFn({ method: 'GET' })
  .validator((data?: ListParams) => data)
  .handler(({ data }) => jsonApiList('users', data))

// ---------------------------------------------------------------------------
// Public client-facing endpoints (no auth token — mirror the old Base44
// "asServiceRole" functions). See labelle_back/lib/labelle_back_web/controllers/api/client_controller.ex
// ---------------------------------------------------------------------------

async function publicRequest(path: string, body: Record<string, any>) {
  await ensureInternalNetworking()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `${path} failed`)
  return json
}

export const getAvailableSlots = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      professional_id: string
      date: string
      duration_minutes?: number
      work_start?: string
      work_end?: string
    }) => data,
  )
  .handler(({ data }) => publicRequest('/api/client/available_slots', data))

export const getClientAppointments = createServerFn({ method: 'POST' })
  .validator((data: { phone: string }) => data)
  .handler(({ data }) => publicRequest('/api/client/appointments', data))

export const getClientLoyalty = createServerFn({ method: 'POST' })
  .validator((data: { phone: string }) => data)
  .handler(({ data }) => publicRequest('/api/client/loyalty', data))

export const upsertClient = createServerFn({ method: 'POST' })
  .validator((data: { name: string; phone: string }) => data)
  .handler(({ data }) => publicRequest('/api/client/upsert', data))

// Configurações do estúdio (telefone/endereço/templates de mensagem) —
// subset público, sem autenticação, para o app da cliente montar a
// notificação de novo agendamento endereçada ao estúdio.
export const getStudioSettings = createServerFn({ method: 'POST' }).handler(() =>
  publicRequest('/api/client/settings', {}),
)

// ---------------------------------------------------------------------------
// Configurações (tela admin) — resource singleton, sem `:id` na URL
// (GET/PATCH /api/json/settings sempre operam sobre a única linha).
// ---------------------------------------------------------------------------

async function jsonApiGetSingleton(path: string) {
  const json = await authedRequest(`/api/json/${path}`)
  return deserialize(json.data)
}

async function jsonApiUpdateSingleton(
  path: string,
  type: string,
  id: string,
  attributes: Record<string, any>,
) {
  const json = await authedRequest(`/api/json/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type, id, attributes: cleanAttributes(attributes) } }),
  })
  return deserialize(json.data)
}

export const getSettings = createServerFn({ method: 'GET' }).handler(() =>
  jsonApiGetSingleton('settings'),
)
export const updateSettings = createServerFn({ method: 'POST' })
  .validator((data: { id: string; attributes: Record<string, any> }) => data)
  .handler(({ data }) => jsonApiUpdateSingleton('settings', 'studio_settings', data.id, data.attributes))

export const SettingsApi = { get: getSettings, update: wrapInput(updateSettings) }

// ---------------------------------------------------------------------------
// Conexão WhatsApp da empresa (WAHA) — status da sessão, QR code para
// (re)parear e logout. Rotas de generic action (sem :id, sem type), por isso
// não usam jsonApi{List,Create,Update,Action} — chamam authedRequest direto.
// ---------------------------------------------------------------------------

export const getWhatsAppConnectionStatus = createServerFn({ method: 'GET' }).handler(() =>
  authedRequest('/api/json/whatsapp_connection/status'),
)
export const getWhatsAppConnectionQrCode = createServerFn({ method: 'GET' }).handler(() =>
  authedRequest('/api/json/whatsapp_connection/qr_code'),
)
export const logoutWhatsAppConnection = createServerFn({ method: 'POST' }).handler(() =>
  authedRequest('/api/json/whatsapp_connection/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  }),
)

export const WhatsAppConnectionApi = {
  status: getWhatsAppConnectionStatus,
  qrCode: getWhatsAppConnectionQrCode,
  logout: logoutWhatsAppConnection,
}
