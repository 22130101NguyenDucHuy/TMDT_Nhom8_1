import brandLogo from "../../assets/logoLoopBook.png";

export default function BrandLogo({ className = "lb-brand-mark" }) {
  return (
    <img alt="LoopBook" className={className} src={brandLogo} />
  );
}
