export const ADMIN_HOME = '/admin' as const
export const PROFESSIONAL_HOME = '/profissional/agenda' as const

const adminSections = new Set(['agenda', 'clientes', 'servicos', 'produtos', 'profissionais', 'financeiro', 'relatorios', 'promocoes', 'fidelidade', 'lembretes', 'configuracoes', 'mais'])
const professionalSections = new Set(['agenda', 'clientes', 'servicos', 'comissoes', 'promocoes', 'mais'])

export function roleHome(role?: string) {
  return role === 'admin' ? ADMIN_HOME : role === 'profissional' ? PROFESSIONAL_HOME : '/'
}

/** Accept only local known staff destinations; never return a protocol/host URL. */
export function safeStaffReturnTo(value: unknown, role: string): string | undefined {
  if (!['admin', 'profissional'].includes(role)) return
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return
  let url: URL
  try { url = new URL(value, 'https://local.invalid') } catch { return }
  if (url.origin !== 'https://local.invalid') return
  const parts = url.pathname.split('/').filter(Boolean)
  const namespace = role === 'admin' ? 'admin' : 'profissional'
  const allowed = role === 'admin' ? adminSections : professionalSections
  const aliases: Record<string, string> = role === 'admin'
    ? Object.fromEntries([...adminSections].map(section => [section, section]))
    : { 'minha-agenda': 'agenda', 'minhas-comissoes': 'comissoes', clientes: 'clientes', servicos: 'servicos', promocoes: 'promocoes', mais: 'mais' }
  const legacySection = parts.length === 1 ? aliases[parts[0]] : undefined
  const section = legacySection || (parts.length === 2 && parts[0] === namespace ? parts[1] : undefined)
  const home = role === 'admin' && parts.length === 1 && parts[0] === namespace
  if (!home && (!section || !allowed.has(section))) return
  const path = legacySection ? `/${namespace}/${legacySection}` : url.pathname
  const search = validateStaffSearch(Object.fromEntries(url.searchParams))
  if (section === 'clientes') delete search.q
  const params = new URLSearchParams()
  for (const [key, val] of Object.entries(search)) params.set(key, String(val))
  return `${path}${params.size ? `?${params}` : ''}`
}

export function validateStaffSearch(search: Record<string, unknown>) {
  const result: Record<string, string | boolean> = {}
  const add = (key: string, max = 100) => {
    const value = search[key]
    if (typeof value === 'string' && value.length <= max && !/[<>\u0000-\u001f]/.test(value)) result[key] = value
  }
  add('date', 10); add('appointment', 100); add('q', 100)
  add('client', 100); add('product', 100); add('service', 100)
  add('professional', 100); add('promotion', 100)
  if (search.view === 'new' || search.view === 'edit' || search.view === 'finalize') result.view = search.view
  if (search.period === 'dia' || search.period === 'semana' || search.period === 'mes') result.period = search.period
  if (typeof search.status === 'string' && ['pago', 'pendente_confirmacao', 'pagamento_parcial', 'cancelado', 'estornado', 'pendente', 'enviado', 'falhou', 'todos'].includes(search.status)) result.status = search.status
  if (typeof search.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(search.month)) result.month = search.month
  if (typeof search.category === 'string' && /^[a-z-]{1,40}$/.test(search.category)) result.category = search.category
  if (search.lowStock === true || search.lowStock === 'true') result.lowStock = true
  if (search.lowStock === false || search.lowStock === 'false') result.lowStock = false
  return result
}
