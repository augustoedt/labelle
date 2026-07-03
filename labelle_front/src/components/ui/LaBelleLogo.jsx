// SVG logo component that replicates the La Belle Studio logo mark (pearl circle) + wordmark
// Uses the uploaded image directly for fidelity
export default function LaBelleLogo({ size = "md", dark = false, imageOnly = false }) {
  const imgUrl = "https://media.base44.com/images/public/69ed4f6aab9a16f877207f63/c0405e1ad_ChatGPTImage25deabrde202620_57_27.png";

  const sizes = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-24",
  };

  return (
    <img
      src={imgUrl}
      alt="La Belle Studio"
      className={`${sizes[size] || sizes.md} w-auto object-contain`}
      style={dark ? {} : { filter: "brightness(0) saturate(100%)" }}
    />
  );
}