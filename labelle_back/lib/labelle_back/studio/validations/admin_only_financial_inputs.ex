defmodule LabelleBack.Studio.Validations.AdminOnlyFinancialInputs do
  @moduledoc """
  Manual bookings and service items calculate their prices from the catalog for
  professionals. Only an admin may explicitly override financial fields.
  """
  use Ash.Resource.Validation

  @impl true
  def validate(changeset, opts, context) do
    if is_nil(context.actor) or Map.get(context.actor, :role) == :admin do
      :ok
    else
      case Enum.find(opts[:fields], fn field ->
             explicit? =
               Map.has_key?(changeset.params || %{}, field) ||
                 Map.has_key?(changeset.params || %{}, to_string(field))

             Ash.Changeset.changing_attribute?(changeset, field) &&
               (field != :professional_referral || explicit?)
           end) do
        nil ->
          :ok

        field ->
          {:error, field: field, message: "somente a administração pode alterar este valor"}
      end
    end
  end
end
