# Multi-stage Dockerfile for a Phoenix/Ash release build.
# Matches the versions used in local dev (Elixir 1.17.2 / Erlang OTP 27).

ARG ELIXIR_VERSION=1.17.2
ARG OTP_VERSION=27.0.1
ARG DEBIAN_VERSION=bookworm-20250113-slim

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} AS builder

RUN apt-get update -y && apt-get install -y build-essential git curl \
  && apt-get clean && rm -f /var/lib/apt/lists/*_*

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

ENV MIX_ENV="prod"

COPY mix.exs mix.lock ./
COPY config config
RUN mix deps.get --only $MIX_ENV
RUN mix deps.compile

COPY priv priv
COPY lib lib
COPY assets assets

RUN mix assets.setup
RUN mix assets.deploy

RUN mix compile

RUN mix release

FROM ${RUNNER_IMAGE} AS app

RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
  && apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

WORKDIR "/app"
RUN chown nobody /app

ENV MIX_ENV="prod"
ENV PHX_SERVER="true"

COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/labelle_back ./

USER nobody

CMD ["/bin/sh", "-c", "/app/bin/labelle_back eval \"LabelleBack.Release.migrate()\" && /app/bin/labelle_back start"]
