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

IO.puts("\nDev seed concluído. Senha de todos os usuários: #{password}")
