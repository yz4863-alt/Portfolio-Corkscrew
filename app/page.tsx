/* eslint-disable @next/next/no-img-element */
import BrainHero from "./BrainHero";
import HeroStatCard from "./HeroStatCard";
import MechanicalComparison from "./MechanicalComparison";
import SectionNavigation from "./SectionNavigation";

const overviewCards = [
  {
    icon: "target",
    title: "Clinical Targeting",
    summary: "Localized dosing for deep tissue regions",
    detail: "Regional infusion aims to reach selected brain volumes while limiting broad exposure.",
  },
  {
    icon: "helix",
    title: "Helical Architecture",
    summary: "Multi-port coverage from one implant",
    detail: "A thin corkscrew path distributes outlets across irregular brain anatomy.",
  },
  {
    icon: "validation",
    title: "Engineered Validation",
    summary: "Modeled, fabricated, and tested",
    detail: "CFD, FEA, benchtop testing, and in vivo work connected design to performance.",
  },
] as const;

const contributionCards = [
  {
    icon: "simulation",
    title: "FEA Stress Mapping",
    summary: "Geometry-driven structural analysis",
    detail: "Compared stress concentration and displacement response between straight and helical catheter designs.",
  },
  {
    icon: "testing",
    title: "Instron Compression",
    summary: "Bench testing under load",
    detail: "Measured compression, buckling, recovery, and failure behavior in prototype catheter structures.",
  },
  {
    icon: "correlation",
    title: "Model-Test Linkage",
    summary: "Simulation checked against data",
    detail: "Connected load-displacement trends from experiments with mechanical model predictions.",
  },
  {
    icon: "translation",
    title: "Design Interpretation",
    summary: "Mechanical evidence for SPIRAL",
    detail: "Translated structural results into device-level conclusions for resilient intracerebral delivery.",
  },
] as const;

const impactItems = [
  {
    label: "Spatial Dosing",
    value: "Multi-port delivery expands regional coverage.",
    graphic: "rings",
  },
  {
    label: "Low Footprint",
    value: "Broader reach without multiple insertion tracks.",
    graphic: "footprint",
  },
  {
    label: "Mechanical Resilience",
    value: "Helical geometry tolerates compressive loading.",
    graphic: "spring",
  },
  {
    label: "Chronic Viability",
    value: "Design supports localized dosing with tissue-aware geometry.",
    graphic: "path",
  },
];

const publicationLinks = [
  { label: "PubMed", href: "https://pubmed.ncbi.nlm.nih.gov/41017425/" },
  { label: "DOI", href: "https://doi.org/10.1088/1741-2552/ae0523" },
  { label: "Local PDF", href: "/spiral-paper.pdf" },
] as const;

const authorLinks = [
  { name: "Batoul Khlaifat", href: "https://ae.linkedin.com/in/batool-khlaifat-976928233" },
  { name: "Mahmoud Elbeh", href: "https://ae.linkedin.com/in/mahmoudelbeh" },
  { name: "Shreya Manjrekar", href: "https://www.linkedin.com/in/shreya-manjrekar" },
  { name: "Seung-Jean Kang", href: "https://www.linkedin.com/in/seung-jean-kang" },
  { name: "Yusheng (Jason) Zhang", href: "https://www.linkedin.com/in/yush-zhang" },
  { name: "Parima Phowarasoontorn", href: "https://th.linkedin.com/in/prim-phowarasoontorn" },
  { name: "Sadaf Usmani", href: "https://ae.linkedin.com/in/sadaf-usmani-196a3644" },
  { name: "Abdel-Hameed Dabbour", href: "https://nz.linkedin.com/in/ahdabbour" },
  { name: "Heba T Naser", href: "https://ae.linkedin.com/in/heba-tageldeen-naser-3b09212b8" },
  { name: "Hanan Mohammed", href: "https://www.linkedin.com/in/mohammedhanan?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" },
  { name: "Minsoo Kim", href: null },
  { name: "Khalil Ramadi*", href: "https://www.linkedin.com/in/khalil-ramadi" },
] as const;

const mediaCoverageLinks = [
  {
    label: "Interesting Engineering",
    href: "https://interestingengineering.com/health/spiral-brain-implant-precision-drug-delivery",
  },
  {
    label: "EurekAlert!",
    href: "https://www.eurekalert.org/news-releases/1101847",
  },
  {
    label: "Drug Target Review",
    href: "https://www.drugtargetreview.com/spiral-device-offers-safer-smarter-drug-delivery-to-the-brain/679640.article",
  },
  {
    label: "Physics World",
    href: "https://physicsworld.com/a/spiral-catheter-optimizes-drug-delivery-to-the-brain/",
  },
] as const;

export default function Home() {
  return (
    <main className="site-page">
      <SectionNavigation />
      <div className="name-watermark name-watermark-left" aria-hidden="true">
        Yusheng (Jason) Zhang
      </div>
      <div className="name-watermark name-watermark-right" aria-hidden="true">
        Yusheng (Jason) Zhang
      </div>

      <nav className="top-nav" aria-label="SPIRAL project page">
        <a href="#hero" className="site-mark">
          <span className="site-mark-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M11.7 4.4c-2.2-.9-4.8.3-5.2 2.8-1.7.5-2.8 2.1-2.4 3.8.2.9.8 1.6 1.5 2-.4 1.7.8 3.4 2.5 3.6.8 1.4 2.2 2.1 3.6 1.7V4.4Z" />
              <path d="M12.3 4.4c2.2-.9 4.8.3 5.2 2.8 1.7.5 2.8 2.1 2.4 3.8-.2.9-.8 1.6-1.5 2 .4 1.7-.8 3.4-2.5 3.6-.8 1.4-2.2 2.1-3.6 1.7V4.4Z" />
              <path d="M8.1 8.4c1.1.1 1.9.7 2.3 1.7" />
              <path d="M15.9 8.4c-1.1.1-1.9.7-2.3 1.7" />
              <path d="M8.2 13.2c.9-.2 1.8.1 2.4.8" />
              <path d="M15.8 13.2c-.9-.2-1.8.1-2.4.8" />
            </svg>
          </span>
          <span className="site-mark-text">Yusheng (Jason) Zhang</span>
        </a>
        <div className="nav-links">
          <a href="#overview">Overview</a>
          <a href="#contributions">Major Contributions</a>
          <a href="#impact">Impact</a>
          <a href="#accomplishments">Accomplishments</a>
          <a className="portfolio-back" href="https://jasonzhanggcs.weebly.com/projects.html">
            Back to Portfolio
          </a>
        </div>
      </nav>

      <section className="hero-shell" id="hero" aria-labelledby="project-title">
        <div className="hero-tint" aria-hidden="true" />
        <BrainHero />
        <div className="hero-content">
          <p className="hero-kicker">Intracerebral microfluidic catheter design</p>
          <h1 id="project-title">SPIRAL<sup className="title-copyright" aria-label="copyright">&copy;</sup></h1>
          <p className="hero-acronym">Strategic Precision Infusion for Regional Administration of Liquid</p>
          <p className="hero-copy">
            A helical neural implant for intracerebral drug delivery: a thin, corkscrew-shaped microfluidic catheter designed to localize infusate through multiple outlets across irregular brain regions while keeping a minimal implant footprint.
          </p>
          <div className="hero-actions" aria-label="Project links">
            <a href="#overview">Explore Project</a>
            <a href="https://pubmed.ncbi.nlm.nih.gov/41017425/" target="_blank" rel="noreferrer">
              View Publication
            </a>
          </div>
          <div className="hero-meta">
            <div className="hero-stats" aria-label="Project snapshot">
              <HeroStatCard
                icon="publication"
                title="Peer-Reviewed Paper"
                summary="J. Neural Eng."
                detail="Journal of Neural Engineering, 22, 056020."
              />
              <HeroStatCard
                icon="device"
                title="Helical Microfluidics"
                summary="Multi-Port Dosing"
                detail="Multi-port helix expands regional coverage."
              />
              <HeroStatCard
                icon="validation"
                title="Mechanical Validation"
                summary="FEA + Instron"
                detail="FEA, Instron testing, and model correlation."
              />
            </div>
            <p className="hero-disclaimer">
              Conceptual visualization only; anatomy, device placement, release behavior, and scale are illustrative and not clinically or dimensionally representative.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-overview" id="overview">
        <div className="section-inner overview-layout">
          <div className="section-header overview-heading">
            <p className="section-kicker">Overview</p>
            <h2>Targeted delivery for irregular brain regions</h2>
          </div>

          <div className="overview-card-grid" aria-label="Project overview themes">
            {overviewCards.map((item) => (
              <OverviewCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                summary={item.summary}
                detail={item.detail}
              />
            ))}
          </div>

          <div className="overview-device-compare" aria-label="Device architecture comparison">
            <figure className="overview-device-figure">
              <img
                src="/overview-conventional-catheter.png"
                alt="Conventional straight intracerebral catheter in a translucent brain"
                loading="lazy"
                decoding="async"
              />
              <figcaption>Conventional Straight Catheter</figcaption>
            </figure>
            <figure className="overview-device-figure">
              <img
                src="/overview-spiral-catheter.png"
                alt="SPIRAL helical intracerebral microfluidic catheter in a translucent brain"
                loading="lazy"
                decoding="async"
              />
              <figcaption>SPIRAL Helical Microfluidic Catheter</figcaption>
            </figure>
          </div>
          <div className="overview-disclaimer-band">
            <p>
              Conceptual visualization only; anatomy, device placement, release behavior, and scale are illustrative and not clinically or dimensionally representative.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-contributions" id="contributions">
        <div className="section-inner contribution-layout">
          <div className="section-header narrow">
            <p className="section-kicker">Major Contributions</p>
            <h2>Mechanical analysis and validation of the catheter architecture</h2>
            <p className="section-lede">
              The mechanical work tested whether a helical drug-delivery catheter could localize infusion while also tolerating compression, buckling, and deformation better than a straight catheter.
            </p>
          </div>
          <div className="contribution-card-grid" aria-label="Mechanical contribution areas">
            {contributionCards.map((item) => (
              <ContributionCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                summary={item.summary}
                detail={item.detail}
              />
            ))}
          </div>
          <MechanicalComparison />
        </div>
      </section>

      <section className="section section-impact" id="impact">
        <div className="section-inner impact-layout">
          <div className="impact-lead">
            <p className="section-kicker">Impact</p>
            <h2>A catheter geometry built for broader, controlled localization</h2>
            <p>
              SPIRAL demonstrates how catheter shape, port sizing, and mechanical resilience can work together in a device designed for localized intracerebral therapy. The helical geometry offers an alternate path toward multiregional dosing without requiring repeated insertions or multiple co-implanted catheters.
            </p>
          </div>
          <div className="impact-grid">
            {impactItems.map((item) => (
              <article className={`impact-item impact-item-${item.graphic}`} key={item.label} tabIndex={0}>
                <div className="impact-graphic" aria-hidden="true">
                  <span className="impact-graphic-line impact-graphic-line-a" />
                  <span className="impact-graphic-line impact-graphic-line-b" />
                  <span className="impact-graphic-dot impact-graphic-dot-a" />
                  <span className="impact-graphic-dot impact-graphic-dot-b" />
                </div>
                <span className="impact-item-label">{item.label}</span>
                <p>{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-accomplishments" id="accomplishments">
        <div className="section-inner accomplishments-layout">
          <div className="section-header">
            <p className="section-kicker">Accomplishments</p>
            <h2>Published, credited, and covered across engineering media</h2>
            <p className="section-lede">
              Peer-reviewed publication, full author acknowledgement, and public reporting around the SPIRAL intracerebral delivery platform.
            </p>
          </div>
          <div className="accomplishment-list" aria-label="Publication accomplishments and media coverage">
            <article className="accomplishment accomplishment-publication">
              <div className="accomplishment-heading">
                <span className="accomplishment-icon"><AccomplishmentIcon type="paper" /></span>
                <div>
                  <span className="accomplishment-label">Peer-Reviewed Paper</span>
                  <p>Journal of Neural Engineering, 22, 056020.</p>
                </div>
              </div>
              <div className="accomplishment-link-row" aria-label="Publication links">
                {publicationLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </article>

            <article className="accomplishment accomplishment-authors">
              <div className="accomplishment-heading">
                <span className="accomplishment-icon"><AccomplishmentIcon type="authors" /></span>
                <div>
                  <span className="accomplishment-label">Author Credit</span>
                  <p>Authors are shown in contribution order as listed in the paper.</p>
                </div>
              </div>
              <div className="author-chip-list" aria-label="Publication authors">
                {authorLinks.map((author) =>
                  author.href ? (
                    <a className="author-chip" href={author.href} target="_blank" rel="noreferrer" key={author.name}>
                      {author.name}
                    </a>
                  ) : (
                    <span className="author-chip author-chip-unlinked" key={author.name}>
                      {author.name}
                    </span>
                  ),
                )}
              </div>
            </article>

            <article className="accomplishment accomplishment-media">
              <div className="accomplishment-heading">
                <span className="accomplishment-icon"><AccomplishmentIcon type="media" /></span>
                <div>
                  <span className="accomplishment-label">Media Coverage</span>
                  <p>Reported by science, health, and engineering outlets.</p>
                </div>
              </div>
              <div className="media-link-grid" aria-label="Media coverage links">
                {mediaCoverageLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>      <footer className="site-footer">
        <p>&copy; Yusheng (Jason) Zhang. All Rights Reserved.</p>
        <p className="site-footer-right">
          Research work conducted at <a href="https://www.ramadilab.com/" target="_blank" rel="noreferrer">Ramadi Lab at New York University</a>.
        </p>
      </footer>

    </main>
  );
}



type AccomplishmentIconType = "paper" | "authors" | "media";

function AccomplishmentIcon({ type }: { type: AccomplishmentIconType }) {
  if (type === "authors") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M3.5 19c.7-3.1 2.2-4.7 4.5-4.7s3.8 1.6 4.5 4.7" />
        <path d="M11.5 19c.7-3.1 2.2-4.7 4.5-4.7s3.8 1.6 4.5 4.7" />
      </svg>
    );
  }

  if (type === "media") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 6h16v12H4z" />
        <path d="M8 10h4" />
        <path d="M8 14h8" />
        <path d="M17 9.5l2-2" />
        <path d="M17 14.5l2 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4h8l4 4v12H7z" />
      <path d="M15 4v5h4" />
      <path d="M10 13h6" />
      <path d="M10 16h4" />
    </svg>
  );
}

type ContributionIconType = (typeof contributionCards)[number]["icon"];

function ContributionIcon({ type }: { type: ContributionIconType }) {
  if (type === "simulation") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 18h16" />
        <path d="M7 15V8" />
        <path d="M12 15V5" />
        <path d="M17 15v-4" />
        <path d="M6 8h12" />
      </svg>
    );
  }

  if (type === "testing") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 4h10" />
        <path d="M12 4v16" />
        <path d="M8 9h8" />
        <path d="M9 16h6" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (type === "correlation") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 17c3.5-8 6.5-8 14-3" />
        <path d="M5 12c4.5 1 7.5 4.5 14-4" />
        <path d="M4 19h16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 5h7v7H5z" />
      <path d="M12 12l7 7" />
      <path d="M14 19h5v-5" />
      <path d="M8.5 8.5h7" />
    </svg>
  );
}

function ContributionCard({
  icon,
  title,
  summary,
  detail,
}: {
  icon: ContributionIconType;
  title: string;
  summary: string;
  detail: string;
}) {
  return (
    <article className="contribution-card" tabIndex={0} aria-label={title + ": " + summary + ". " + detail}>
      <div className="contribution-card-top">
        <span className="contribution-card-icon">
          <ContributionIcon type={icon} />
        </span>
        <h3>{title}</h3>
      </div>
      <div className="contribution-card-body">
        <p className="contribution-card-summary">{summary}</p>
        <p className="contribution-card-detail">{detail}</p>
      </div>
    </article>
  );
}


type OverviewIconType = (typeof overviewCards)[number]["icon"];

function OverviewIcon({ type }: { type: OverviewIconType }) {
  if (type === "target") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4v3" />
        <path d="M12 17v3" />
        <path d="M4 12h3" />
        <path d="M17 12h3" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }

  if (type === "helix") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3c-3.4 2.1-3.4 4.2 0 6.3s3.4 4.1 0 6.2-3.4 4.1 0 5.5" />
        <path d="M8 6.1h8" />
        <path d="M8 12h8" />
        <path d="M8 17.9h8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 18h16" />
      <path d="M6 15l3-4 3 2.8 5-7.8" />
      <path d="M16 6h2v2" />
      <path d="M6 6v9" />
    </svg>
  );
}

function OverviewCard({
  icon,
  title,
  summary,
  detail,
}: {
  icon: OverviewIconType;
  title: string;
  summary: string;
  detail: string;
}) {
  return (
    <article className="overview-card" tabIndex={0} aria-label={title + ": " + summary + ". " + detail}>
      <div className="overview-card-top">
        <span className="overview-card-icon">
          <OverviewIcon type={icon} />
        </span>
        <h3>{title}</h3>
      </div>
      <div className="overview-card-body">
        <p className="overview-card-summary">{summary}</p>
        <p className="overview-card-detail">{detail}</p>
      </div>
    </article>
  );
}
