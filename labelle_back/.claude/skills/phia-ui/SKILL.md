---
name: phia-ui
description: "Use this skill when building or editing Phoenix LiveView UI (HEEx templates, LiveViews, components) in this project. Load when a file imports `PhiaUi.Components.*`, when running `mix phia.*` tasks, or when asked to design/build a page, dashboard, form, chart, or admin screen."
metadata:
  managed-by: manual
  source: deps/phia_ui (README + docs + source, v0.1.17) — verified against the installed package, not copied from another project
---

## What this is

PhiaUI (`phia_ui` on Hex, https://github.com/charlenopires/PhiaUI) is a copy-paste,
shadcn/ui-inspired component library for **Phoenix LiveView** — 829 components across
20+ categories, built on TailwindCSS v4 semantic tokens. It is already installed in
this project:

- Dependency in `mix.exs`: `{:phia_ui, "~> 0.1.17"}`
- `mix phia.install` has been run: injected the theme into `assets/css/app.css`,
  created `assets/js/phia_hooks/index.js`, wired hooks into `assets/js/app.js`
- No supervision-tree change needed — `phia_ui` ships its own OTP app
  (`PhiaUi.Application`) that starts `PhiaUi.ClassMerger.Cache` automatically
- `.mcp.json` at the project root configures the `phiaui-design` MCP server

Full README is at `deps/phia_ui/README.md`. Per-category API docs (attrs/slots/
variants for every component) are at `deps/phia_ui/docs/components/*.md` — **read the
relevant one before using an unfamiliar component rather than guessing attrs.**
Guides/tutorials are at `deps/phia_ui/docs/guides/*.md`.

## Two ways to use a component

1. **Direct import from the dependency** (fastest, stays on-package):
   ```elixir
   import PhiaUi.Components.Buttons
   import PhiaUi.Components.Layout, only: [shell: 1, sidebar: 1, sidebar_item: 1, sidebar_section: 1]
   ```
2. **Eject for full ownership** (when you need to customize):
   ```bash
   mix phia.add button
   mix phia.add dialog
   ```
   This copies the component into `lib/labelle_back_web/components/ui/` plus any JS
   hooks it needs. Once ejected, the file belongs to this project — edit freely, it
   won't be touched by future `phia_ui` upgrades. `mix phia.add --help` lists what's
   ejectable.

## Verified gotchas (checked against the installed package source, not assumed)

| # | Rule | Why |
|---|------|-----|
| 1 | `<.button>` renders a real `<button>` — use `<.link navigate={~p"..."}>` for internal navigation, not a button with an `href` | `href` on `<button>` is ignored by the browser |
| 2 | `data_table`'s `:column` slot requires `key` (`attr(:key, :string, required: true)` in `deps/phia_ui/lib/phia_ui/components/data/data_table.ex`) | Omitting it triggers a compile warning and breaks sorting |
| 3 | `Alert` variants are `:default`, `:destructive`, `:warning`, `:success` — there is **no** `:error` variant (`deps/phia_ui/lib/phia_ui/components/feedback/alert.ex`) | Map app-level "error" states to `:destructive` |
| 4 | `PhiaUi.Components.Layout` (the `shell.ex` module) already exports `shell/1`, `sidebar/1`, `sidebar_item/1`, `sidebar_section/1`, `topbar/1`, `mobile_sidebar_toggle/1`. There is *also* a separate `sidebar/1` in `PhiaUi.Components.Navigation` (`navigation/sidebar.ex`) | Importing both modules unqualified creates a function-name collision — pick one, don't import both |
| 5 | Don't use raw Tailwind color utilities (`bg-blue-500`, `text-red-600`) inside or alongside PhiaUI components — use the semantic tokens (`bg-primary`, `text-destructive`, etc.) | Raw colors bypass theming and dark mode, which PhiaUI drives entirely off CSS variables |
| 6 | If importing PhiaUI components **directly from the dependency** (not ejected), `assets/css/app.css` needs `@source "../../deps/phia_ui/lib";` alongside the existing `@source` lines | This project's `app.css` uses `@import "tailwindcss" source(none)` (no automatic content scanning) and currently only sources `ash_authentication_phoenix`, `../css`, `../js`, `../../lib/labelle_back_web` — **not** `deps/phia_ui`. Without it, Tailwind never scans PhiaUI's own `.ex` files, so classes referenced only inside un-ejected components (e.g. responsive classes on `Shell`/`Sidebar`) won't be generated and layouts silently break at certain breakpoints. **Ejected** components don't need this since they live under `lib/labelle_back_web`, which is already sourced |
| 7 | Fields typed `Ash.Type.CiString` (e.g. `user.email` from `AshAuthentication`) need `to_string/1` before passing into a component that calls string functions on them (e.g. an avatar's initials via `String.split/3`) | `Ash.CiString` is a struct, not a binary — string functions raise |
| 8 | Always use `<.link navigate={...}>` for in-app navigation in LiveViews, never plain `<a href="...">` | `<a href>` triggers a full page reload; `<.link navigate>` reuses the existing LiveView socket |

## Component catalog (by category)

| Category | Count | Key components |
|---|---:|---|
| Animation | 22 | marquee, typewriter, particle_bg, orbit, confetti_burst |
| Background | 15 | gradient_mesh, noise_bg, dot_grid, wave_bg |
| Buttons | ~20 | button, toggle, split_button, icon_button, gradient_button |
| Calendar | 33 | date/time pickers, booking_calendar, big_calendar |
| Cards | 22 | stat_card, article_card, profile_card, pricing_card |
| Charts & Data | ~80 | 35+ chart types, data_grid, data_table, kanban_board |
| Collaboration | ~35 | presence, cursors, comments, notifications |
| Display | 27 | icon, badge, avatar, timeline, avatar_group |
| Editor | ~170 | rich_editor, 10 presets, blocks, media, formatting |
| Feedback | 21 | alert, banner, snackbar, loading_overlay, skeleton |
| Forms | 34 | form_section, form_fieldset, radio_card, signature_pad |
| Inputs | 61 | text, rich, OTP, upload, textarea variants |
| Interaction | 14 | sortable_list, sortable_grid, drag_handle, drop_zone |
| Layout | 31 | box, flex, grid, stack, shell, container_query |
| Media | 5 | audio_player, carousel, image_comparison, qr_code |
| Navigation | 33 | sidebar, breadcrumb, tabs, command_palette, stepper_nav |
| Overlay | 9 | dialog, drawer, sheet, dropdown_menu, popover, tooltip |
| Surface | 25 | glass_card, bento_grid, border_beam, bottom_sheet |
| Typography | 18 | heading, prose, code_block, gradient_text |

## Shell layout pattern

```heex
<.shell>
  <:topbar>
    <.mobile_sidebar_toggle />
    <span class="font-semibold">{@page_title}</span>
    <div class="ml-auto text-sm text-muted-foreground">
      {@current_user.email}
    </div>
  </:topbar>

  <:sidebar>
    <.sidebar variant={:dark}>
      <:brand><span class="text-lg font-bold">La Belle</span></:brand>
      <:nav_items>
        <.sidebar_section label="Geral">
          <.sidebar_item navigate={~p"/dashboard"} active={@live_action == :index}>Dashboard</.sidebar_item>
        </.sidebar_section>
      </:nav_items>
    </.sidebar>
  </:sidebar>

  <main class="overflow-y-auto p-8">
    {@inner_content}
  </main>
</.shell>
```

## data_table pattern

```heex
<.data_table rows={@items} empty_message="Nenhum registro">
  <:column key="name" label="Nome" sortable :let={item}>{item.name}</:column>
  <:column key="status" label="Status" align={:center} :let={item}>{item.status}</:column>
  <:action :let={item}>
    <.button variant={:ghost} size={:sm} phx-click="delete" phx-value-id={item.id}>Remover</.button>
  </:action>
</.data_table>
```

## Charts (zero-JS, pure SVG)

```heex
<.bar_chart id="revenue"
  series={[%{name: "Revenue", data: [120, 200, 150, 80, 250, 190]}]}
  categories={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]} />
```

19 chart types (bar/line/area/pie/donut/radar/scatter/gauge/heatmap/waterfall/
treemap/sparkline/xy_chart composable...). Data format is always
`series = [%{name: ..., data: [...]}]` + `categories = [...]`. See
`deps/phia_ui/docs/guides/tutorial-charts.md`.

## Ecto/AshPhoenix form integration

```heex
<.form for={@form} phx-change="validate" phx-submit="save">
  <.phia_input field={@form[:name]} label="Nome completo" required />
  <.phia_input field={@form[:email]} type="email" label="Email" />
  <.button type="submit" variant="default">Salvar</.button>
</.form>
```

Works the same with `AshPhoenix.Form.to_form/2` as with plain Ecto changesets —
`field={@form[:x]}` is what matters, not where the form came from.

## Design MCP server (Claude Code)

`.mcp.json` in this project already points Claude Code at `mix phia.design.mcp`.
When available, prefer the MCP tools over hand-writing HEEx for new pages/screens:

| Tool | Use for |
|---|---|
| `get_phia_catalog` / `get_phia_component_info` | Browse components / get exact attrs+slots+variants before inserting |
| `insert_phia_component` / `insert_phia_page` | Add a component or a full page template (dashboard, settings, auth...) |
| `set_phia_attr` / `set_phia_slot` / `move_phia_node` / `delete_phia_node` | Edit the in-progress scene |
| `set_phia_theme` / `get_phia_theme` | zinc, slate, stone, gray, red, rose, orange, blue, green, violet |
| `export_liveview` / `export_heex` | Emit the final `.ex`/`.heex` file once the scene is right |

Workflow: browse catalog → insert components → configure attrs/slots → export as a
real LiveView module → `mix compile` to confirm it works. Alternative entry points:
`mix phia.design` (visual editor, http://localhost:4200) and `mix phia.design.export
my_page.phia.json --format liveview --output lib/... --module LabelleBackWeb.SomeLive`.

## Theming

```bash
mix phia.theme install zinc   # or slate, stone, gray, red, rose, orange, blue, green, violet
mix phia.theme list
```

Tokens are CSS variables under `@layer base` in `assets/css/app.css`. Dark mode is
class-based (`.dark` on `<html>`), all components respond automatically.

## Other gotchas

- This is a **server-rendered LiveView** UI library — unrelated to the React
  frontend in the sibling `grumpy-belle-studio-book` project. Don't conflate the two
  when deciding where a screen should live.
- `assets/js/app.js` must keep `hooks: { ...PhiaHooks, ...YourHooks }` — removing the
  spread breaks any ejected/imported component that relies on a JS hook (calendars,
  editors, drag & drop, interactive charts).
