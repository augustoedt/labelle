defmodule LabelleBack.Studio.AutomaticRemindersTest do
  use LabelleBack.DataCase, async: false
  require Ash.Query
  alias LabelleBack.Studio.{Appointment, Client, ClientReminder, Professional, Service, Settings}

  alias LabelleBack.Studio.Reminders.{
    AppointmentReminder,
    ScheduleAppointments,
    GenerateDue,
    DeliverPending
  }

  defmodule Adapter do
    def configured?, do: true

    def send_message(phone, message) do
      send(self(), {:sent, phone, message})
      {:ok, "fake-id"}
    end
  end

  defmodule FailedAdapter do
    def configured?, do: true
    def send_message(_, _), do: {:error, :offline}
  end

  setup do
    previous = Application.get_env(:labelle_back, :whatsapp_adapter)
    Application.put_env(:labelle_back, :whatsapp_adapter, Adapter)
    on_exit(fn -> Application.put_env(:labelle_back, :whatsapp_adapter, previous) end)

    Settings
    |> Ash.Changeset.for_create(
      :create,
      %{
        name: "Teste",
        whatsapp_phone: "11999990000",
        message_confirmation: "Confirmação",
        message_reminder: "Lembrete {{cliente}} {{hora}}",
        message_thank_you: "Obrigada {{cliente}}",
        message_reengagement: "Volte {{cliente}}",
        message_new_booking_notification: "Nova reserva"
      },
      authorize?: false
    )
    |> Ash.create!()

    client =
      Client
      |> Ash.Changeset.for_create(:create, %{name: "Teste", phone: "11988887777"},
        authorize?: false
      )
      |> Ash.create!()

    professional =
      Professional
      |> Ash.Changeset.for_create(:create, %{name: "Teste", phone: "11999990000"},
        authorize?: false
      )
      |> Ash.create!()

    service =
      Service
      |> Ash.Changeset.for_create(
        :create,
        %{name: "Teste", category: :cabelo, price: 50, duration_minutes: 30},
        authorize?: false
      )
      |> Ash.create!()

    %{client: client, professional: professional, service: service}
  end

  defp appointment(ctx, date, time \\ ~T[14:00:00]) do
    Appointment
    |> Ash.Changeset.for_create(
      :create,
      %{
        client_id: ctx.client.id,
        client_name: ctx.client.name,
        professional_id: ctx.professional.id,
        service_id: ctx.service.id,
        date: date,
        time: time
      },
      authorize?: false
    )
    |> Ash.create!()
  end

  defp completed(ctx, date) do
    appointment(ctx, date)
    |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
    |> Ash.update!()
    |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, authorize?: false)
    |> Ash.update!()
  end

  defp args(a),
    do: %{
      "appointment_id" => a.id,
      "date" => Date.to_iso8601(a.date),
      "time" => Time.to_iso8601(a.time)
    }

  test "2h scheduler deduplicates repeat scans and sends the configured message", ctx do
    a = appointment(ctx, ~D[2026-11-10])
    now = ~U[2026-11-10 15:00:00Z]
    assert :ok = ScheduleAppointments.schedule(now)
    assert :ok = ScheduleAppointments.schedule(now)

    [job] =
      Repo.all(
        Ecto.Query.from(j in Oban.Job,
          where: j.worker == "LabelleBack.Studio.Reminders.AppointmentReminder"
        )
      )

    assert job.args == args(a)
    assert DateTime.compare(job.scheduled_at, now) == :eq
    job |> Ecto.Changeset.change(state: "completed") |> Repo.update!()
    assert :ok = ScheduleAppointments.schedule(now)
    assert Repo.aggregate(Oban.Job, :count) == 1
    assert {:ok, :sent} = AppointmentReminder.deliver(job.args, now)
    assert_receive {:sent, "11988887777", "Lembrete Teste 14:00"}
  end

  test "scheduled_at respects UTC-3 including midnight and rejects early/old windows", ctx do
    assert AppointmentReminder.starts_at(~D[2026-11-10], ~T[00:30:00]) == ~U[2026-11-10 03:30:00Z]
    a = appointment(ctx, ~D[2026-11-10])
    assert {:snooze, 3600} = AppointmentReminder.deliver(args(a), ~U[2026-11-10 14:00:00Z])
    assert :ok = ScheduleAppointments.schedule(~U[2026-11-10 14:00:00Z])
    assert :ok = ScheduleAppointments.schedule(~U[2026-11-10 15:06:00Z])
    assert Repo.aggregate(Oban.Job, :count) == 0
    refute_receive {:sent, _, _}
  end

  test "cancelled, rescheduled and started appointments never receive stale reminders", ctx do
    a = appointment(ctx, ~D[2026-11-10])
    original = args(a)

    assert :ok =
             AppointmentReminder.deliver(
               %{original | "time" => "13:00:00"},
               ~U[2026-11-10 15:00:00Z]
             )

    changed =
      a
      |> Ash.Changeset.for_update(:update, %{time: ~T[15:00:00]}, authorize?: false)
      |> Ash.update!()

    assert :ok = AppointmentReminder.deliver(original, ~U[2026-11-10 15:00:00Z])
    started = changed |> Ash.Changeset.for_update(:start, %{}, authorize?: false) |> Ash.update!()
    assert :ok = AppointmentReminder.deliver(args(started), ~U[2026-11-10 16:00:00Z])
    started |> Ash.Changeset.for_update(:cancel, %{}, authorize?: false) |> Ash.update!()
    assert :ok = AppointmentReminder.deliver(original, ~U[2026-11-10 15:00:00Z])
    refute_receive {:sent, _, _}
  end

  test "provider failure is retryable, and no reminders are sent after service starts", ctx do
    a = appointment(ctx, ~D[2026-11-10])
    Application.put_env(:labelle_back, :whatsapp_adapter, FailedAdapter)
    assert {:error, :offline} = AppointmentReminder.deliver(args(a), ~U[2026-11-10 15:00:00Z])
    assert :ok = AppointmentReminder.deliver(args(a), ~U[2026-11-10 17:00:00Z])
    assert AppointmentReminder.valid_phone?("(11) 98888-7777")
    assert AppointmentReminder.valid_phone?("5511988887777")
    refute AppointmentReminder.valid_phone?("")
    refute AppointmentReminder.valid_phone?("123")
  end

  test "20 day thanks and 45 day reengagement are anchored to last completed visit", ctx do
    date = Date.add(AppointmentReminder.local_date(DateTime.utc_now()), -20)
    completed(ctx, date)
    assert {:ok, 0} = GenerateDue.generate(Date.add(date, 19))
    assert {:ok, 1} = GenerateDue.generate(Date.add(date, 20))
    assert {:ok, 0} = GenerateDue.generate(Date.add(date, 20))
    [thanks] = Ash.read!(ClientReminder, authorize?: false)
    assert thanks.kind == :agradecimento
    assert {:ok, 1} = GenerateDue.generate(Date.add(date, 45))
    rows = Ash.read!(ClientReminder, authorize?: false)
    assert Enum.find(rows, &(&1.id == thanks.id)).status == :cancelado
    assert Enum.any?(rows, &(&1.kind == :reengajamento and &1.status == :pendente))
    assert {:ok, 0} = GenerateDue.generate(Date.add(date, 45))
  end

  test "return booking cancels pending contacts and completed visit starts a new cycle", ctx do
    today = AppointmentReminder.local_date(DateTime.utc_now())
    completed(ctx, Date.add(today, -46))
    assert {:ok, 1} = GenerateDue.generate(today)
    appointment(ctx, Date.add(today, 1))
    assert {:ok, 0} = GenerateDue.generate(today)
    assert Enum.all?(Ash.read!(ClientReminder, authorize?: false), &(&1.status == :cancelado))
    assert {:ok, 0} = DeliverPending.run(nil, [], %{})
    refute_receive {:sent, _, _}
  end

  test "failed return contact retries on next delivery and sent contacts are not sent again",
       ctx do
    today = AppointmentReminder.local_date(DateTime.utc_now())
    completed(ctx, Date.add(today, -20))
    GenerateDue.generate(today)
    Application.put_env(:labelle_back, :whatsapp_adapter, FailedAdapter)
    assert {:ok, 0} = DeliverPending.run(nil, [], %{})
    [r] = Ash.read!(ClientReminder, authorize?: false)
    assert r.status == :falhou
    assert {:ok, 0} = GenerateDue.generate(today)
    Application.put_env(:labelle_back, :whatsapp_adapter, Adapter)
    assert {:ok, 1} = DeliverPending.run(nil, [], %{})
    assert_receive {:sent, "11988887777", "Obrigada Teste"}
    assert {:ok, 0} = DeliverPending.run(nil, [], %{})
    refute_receive {:sent, _, _}
  end

  test "a new completed visit and inactive clients suppress obsolete pending contacts", ctx do
    today = AppointmentReminder.local_date(DateTime.utc_now())
    completed(ctx, Date.add(today, -46))
    GenerateDue.generate(today)
    completed(ctx, Date.add(today, -1))
    assert {:ok, 0} = DeliverPending.run(nil, [], %{})
    assert Enum.all?(Ash.read!(ClientReminder, authorize?: false), &(&1.status == :cancelado))
    refute_receive {:sent, _, _}
  end

  test "reengagement repeats only 45 days after successful reengagement", ctx do
    today = AppointmentReminder.local_date(DateTime.utc_now())
    completed(ctx, Date.add(today, -45))
    assert {:ok, 1} = GenerateDue.generate(today)
    [reminder] = Ash.read!(ClientReminder, authorize?: false)

    reminder
    |> Ash.Changeset.for_update(:mark_sent, %{sent_at: DateTime.utc_now()}, authorize?: false)
    |> Ash.update!()

    assert {:ok, 0} = GenerateDue.generate(Date.add(today, 44))
    assert {:ok, 1} = GenerateDue.generate(Date.add(today, 45))
  end

  test "manual cancellation is respected and invalid phone numbers never create contacts", ctx do
    today = AppointmentReminder.local_date(DateTime.utc_now())
    completed(ctx, Date.add(today, -20))
    GenerateDue.generate(today)
    [reminder] = Ash.read!(ClientReminder, authorize?: false)
    reminder |> Ash.Changeset.for_update(:cancel, %{}, authorize?: false) |> Ash.update!()
    assert {:ok, 0} = GenerateDue.generate(today)

    ctx.client
    |> Ash.Changeset.for_update(:update, %{phone: "123"}, authorize?: false)
    |> Ash.update!()

    assert {:ok, 0} = GenerateDue.generate(Date.add(today, 25))
  end

  test "successful automatic sends have an auditable receipt without storing phone or message",
       ctx do
    local_start = DateTime.utc_now() |> DateTime.add(-3600, :second)

    a =
      appointment(
        ctx,
        DateTime.to_date(local_start),
        Time.truncate(DateTime.to_time(local_start), :second)
      )

    job = args(a) |> AppointmentReminder.new() |> Oban.insert!()
    assert :ok = AppointmentReminder.perform(job)
    assert_receive {:sent, _, _}
    assert %{"outcome" => "sent", "sent_at" => sent_at} = Repo.get!(Oban.Job, job.id).meta
    assert {:ok, _, _} = DateTime.from_iso8601(sent_at)
  end
end
