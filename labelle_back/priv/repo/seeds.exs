# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Safe to re-run: skips creating records that already exist.

require Ash.Query

alias LabelleBack.Accounts
alias LabelleBack.Studio

# ---------------------------------------------------------------------------
# Admin user
# ---------------------------------------------------------------------------

admin_email = (System.get_env("ADMIN_EMAIL") || "admin@labelle.studio") |> String.downcase()
admin_password = System.get_env("ADMIN_PASSWORD") || "changeme123456"

existing_admin =
  Accounts.User
  |> Ash.Query.filter(email == ^admin_email)
  |> Ash.read_one!(authorize?: false)

case existing_admin do
  nil ->
    Accounts.User
    |> Ash.Changeset.for_create(:register_with_password, %{
      email: admin_email,
      password: admin_password,
      password_confirmation: admin_password
    })
    |> Ash.create!(authorize?: false)
    |> Ash.Changeset.for_update(:update, %{role: :admin})
    |> Ash.Changeset.force_change_attribute(:confirmed_at, DateTime.utc_now())
    |> Ash.update!(authorize?: false)

    IO.puts("Seeded admin user: #{admin_email}")

  _user ->
    IO.puts("Admin user #{admin_email} already exists, skipping.")
end

# ---------------------------------------------------------------------------
# Staff (profissional users + their Professional profile)
# ---------------------------------------------------------------------------

staff_password = System.get_env("STAFF_PASSWORD") || "changeme123456"

seed_staff = fn attrs ->
  user =
    case Accounts.User |> Ash.Query.filter(email == ^attrs.email) |> Ash.read_one!(authorize?: false) do
      nil ->
        Accounts.User
        |> Ash.Changeset.for_create(:register_with_password, %{
          email: attrs.email,
          password: staff_password,
          password_confirmation: staff_password
        })
        |> Ash.create!(authorize?: false)
        |> Ash.Changeset.for_update(:update, %{role: :profissional})
        |> Ash.Changeset.force_change_attribute(:confirmed_at, DateTime.utc_now())
        |> Ash.update!(authorize?: false)

      user ->
        user
    end

  case Studio.Professional |> Ash.Query.filter(user_id == ^user.id) |> Ash.read_one!(authorize?: false) do
    nil ->
      Studio.Professional
      |> Ash.Changeset.for_create(
        :create,
        Map.put(attrs.professional, :user_id, user.id),
        authorize?: false
      )
      |> Ash.create!()

      IO.puts("Seeded staff: #{attrs.email} (#{attrs.professional.name})")

    _professional ->
      IO.puts("Professional for #{attrs.email} already exists, skipping.")
  end
end

seed_staff.(%{
  email: "joana@labelle.studio",
  professional: %{
    name: "Joana Silva",
    phone: "11988881111",
    type: :comissao,
    commission_percent: 45,
    color: "#F28FA3",
    is_active: true,
    work_days: [1, 2, 3, 4, 5, 6],
    work_start: ~T[09:00:00],
    work_end: ~T[18:00:00]
  }
})

seed_staff.(%{
  email: "camila@labelle.studio",
  professional: %{
    name: "Camila Souza",
    phone: "11988882222",
    type: :comissao,
    commission_percent: 40,
    color: "#9B7EDE",
    is_active: true,
    work_days: [2, 3, 4, 5, 6],
    work_start: ~T[10:00:00],
    work_end: ~T[19:00:00]
  }
})

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

seed_service = fn attrs ->
  case Studio.Service |> Ash.Query.filter(name == ^attrs.name) |> Ash.read_one!(authorize?: false) do
    nil ->
      Studio.Service
      |> Ash.Changeset.for_create(:create, attrs, authorize?: false)
      |> Ash.create!()

      IO.puts("Seeded service: #{attrs.name}")

    _service ->
      IO.puts("Service #{attrs.name} already exists, skipping.")
  end
end

[
  %{name: "Corte Feminino", category: :cabelo, price: 80, duration_minutes: 60, commission_percent: 40},
  %{name: "Corte Masculino", category: :cabelo, price: 50, duration_minutes: 30, commission_percent: 40},
  %{name: "Escova / Penteado", category: :cabelo, price: 60, duration_minutes: 45, commission_percent: 40},
  %{name: "Coloração", category: :cabelo, price: 150, duration_minutes: 120, commission_percent: 35},
  %{name: "Manicure", category: :unha, price: 35, duration_minutes: 45, commission_percent: 50},
  %{name: "Pedicure", category: :unha, price: 40, duration_minutes: 50, commission_percent: 50},
  %{name: "Design de Sobrancelha", category: :sobrancelha, price: 25, duration_minutes: 30, commission_percent: 50},
  %{name: "Limpeza de Pele", category: :estetica, price: 90, duration_minutes: 60, commission_percent: 40},
  %{name: "Maquiagem Social", category: :maquiagem, price: 100, duration_minutes: 60, commission_percent: 40}
]
|> Enum.each(seed_service)
