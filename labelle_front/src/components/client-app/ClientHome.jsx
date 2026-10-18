import { useQuery } from "@tanstack/react-query";
import {
  ServicesApi,
  PromotionsApi,
  ServiceVariantsApi,
  ProfessionalsApi,
  getPublicStudioSettings,
} from "@/server/api";
import {
  ArrowRight,
  CalendarDays,
  Heart,
  MapPin,
  MessageCircle,
  Instagram,
  ShieldCheck,
  Sparkles,
  Clock,
  UserRound,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import {
  availableService,
  minimumPrice,
  promotionFor,
} from "@/lib/serviceCatalog";
import { categoryPhotos, categoryDescriptions } from "@/lib/brand";
import ServiceCategoryIcon, {
  categoryLabels,
} from "@/components/ui/ServiceCategoryIcon";

export default function ClientHome({ clientName, onNavigate, onCategory }) {
  const serviceQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });
  const variantQuery = useQuery({
    queryKey: ["service-variants"],
    queryFn: () => ServiceVariantsApi.list({ limit: 1000 }),
  });
  const { data: promotions = [] } = useQuery({queryKey:["promotions"],queryFn:()=>PromotionsApi.list()});
  const professionalQuery = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });
  const settingsQuery = useQuery({
    queryKey: ["public-studio-settings"],
    queryFn: () => getPublicStudioSettings(),
  });
  const variants = variantQuery.data || [];
  const services = (serviceQuery.data || []).filter((s) =>
    availableService(s, variants),
  );
  const applicablePromotions = services
    .map((service) => promotionFor(promotions, service.id))
    .filter(Boolean);
  const categories = [...new Set(services.map((s) => s.category))];
  const professionals = (professionalQuery.data || []).filter(
    (p) => p.is_active !== false,
  );
  const settings = settingsQuery.data;
  const phone = (settings?.whatsapp_phone || "").replace(/\D/g, "");
  const whatsapp =
    phone.length >= 10
      ? `https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}`
      : null;
  const loading = serviceQuery.isPending || variantQuery.isPending;
  const failed = serviceQuery.isError || variantQuery.isError;
  return (
    <>
      <section id="inicio" className="website-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            Beleza <span>·</span> Bem-estar <span>·</span> Autocuidado
          </p>
          <p className="mobile-greeting">
            {clientName
              ? `Olá, ${clientName.split(" ")[0]}!`
              : "Bem-vinda ao La Belle"}
          </p>
          <h1>
            Sua beleza,
            <br />
            em um só <em>lugar.</em>
          </h1>
          <p className="hero-description">
            Cabelos, unhas e bem-estar.
            <br className="desktop-break" /> Um momento para cuidar de você e
            realçar a sua melhor versão.
          </p>
          <button
            className="brand-button"
            onClick={() => onNavigate("agendar")}
          >
            Agendar meu horário <ArrowRight size={17} />
          </button>
          <div className="hero-details">
            <span>
              <UserRound />
              <small>
                Escolha sua
                <br />
                profissional
              </small>
            </span>
            <span>
              <Heart />
              <small>
                Um cuidado
                <br />
                feito para você
              </small>
            </span>
            <span>
              <CalendarDays />
              <small>
                Agende com
                <br />
                praticidade
              </small>
            </span>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="/images/salon-hero.webp"
            alt="Ambiente de beleza em tons de bege e cobre, imagem ilustrativa"
            fetchPriority="high"
          />
          <span className="hero-image-note">
            Inspiração La Belle · imagem ilustrativa
          </span>
        </div>
        <div className="mobile-hero-bottom">
          <Sparkles size={15} /> Seu momento de beleza começa aqui.
        </div>
      </section>

      <section id="servicos" className="website-section services-overview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cuidado em cada detalhe</p>
            <h2>Nossos serviços</h2>
          </div>
          <button
            className="text-action"
            onClick={() => onNavigate("catalogo")}
          >
            Ver catálogo completo <ArrowRight size={16} />
          </button>
        </div>
        <p className="section-intro">
          Tudo o que você precisa para se sentir ainda mais você.
        </p>
        {failed ? (
          <div role="alert" className="website-empty">
            <p>Não foi possível carregar os serviços.</p>
            <button
              className="text-action"
              onClick={() => {
                serviceQuery.refetch();
                variantQuery.refetch();
              }}
            >
              Tentar novamente <ArrowRight size={16} />
            </button>
          </div>
        ) : loading ? (
          <div className="category-grid" aria-label="Carregando serviços">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="category-placeholder animate-pulse" />
            ))}
          </div>
        ) : categories.length ? (
          <div className="category-grid">
            {categories.map((category) => {
              const offerings = services.filter((s) => s.category === category);
              const minimum = Math.min(
                ...offerings.map((s) => minimumPrice(s, variants)),
              );
              return (
                <button
                  className="category-card"
                  key={category}
                  onClick={() => onCategory(category)}
                >
                  <div className="category-image">
                    <img
                      src={categoryPhotos[category] || categoryPhotos.outros}
                      alt=""
                      loading="lazy"
                    />
                    <span>
                      <ServiceCategoryIcon category={category} />
                    </span>
                  </div>
                  <div className="category-copy">
                    <h3>{categoryLabels[category] || category}</h3>
                    <p>
                      {categoryDescriptions[category] ||
                        "Conheça nossos serviços"}
                    </p>
                    <div>
                      <small>A partir de {formatBRL(minimum)}</small>
                      <ArrowRight size={17} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="website-empty">
            Nosso catálogo está sendo preparado. Fale com o salão para conhecer
            os atendimentos disponíveis.
          </div>
        )}
      </section>

      {applicablePromotions.length > 0 && (
        <section className="website-section website-offers">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Para aproveitar</p>
              <h2>Promoções do salão</h2>
            </div>
          </div>
          <div className="offers-grid">
            {applicablePromotions.map((promo) => (
              <button
                className="offer-card"
                key={promo.id}
                onClick={() => onNavigate("catalogo")}
              >
                <div>
                  <h3>{promo.name}</h3>
                  <p>
                    {promo.description ||
                      promo.rules ||
                      "Consulte as condições do atendimento no catálogo."}
                  </p>
                </div>
                <strong>
                  {promo.discount_type === "percent"
                    ? `−${promo.discount_value}%`
                    : `−${formatBRL(promo.discount_value)}`}
                </strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="sobre" className="website-about website-section">
        <div className="about-image">
          <img
            src={categoryPhotos.cabelo}
            alt="Cuidados com a beleza e os cabelos"
            loading="lazy"
          />
          <span className="about-seal">
            <Heart size={23} />
            <small>
              Seu tempo.
              <br />
              Seu cuidado.
            </small>
          </span>
        </div>
        <div className="about-copy">
          <p className="eyebrow">La Belle Studio</p>
          <h2>
            Mais que beleza.
            <br />
            Um momento <em>seu.</em>
          </h2>
          <p>
            Entre a rotina e tantos compromissos, existe um tempo que é só seu.
            Aqui, você encontra diferentes cuidados em um só lugar e escolhe o
            atendimento que combina com o seu momento.
          </p>
          <div className="about-feature">
            <ShieldCheck />
            <span>
              <strong>Você escolhe, o salão confirma.</strong>
              <small>
                Selecione o serviço, a opção e a profissional. Nós conferimos a
                agenda para confirmar seu horário.
              </small>
            </span>
          </div>
          <button
            className="text-action"
            onClick={() => onNavigate("catalogo")}
          >
            Encontre o seu cuidado <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <section id="profissionais" className="website-section team-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cuidado com quem entende</p>
            <h2>Nossas profissionais</h2>
          </div>
        </div>
        <p className="section-intro">
          Conheça a equipe e escolha com quem deseja agendar.
        </p>
        {professionalQuery.isPending ? (
          <p className="text-muted-foreground">Carregando equipe...</p>
        ) : professionalQuery.isError ? (
          <div role="alert" className="website-empty">
            Não foi possível carregar a equipe.{" "}
            <button
              className="text-action"
              onClick={() => professionalQuery.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : professionals.length ? (
          <div className="team-grid">
            {professionals.map((prof) => (
              <article className="team-card" key={prof.id}>
                <div className="team-avatar">
                  {prof.avatar_url ? (
                    <img src={prof.avatar_url} alt="" loading="lazy" />
                  ) : (
                    <span>
                      {prof.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                  )}
                </div>
                <div>
                  <h3>{prof.name}</h3>
                  <p>Equipe La Belle Studio</p>
                  <button
                    className="text-action"
                    onClick={() => onNavigate("agendar")}
                  >
                    Ver disponibilidade <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="website-empty">
            Fale com o salão para conhecer a equipe.
          </p>
        )}
      </section>

      <section className="website-cta">
        <Sparkles />
        <p className="eyebrow">Um convite ao autocuidado</p>
        <h2>
          O seu próximo momento
          <br />
          de beleza começa aqui.
        </h2>
        <button className="brand-button" onClick={() => onNavigate("agendar")}>
          Quero agendar <ArrowRight size={17} />
        </button>
        <p>Escolha seu horário e aguarde a confirmação do salão.</p>
      </section>
      <footer id="contato" className="website-footer website-section">
        <div>
          <p className="eyebrow">Vamos conversar?</p>
          <h2>Encontre o La Belle</h2>
          <p>Informações e agendamentos nos canais do salão.</p>
          <div className="contact-actions">
            {whatsapp && (
              <a
                className="brand-button"
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} /> Falar no WhatsApp
              </a>
            )}
            <a
              className="text-action"
              href="https://www.instagram.com/labellestudio_jp/"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={18} /> Instagram
            </a>
          </div>
        </div>
        <div className="footer-details">
          {settings?.address && (
            <p>
              <MapPin size={18} />
              <span>{settings.address}</span>
            </p>
          )}
          <p>
            <Clock size={18} />
            <span>Consulte os horários disponíveis no agendamento.</span>
          </p>
          <button
            className="text-action"
            onClick={() => onNavigate("historico")}
          >
            Meus agendamentos <ArrowRight size={16} />
          </button>
          <a href="/login">Acesso da equipe</a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} La Belle Studio</span>
          <span>Beleza · Bem-estar · Autocuidado</span>
        </div>
      </footer>
    </>
  );
}
