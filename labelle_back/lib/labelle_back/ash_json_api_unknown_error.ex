# Sem este impl, qualquer `{:error, atom | string}` retornado por uma
# generic action (ex.: LabelleBack.Studio.WhatsAppConnection) vira um 500
# opaco no JSON:API — só um log de warning no server
# ("AshJsonApi.Error not implemented for error: ..."), sem detalhe nenhum
# pra quem chamou. Isso faz o motivo do erro chegar até o front.
defimpl AshJsonApi.ToJsonApiError, for: Ash.Error.Unknown.UnknownError do
  def to_json_api_error(error) do
    %AshJsonApi.Error{
      id: Ash.UUID.generate(),
      status_code: 422,
      code: "unknown_error",
      title: "UnknownError",
      detail: Ash.Error.Unknown.UnknownError.message(error)
    }
  end
end
