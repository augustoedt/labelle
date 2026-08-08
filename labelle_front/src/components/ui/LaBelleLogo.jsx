// Logo La Belle Studio (asset local em public/logo.png)
export default function LaBelleLogo({ size = "md", dark = false, imageOnly = false }) {
  const imgUrl = "/logo.png";

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