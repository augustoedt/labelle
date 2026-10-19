defmodule LabelleBack.Studio.Changes.RememberClientReferral do
  use Ash.Resource.Change
  alias LabelleBack.Studio.{Client, Changes.NormalizePhone}
  @impl true
  def change(changeset, _opts, context) do
    Ash.Changeset.before_action(changeset, fn cs ->
      explicit? =
        Map.has_key?(cs.params || %{}, :professional_referral) ||
          Map.has_key?(cs.params || %{}, "professional_referral")

      professional_id = Ash.Changeset.get_attribute(cs, :professional_id)
      client = client(cs)

      client =
        if is_nil(client) && explicit? && Ash.Changeset.get_attribute(cs, :professional_referral) &&
             context.actor && context.actor.role == :admin do
          phone = Ash.Changeset.get_attribute(cs, :client_phone) || ""

          if String.length(NormalizePhone.normalize(phone)) in [12, 13] do
            Client
            |> Ash.Changeset.for_create(
              :create,
              %{
                name: Ash.Changeset.get_attribute(cs, :client_name),
                phone: phone,
                source: :atendimento
              },
              authorize?: false
            )
            |> Ash.create!(
              upsert?: true,
              upsert_identity: :unique_phone_normalized,
              upsert_fields: []
            )
          end
        else
          client
        end

      cs =
        if client, do: Ash.Changeset.force_change_attribute(cs, :client_id, client.id), else: cs

      cs =
        if !explicit? &&
             (cs.action_type == :create || Ash.Changeset.changing_attribute?(cs, :professional_id)) do
          Ash.Changeset.force_change_attribute(
            cs,
            :professional_referral,
            not is_nil(client) && client.referring_professional_id == professional_id
          )
        else
          cs
        end

      persist? =
        cs.action_type == :create || Ash.Changeset.changing_attribute?(cs, :professional_referral) ||
          Ash.Changeset.changing_attribute?(cs, :professional_id)

      if explicit? && persist? && client && context.actor && context.actor.role == :admin do
        indicated = Ash.Changeset.get_attribute(cs, :professional_referral)

        if indicated || client.referring_professional_id == professional_id do
          client
          |> Ash.Changeset.for_update(
            :set_referrer,
            %{referring_professional_id: if(indicated, do: professional_id)},
            authorize?: false
          )
          |> Ash.update!()
        end
      end

      indicated = Ash.Changeset.get_attribute(cs, :professional_referral)

      referrer =
        cond do
          indicated ->
            professional_id

          explicit? && persist? && client && client.referring_professional_id == professional_id ->
            nil

          cs.action_type == :create ->
            client && client.referring_professional_id

          explicit? && persist? &&
              Ash.Changeset.get_attribute(cs, :referral_professional_id) == professional_id ->
            nil

          true ->
            Ash.Changeset.get_attribute(cs, :referral_professional_id)
        end

      Ash.Changeset.force_change_attribute(cs, :referral_professional_id, referrer)
    end)
  end

  defp client(cs) do
    case Ash.Changeset.get_attribute(cs, :client_id) do
      nil ->
        phone = Ash.Changeset.get_attribute(cs, :client_phone) || ""
        normalized = NormalizePhone.normalize(phone)

        if String.length(normalized) in [12, 13] do
          LabelleBack.Studio.get_client_by_phone_normalized(normalized, authorize?: false)
          |> elem(1)
        end

      id ->
        Ash.get!(Client, id, authorize?: false)
    end
  end
end
