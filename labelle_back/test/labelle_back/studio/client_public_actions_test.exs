defmodule LabelleBack.Studio.ClientPublicActionsTest do
  @moduledoc """
  Cobre as actions de domínio que atendem os endpoints públicos do app da
  cliente (antes espalhadas no ClientController): upsert de cliente,
  lookup por telefone, agendamentos por telefone e cálculo de slots.
  """
  use LabelleBack.DataCase, async: true

  alias LabelleBack.Studio
  alias LabelleBack.Studio.Changes.NormalizePhone
  alias LabelleBack.Studio.{Appointment, Client, Professional, Service}

  defp create_professional!(attrs \\ %{}) do
    defaults = %{name: "Pro Teste", phone: "11999990000"}

    Professional
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  defp create_service! do
    Service
    |> Ash.Changeset.for_create(
      :create,
      %{name: "Corte", category: :cabelo, price: Decimal.new("100"), duration_minutes: 60},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_appointment!(professional, service, attrs) do
    defaults = %{
      client_name: "Cliente Teste",
      professional_id: professional.id,
      service_id: service.id,
      date: Date.utc_today(),
      time: ~T[10:00:00]
    }

    Appointment
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  describe "upsert_client_from_booking" do
    test "cria cliente novo com origem app_cliente e telefone normalizado com 55" do
      client = Studio.upsert_client_from_booking!("  Maria Silva  ", "(11) 98888-7777", authorize?: false)

      assert client.name == "Maria Silva"
      assert client.source == :app_cliente
      assert client.phone_normalized == "5511988887777"
      assert client.visit_count == 0
      assert client.first_appointment_date == Date.utc_today()
      assert client.last_appointment_date == Date.utc_today()
    end

    test "segunda vez com o mesmo telefone (outra máscara) atualiza e incrementa visita" do
      first = Studio.upsert_client_from_booking!("Maria", "11988887777", authorize?: false)
      second = Studio.upsert_client_from_booking!("Maria S.", "55 11 98888-7777", authorize?: false)

      assert second.id == first.id
      assert second.name == "Maria S."
      assert second.visit_count == 1
      assert second.last_appointment_date == Date.utc_today()
    end
  end

  describe "get_client_by_phone_normalized" do
    test "encontra pela identidade normalizada; retorna nil para desconhecido" do
      client =
        Client
        |> Ash.Changeset.for_create(:create, %{name: "Ana", phone: "11977776666"}, authorize?: false)
        |> Ash.create!()

      assert client.phone_normalized == "5511977776666"

      assert {:ok, found} =
               Studio.get_client_by_phone_normalized("5511977776666", authorize?: false)

      assert found.id == client.id

      assert {:ok, nil} =
               Studio.get_client_by_phone_normalized("5511900001111", authorize?: false)
    end

    test "NormalizePhone.normalize/1 cobre máscara e prefixo 55" do
      assert NormalizePhone.normalize("(11) 97777-6666") == "5511977776666"
      assert NormalizePhone.normalize("5511977776666") == "5511977776666"
      assert NormalizePhone.normalize("11977776666") == "5511977776666"
      assert NormalizePhone.normalize("") == ""
    end
  end

  describe "list_appointments_by_client_phone" do
    test "lista só os agendamentos daquele telefone, mesmo com máscara gravada" do
      professional = create_professional!()
      service = create_service!()

      older =
        create_appointment!(professional, service, %{
          client_phone: "(11) 98888-7777",
          date: Date.add(Date.utc_today(), -3)
        })

      newer =
        create_appointment!(professional, service, %{
          client_phone: "5511988887777",
          date: Date.utc_today()
        })

      create_appointment!(professional, service, %{client_phone: "11900000000"})

      results = Studio.list_appointments_by_client_phone!("11 98888-7777", authorize?: false)

      assert Enum.map(results, & &1.id) == [newer.id, older.id]
    end
  end

  describe "available_slots" do
    test "grade de 30min descontando agendamentos, com expediente da profissional" do
      professional =
        create_professional!(%{work_start: ~T[09:00:00], work_end: ~T[12:00:00]})

      service = create_service!()

      create_appointment!(professional, service, %{
        date: ~D[2026-08-10],
        time: ~T[10:00:00],
        duration_minutes: 60
      })

      # agendamento cancelado não bloqueia o horário
      cancelled =
        create_appointment!(professional, service, %{
          date: ~D[2026-08-10],
          time: ~T[11:00:00]
        })

      cancelled
      |> Ash.Changeset.for_update(:cancel, %{}, authorize?: false)
      |> Ash.update!()

      slots = Studio.available_slots!(professional.id, ~D[2026-08-10], authorize?: false)

      assert slots == ["09:00", "11:00"]
    end

    test "respeita duração e expediente passados explicitamente" do
      professional = create_professional!()

      slots =
        Studio.available_slots!(
          professional.id,
          ~D[2026-08-10],
          %{duration_minutes: 90, work_start: "09:00", work_end: "12:00"},
          authorize?: false
        )

      assert slots == ["09:00", "09:30", "10:00", "10:30"]
    end
  end
end
