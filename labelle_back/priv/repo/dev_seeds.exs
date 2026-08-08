# Seed de DESENVOLVIMENTO — popula o banco com dados fictícios para
# trabalhar no design do front. Rode com:
#
#     mix run priv/repo/dev_seeds.exs
#
# Seguro para re-rodar: usuários/clientes são pulados se já existirem e os
# agendamentos só são criados uma vez (sentinela "[dev-seed]" nas notas).

require Ash.Query

alias LabelleBack.Accounts
alias LabelleBack.Studio

password = "labelle123456"

# ---------------------------------------------------------------------------
# Usuários (admin já vem do seeds.exs; aqui: cliente + mais uma profissional)
# ---------------------------------------------------------------------------

create_user = fn email, role ->
  case Accounts.User |> Ash.Query.filter(email == ^email) |> Ash.read_one!(authorize?: false) do
    nil ->
      user =
        Accounts.User
        |> Ash.Changeset.for_create(:register_with_password, %{
          email: email,
          password: password,
          password_confirmation: password
        })
        |> Ash.create!(authorize?: false)
        |> Ash.Changeset.for_update(:update, %{role: role})
        |> Ash.Changeset.force_change_attribute(:confirmed_at, DateTime.utc_now())
        |> Ash.update!(authorize?: false)

      IO.puts("Criado usuário #{role}: #{email}")
      user

    user ->
      IO.puts("Usuário #{email} já existe, pulando.")
      user
  end
end

create_user.("maria@exemplo.com", :user)
beatriz_user = create_user.("beatriz@labelle.studio", :profissional)

case Studio.Professional
     |> Ash.Query.filter(user_id == ^beatriz_user.id)
     |> Ash.read_one!(authorize?: false) do
  nil ->
    Studio.Professional
    |> Ash.Changeset.for_create(
      :create,
      %{
        user_id: beatriz_user.id,
        name: "Beatriz Ramos",
        phone: "11988883333",
        type: :comissao,
        commission_percent: 40,
        color: "#7EC8A9",
        is_active: true,
        work_days: [1, 2, 3, 4, 5, 6],
        work_start: ~T[09:00:00],
        work_end: ~T[18:00:00]
      },
      authorize?: false
    )
    |> Ash.create!()

    IO.puts("Criada profissional: Beatriz Ramos")

  _professional ->
    IO.puts("Profissional da Beatriz já existe, pulando.")
end

# ---------------------------------------------------------------------------
# Clientes (upsert pelo telefone normalizado)
# ---------------------------------------------------------------------------

clients_data = [
  {"Maria Fernanda Lima", "11997770001"},
  {"Ana Beatriz Costa", "11997770002"},
  {"Juliana Paes", "11997770003"},
  {"Roberta Almeida", "11997770004"},
  {"Fernanda Torres", "11997770005"},
  {"Patrícia Mendes", "11997770006"}
]

clients =
  Enum.map(clients_data, fn {name, phone} ->
    {:ok, client} = Studio.upsert_client_from_booking(name, phone, authorize?: false)
    IO.puts("Cliente: #{client.name}")
    client
  end)

# ---------------------------------------------------------------------------
# Agendamentos (passado finalizado vira transação; hoje e futuro em aberto)
# ---------------------------------------------------------------------------

already_seeded =
  Studio.Appointment
  |> Ash.Query.filter(notes == "[dev-seed]")
  |> Ash.read!(authorize?: false)
  |> Enum.any?()

if already_seeded do
  IO.puts("Agendamentos dev-seed já existem, pulando.")
else
  professionals = Studio.Professional |> Ash.read!(authorize?: false)
  services = Studio.Service |> Ash.read!(authorize?: false)

  today = Date.utc_today()

  create_appointment = fn attrs ->
    Studio.Appointment
    |> Ash.Changeset.for_create(
      :create,
      Map.merge(%{notes: "[dev-seed]", source: :manual}, attrs),
      authorize?: false
    )
    |> Ash.create!()
  end

  finalize = fn appointment, payment_method ->
    appointment
    |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
    |> Ash.update!()
    |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
    |> Ash.update!()
    |> Ash.Changeset.for_update(:finalize, %{payment_method: payment_method}, authorize?: false)
    |> Ash.update!()
  end

  times = [~T[09:00:00], ~T[10:30:00], ~T[13:00:00], ~T[14:30:00], ~T[16:00:00], ~T[17:30:00]]
  payment_methods = [:pix, :dinheiro, :debito, :credito]

  # 12 atendimentos finalizados nos últimos 14 dias (geram transações pagas)
  for i <- 1..12 do
    date = Date.add(today, -i)
    client = Enum.at(clients, rem(i, length(clients)))
    professional = Enum.at(professionals, rem(i, length(professionals)))
    service = Enum.at(services, rem(i, length(services)))

    %{
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      professional_id: professional.id,
      service_id: service.id,
      date: date,
      time: Enum.at(times, rem(i, length(times)))
    }
    |> create_appointment.()
    |> finalize.(Enum.at(payment_methods, rem(i, length(payment_methods))))
  end

  IO.puts("Criados 12 atendimentos finalizados (com transações).")

  # 1 cancelado recente
  client = Enum.at(clients, 2)

  %{
    client_id: client.id,
    client_name: client.name,
    client_phone: client.phone,
    professional_id: hd(professionals).id,
    service_id: hd(services).id,
    date: Date.add(today, -2),
    time: ~T[15:00:00]
  }
  |> create_appointment.()
  |> Ash.Changeset.for_update(:cancel, %{}, authorize?: false)
  |> Ash.update!()

  # Hoje: um em atendimento, um confirmado, dois agendados
  [
    {:em_atendimento, 0, 0, ~T[09:00:00]},
    {:confirmado, 1, 1, ~T[11:00:00]},
    {:agendado, 2, 2, ~T[14:00:00]},
    {:agendado, 3, 1, ~T[16:30:00]}
  ]
  |> Enum.each(fn {status, client_idx, prof_idx, time} ->
    client = Enum.at(clients, client_idx)
    professional = Enum.at(professionals, prof_idx)
    service = Enum.at(services, client_idx)

    appointment =
      create_appointment.(%{
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        professional_id: professional.id,
        service_id: service.id,
        date: today,
        time: time
      })

    case status do
      :agendado ->
        :ok

      :confirmado ->
        appointment
        |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
        |> Ash.update!()

      :em_atendimento ->
        appointment
        |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
        |> Ash.update!()
    end
  end)

  IO.puts("Criados 4 agendamentos para hoje.")

  # Próximos dias
  for i <- 1..5 do
    client = Enum.at(clients, rem(i + 1, length(clients)))
    professional = Enum.at(professionals, rem(i, length(professionals)))
    service = Enum.at(services, rem(i + 3, length(services)))

    appointment =
      create_appointment.(%{
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        professional_id: professional.id,
        service_id: service.id,
        date: Date.add(today, i),
        time: Enum.at(times, rem(i + 2, length(times))),
        source: if(i == 2, do: :online, else: :manual)
      })

    if rem(i, 2) == 0 do
      appointment
      |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
      |> Ash.update!()
    end
  end

  IO.puts("Criados 5 agendamentos futuros.")
end

# ---------------------------------------------------------------------------
# Catálogo real de serviços (espelho da produção) + vínculos com profissionais
# ---------------------------------------------------------------------------

real_catalog = [
  %{name: "Adicional", category: :cabelo, price: 10, duration_minutes: 60, commission_percent: 0, is_active: true},
  %{name: "Adicional escova modelada", category: :cabelo, price: 20, duration_minutes: 20, commission_percent: 40, is_active: true},
  %{name: "Adicional química", category: :cabelo, price: 10, duration_minutes: 60, commission_percent: 30, is_active: true},
  %{name: "Aplicação de tinta (cliente)", category: :cabelo, price: 60, duration_minutes: 90, commission_percent: 40, is_active: true},
  %{name: "Botox P", category: :cabelo, price: 150, duration_minutes: 60, commission_percent: 30, is_active: true},
  %{name: "Coloração cabelo curto", category: :cabelo, price: 120, duration_minutes: 120, commission_percent: 30, is_active: true},
  %{name: "Corte Feminino", category: :cabelo, price: 100, duration_minutes: 60, commission_percent: 40, is_active: true},
  %{name: "Corte Masculino", category: :cabelo, price: 50, duration_minutes: 30, commission_percent: 40, is_active: false},
  %{name: "Escova G", category: :cabelo, price: 60, duration_minutes: 40, commission_percent: 40, is_active: true},
  %{name: "Escova M", category: :cabelo, price: 50, duration_minutes: 30, commission_percent: 40, is_active: true},
  %{name: "Escova P", category: :cabelo, price: 45, duration_minutes: 30, commission_percent: 40, is_active: true},
  %{name: "Mechas Cabelo Curto", category: :cabelo, price: 400, duration_minutes: 180, commission_percent: 30, is_active: true},
  %{name: "Penteado", category: :cabelo, price: 120, duration_minutes: 40, commission_percent: 40, is_active: true},
  %{name: "Reconstrução Joico - Cabelos Curtos", category: :cabelo, price: 200, duration_minutes: 120, commission_percent: 30, is_active: true},
  %{name: "Reconstrução Truss com molecular", category: :cabelo, price: 150, duration_minutes: 120, commission_percent: 30, is_active: true},
  %{name: "Reconstrução Wella - Cabelos Curtos", category: :cabelo, price: 120, duration_minutes: 60, commission_percent: 30, is_active: true},
  %{name: "Selagem P", category: :cabelo, price: 200, duration_minutes: 60, commission_percent: 30, is_active: true},
  %{name: "Limpeza de Pele", category: :estetica, price: 90, duration_minutes: 60, commission_percent: 40, is_active: false},
  %{name: "Maquiagem Básica", category: :maquiagem, price: 120, duration_minutes: 40, commission_percent: 100, is_active: true},
  %{name: "Maquiagem para Noivas", category: :maquiagem, price: 350, duration_minutes: 90, commission_percent: 100, is_active: true},
  %{name: "Maquiagem Social", category: :maquiagem, price: 150, duration_minutes: 60, commission_percent: 100, is_active: true},
  %{name: "Adicional Sobrancelha", category: :sobrancelha, price: 10, duration_minutes: 30, commission_percent: 40, is_active: true},
  %{name: "Design de Sobrancelha", category: :sobrancelha, price: 40, duration_minutes: 20, commission_percent: 40, is_active: true},
  %{name: "Adicional Francesinha", category: :unha, price: 5, duration_minutes: 10, commission_percent: 40, is_active: true},
  %{name: "Adicional francesinha permanente", category: :unha, price: 10, duration_minutes: 10, commission_percent: 40, is_active: true},
  %{name: "Adicional Molde F1", category: :unha, price: 20, duration_minutes: 30, commission_percent: 40, is_active: true},
  %{name: "Apenas esmaltação mão", category: :unha, price: 20, duration_minutes: 15, commission_percent: 40, is_active: true},
  %{name: "Apenas esmaltação pé", category: :unha, price: 20, duration_minutes: 15, commission_percent: 40, is_active: true},
  %{name: "Apenas esmaltação pé e mão", category: :unha, price: 30, duration_minutes: 20, commission_percent: 40, is_active: true},
  %{name: "Banho com francesinha ou baby boomer", category: :unha, price: 120, duration_minutes: 120, commission_percent: 40, is_active: true},
  %{name: "Banho de gel clássico", category: :unha, price: 80, duration_minutes: 90, commission_percent: 40, is_active: true},
  %{name: "Banho de gel com esmaltação permanente", category: :unha, price: 120, duration_minutes: 120, commission_percent: 40, is_active: true},
  %{name: "Blindagem em gel", category: :unha, price: 100, duration_minutes: 60, commission_percent: 40, is_active: true},
  %{name: "Esmaltação permanente mão e pé", category: :unha, price: 100, duration_minutes: 120, commission_percent: 40, is_active: true},
  %{name: "Esmaltação permanente + pedicure", category: :unha, price: 80, duration_minutes: 90, commission_percent: 40, is_active: true},
  %{name: "Manicure", category: :unha, price: 30, duration_minutes: 30, commission_percent: 40, is_active: true},
  %{name: "Pedicure", category: :unha, price: 30, duration_minutes: 30, commission_percent: 40, is_active: true},
  %{name: "Pé e Mão", category: :unha, price: 45, duration_minutes: 60, commission_percent: 40, is_active: true},
  %{name: "Plástica dos pés", category: :unha, price: 70, duration_minutes: 30, commission_percent: 40, is_active: true},
  %{name: "Remoção de alongamento", category: :unha, price: 50, duration_minutes: 60, commission_percent: 40, is_active: true},
  %{name: "Unhas em Gel - Aplicação", category: :unha, price: 120, duration_minutes: 60, commission_percent: 40, is_active: true},
  %{name: "Unhas em Gel - Manutenção", category: :unha, price: 90, duration_minutes: 60, commission_percent: 40, is_active: true}
]

catalog_names = Enum.map(real_catalog, & &1.name)

services_by_name =
  Map.new(real_catalog, fn attrs ->
    service =
      case Studio.Service
           |> Ash.Query.filter(name == ^attrs.name)
           |> Ash.read_one!(authorize?: false) do
        nil ->
          Studio.Service
          |> Ash.Changeset.for_create(:create, attrs, authorize?: false)
          |> Ash.create!()

        existing ->
          existing
          |> Ash.Changeset.for_update(:update, attrs, authorize?: false)
          |> Ash.update!()
      end

    {service.name, service}
  end)

IO.puts("Catálogo real sincronizado: #{map_size(services_by_name)} serviços.")

# Serviços que só existem no dev (não constam no catálogo real) ficam inativos
Studio.Service
|> Ash.read!(authorize?: false)
|> Enum.reject(&(&1.name in catalog_names))
|> Enum.each(fn service ->
  if service.is_active do
    service
    |> Ash.Changeset.for_update(:update, %{is_active: false}, authorize?: false)
    |> Ash.update!()

    IO.puts("Serviço fora do catálogo real desativado: #{service.name}")
  end
end)

# Vínculos profissional ↔ serviço por especialidade (mesmo recorte da produção:
# unha / unha+sobrancelha / cabelo+sobrancelha+maquiagem)
assignments = [
  {"Joana Silva", [:unha]},
  {"Camila Souza", [:unha, :sobrancelha]},
  {"Beatriz Ramos", [:cabelo, :sobrancelha, :maquiagem]}
]

Enum.each(assignments, fn {professional_name, categories} ->
  professional =
    Studio.Professional
    |> Ash.Query.filter(name == ^professional_name)
    |> Ash.read_one!(authorize?: false)

  services =
    real_catalog
    |> Enum.filter(&(&1.category in categories and &1.is_active))
    |> Enum.map(&services_by_name[&1.name])

  existing =
    Studio.ProfessionalService
    |> Ash.Query.filter(professional_id == ^professional.id)
    |> Ash.read!(authorize?: false)
    |> MapSet.new(& &1.service_id)

  Enum.each(services, fn service ->
    unless MapSet.member?(existing, service.id) do
      Studio.ProfessionalService
      |> Ash.Changeset.for_create(
        :create,
        %{professional_id: professional.id, service_id: service.id},
        authorize?: false
      )
      |> Ash.create!()
    end
  end)

  IO.puts("#{professional_name}: #{length(services)} serviços vinculados.")
end)

IO.puts("\nDev seed concluído. Senha de todos os usuários: #{password}")
