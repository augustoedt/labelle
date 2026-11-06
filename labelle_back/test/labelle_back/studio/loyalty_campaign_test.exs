defmodule LabelleBack.Studio.LoyaltyCampaignTest do
  use LabelleBack.DataCase, async: false
  alias LabelleBack.Studio.{Appointment, Client, Professional, Service, Transaction, Payment}
  alias LabelleBack.Studio.Loyalty.{Campaign, Reconcile}

  setup do
    client = create(Client, %{name: "Cliente", phone: "11977776666"})
    professional = create(Professional, %{name: "Pro", phone: "11999998888"})

    service =
      create(Service, %{name: "Corte", category: :cabelo, price: 100, duration_minutes: 30})

    %{client: client, professional: professional, service: service}
  end

  defp create(resource, attrs),
    do: resource |> Ash.Changeset.for_create(:create, attrs, authorize?: false) |> Ash.create!()

  defp change(record, action, attrs),
    do: record |> Ash.Changeset.for_update(action, attrs, authorize?: false) |> Ash.update!()

  defp points(ctx), do: Ash.get!(Client, ctx.client.id, authorize?: false).loyalty_points

  defp completed(ctx, date, attrs \\ %{}) do
    create(Appointment, %{
      client_id: ctx.client.id,
      client_name: "Cliente",
      professional_id: ctx.professional.id,
      service_id: ctx.service.id,
      date: date,
      time: ~T[10:00:00]
    })
    |> change(:start, %{})
    |> change(:finalize, Map.merge(%{payment_method: :pix}, attrs))
  end

  defp transaction(a) do
    require Ash.Query
    Transaction |> Ash.Query.filter(appointment_id == ^a.id) |> Ash.read_one!(authorize?: false)
  end

  test "finalize updates immediately; replay does not duplicate points or audit", ctx do
    completed(ctx, ~D[2026-10-01], %{tip_input: 25})
    assert points(ctx) == 150
    [[before]] = Repo.query!("select count(*) from loyalty_point_audits").rows
    assert {:ok, 0} = Campaign.refresh(~D[2026-11-06])
    assert :ok = Reconcile.perform(%Oban.Job{})
    assert points(ctx) == 150
    assert Repo.query!("select count(*) from loyalty_point_audits").rows == [[before]]
  end

  test "one visit per day and one bonus per month, across multiple services", ctx do
    completed(ctx, ~D[2026-10-01])
    completed(ctx, ~D[2026-10-01])
    completed(ctx, ~D[2026-10-02])
    completed(ctx, ~D[2026-10-03])
    assert points(ctx) == 650
    completed(ctx, ~D[2026-10-04])
    assert points(ctx) == 800
  end

  test "partial payment credits only receipts and later payment updates automatically", ctx do
    a = completed(ctx, ~D[2026-10-01], %{payment_status: :pagamento_parcial, amount_paid: 25})
    assert points(ctx) == 75
    t = transaction(a)

    attrs = %{
      receipts: [%{"amount" => "75", "payment_method" => "pix"}],
      reference: Ash.UUID.generate(),
      payment_date: ~D[2026-11-06]
    }

    change(t, :record_payment, attrs)
    assert points(ctx) == 150
    change(t, :record_payment, attrs)
    assert points(ctx) == 150
  end

  test "refund, courtesy and pending do not give spending points; visits remain", ctx do
    a = completed(ctx, ~D[2026-10-01])
    change(transaction(a), :update, %{status: :estornado})
    assert points(ctx) == 50
    completed(ctx, ~D[2026-10-01], %{payment_status: :pendente_confirmacao, payment_method: nil})
    assert points(ctx) == 50
    a = completed(ctx, ~D[2026-10-01])
    change(transaction(a), :update, %{payment_method: :cortesia})
    assert points(ctx) == 50
  end

  test "receipt refund overrides legacy paid status and voucher is excluded", ctx do
    a = completed(ctx, ~D[2026-10-01])
    t = transaction(a)

    p =
      create(Payment, %{
        transaction_id: t.id,
        appointment_id: a.id,
        payment_date: ~D[2026-10-01],
        payment_method: :pix,
        amount: 100
      })

    assert points(ctx) == 150
    change(p, :update, %{status: :estornado})
    assert points(ctx) == 50
    change(p, :update, %{status: :confirmado, payment_method: :voucher})
    assert points(ctx) == 50
  end

  test "campaign boundaries, accumulated fractions and no premature points", ctx do
    completed(ctx, ~D[2026-09-30])
    assert points(ctx) == 0
    a = completed(ctx, ~D[2026-10-01])
    change(transaction(a), :update, %{amount: Decimal.new("20.75")})
    b = completed(ctx, ~D[2026-10-01])
    change(transaction(b), :update, %{amount: Decimal.new("10.75")})
    assert points(ctx) == 81
    assert {:ok, _} = Campaign.refresh(~D[2026-09-30])
    assert points(ctx) == 0
    assert {:ok, _} = Campaign.refresh(~D[2027-01-20])
    assert points(ctx) == 81
  end

  test "additional services update spending without extra visit bonus", ctx do
    a = completed(ctx, ~D[2026-10-01])

    create(LabelleBack.Studio.ProfessionalService, %{
      professional_id: ctx.professional.id,
      service_id: ctx.service.id
    })

    item =
      create(LabelleBack.Studio.AppointmentService, %{
        appointment_id: a.id,
        professional_id: ctx.professional.id,
        service_id: ctx.service.id
      })

    assert points(ctx) == 250
    change(item, :edit_financial, %{price: 50, edit_comment: "Correção"})
    assert points(ctx) == 200
  end

  test "December 31 counts, January visits and January payments do not", ctx do
    a = completed(ctx, ~D[2026-12-31])
    completed(ctx, ~D[2027-01-01])
    assert {:ok, _} = Campaign.refresh(~D[2027-01-20])
    assert points(ctx) == 150
    t = transaction(a)

    create(Payment, %{
      transaction_id: t.id,
      appointment_id: a.id,
      payment_date: ~D[2027-01-01],
      payment_method: :pix,
      amount: 100
    })

    assert {:ok, _} = Campaign.refresh(~D[2027-01-20])
    assert points(ctx) == 50
  end

  test "customer statistics use lifetime days and actual receipts, not stale stored values",
       ctx do
    a = completed(ctx, ~D[2026-09-30], %{tip_input: 20})
    completed(ctx, ~D[2026-09-30])
    completed(ctx, ~D[2026-10-01], %{payment_status: :pagamento_parcial, amount_paid: 25})
    completed(ctx, ~D[2026-10-02], %{payment_status: :pendente_confirmacao, payment_method: nil})
    completed(ctx, ~D[2027-01-01])
    other = create(Client, %{name: "Outra", phone: "11988887777"})
    completed(%{ctx | client: other}, ~D[2026-10-01])
    change(ctx.client, :update, %{total_spent: 9999})
    stats = LabelleBack.Studio.ClientStatistics.for_client(ctx.client.id, ~D[2026-11-06])
    assert stats.visit_count == 3
    assert Decimal.equal?(stats.total_spent, 225)
    change(transaction(a), :update, %{status: :estornado})
    stats = LabelleBack.Studio.ClientStatistics.for_client(ctx.client.id, ~D[2026-11-06])
    assert stats.visit_count == 3
    assert Decimal.equal?(stats.total_spent, 125)

    conn =
      Phoenix.ConnTest.build_conn()
      |> Plug.Conn.put_req_header("content-type", "application/json")

    conn =
      Phoenix.ConnTest.dispatch(
        conn,
        LabelleBackWeb.Endpoint,
        :post,
        "/api/client/loyalty",
        Jason.encode!(%{phone: ctx.client.phone})
      )

    response = Jason.decode!(conn.resp_body)["client"]
    assert response["visit_count"] == 3
    assert response["total_spent"] == 125
  end

  test "customer with no completed history sees zero totals", ctx do
    assert %{visit_count: 0, total_spent: spent} =
             LabelleBack.Studio.ClientStatistics.for_client(ctx.client.id)

    assert Decimal.equal?(spent, 0)
  end
end
